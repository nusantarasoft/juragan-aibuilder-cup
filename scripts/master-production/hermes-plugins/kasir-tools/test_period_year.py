"""Unit tests for year YTD period + out-of-YTD refuse + tenant REST gate."""
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


def _load():
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
    spec = importlib.util.spec_from_file_location(
        "kasir_tools.init_year", ROOT / "__init__.py"
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules["kasir_tools.init_year"] = mod
    spec.loader.exec_module(mod)
    return mod


class PeriodYearTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.m = _load()

    def test_year_ytd_parity_fixture_2026_03_15(self) -> None:
        # Shared fixture with Nest studio-umkm-ops.util.spec.ts
        fixed = datetime(2026, 3, 15, 12, 0, 0, tzinfo=JAKARTA)
        with mock.patch.object(self.m, "_jakarta_today", return_value=fixed):
            label, frm, to = self.m._period_range("year")
        self.assertEqual(label, "tahun ini")
        self.assertEqual(frm, "2026-01-01T00:00:00+07:00")
        self.assertEqual(to, "2026-03-15T23:59:59.999+07:00")

    def test_normalize_year_aliases(self) -> None:
        self.assertEqual(self.m._normalize_period("tahun ini", "today"), "year")
        self.assertEqual(self.m._normalize_period("year", "today"), "year")
        self.assertEqual(self.m._normalize_period("ytd", "today"), "year")

    def test_out_of_ytd_refuse(self) -> None:
        with self.assertRaises(self.m._OutOfYtdPeriod):
            self.m._normalize_period("tahun lalu", "today")
        with self.assertRaises(self.m._OutOfYtdPeriod):
            self.m._normalize_period("2024", "today")
        self.assertIn("tahun ini", self.m._out_of_ytd_refuse("tahun lalu") or "")

    def test_rest_refuses_ledger_without_tenant(self) -> None:
        with mock.patch.object(self.m, "_supabase_url", return_value="http://x"):
            with mock.patch.object(self.m, "_service_key", return_value="key"):
                with self.assertRaises(RuntimeError) as ctx:
                    self.m._rest("ecom_orders", {"select": "id", "limit": "1"})
        self.assertIn("tenant_id", str(ctx.exception))

    def test_year_paginate_queries_include_tenant(self) -> None:
        calls: list[dict] = []

        def fake_rest(path, query=None, **kwargs):
            calls.append({"path": path, "query": dict(query or {})})
            # one short page → done
            return [{"id": "1", "total_amount": 1000, "status": "paid"}]

        with mock.patch.object(self.m, "_rest", side_effect=fake_rest):
            rows = self.m._fetch_orders_year_paginated(
                "tenant-a",
                "2026-01-01T00:00:00+07:00",
                "2026-03-15T23:59:59.999+07:00",
            )
        self.assertEqual(len(rows), 1)
        self.assertEqual(calls[0]["query"].get("tenant_id"), "eq.tenant-a")
        self.assertEqual(calls[0]["query"].get("limit"), "200")
        self.assertEqual(calls[0]["query"].get("offset"), "0")

    def test_year_soft_cap_raises(self) -> None:
        def always_full(path, query=None, **kwargs):
            return [{"id": str(i), "status": "paid"} for i in range(200)]

        with mock.patch.object(self.m, "_rest", side_effect=always_full):
            with mock.patch.object(self.m, "_YEAR_MAX_PAGES", 2):
                with self.assertRaises(self.m._ReportCapExceeded):
                    self.m._fetch_orders_year_paginated(
                        "t",
                        "2026-01-01T00:00:00+07:00",
                        "2026-03-15T23:59:59.999+07:00",
                    )

    def test_handle_report_cap_message(self) -> None:
        with mock.patch.object(
            self.m, "_with_tenant", return_value=(("6281", "t1"), None)
        ):
            with mock.patch.object(
                self.m,
                "_normalize_period",
                return_value="year",
            ):
                with mock.patch.object(
                    self.m,
                    "_combined_report",
                    side_effect=self.m._ReportCapExceeded("max_pages"),
                ):
                    out = self.m._handle_report({"period": "year"})
        self.assertIn("bulan ini", out.lower())
        self.assertNotIn("kasir_", out.lower())


if __name__ == "__main__":
    unittest.main()
