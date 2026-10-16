"""Unit tests for persisted kasir sale/purchase drafts (volume mirror)."""

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


class DraftPersistTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self.path = Path(self._tmpdir.name) / "kasir_drafts.json"
        os.environ["KASIR_DRAFTS_PATH"] = str(self.path)
        # Drop cached module so env path is re-read with fresh state
        for key in list(sys.modules):
            if key == "kasir_tools" or key.startswith("kasir_tools."):
                del sys.modules[key]
        self.w = _load_writes()
        self.w._DRAFTS.clear()
        self.w._DRAFTS_LOADED = False

    def tearDown(self) -> None:
        self._tmpdir.cleanup()
        os.environ.pop("KASIR_DRAFTS_PATH", None)

    def test_set_draft_writes_file(self) -> None:
        self.w._set_draft(
            "abc123",
            {
                "kind": "sale",
                "created_at": time.time(),
                "phone": "628111",
                "tenant_id": "t1",
                "items": [],
                "total": 0,
            },
        )
        self.assertTrue(self.path.is_file())
        data = json.loads(self.path.read_text(encoding="utf-8"))
        self.assertIn("abc123", data)
        self.assertEqual(data["abc123"]["kind"], "sale")

    def test_reload_finds_latest_draft(self) -> None:
        now = time.time()
        self.w._set_draft(
            "old",
            {
                "kind": "sale",
                "created_at": now - 10,
                "phone": "628111",
                "tenant_id": "t1",
                "items": [],
                "total": 1,
            },
        )
        self.w._set_draft(
            "new",
            {
                "kind": "sale",
                "created_at": now,
                "phone": "628111",
                "tenant_id": "t1",
                "items": [],
                "total": 2,
            },
        )
        for key in list(sys.modules):
            if key == "kasir_tools" or key.startswith("kasir_tools."):
                del sys.modules[key]
        w2 = _load_writes()
        w2._DRAFTS.clear()
        w2._DRAFTS_LOADED = False
        did, draft = w2._find_draft(
            phone="628111", kind="sale", tenant_id="t1", draft_id=""
        )
        self.assertEqual(did, "new")
        assert draft is not None
        self.assertEqual(draft["total"], 2)

    def test_pop_removes_from_disk(self) -> None:
        self.w._set_draft(
            "x1",
            {
                "kind": "purchase",
                "created_at": time.time(),
                "phone": "628111",
                "tenant_id": "t1",
                "items": [],
                "total": 0,
            },
        )
        self.w._pop_draft("x1")
        data = json.loads(self.path.read_text(encoding="utf-8"))
        self.assertNotIn("x1", data)

    def test_purge_expired_persists(self) -> None:
        self.w._set_draft(
            "dead",
            {
                "kind": "sale",
                "created_at": time.time() - (20 * 60),
                "phone": "628111",
                "tenant_id": "t1",
                "items": [],
                "total": 0,
            },
        )
        self.w._purge_expired()
        data = json.loads(self.path.read_text(encoding="utf-8"))
        self.assertNotIn("dead", data)


if __name__ == "__main__":
    unittest.main()
