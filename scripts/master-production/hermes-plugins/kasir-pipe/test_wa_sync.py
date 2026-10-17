"""Unit tests for wa_sync handoff cache + turn URL defaults."""

from __future__ import annotations

import os
import unittest
from unittest import mock

import importlib.util
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "kasir_pipe_wa_sync",
    Path(__file__).resolve().with_name("wa_sync.py"),
)
assert _spec and _spec.loader
wa_sync = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(wa_sync)


class WaSyncTests(unittest.TestCase):
    def test_handoff_active_uses_cache(self) -> None:
        wa_sync._HANDOFF_CACHE = (0.0, {})
        with mock.patch.dict(
            os.environ,
            {"KASIR_CONSULT_KEY": "k", "KASIR_WA_HANDOFF_CACHE_SEC": "60"},
            clear=False,
        ), mock.patch.object(wa_sync, "_get_handoff", return_value=(True, None)) as gh:
            self.assertTrue(wa_sync.handoff_active("6281234567890"))
            self.assertTrue(wa_sync.handoff_active("6281234567890"))
            gh.assert_called_once()

    def test_turn_url_default(self) -> None:
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("KASIR_WA_TURN_URL", None)
            self.assertIn("/internal/wa-turn", wa_sync._turn_url())


if __name__ == "__main__":
    unittest.main()
