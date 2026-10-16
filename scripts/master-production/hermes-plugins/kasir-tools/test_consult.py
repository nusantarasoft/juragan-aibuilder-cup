"""Unit tests for kasir_consult (flag OFF / Nest HTTP / errors)."""

from __future__ import annotations

import importlib.util
import io
import json
import os
import sys
import types
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent


def _load_consult():
    pkg = types.ModuleType("kasir_tools")
    pkg.__path__ = [str(ROOT)]
    sys.modules["kasir_tools"] = pkg

    us_spec = importlib.util.spec_from_file_location(
        "kasir_tools.user_safe", ROOT / "user_safe.py"
    )
    us = importlib.util.module_from_spec(us_spec)
    assert us_spec.loader
    sys.modules["kasir_tools.user_safe"] = us
    us_spec.loader.exec_module(us)

    spec = importlib.util.spec_from_file_location(
        "kasir_tools.consult", ROOT / "consult.py"
    )
    mod = importlib.util.module_from_spec(spec)
    sys.modules["kasir_tools.consult"] = mod
    assert spec.loader
    spec.loader.exec_module(mod)
    return mod


class _FakeResp:
    def __init__(self, payload: dict, status: int = 200):
        self._payload = payload
        self.status = status

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class ConsultTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mod = _load_consult()

    def setUp(self) -> None:
        self.env = {
            "KASIR_CONSULT": "0",
            "KASIR_CONSULT_KEY": "test-key",
            "KASIR_CONSULT_URL": "http://middleware:4001/internal/kasir-consult",
        }

    def test_flag_off_no_http(self) -> None:
        with mock.patch.dict(os.environ, self.env, clear=False), mock.patch.object(
            self.mod.urllib.request, "urlopen"
        ) as urlopen:
            out = self.mod.handle_consult({"question": "tanya modal"})
            self.assertEqual(out, self.mod.CONSULT_OFF_COPY)
            urlopen.assert_not_called()

    def test_ledger_question_redirect_no_http(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1"}
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request, "urlopen"
        ) as urlopen:
            out = self.mod.handle_consult({"question": "tanya cek stok indomie"})
            self.assertEqual(out, self.mod.CONSULT_LEDGER_REDIRECT_COPY)
            urlopen.assert_not_called()

    def test_flag_on_hit(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1"}
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request,
            "urlopen",
            return_value=_FakeResp({"status": "hit", "text": "Pisahkan modal usaha."}),
        ) as urlopen:
            out = self.mod.handle_consult(
                {"question": "gimana atur modal", "phone": "6281111111111"}
            )
            self.assertEqual(out, "Pisahkan modal usaha.")
            urlopen.assert_called_once()
            req = urlopen.call_args[0][0]
            self.assertEqual(req.get_method(), "POST")
            headers = {k.lower(): v for k, v in req.header_items()}
            self.assertEqual(headers.get("x-kasir-consult-key"), "test-key")
            self.assertIn(b"gimana atur modal", req.data)
            self.assertIn(b"6281111111111", req.data)
            self.assertEqual(urlopen.call_args.kwargs.get("timeout"), 60)

    def test_flag_on_nest_off_passthrough(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1"}
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request,
            "urlopen",
            return_value=_FakeResp(
                {"status": "off", "text": self.mod.CONSULT_OFF_COPY}
            ),
        ):
            out = self.mod.handle_consult({"question": "tanya"})
            self.assertEqual(out, self.mod.CONSULT_OFF_COPY)

    def test_timeout_busy(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1"}
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request,
            "urlopen",
            side_effect=TimeoutError("slow"),
        ):
            out = self.mod.handle_consult({"question": "tanya"})
            self.assertEqual(out, self.mod.CONSULT_BUSY_COPY)

    def test_http_401_busy_no_secret_leak(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1"}
        err = urllib.error.HTTPError(
            url="http://x", code=401, msg="Unauthorized", hdrs=None, fp=io.BytesIO(b"")
        )
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request, "urlopen", side_effect=err
        ):
            out = self.mod.handle_consult({"question": "tanya"})
            self.assertEqual(out, self.mod.CONSULT_BUSY_COPY)
            self.assertNotIn("test-key", out)
            self.assertNotIn("401", out)

    def test_empty_question(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1"}
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request, "urlopen"
        ) as urlopen:
            out = self.mod.handle_consult({"question": "  "})
            self.assertEqual(out, self.mod.CONSULT_EMPTY_Q)
            urlopen.assert_not_called()

    def test_missing_key_busy(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1", "KASIR_CONSULT_KEY": ""}
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request, "urlopen"
        ) as urlopen:
            out = self.mod.handle_consult({"question": "tanya modal"})
            self.assertEqual(out, self.mod.CONSULT_BUSY_COPY)
            urlopen.assert_not_called()

    def test_coach_alias_sends_mode_and_phone(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1"}
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request,
            "urlopen",
            return_value=_FakeResp({"status": "hit", "text": "Ringkasan: …"}),
        ) as urlopen:
            out = self.mod.handle_consult(
                {"question": "pendamping", "phone": "6281111111111"}
            )
            self.assertIn("Ringkasan", out)
            body = json.loads(urlopen.call_args[0][0].data.decode("utf-8"))
            self.assertEqual(body.get("mode"), "coach")
            self.assertEqual(body.get("phone"), "6281111111111")

    def test_tanya_unchanged_no_coach_mode(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1"}
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request,
            "urlopen",
            return_value=_FakeResp({"status": "hit", "text": "Modal usaha."}),
        ) as urlopen:
            self.mod.handle_consult({"question": "tanya modal usaha", "phone": "6281"})
            body = json.loads(urlopen.call_args[0][0].data.decode("utf-8"))
            self.assertNotIn("mode", body)

    def test_coach_alias_without_phone_busy(self) -> None:
        env = {**self.env, "KASIR_CONSULT": "1"}
        with mock.patch.dict(os.environ, env, clear=False), mock.patch.object(
            self.mod.urllib.request, "urlopen"
        ) as urlopen:
            out = self.mod.handle_consult({"question": "saran bisnis"})
            self.assertEqual(out, self.mod.CONSULT_BUSY_COPY)
            urlopen.assert_not_called()


if __name__ == "__main__":
    unittest.main()
