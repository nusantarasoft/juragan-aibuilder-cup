"""Unit tests: period compiler + uncapped parity + RPC path (no live DB)."""
from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
JAKARTA = ZoneInfo("Asia/Jakarta")


def _load_period():
    spec = importlib.util.spec_from_file_location("kasir_tools.period", ROOT / "period.py")
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules["kasir_tools.period"] = mod
    spec.loader.exec_module(mod)
    return mod


def _load_legacy():
    spec = importlib.util.spec_from_file_location(
        "kasir_tools.legacy_aggregate", ROOT / "legacy_aggregate.py"
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules["kasir_tools.legacy_aggregate"] = mod
    spec.loader.exec_module(mod)
    return mod


def _load_init():
    pkg = types.ModuleType("kasir_tools")
    pkg.__path__ = [str(ROOT)]
    sys.modules["kasir_tools"] = pkg
    us = importlib.util.spec_from_file_location(
        "kasir_tools.user_safe", ROOT / "user_safe.py"
    )
    assert us and us.loader
    us_mod = importlib.util.module_from_spec(us)
    sys.modules["kasir_tools.user_safe"] = us_mod
    us.loader.exec_module(us_mod)
    _load_period()
    spec = importlib.util.spec_from_file_location(
        "kasir_tools.init_rpc", ROOT / "__init__.py"
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules["kasir_tools.init_rpc"] = mod
    spec.loader.exec_module(mod)
    return mod


class PeriodCompilerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.p = _load_period()

    def test_year_ytd(self) -> None:
        now = datetime(2026, 10, 6, 12, 0, tzinfo=JAKARTA)
        label, frm, to = self.p.period_range("year", now=now)
        self.assertEqual(label, "tahun ini")
        self.assertTrue(frm.startswith("2026-01-01"))
        self.assertTrue(to.startswith("2026-10-06"))

    def test_last_year(self) -> None:
        now = datetime(2026, 10, 6, 12, 0, tzinfo=JAKARTA)
        label, frm, to = self.p.period_range("last_year", now=now)
        self.assertEqual(label, "tahun lalu")
        self.assertTrue(frm.startswith("2025-01-01"))
        self.assertTrue(to.startswith("2025-12-31"))

    def test_last_3_months_from_day1(self) -> None:
        now = datetime(2026, 10, 5, 12, 0, tzinfo=JAKARTA)
        label, frm, to = self.p.period_range("last_3_months", now=now)
        self.assertEqual(label, "3 bulan terakhir")
        self.assertTrue(frm.startswith("2026-08-01"))
        self.assertTrue(to.startswith("2026-10-05"))

    def test_quarter_current(self) -> None:
        now = datetime(2026, 10, 5, 12, 0, tzinfo=JAKARTA)
        label, frm, to = self.p.period_range("quarter", now=now)
        self.assertIn("kuartal 4", label)
        self.assertTrue(frm.startswith("2026-10-01"))
        self.assertTrue(to.startswith("2026-10-05"))

    def test_compile_aliases(self) -> None:
        self.assertEqual(self.p.compile_period("tahun lalu"), "last_year")
        self.assertEqual(self.p.compile_period("3 bulan terakhir"), "last_3_months")
        self.assertEqual(self.p.compile_period(None, "today"), "today")

    def test_refuse_year_number(self) -> None:
        with self.assertRaises(self.p.PeriodRefuse):
            self.p.compile_period("2024")

    def test_refuse_free_range(self) -> None:
        with self.assertRaises(self.p.PeriodRefuse):
            self.p.compile_period("dari 1 januari sampai 15 maret")

    def test_ambiguous_triwulan(self) -> None:
        with self.assertRaises(self.p.PeriodAmbiguous):
            self.p.compile_period("triwulan")

    def test_unknown_not_silent_today(self) -> None:
        with self.assertRaises(self.p.PeriodRefuse):
            self.p.compile_period("kemarin lusa")


class LegacyAggregateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.legacy = _load_legacy()

    def test_uncapped_over_500(self) -> None:
        orders = [
            {
                "id": f"o{i}",
                "total_amount": 1000,
                "status": "completed",
            }
            for i in range(600)
        ]
        orders[0]["status"] = "cancelled"
        items = [
            {
                "order_id": f"o{i}",
                "item_name": "Teh",
                "quantity": 1,
                "subtotal": 1000,
                "status": "ok",
            }
            for i in range(1, 600)
        ]
        purchases = [{"total_cost": 50000, "status": "completed"}]
        out = self.legacy.aggregate_period(orders, items, purchases, top_n=5)
        self.assertEqual(out["order_count"], 599)
        self.assertEqual(out["revenue"], 599_000)
        self.assertEqual(out["purchase_total"], 50000)
        self.assertEqual(out["top_products"][0]["name"], "Teh")
        self.assertEqual(out["top_products"][0]["units"], 599)


class RpcPathTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.mod = _load_init()

    def test_combined_report_uses_rpc(self) -> None:
        payload = {
            "order_count": 2,
            "revenue": 15000,
            "purchase_total": 5000,
            "top_products": [
                {"name": "Kopi", "units": 3, "revenue": 15000},
            ],
        }
        with mock.patch.object(self.mod, "_period_rpc_enabled", return_value=True):
            with mock.patch.object(self.mod, "_rpc", return_value=payload) as rpc:
                text = self.mod._combined_report("tenant-a", "month")
        rpc.assert_called_once()
        args = rpc.call_args[0]
        self.assertEqual(args[0], "kasir_period_report")
        self.assertEqual(args[1]["p_tenant_id"], "tenant-a")
        self.assertIn("Kopi", text)
        self.assertIn("Rp 15.000", text)

    def test_kill_switch_off(self) -> None:
        with mock.patch.object(self.mod, "_period_rpc_enabled", return_value=False):
            with self.assertRaises(self.mod._ReportFetchError):
                self.mod._fetch_period_payload("t", "today")

    def test_strip_phone_on_report(self) -> None:
        params = {"period": "today", "phone": "628111111111"}
        stripped = self.mod._strip_tool_phone(params)
        self.assertNotIn("phone", stripped)
        self.assertEqual(stripped.get("period"), "today")

    def test_schema_missing_keys_fail_closed(self) -> None:
        with mock.patch.object(self.mod, "_period_rpc_enabled", return_value=True):
            with mock.patch.object(self.mod, "_rpc", return_value={"order_count": 1}):
                with self.assertRaises(self.mod._ReportFetchError):
                    self.mod._fetch_period_payload("t", "today")


if __name__ == "__main__":
    unittest.main()
