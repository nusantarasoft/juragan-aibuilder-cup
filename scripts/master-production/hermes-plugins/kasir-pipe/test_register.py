"""Unit tests for UMKM WA registration wizard state machine."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("kasir_register", ROOT / "register.py")
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
sys.modules["kasir_register"] = mod
spec.loader.exec_module(mod)


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

    def test_status_pending(self):
        row = {"status": "pending", "store_name": "Warung X"}
        reply, patch = mod.advance_wizard(text="STATUS", phone="62811", row=row)
        self.assertIn("menunggu", reply.lower())
        self.assertIsNone(patch)

    def test_batal_rejects_open(self):
        row = {"status": "draft", "wizard_step": mod.STEP_ASK_STORE}
        reply, patch = mod.advance_wizard(text="batal", phone="62811", row=row)
        self.assertEqual(patch["status"], "rejected")
        self.assertIn("dibatalkan", reply.lower())

    def test_slugify_tenant(self):
        self.assertEqual(mod.slugify_tenant("Warung Bu Ani!"), "umkm-warung-bu-ani")


if __name__ == "__main__":
    unittest.main()
