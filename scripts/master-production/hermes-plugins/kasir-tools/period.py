"""BSS period compiler + report formatting (Hermes WA).

Presets → Asia/Jakarta from/to. Keep Nest ``periodRange`` in sync.
CEO+eng plan 2026-10-06: enum presets only; free ranges / year numbers refuse.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

_JAKARTA = timezone(timedelta(hours=7))

PERIOD_PRESETS = (
    "today",
    "week",
    "month",
    "year",
    "quarter",
    "quarter_last",
    "last_3_months",
    "last_year",
)

_ALIASES: dict[str, str] = {
    "today": "today",
    "hari": "today",
    "hari ini": "today",
    "week": "week",
    "minggu": "week",
    "minggu ini": "week",
    "month": "month",
    "bulan": "month",
    "bulan ini": "month",
    "year": "year",
    "tahun": "year",
    "tahun ini": "year",
    "this year": "year",
    "ytd": "year",
    "quarter": "quarter",
    "kuartal": "quarter",
    "kuartal ini": "quarter",
    "quarter_last": "quarter_last",
    "kuartal lalu": "quarter_last",
    "kuartal sebelumnya": "quarter_last",
    "last_3_months": "last_3_months",
    "3 bulan": "last_3_months",
    "3 bulan terakhir": "last_3_months",
    "tiga bulan terakhir": "last_3_months",
    "last_year": "last_year",
    "tahun lalu": "last_year",
    "last year": "last_year",
}

UNSUPPORTED_MSG = (
    "Periode itu belum bisa dipakai di chat. "
    "Coba: *hari ini*, *minggu ini*, *bulan ini*, *3 bulan terakhir*, "
    "*kuartal ini*, *kuartal lalu*, *tahun ini*, atau *tahun lalu*."
)
_UNSUPPORTED_MSG = UNSUPPORTED_MSG

_YEAR_NUMBER_MSG = (
    "Tahun angka (mis. *2024*) belum didukung. "
    "Kalau mau tahun sebelumnya, ketik *laporan tahun lalu*. "
    "Atau *laporan tahun ini* / *bulan ini*."
)

_FREE_RANGE_MSG = (
    "Rentang tanggal bebas belum didukung. "
    "Pakai preset: *3 bulan terakhir*, *kuartal ini*, *tahun ini*, atau *bulan ini*."
)

_AMBIGUOUS_TRIWULAN_MSG = (
    "Maksudnya *kuartal* kalender (Q1–Q4) atau *3 bulan terakhir*? "
    "Ketik *laporan kuartal ini* atau *laporan 3 bulan terakhir*."
)

_RPC_OFF_MSG = (
    "Laporan periode sementara tidak bisa diambil. "
    "Coba lagi sebentar, atau hubungi admin kalau masih gagal."
)


class PeriodRefuse(Exception):
    """User-safe soft-refuse for unsupported period phrases."""


class PeriodAmbiguous(Exception):
    """Ask user to pick between kuartal vs rolling 3 months."""


def jakarta_now(now: datetime | None = None) -> datetime:
    if now is None:
        return datetime.now(_JAKARTA)
    if now.tzinfo is None:
        return now.replace(tzinfo=_JAKARTA)
    return now.astimezone(_JAKARTA)


def _bounds(day: str) -> tuple[str, str]:
    return f"{day}T00:00:00+07:00", f"{day}T23:59:59.999+07:00"


def _quarter_start_month(month: int) -> int:
    return ((month - 1) // 3) * 3 + 1


def period_range(
    period: str, now: datetime | None = None
) -> tuple[str, str, str]:
    """Return (label, from_iso, to_iso) Asia/Jakarta inclusive."""
    now = jakarta_now(now)
    today = now.strftime("%Y-%m-%d")
    y, m = now.year, now.month

    if period == "month":
        start = now.replace(day=1).strftime("%Y-%m-%d")
        if m == 12:
            nxt = now.replace(year=y + 1, month=1, day=1)
        else:
            nxt = now.replace(month=m + 1, day=1)
        end = (nxt - timedelta(days=1)).strftime("%Y-%m-%d")
        frm, _ = _bounds(start)
        _, to = _bounds(end)
        return "bulan ini", frm, to

    if period == "week":
        dow = now.weekday()
        start_dt = now - timedelta(days=dow)
        end_dt = start_dt + timedelta(days=6)
        start = start_dt.strftime("%Y-%m-%d")
        end = end_dt.strftime("%Y-%m-%d")
        frm, _ = _bounds(start)
        _, to = _bounds(end)
        return "minggu ini", frm, to

    if period == "year":
        start = now.replace(month=1, day=1).strftime("%Y-%m-%d")
        frm, _ = _bounds(start)
        _, to = _bounds(today)
        return "tahun ini", frm, to

    if period == "last_year":
        start = f"{y - 1}-01-01"
        end = f"{y - 1}-12-31"
        frm, _ = _bounds(start)
        _, to = _bounds(end)
        return "tahun lalu", frm, to

    if period == "quarter":
        qm = _quarter_start_month(m)
        start = now.replace(month=qm, day=1).strftime("%Y-%m-%d")
        qn = (qm - 1) // 3 + 1
        frm, _ = _bounds(start)
        _, to = _bounds(today)
        return f"kuartal {qn} {y}", frm, to

    if period == "quarter_last":
        qm = _quarter_start_month(m)
        if qm == 1:
            py, pqm = y - 1, 10
        else:
            py, pqm = y, qm - 3
        start_dt = datetime(py, pqm, 1, tzinfo=_JAKARTA)
        if pqm == 10:
            end_dt = datetime(py, 12, 31, tzinfo=_JAKARTA)
        else:
            end_dt = datetime(py, pqm + 3, 1, tzinfo=_JAKARTA) - timedelta(days=1)
        start = start_dt.strftime("%Y-%m-%d")
        end = end_dt.strftime("%Y-%m-%d")
        qn = (pqm - 1) // 3 + 1
        frm, _ = _bounds(start)
        _, to = _bounds(end)
        return f"kuartal {qn} {py}", frm, to

    if period == "last_3_months":
        # From day-1 of (current_month - 2) through today (CEO D14 A).
        month_idx = y * 12 + (m - 1) - 2
        sy, sm = divmod(month_idx, 12)
        sm += 1
        start = datetime(sy, sm, 1, tzinfo=_JAKARTA).strftime("%Y-%m-%d")
        frm, _ = _bounds(start)
        _, to = _bounds(today)
        return "3 bulan terakhir", frm, to

    # today
    frm, to = _bounds(today)
    return "hari ini", frm, to


def compile_period(raw: str | None, default: str = "today") -> str:
    """Map tool/user period string → preset. Never silent-map garbage to default."""
    if default not in PERIOD_PRESETS:
        default = "today"
    if raw is None or str(raw).strip() == "":
        return default
    p = str(raw).strip().lower()

    if re.search(r"\bdari\b|\bsampai\b|\bhingga\b|\bs/d\b", p):
        raise PeriodRefuse(_FREE_RANGE_MSG)
    if re.search(r"\btriwulan\b", p) and "kuartal" not in p:
        raise PeriodAmbiguous(_AMBIGUOUS_TRIWULAN_MSG)
    if re.search(r"\b20\d{2}\b", p):
        raise PeriodRefuse(_YEAR_NUMBER_MSG)

    if p in _ALIASES:
        return _ALIASES[p]
    if p in PERIOD_PRESETS:
        return p

    raise PeriodRefuse(_UNSUPPORTED_MSG)


def validate_report_payload(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ValueError("rpc payload not object")
    for key in ("order_count", "revenue", "purchase_total", "top_products"):
        if key not in data:
            raise ValueError(f"rpc missing {key}")
    tops = data.get("top_products")
    if tops is None:
        tops = []
    if not isinstance(tops, list):
        raise ValueError("top_products not list")
    ranked: list[dict[str, Any]] = []
    for row in tops:
        if not isinstance(row, dict):
            continue
        ranked.append(
            {
                "name": str(row.get("name") or "Produk").strip() or "Produk",
                "units": float(row.get("units") or 0),
                "revenue": float(row.get("revenue") or 0),
            }
        )
    return {
        "order_count": int(data.get("order_count") or 0),
        "revenue": float(data.get("revenue") or 0),
        "purchase_total": float(data.get("purchase_total") or 0),
        "top_products": ranked,
    }


def format_top_products(
    label: str,
    ranked: list[dict[str, Any]],
    *,
    standalone: bool,
    idr,
) -> str:
    if not ranked:
        body = [
            f"🏆 *Produk terlaris ({label})*",
            "",
            "Belum ada penjualan di periode ini.",
        ]
        if standalone:
            body.append("")
            body.append(
                "Coba: *hari ini* / *bulan ini* / *3 bulan terakhir* / *tahun ini*."
            )
        return "\n".join(body)

    lines = [f"🏆 *Produk terlaris ({label})*", ""]
    for i, p in enumerate(ranked, 1):
        units = p["units"]
        units_s = (
            str(int(units)) if float(units).is_integer() else f"{units:g}"
        )
        lines.append(
            f"{i}. *{p['name']}* — {units_s} pcs · {idr(p['revenue'])}"
        )
    if standalone:
        lines.append("")
        lines.append(f"Paling oke: *{ranked[0]['name']}*.")
    return "\n".join(lines)


def format_combined_report(
    label: str,
    payload: dict[str, Any],
    *,
    closing: bool,
    idr,
) -> str:
    order_count = int(payload["order_count"])
    revenue = float(payload["revenue"])
    purchase_total = float(payload["purchase_total"])
    margin = revenue - purchase_total
    ranked = list(payload.get("top_products") or [])
    lines = [
        f"📊 *Laporan {label}*",
        "",
        f"Penjualan: *{order_count}* order",
        f"Total penjualan: *{idr(revenue)}*",
        f"Total belanja: *{idr(purchase_total)}*",
        f"Selisih: *{idr(margin)}*",
    ]
    if ranked:
        lines.append("")
        lines.append(
            format_top_products(label, ranked, standalone=False, idr=idr)
        )
    lines.append("")
    if closing:
        lines.append("Ringkasan tutup toko untuk hari ini.")
    else:
        lines.append(
            "Mau periode lain? Ketik *laporan bulan ini*, *3 bulan terakhir*, "
            "*kuartal ini*, atau *tahun ini*."
        )
    return "\n".join(lines)


def rpc_off_message() -> str:
    return _RPC_OFF_MSG
