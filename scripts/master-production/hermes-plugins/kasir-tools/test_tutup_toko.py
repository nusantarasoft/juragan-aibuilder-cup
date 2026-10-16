"""Unit tests for tutup-toko closing recap compose."""

from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent


def _load_tools():
    pkg_name = "kasir_tools_tutup"
    pkg = types.ModuleType(pkg_name)
    pkg.__path__ = [str(ROOT)]
    sys.modules[pkg_name] = pkg

    for sub in ("user_safe", "writes", "identity"):
        sub_spec = importlib.util.spec_from_file_location(
            f"{pkg_name}.{sub}", ROOT / f"{sub}.py"
        )
        assert sub_spec and sub_spec.loader
        sub_mod = importlib.util.module_from_spec(sub_spec)
        sub_mod.__package__ = pkg_name
        sys.modules[f"{pkg_name}.{sub}"] = sub_mod
        sub_spec.loader.exec_module(sub_mod)

    init_spec = importlib.util.spec_from_file_location(
        f"{pkg_name}.__init__",
        ROOT / "__init__.py",
        submodule_search_locations=[str(ROOT)],
    )
    assert init_spec and init_spec.loader
    mod = importlib.util.module_from_spec(init_spec)
    mod.__package__ = pkg_name
    sys.modules[f"{pkg_name}.__init__"] = mod
    init_spec.loader.exec_module(mod)
    return mod


class TutupTokoFormatTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = _load_tools()

    def test_format_tutup_recap_joins_sections(self):
        out = self.mod._format_tutup_recap(
            "📊 *Laporan hari ini*\n\nPenjualan: *1* order",
            "⚠️ *Stok menipis*\n\n1. *indomie* — sisa *3*",
        )
        self.assertIn("Laporan hari ini", out)
        self.assertIn("Stok menipis", out)
        self.assertIn("Toko ditutup", out)
        self.assertIn("jual", out.lower())

    def test_handle_tutup_uses_today_closing_and_low_stock(self):
        with mock.patch.object(
            self.mod, "_with_tenant", return_value=(("62811", "tenant-1"), None)
        ), mock.patch.object(
            self.mod, "_combined_report", return_value="REPORT"
        ) as report, mock.patch.object(
            self.mod, "_low_stock_rows", return_value=[{"name": "x", "available": 1}]
        ), mock.patch.object(
            self.mod, "_format_low_stock", return_value="LOW"
        ):
            out = self.mod._handle_tutup_toko({})
        report.assert_called_once_with("tenant-1", "today", closing=True)
        self.assertEqual(out, self.mod._format_tutup_recap("REPORT", "LOW"))
        self.assertIn("Toko ditutup", out)


if __name__ == "__main__":
    unittest.main()
