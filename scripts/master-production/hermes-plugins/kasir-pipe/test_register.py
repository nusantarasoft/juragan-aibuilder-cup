"""Unit tests for UMKM WA registration wizard state machine."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("kasir_register", ROOT / "register.py")
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
sys.modules["kasir_register"] = mod
spec.loader.exec_module(mod)


class HelpersTest(unittest.TestCase):
    def test_normalize_phone_strips_jid(self):
        self.assertEqual(mod.normalize_phone("62811:12@s.whatsapp.net"), "62811")

    def test_normalize_text(self):
        self.assertEqual(mod.normalize_text("  Hello   World "), "hello world")

    def test_intent_helpers(self):
        self.assertTrue(mod.is_daftar("mau daftar"))
        self.assertTrue(mod.is_status("cek status"))
        self.assertTrue(mod.is_batal("cancel"))
        self.assertTrue(mod.is_ya("iya"))
        self.assertTrue(mod.is_tidak("enggak"))
        self.assertFalse(mod.is_daftar("halo"))

    def test_slugify_empty_and_long(self):
        self.assertEqual(mod.slugify_tenant(""), "umkm-toko")
        self.assertEqual(mod.slugify_tenant("!!!"), "umkm-toko")
        long = "A" * 80
        out = mod.slugify_tenant(long)
        self.assertTrue(out.startswith("umkm-"))
        self.assertLessEqual(len(out), 5 + 48)

    def test_message_builders(self):
        self.assertIn("DAFTAR", mod.msg_intro())
        self.assertIn("Nama toko", mod.msg_ask_store())
        self.assertIn("Warung", mod.msg_confirm("Warung", "62811"))
        self.assertIn("STATUS", mod.msg_pending("X"))
        self.assertIn("menunggu", mod.msg_status_pending("X"))
        self.assertIn("menunggu", mod.msg_status_pending(None))
        self.assertIn("Alasan", mod.msg_status_rejected("dup"))
        self.assertNotIn("Alasan", mod.msg_status_rejected(None))
        self.assertIn("cek stok", mod.msg_status_approved("Toko"))
        self.assertIn("cek stok", mod.msg_status_approved(None))
        self.assertIn("Belum ada", mod.msg_status_none())
        self.assertIn("kedaluwarsa", mod.msg_expired())
        self.assertIn("dibatalkan", mod.msg_cancelled().lower())
        self.assertIn("DAFTAR", mod.msg_need_active())
        self.assertIn("sibuk", mod.msg_system_busy())
        self.assertIn("diaktifkan", mod.msg_approved_notify("Toko"))
        self.assertIn("ditolak", mod.msg_rejected_notify(None).lower())
        self.assertIn("ditolak: x", mod.msg_rejected_notify("x").lower())


class AdvanceWizardTest(unittest.TestCase):
    def test_intro_on_random_text(self):
        reply, patch = mod.advance_wizard(text="halo", phone="62811", row=None)
        self.assertIn("DAFTAR", reply)
        self.assertIsNone(patch)

    def test_daftar_creates_draft(self):
        reply, patch = mod.advance_wizard(text="DAFTAR", phone="62811", row=None)
        self.assertIn("Nama toko", reply)
        self.assertEqual(patch["_action"], "create")
        self.assertEqual(patch["wizard_step"], mod.STEP_ASK_STORE)

    def test_daftar_when_pending_returns_status(self):
        row = {"status": "pending", "store_name": "Toko"}
        reply, patch = mod.advance_wizard(text="DAFTAR", phone="62811", row=row)
        self.assertIn("menunggu", reply.lower())
        self.assertIsNone(patch)

    def test_daftar_when_draft_resets_store(self):
        row = {"status": "draft", "wizard_step": mod.STEP_CONFIRM, "store_name": "X"}
        reply, patch = mod.advance_wizard(text="register", phone="62811", row=row)
        self.assertEqual(patch["_action"], "update")
        self.assertIsNone(patch["store_name"])

    def test_store_name_then_ya_pending(self):
        draft = {
            "status": "draft",
            "wizard_step": mod.STEP_ASK_STORE,
            "phone": "62811",
        }
        reply, patch = mod.advance_wizard(text="Warung Bu Ani", phone="62811", row=draft)
        self.assertIn("YA", reply)
        self.assertEqual(patch["store_name"], "Warung Bu Ani")
        self.assertEqual(patch["wizard_step"], mod.STEP_CONFIRM)

        confirm = {**draft, **{k: v for k, v in patch.items() if k != "_action"}}
        reply2, patch2 = mod.advance_wizard(text="ya", phone="62811", row=confirm)
        self.assertIn("approve", reply2.lower())
        self.assertEqual(patch2["status"], "pending")

    def test_store_name_too_short_and_truncated(self):
        draft = {"status": "draft", "wizard_step": mod.STEP_ASK_STORE}
        reply, patch = mod.advance_wizard(text="A", phone="62811", row=draft)
        self.assertIn("pendek", reply.lower())
        self.assertIsNone(patch)

        long_name = "X" * 100
        reply2, patch2 = mod.advance_wizard(text=long_name, phone="62811", row=draft)
        self.assertEqual(len(patch2["store_name"]), 80)

    def test_confirm_tidak_and_reprompt(self):
        confirm = {
            "status": "draft",
            "wizard_step": mod.STEP_CONFIRM,
            "store_name": "Warung",
        }
        reply, patch = mod.advance_wizard(text="tidak", phone="62811", row=confirm)
        self.assertEqual(patch["status"], "rejected")
        self.assertIn("dibatalkan", reply.lower())

        reply2, patch2 = mod.advance_wizard(text="hmm", phone="62811", row=confirm)
        self.assertIn("YA", reply2)
        self.assertIsNone(patch2)

    def test_pending_any_text(self):
        row = {"status": "pending", "store_name": "Toko", "wizard_step": mod.STEP_DONE}
        reply, patch = mod.advance_wizard(text="apa kabar", phone="62811", row=row)
        self.assertIn("menunggu", reply.lower())
        self.assertIsNone(patch)

    def test_status_branches(self):
        self.assertIn("Belum ada", mod.advance_wizard(text="STATUS", phone="1", row=None)[0])

        pending = {"status": "pending", "store_name": "Warung X"}
        reply, patch = mod.advance_wizard(text="STATUS", phone="62811", row=pending)
        self.assertIn("menunggu", reply.lower())
        self.assertIsNone(patch)

        rej = {"status": "rejected", "reject_reason": "dup"}
        self.assertIn("Alasan", mod.advance_wizard(text="STATUS", phone="1", row=rej)[0])

        appr = {"status": "approved", "store_name": "OK"}
        self.assertIn("aktif", mod.advance_wizard(text="STATUS", phone="1", row=appr)[0].lower())

        expired = {"status": "expired", "wizard_step": mod.STEP_DONE}
        self.assertIn("kedaluwarsa", mod.advance_wizard(text="STATUS", phone="1", row=expired)[0].lower())

        draft_ask = {"status": "draft", "wizard_step": mod.STEP_ASK_STORE}
        self.assertIn("Nama toko", mod.advance_wizard(text="STATUS", phone="1", row=draft_ask)[0])

        draft_confirm = {
            "status": "draft",
            "wizard_step": mod.STEP_CONFIRM,
            "store_name": "Toko",
        }
        self.assertIn("YA", mod.advance_wizard(text="STATUS", phone="62811", row=draft_confirm)[0])

        weird = {"status": "draft", "wizard_step": "unknown"}
        self.assertIn("Belum ada", mod.advance_wizard(text="STATUS", phone="1", row=weird)[0])

    def test_batal_rejects_open(self):
        row = {"status": "draft", "wizard_step": mod.STEP_ASK_STORE}
        reply, patch = mod.advance_wizard(text="batal", phone="62811", row=row)
        self.assertEqual(patch["status"], "rejected")
        self.assertIn("dibatalkan", reply.lower())

    def test_batal_without_open_row(self):
        reply, patch = mod.advance_wizard(text="batal", phone="62811", row=None)
        self.assertIn("DAFTAR", reply)
        self.assertIsNone(patch)

    def test_unknown_step_need_active(self):
        row = {"status": "draft", "wizard_step": "weird"}
        reply, patch = mod.advance_wizard(text="halo", phone="62811", row=row)
        self.assertIn("DAFTAR", reply)
        self.assertIsNone(patch)

    def test_slugify_tenant(self):
        self.assertEqual(mod.slugify_tenant("Warung Bu Ani!"), "umkm-warung-bu-ani")

    def test_ya_pending_uses_default_store(self):
        confirm = {"status": "draft", "wizard_step": mod.STEP_CONFIRM, "store_name": "  "}
        reply, patch = mod.advance_wizard(text="yes", phone="62811", row=confirm)
        self.assertEqual(patch["status"], "pending")
        self.assertIn("Toko", reply)


class PipeBusyFallbackTest(unittest.TestCase):
    """Outer-except busy reply on kasir-pipe pre_gateway_dispatch (T1)."""

    @classmethod
    def setUpClass(cls):
        # Load package as kasir_pipe so relative imports work.
        pkg_name = "kasir_pipe_testpkg"
        if pkg_name not in sys.modules:
            pkg = type(sys)(pkg_name)
            pkg.__path__ = [str(ROOT)]
            pkg.__package__ = pkg_name
            sys.modules[pkg_name] = pkg
        init_spec = importlib.util.spec_from_file_location(
            f"{pkg_name}.__init__",
            ROOT / "__init__.py",
            submodule_search_locations=[str(ROOT)],
        )
        assert init_spec and init_spec.loader
        cls.pipe = importlib.util.module_from_spec(init_spec)
        cls.pipe.__package__ = pkg_name
        sys.modules[f"{pkg_name}.__init__"] = cls.pipe
        sys.modules[f"{pkg_name}.register"] = mod
        # Avoid pair.py / HTTP server side effects if any on full load — __init__
        # itself does not start servers at import time.
        init_spec.loader.exec_module(cls.pipe)

    def test_unexpected_error_sends_busy_and_skips(self):
        event = mock.Mock()
        event.internal = False
        gateway = mock.Mock()

        with mock.patch.object(self.pipe, "_platform_name", return_value="whatsapp"), mock.patch.object(
            self.pipe, "_platforms", return_value={"whatsapp"}
        ), mock.patch.object(
            self.pipe, "_chat_id", side_effect=["628119999@s.whatsapp.net", "628119999@s.whatsapp.net"]
        ), mock.patch.object(
            self.pipe, "_sender_allowed", side_effect=RuntimeError("boom")
        ), mock.patch.object(self.pipe, "_send_wa_text") as send:
            out = self.pipe._on_pre_gateway_dispatch(event, gateway=gateway)

        self.assertEqual(out["action"], "skip")
        self.assertIn("boom", out["reason"])
        send.assert_called_once()
        args = send.call_args[0]
        self.assertIn("sibuk", args[1].lower())

    def test_busy_send_failure_still_returns_skip(self):
        event = mock.Mock()
        event.internal = False
        gateway = mock.Mock()

        with mock.patch.object(self.pipe, "_platform_name", return_value="whatsapp"), mock.patch.object(
            self.pipe, "_platforms", return_value={"whatsapp"}
        ), mock.patch.object(
            self.pipe, "_chat_id", side_effect=RuntimeError("no chat")
        ), mock.patch.object(self.pipe, "_send_wa_text") as send:
            # First failure is in try body via _chat_id; except then calls _chat_id again
            # which also fails — busy send skipped, still skip action.
            out = self.pipe._on_pre_gateway_dispatch(event, gateway=gateway)

        self.assertEqual(out["action"], "skip")
        send.assert_not_called()


class PipeOnlyInboundTest(unittest.TestCase):
    """Allowlisted inbound must reach the agent path — never Nest webhook forward."""

    @classmethod
    def setUpClass(cls):
        pkg_name = "kasir_pipe_testpkg"
        if pkg_name not in sys.modules:
            pkg = type(sys)(pkg_name)
            pkg.__path__ = [str(ROOT)]
            pkg.__package__ = pkg_name
            sys.modules[pkg_name] = pkg
        init_spec = importlib.util.spec_from_file_location(
            f"{pkg_name}.__init__",
            ROOT / "__init__.py",
            submodule_search_locations=[str(ROOT)],
        )
        assert init_spec and init_spec.loader
        cls.pipe = importlib.util.module_from_spec(init_spec)
        cls.pipe.__package__ = pkg_name
        sys.modules[f"{pkg_name}.__init__"] = cls.pipe
        sys.modules[f"{pkg_name}.register"] = mod
        init_spec.loader.exec_module(cls.pipe)

    def test_dead_webhook_helpers_removed(self):
        for name in (
            "_post_signed",
            "_webhook_body",
            "_webhook_url",
            "_hmac_key",
            "_selected_button_id",
        ):
            self.assertFalse(hasattr(self.pipe, name), name)

    def test_allowlist_ok_returns_none_stamps_and_does_not_skip(self):
        event = mock.Mock()
        event.internal = False
        gateway = mock.Mock()
        chat = "628111111111@s.whatsapp.net"

        with mock.patch.object(self.pipe, "_platform_name", return_value="whatsapp"), mock.patch.object(
            self.pipe, "_platforms", return_value={"whatsapp"}
        ), mock.patch.object(self.pipe, "_chat_id", return_value=chat), mock.patch.object(
            self.pipe, "_sender_allowed", return_value=True
        ), mock.patch.object(
            self.pipe, "_resolve_sender_phone", return_value="628111111111"
        ), mock.patch.object(self.pipe, "_stamp_active_sender") as stamp, mock.patch.object(
            self.pipe.urllib.request, "urlopen"
        ) as urlopen:
            out = self.pipe._on_pre_gateway_dispatch(event, gateway=gateway)

        self.assertIsNone(out)
        stamp.assert_called_once()
        urlopen.assert_not_called()


if __name__ == "__main__":
    unittest.main()
