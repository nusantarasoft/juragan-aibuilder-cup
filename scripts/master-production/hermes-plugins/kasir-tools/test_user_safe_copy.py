"""Unit tests for user-facing leak sanitizer + draft copy (eng-review leak harden)."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PIPE_ROOT = ROOT.parent / "kasir-pipe"


def _load_user_safe():
    spec = importlib.util.spec_from_file_location("kasir_tools_user_safe", ROOT / "user_safe.py")
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


def _load_writes():
    pkg = types.ModuleType("kasir_tools")
    pkg.__path__ = [str(ROOT)]
    sys.modules["kasir_tools"] = pkg
    us = _load_user_safe()
    sys.modules["kasir_tools.user_safe"] = us
    spec = importlib.util.spec_from_file_location("kasir_tools.writes", ROOT / "writes.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules["kasir_tools.writes"] = mod
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


class UserSafeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.us = _load_user_safe()

    def test_safe_plain_indonesian(self) -> None:
        text = "📦 *Cek Stok*\n\n• indomie goreng — sisa *5*"
        self.assertEqual(self.us.sanitize_user_text(text), text)

    def test_blocks_kasir_tool_name(self) -> None:
        raw = "Panggil tool kasir_confirm_sale ahora"
        out = self.us.sanitize_user_text(raw)
        self.assertNotIn("kasir_", out.lower())
        self.assertIn("sibuk", out.lower())

    def test_blocks_draft_id(self) -> None:
        raw = "draft_id: `abc123def456`"
        out = self.us.sanitize_user_text(raw)
        self.assertNotIn("draft_id", out.lower())

    def test_blocks_http_and_pgrst(self) -> None:
        raw = "Gagal cek stok: HTTP 500 /rest/v1/ecom_items PGRST116"
        out = self.us.sanitize_user_text(raw)
        self.assertNotIn("HTTP", out)
        self.assertNotIn("PGRST", out)

    def test_safe_user_error_kinds(self) -> None:
        self.assertIn("stok", self.us.safe_user_error("stock").lower())
        self.assertIn("sibuk", self.us.safe_user_error("generic").lower())

    def test_reject_reason_cap_and_strip(self) -> None:
        self.assertIsNone(self.us.sanitize_reject_reason("see https://evil.example/x"))
        self.assertIsNone(self.us.sanitize_reject_reason("kasir_get_stock failed"))
        clean = self.us.sanitize_reject_reason("Nama toko tidak jelas")
        self.assertEqual(clean, "Nama toko tidak jelas")
        long = "a" * 200
        capped = self.us.sanitize_reject_reason(long)
        assert capped is not None
        self.assertLessEqual(len(capped), 120)


class DraftCopyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.writes = _load_writes()

        def with_tenant(params, kwargs):
            phone = str((params or {}).get("phone") or "628111111111")
            return (phone, "tenant-test"), None

        def active_products(_tenant):
            return [
                {
                    "id": "item-1",
                    "name": "indomie goreng",
                    "sku": "PHY-1",
                    "selling_price": 3500,
                }
            ]

        def idr(n):
            return f"Rp {int(n):,}".replace(",", ".")

        cls.writes.bind(with_tenant=with_tenant, active_products=active_products, idr=idr)
        cls.writes._DRAFTS.clear()

    def tearDown(self) -> None:
        self.writes._DRAFTS.clear()

    def test_draft_sale_has_no_internal_tokens(self) -> None:
        text = self.writes.handle_draft_sale(
            {
                "phone": "628111111111",
                "items": [{"name": "indomie", "quantity": 1, "unit_price": 3500}],
                "payment_method": "tunai",
            }
        )
        low = text.lower()
        self.assertNotIn("draft_id", low)
        self.assertNotIn("kasir_", low)
        self.assertIn("ya", low)
        self.assertEqual(len(self.writes._DRAFTS), 1)

    def test_confirm_sale_without_draft_id_uses_latest(self) -> None:
        self.writes.handle_draft_sale(
            {
                "phone": "628111111111",
                "items": [{"name": "indomie", "quantity": 1, "unit_price": 3500}],
                "payment_method": "tunai",
            }
        )
        # Avoid hitting PostgREST: only test resolver
        did, draft = self.writes._find_draft(
            phone="628111111111", kind="sale", tenant_id="tenant-test", draft_id=""
        )
        self.assertTrue(did)
        self.assertIsNotNone(draft)
        self.assertEqual(draft["kind"], "sale")


class RegisterRejectTests(unittest.TestCase):
    def test_rejected_message_strips_unsafe_reason(self) -> None:
        path = PIPE_ROOT / "register.py"
        # Load register with sibling user_safe
        pkg = types.ModuleType("kasir_pipe")
        pkg.__path__ = [str(PIPE_ROOT)]
        sys.modules["kasir_pipe"] = pkg
        us_spec = importlib.util.spec_from_file_location(
            "kasir_pipe.user_safe", PIPE_ROOT / "user_safe.py"
        )
        us = importlib.util.module_from_spec(us_spec)
        sys.modules["kasir_pipe.user_safe"] = us
        assert us_spec.loader
        us_spec.loader.exec_module(us)
        reg_spec = importlib.util.spec_from_file_location(
            "kasir_pipe.register", path
        )
        reg = importlib.util.module_from_spec(reg_spec)
        sys.modules["kasir_pipe.register"] = reg
        assert reg_spec.loader
        reg_spec.loader.exec_module(reg)
        msg = reg.msg_status_rejected("HTTP 500 https://x/rest/v1/y")
        self.assertNotIn("HTTP", msg)
        self.assertNotIn("https", msg.lower())
        self.assertIn("ditolak", msg.lower())


if __name__ == "__main__":
    unittest.main()
