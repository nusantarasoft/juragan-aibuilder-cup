"""Unit tests for multi-chat sender stamp (no global race)."""

from __future__ import annotations

import importlib.util
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def _load_identity(tmpdir: str):
    os.environ["KASIR_IDENTITY_DIR"] = tmpdir
    # Force reload
    for key in list(sys.modules):
        if key == "kasir_tools.identity" or key.endswith(".identity"):
            del sys.modules[key]
    spec = importlib.util.spec_from_file_location(
        "kasir_tools.identity", ROOT / "identity.py"
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(mod)
    return mod


class IdentityStampTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self.id = _load_identity(self._tmpdir.name)

    def tearDown(self) -> None:
        self._tmpdir.cleanup()
        os.environ.pop("KASIR_IDENTITY_DIR", None)

    def test_concurrent_chats_do_not_overwrite(self) -> None:
        self.id.remember_sender(chat_id="628111111111@s.whatsapp.net", phone="628111111111")
        self.id.remember_sender(chat_id="628222222222@s.whatsapp.net", phone="628222222222")
        self.assertEqual(
            self.id.read_sender(chat_id="628111111111@s.whatsapp.net"),
            "628111111111",
        )
        self.assertEqual(
            self.id.read_sender(chat_id="628222222222@s.whatsapp.net"),
            "628222222222",
        )

    def test_ambiguous_without_hint_returns_empty(self) -> None:
        self.id.remember_sender(chat_id="628111111111@s.whatsapp.net", phone="628111111111")
        self.id.remember_sender(chat_id="628222222222@s.whatsapp.net", phone="628222222222")
        self.assertEqual(self.id.read_sender(), "")

    def test_single_fresh_ok_without_hint(self) -> None:
        self.id.remember_sender(chat_id="628111111111@s.whatsapp.net", phone="628111111111")
        self.assertEqual(self.id.read_sender(), "628111111111")

    def test_stale_ttl(self) -> None:
        self.id.remember_sender(chat_id="628111111111@s.whatsapp.net", phone="628111111111")
        data = self.id._load()
        key = self.id._chat_key("628111111111@s.whatsapp.net")
        data["by_chat"][key]["ts"] = time.time() - 9999
        data["by_chat"]["628111111111"]["ts"] = time.time() - 9999
        self.id._save(data)
        self.assertEqual(self.id.read_sender(chat_id="628111111111@s.whatsapp.net"), "")

    def test_v1_migrate(self) -> None:
        path = Path(self._tmpdir.name) / "kasir_active_sender.json"
        path.write_text(
            '{"phone":"628333333333","chat":"628333333333","chat_raw":'
            '"628333333333@s.whatsapp.net","ts":%s}' % time.time(),
            encoding="utf-8",
        )
        # reload module against same dir
        mod = _load_identity(self._tmpdir.name)
        self.assertEqual(
            mod.read_sender(chat_id="628333333333@s.whatsapp.net"),
            "628333333333",
        )


if __name__ == "__main__":
    unittest.main()
