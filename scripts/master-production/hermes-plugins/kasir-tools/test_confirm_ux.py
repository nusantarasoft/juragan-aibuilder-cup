"""Unit tests for confirm poll + last-sale (satu lagi)."""

from __future__ import annotations

import importlib.util
import json
import os
import sys
import tempfile
import time
import types
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent


def _load_writes():
    pkg = types.ModuleType("kasir_tools")
    pkg.__path__ = [str(ROOT)]
    sys.modules["kasir_tools"] = pkg
    us_spec = importlib.util.spec_from_file_location(
        "kasir_tools.user_safe", ROOT / "user_safe.py"
    )
    us = importlib.util.module_from_spec(us_spec)
    assert us_spec and us_spec.loader
    sys.modules["kasir_tools.user_safe"] = us
    us_spec.loader.exec_module(us)
    spec = importlib.util.spec_from_file_location("kasir_tools.writes", ROOT / "writes.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules["kasir_tools.writes"] = mod
    assert spec and spec.loader
    spec.loader.exec_module(mod)
    return mod


class ConfirmPollTests(unittest.TestCase):
    def setUp(self) -> None:
        for key in list(sys.modules):
            if key == "kasir_tools" or key.startswith("kasir_tools."):
                del sys.modules[key]
        self.w = _load_writes()

    def test_send_confirm_poll_success(self) -> None:
        class Resp:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def read(self):
                return b"{}"

        with mock.patch.object(self.w.urllib.request, "urlopen", return_value=Resp()) as uo:
            ok = self.w._send_confirm_poll("628111111111", "Konfirmasi penjualan")
        self.assertTrue(ok)
        req = uo.call_args[0][0]
        self.assertIn("/send-poll", req.full_url)
        body = json.loads(req.data.decode())
        self.assertEqual(body["question"], "Konfirmasi penjualan")
        self.assertEqual(body["options"], ["Ya, simpan", "Batal"])
        self.assertEqual(body.get("selectableCount"), 1)
        self.assertNotIn("draft_id", json.dumps(body))

    def test_send_confirm_poll_fail_open(self) -> None:
        with mock.patch.object(
            self.w.urllib.request, "urlopen", side_effect=OSError("down")
        ):
            self.assertFalse(self.w._send_confirm_poll("628111111111", "x"))

    def test_footer_variants(self) -> None:
        self.assertIn("Ya, simpan", self.w._draft_confirm_footer(poll_sent=True))
        self.assertIn("ya", self.w._draft_confirm_footer(poll_sent=False).lower())


class LastSaleTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        os.environ["KASIR_LAST_SALE_PATH"] = str(
            Path(self._tmpdir.name) / "kasir_last_sale.json"
        )
        for key in list(sys.modules):
            if key == "kasir_tools" or key.startswith("kasir_tools."):
                del sys.modules[key]
        self.w = _load_writes()

    def tearDown(self) -> None:
        self._tmpdir.cleanup()
        os.environ.pop("KASIR_LAST_SALE_PATH", None)

    def test_remember_and_get(self) -> None:
        self.w._remember_last_sale(
            phone="628111",
            tenant_id="t1",
            items=[{"name": "indomie", "quantity": 2, "unit_price": 3500}],
        )
        row = self.w._get_last_sale(phone="628111", tenant_id="t1")
        assert row is not None
        self.assertEqual(row["items"][0]["name"], "indomie")

    def test_stale_ttl(self) -> None:
        self.w._remember_last_sale(
            phone="628111",
            tenant_id="t1",
            items=[{"name": "teh", "quantity": 1, "unit_price": 2500}],
        )
        data = self.w._load_last_sales()
        key = self.w._last_sale_key("628111", "t1")
        data[key]["updated_at"] = time.time() - (25 * 60 * 60)
        self.w._save_last_sales(data)
        self.assertIsNone(self.w._get_last_sale(phone="628111", tenant_id="t1"))

    def test_repeat_calls_draft(self) -> None:
        self.w._remember_last_sale(
            phone="628111",
            tenant_id="t1",
            items=[{"name": "teh", "quantity": 1, "unit_price": 2500}],
        )

        def fake_tenant(params, kwargs):
            return ("628111", "t1"), None

        self.w.bind(
            with_tenant=fake_tenant,
            active_products=lambda _t: [],
            idr=lambda x: f"Rp {x}",
        )
        with mock.patch.object(
            self.w, "handle_draft_sale", return_value="DRAFT_OK"
        ) as draft:
            out = self.w.handle_repeat_last_sale({"phone": "628111"})
        self.assertEqual(out, "DRAFT_OK")
        args = draft.call_args[0][0]
        self.assertEqual(args["items"][0]["name"], "teh")


if __name__ == "__main__":
    unittest.main()
