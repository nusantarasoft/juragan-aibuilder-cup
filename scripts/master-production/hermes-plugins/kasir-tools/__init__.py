"""kasir-tools — kasir read + draft/confirm write tools (Hermes → Supabase).

Middleware is NOT used for business logic. Tools query/write PostgREST via
Kong with the service role, same tables StudioUmkmService uses.

Tenant resolution: ``studio_whatsapp_config`` matched by sender phone
(``business_phone`` ∪ ``allowlist_phones``). No single-tenant fallback —
unlisted phones are rejected.

Writes always go draft → confirm (in-memory draft TTL 15m).

Env:
- ``SUPABASE_URL`` — e.g. ``http://kong:8000`` (required)
- ``SUPABASE_SERVICE_KEY`` or ``SUPABASE_SERVICE_ROLE_KEY`` (required)
- ``KASIR_WA_SESSION_DIR`` — Baileys session dir for LID→phone

Note: ``KASIR_AGENT_PHONES`` is **not** used as a tenant fallback here (that
leaked another UMKM's stock). Emergency allowlist remains kasir-pipe only.
"""

from __future__ import annotations

import json
import logging
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from .user_safe import safe_user_error, sanitize_user_text

logger = logging.getLogger("hermes.plugins.kasir-tools")


def _user_safe_tool(fn: Callable[..., str], *, kind: str = "generic") -> Callable[..., str]:
    """Wrap tool handlers so every return is sanitized before the model sees it."""

    def wrapped(*args: Any, **kwargs: Any) -> str:
        try:
            out = fn(*args, **kwargs)
        except Exception:
            logger.exception("kasir-tools handler crashed kind=%s", kind)
            return safe_user_error(kind)
        return sanitize_user_text(
            "" if out is None else str(out),
            fallback=safe_user_error(kind),
        )

    wrapped.__name__ = getattr(fn, "__name__", "tool")
    wrapped.__doc__ = getattr(fn, "__doc__", None)
    return wrapped

_JID_RE = re.compile(r"\d{6,}@(?:[a-z.]*whatsapp\.net|lid|g\.us|c\.us)")
_SESSION_DIR = (
    os.environ.get("KASIR_WA_SESSION_DIR") or "/opt/data/platforms/whatsapp/session"
)
_JAKARTA = timezone(timedelta(hours=7))
_SESSION_PHONE: dict[str, str] = {}


def _supabase_url() -> str:
    return (os.environ.get("SUPABASE_URL") or "").rstrip("/")


def _service_key() -> str:
    return (
        os.environ.get("SUPABASE_SERVICE_KEY")
        or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or ""
    ).strip()


def _digits(value: str) -> str:
    head = (value or "").split("@", 1)[0].split(":", 1)[0]
    return re.sub(r"\D", "", head)


def _agent_phones() -> list[str]:
    """Emergency phones for pipe allowlist only — never tenant fallback in tools."""
    raw = os.environ.get("KASIR_AGENT_PHONES") or ""
    return [d for d in (_digits(p) for p in raw.split(",")) if d]


def _phone_for_lid(lid_digits: str) -> str:
    if not lid_digits or not os.path.isdir(_SESSION_DIR):
        return ""
    try:
        for name in os.listdir(_SESSION_DIR):
            if not (name.startswith("lid-mapping-") and name.endswith(".json")):
                continue
            phone = _digits(name[len("lid-mapping-") : -len(".json")])
            if not phone:
                continue
            try:
                with open(os.path.join(_SESSION_DIR, name), "r", encoding="utf-8") as fh:
                    mapped = _digits(str(json.load(fh)))
            except Exception:
                continue
            if mapped == lid_digits:
                return phone
    except Exception:
        return ""
    return ""


def _jids_in(value: Any, found: list[str], depth: int = 0) -> None:
    if depth > 3 or len(found) >= 8:
        return
    try:
        if isinstance(value, str):
            for m in _JID_RE.findall(value):
                if m not in found:
                    found.append(m)
            return
        if isinstance(value, dict):
            for v in list(value.values())[:40]:
                _jids_in(v, found, depth + 1)
            return
        if isinstance(value, (list, tuple, set)):
            for v in list(value)[:20]:
                _jids_in(v, found, depth + 1)
    except Exception:
        return


def _phone_from_jid(jid: str) -> str:
    """Map WhatsApp JID → real phone digits. Never return raw LID as phone."""
    d = _digits(jid)
    if not d:
        return ""
    if "@lid" in jid:
        return _phone_for_lid(d)  # empty if unmapped — fail closed
    return d


def _remember(session_id: str, phone: str) -> None:
    if session_id and phone and len(phone) >= 8:
        _SESSION_PHONE[session_id] = phone


def _phone_from_hermes_session(session_id: str) -> str:
    """Map Hermes session_id → phone via sessions.json routing index.

    Keys look like ``agent:main:whatsapp:dm:628568713897``. Tool hooks usually
    get ``session_id`` (e.g. ``20260912_030323_9b3ac97d``) but not the chat JID.
    """
    if not session_id:
        return ""
    path = Path(
        os.environ.get("KASIR_HERMES_SESSIONS_JSON")
        or "/opt/data/sessions/sessions.json"
    )
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return ""
    if not isinstance(data, dict):
        return ""
    for key, val in data.items():
        if not isinstance(key, str) or key.startswith("_"):
            continue
        if not isinstance(val, dict):
            continue
        if str(val.get("session_id") or "") != session_id:
            continue
        for candidate in (key, str(val.get("session_key") or "")):
            # …:whatsapp:dm:628xxxx
            tail = candidate.rsplit(":", 1)[-1]
            phone = _digits(tail)
            if len(phone) >= 8:
                return phone
    return ""


def _resolve_phone(params: dict[str, Any] | None, kwargs: dict[str, Any]) -> str:
    params = params or {}
    explicit = _digits(str(params.get("phone") or ""))
    if len(explicit) >= 8:
        return explicit
    # Prefer JIDs from this tool call over cached session phone — cache can be
    # stale/wrong if Hermes reuses session keys across chats.
    jids: list[str] = []
    _jids_in(kwargs, jids)
    _jids_in(params, jids)
    session_id = str(kwargs.get("session_id") or "")
    for jid in jids:
        phone = _phone_from_jid(jid)
        if len(phone) >= 8:
            _remember(session_id, phone)
            return phone
    # Hermes gateway session index (reliable for WhatsApp DM)
    phone = _phone_from_hermes_session(session_id)
    if len(phone) >= 8:
        _remember(session_id, phone)
        return phone
    if session_id and session_id in _SESSION_PHONE:
        return _SESSION_PHONE[session_id]
    # Last resort: recent sender stamped by kasir-pipe (multi-chat map).
    try:
        from .identity import read_sender

        chat_hint = ""
        for jid in jids:
            if jid:
                chat_hint = str(jid)
                break
        phone = read_sender(chat_id=chat_hint or None)
        if len(phone) >= 8:
            _remember(session_id, phone)
            return phone
    except Exception:
        pass
    # Do NOT fall back to KASIR_AGENT_PHONES — that cross-contaminates tenants.
    return ""


def _phones_match(a: str, b: str) -> bool:
    """Exact digit match only — suffix matching caused cross-tenant hits."""
    da, db = _digits(a), _digits(b)
    if len(da) < 8 or len(db) < 8:
        return False
    return da == db


def _rest(path: str, query: dict[str, str] | None = None) -> Any:
    base = _supabase_url()
    key = _service_key()
    if not base or not key:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_SERVICE_KEY belum di-set di container Hermes"
        )
    url = f"{base}/rest/v1/{path}"
    if query:
        url += "?" + urllib.parse.urlencode(query)
    req = urllib.request.Request(url, method="GET")
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Accept", "application/json")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8", "replace"))


def _resolve_tenant(phone: str) -> str:
    rows = _rest(
        "studio_whatsapp_config",
        {
            "select": "tenant_id,enabled,notebook_id,business_phone,allowlist_phones",
        },
    )
    if not isinstance(rows, list):
        rows = []

    def owner_phones(cfg: dict) -> list[str]:
        out = []
        bp = cfg.get("business_phone")
        if bp:
            out.append(_digits(str(bp)))
        allow = cfg.get("allowlist_phones") or []
        if isinstance(allow, str):
            try:
                allow = json.loads(allow)
            except Exception:
                allow = [allow]
        for p in allow if isinstance(allow, list) else []:
            d = _digits(str(p))
            if d:
                out.append(d)
        return out

    active = [
        c
        for c in rows
        if c.get("enabled") is not False and c.get("notebook_id")
    ]
    matches = [
        c
        for c in active
        if any(_phones_match(p, phone) for p in owner_phones(c))
    ]
    if len(matches) == 1:
        return str(matches[0]["tenant_id"])
    if len(matches) > 1:
        raise RuntimeError(
            f"Nomor {phone} cocok ke lebih dari satu toko — perbaiki allowlist di Gateway"
        )
    raise RuntimeError(
        f"Nomor {phone} tidak terdaftar di allowlist toko (studio_whatsapp_config)"
    )


def _idr(n: float | int) -> str:
    try:
        v = int(round(float(n)))
    except Exception:
        v = 0
    s = f"{v:,}".replace(",", ".")
    return f"Rp {s}"


def _jakarta_today() -> datetime:
    return datetime.now(_JAKARTA)


def _period_range(period: str) -> tuple[str, str | None, str | None]:
    now = _jakarta_today()
    today = now.strftime("%Y-%m-%d")
    if period == "month":
        start = now.replace(day=1).strftime("%Y-%m-%d")
        # last day of month
        if now.month == 12:
            nxt = now.replace(year=now.year + 1, month=1, day=1)
        else:
            nxt = now.replace(month=now.month + 1, day=1)
        end = (nxt - timedelta(days=1)).strftime("%Y-%m-%d")
        return "bulan ini", f"{start}T00:00:00+07:00", f"{end}T23:59:59.999+07:00"
    if period == "week":
        # Monday-start
        dow = now.weekday()  # Mon=0
        start_dt = now - timedelta(days=dow)
        end_dt = start_dt + timedelta(days=6)
        start = start_dt.strftime("%Y-%m-%d")
        end = end_dt.strftime("%Y-%m-%d")
        return "minggu ini", f"{start}T00:00:00+07:00", f"{end}T23:59:59.999+07:00"
    return "hari ini", f"{today}T00:00:00+07:00", f"{today}T23:59:59.999+07:00"


def _active_products(tenant_id: str) -> list[dict[str, Any]]:
    rows = _rest(
        "inv_items",
        {
            "select": "id,name,sku,selling_price",
            "tenant_id": f"eq.{tenant_id}",
            "status": "eq.active",
            "order": "name.asc",
        },
    )
    return rows if isinstance(rows, list) else []


def _format_products(products: list[dict[str, Any]]) -> str:
    if not products:
        return "Belum ada produk aktif. Tambah dulu lewat panel atau perintah tambah menu."
    lines = ["📦 *Daftar Barang*", ""]
    for p in products:
        price = _idr(p.get("selling_price") or 0)
        lines.append(f"• {p.get('name')} — {price}")
    lines.append("")
    lines.append("Catat penjualan: *jual 2 [nama produk] [total/harga]*")
    return "\n".join(lines)


def _format_stock(rows: list[dict[str, Any]], query: str | None) -> str:
    if not rows:
        if query:
            return f"Tidak ketemu produk untuk *{query}*."
        return "Belum ada data stok."
    lines = ["📦 *Cek Stok*", ""]
    for r in rows:
        lines.append(f"• {r['name']} — sisa *{int(r['available'])}*")
    return "\n".join(lines)


def _format_low_stock(rows: list[dict[str, Any]], threshold: float) -> str:
    if not rows:
        return (
            f"Tidak ada produk dengan sisa ≤ *{int(threshold)}*. "
            "Stok masih aman."
        )
    lines = [f"⚠️ *Stok menipis* (sisa ≤ {int(threshold)})", ""]
    for i, r in enumerate(rows, 1):
        avail = r["available"]
        avail_s = str(int(avail)) if float(avail).is_integer() else f"{avail:g}"
        lines.append(f"{i}. *{r['name']}* — sisa *{avail_s}*")
    lines.append("")
    lines.append(f"Paling kritis: *{rows[0]['name']}*.")
    return "\n".join(lines)


def _low_stock_rows(
    tenant_id: str, threshold: float, limit: int = 10
) -> list[dict[str, Any]]:
    rows = _stock_rows(tenant_id, None)
    thin = [r for r in rows if float(r.get("available") or 0) <= threshold]
    thin.sort(key=lambda r: (float(r.get("available") or 0), str(r.get("name") or "")))
    return thin[: max(1, min(limit, 30))]


def _stock_rows(tenant_id: str, product_query: str | None) -> list[dict[str, Any]]:
    products = _active_products(tenant_id)
    if not products:
        return []
    scoped = products
    if product_query:
        q = product_query.strip().lower()
        scoped = [
            p
            for p in products
            if q in str(p.get("name") or "").lower()
            or (p.get("sku") and q in str(p.get("sku")).lower())
        ]
        if not scoped:
            return []
    ids = [str(p["id"]) for p in scoped]
    # PostgREST in.(...) filter
    ledger = _rest(
        "inv_stock_ledger",
        {
            "select": "item_id,on_hand,reserved,committed,available",
            "tenant_id": f"eq.{tenant_id}",
            "item_id": f"in.({','.join(ids)})",
        },
    )
    by_item: dict[str, dict[str, float]] = {}
    for row in ledger if isinstance(ledger, list) else []:
        item_id = str(row.get("item_id") or "")
        on_hand = float(row.get("on_hand") or 0)
        reserved = float(row.get("reserved") or 0)
        committed = float(row.get("committed") or 0)
        available_raw = row.get("available")
        available = (
            float(available_raw)
            if available_raw is not None
            else on_hand - reserved - committed
        )
        prev = by_item.get(item_id) or {"on_hand": 0.0, "reserved": 0.0, "available": 0.0}
        prev["on_hand"] += on_hand
        prev["reserved"] += reserved
        prev["available"] += available
        by_item[item_id] = prev
    out = []
    for p in scoped:
        stock = by_item.get(str(p["id"])) or {
            "on_hand": 0.0,
            "reserved": 0.0,
            "available": 0.0,
        }
        out.append(
            {
                "name": p.get("name"),
                "sku": p.get("sku"),
                "available": stock["available"],
                "on_hand": stock["on_hand"],
                "reserved": stock["reserved"],
            }
        )
    return out


def _orders_in_period(tenant_id: str, period: str) -> tuple[str, list[dict[str, Any]]]:
    label, frm, to = _period_range(period)
    sales_q: dict[str, str] = {
        "select": "id,total_amount,paid_amount,payment_status,status",
        "tenant_id": f"eq.{tenant_id}",
        "order": "created_at.desc",
        "limit": "500",
    }
    # PostgREST: one filter per column unless wrapped in and=
    if frm and to:
        sales_q["and"] = f"(created_at.gte.{frm},created_at.lte.{to})"
    elif frm:
        sales_q["created_at"] = f"gte.{frm}"
    sales = _rest("ecom_orders", sales_q)
    rows = sales if isinstance(sales, list) else []
    active = [
        r
        for r in rows
        if str(r.get("status") or "").lower() not in ("cancelled", "refunded")
    ]
    return label, active


def _top_products(
    tenant_id: str, period: str, limit: int = 5
) -> tuple[str, list[dict[str, Any]]]:
    """Aggregate ecom_order_items by item_name for the period (revenue desc)."""
    label, orders = _orders_in_period(tenant_id, period)
    ids = [str(o["id"]) for o in orders if o.get("id")]
    if not ids:
        return label, []
    # Chunk in.() to keep URLs short on bigger months.
    items: list[dict[str, Any]] = []
    chunk = 80
    for i in range(0, len(ids), chunk):
        part = ids[i : i + chunk]
        rows = _rest(
            "ecom_order_items",
            {
                "select": "item_name,quantity,subtotal,status",
                "order_id": f"in.({','.join(part)})",
            },
        )
        if isinstance(rows, list):
            items.extend(rows)

    product_map: dict[str, dict[str, Any]] = {}
    for row in items:
        status = str(row.get("status") or "").lower()
        if status in ("cancelled", "returned"):
            continue
        name = str(row.get("item_name") or "Produk").strip() or "Produk"
        key = name.lower()
        prev = product_map.get(key) or {"name": name, "units": 0.0, "revenue": 0.0}
        prev["units"] += float(row.get("quantity") or 0)
        prev["revenue"] += float(row.get("subtotal") or 0)
        product_map[key] = prev

    ranked = sorted(
        product_map.values(),
        key=lambda p: (float(p["revenue"]), float(p["units"])),
        reverse=True,
    )
    return label, ranked[: max(1, min(limit, 20))]


def _format_top_products(
    label: str, ranked: list[dict[str, Any]], *, standalone: bool
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
                "Coba periode lain: *hari ini* / *minggu ini* / *bulan ini*."
            )
        return "\n".join(body)

    lines = [f"🏆 *Produk terlaris ({label})*", ""]
    for i, p in enumerate(ranked, 1):
        units = p["units"]
        units_s = (
            str(int(units)) if float(units).is_integer() else f"{units:g}"
        )
        lines.append(
            f"{i}. *{p['name']}* — {units_s} pcs · {_idr(p['revenue'])}"
        )
    if standalone:
        best = ranked[0]["name"]
        lines.append("")
        lines.append(f"Paling oke: *{best}*.")
    return "\n".join(lines)


def _combined_report(
    tenant_id: str, period: str, *, closing: bool = False
) -> str:
    label, sales_list = _orders_in_period(tenant_id, period)
    buy_q: dict[str, str] = {
        "select": "total_cost",
        "tenant_id": f"eq.{tenant_id}",
        "status": "eq.completed",
    }
    _label, frm, to = _period_range(period)
    if frm and to:
        d0, d1 = frm[:10], to[:10]
        buy_q["and"] = f"(purchase_date.gte.{d0},purchase_date.lte.{d1})"
    buys = _rest("studio_umkm_purchases", buy_q)
    buys_list = buys if isinstance(buys, list) else []
    order_count = len(sales_list)
    revenue = sum(float(r.get("total_amount") or 0) for r in sales_list)
    purchase_total = sum(float(r.get("total_cost") or 0) for r in buys_list)
    margin = revenue - purchase_total
    _, ranked = _top_products(tenant_id, period, limit=5)
    lines = [
        f"📊 *Laporan {label}*",
        "",
        f"Penjualan: *{order_count}* order",
        f"Total penjualan: *{_idr(revenue)}*",
        f"Total belanja: *{_idr(purchase_total)}*",
        f"Selisih: *{_idr(margin)}*",
    ]
    if ranked:
        lines.append("")
        lines.append(_format_top_products(label, ranked, standalone=False))
    lines.append("")
    if closing:
        lines.append("Ringkasan tutup toko untuk hari ini.")
    else:
        lines.append(
            "Mau lihat *minggu ini* atau *bulan ini*? "
            "Ketik *laporan minggu ini* / *laporan bulan ini*."
        )
    return "\n".join(lines)


def _format_tutup_recap(report: str, low_stock: str) -> str:
    """Pure compose for unit tests — omzet hari ini + stok menipis + closing."""
    parts = [report.strip(), low_stock.strip()]
    parts.append(
        "Toko ditutup untuk hari ini. Besok tinggal ketik *jual* / *stok* lagi ya."
    )
    return "\n\n".join(p for p in parts if p)


def _with_tenant(params: dict[str, Any] | None, kwargs: dict[str, Any]):
    phone = _resolve_phone(params, kwargs)
    if not phone:
        return None, (
            "Nomor pengirim tidak dikenali. Pastikan chat dari nomor yang "
            "terdaftar di toko (bukan sesi bersama), lalu coba lagi."
        )
    try:
        tenant_id = _resolve_tenant(phone)
    except Exception as err:
        logger.exception("kasir-tools resolve tenant failed: %s", err)
        return None, safe_user_error("tenant")
    logger.info("kasir-tools tenant phone=%s tenant=%s", phone, tenant_id)
    return (phone, tenant_id), None


def _handle_stock(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    try:
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        _phone, tenant_id = resolved
        query = (params.get("product_query") or params.get("query") or "").strip() or None
        rows = _stock_rows(tenant_id, query)
        return _format_stock(rows, query)
    except Exception as err:
        logger.exception("kasir_get_stock failed: %s", err)
        return safe_user_error("stock")


def _handle_low_stock(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    try:
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        _phone, tenant_id = resolved
        try:
            threshold = float(params.get("threshold") if params.get("threshold") is not None else 10)
        except Exception:
            threshold = 10.0
        try:
            limit = int(params.get("limit") or 10)
        except Exception:
            limit = 10
        rows = _low_stock_rows(tenant_id, threshold=threshold, limit=limit)
        return _format_low_stock(rows, threshold)
    except Exception as err:
        logger.exception("kasir_low_stock failed: %s", err)
        return safe_user_error("low_stock")


def _handle_products(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    try:
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        _phone, tenant_id = resolved
        return _format_products(_active_products(tenant_id))
    except Exception as err:
        logger.exception("kasir_list_products failed: %s", err)
        return safe_user_error("products")


def _normalize_period(raw: str | None, default: str = "today") -> str:
    p = str(raw or default).strip().lower()
    aliases = {
        "today": "today",
        "hari": "today",
        "hari ini": "today",
        "week": "week",
        "minggu": "week",
        "minggu ini": "week",
        "month": "month",
        "bulan": "month",
        "bulan ini": "month",
    }
    if p in aliases:
        return aliases[p]
    return default if default in ("today", "week", "month") else "today"


def _handle_report(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    try:
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        _phone, tenant_id = resolved
        period = _normalize_period(params.get("period"), "today")
        return _combined_report(tenant_id, period)
    except Exception as err:
        logger.exception("kasir_daily_report failed: %s", err)
        return safe_user_error("report")


def _handle_tutup_toko(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    """Closing ritual: today's omzet + thin stock — no period upsell."""
    try:
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        _phone, tenant_id = resolved
        try:
            threshold = float(
                params.get("threshold") if params.get("threshold") is not None else 10
            )
        except Exception:
            threshold = 10.0
        report = _combined_report(tenant_id, "today", closing=True)
        low = _format_low_stock(
            _low_stock_rows(tenant_id, threshold=threshold, limit=10),
            threshold,
        )
        return _format_tutup_recap(report, low)
    except Exception as err:
        logger.exception("kasir_tutup_toko failed: %s", err)
        return safe_user_error("tutup")


def _handle_top_products(params: dict[str, Any] | None = None, **kwargs: Any) -> str:
    try:
        params = params or {}
        resolved, err = _with_tenant(params, kwargs)
        if err:
            return err
        assert resolved
        _phone, tenant_id = resolved
        # Default month: "produk paling laris" without a period usually means recent stretch.
        period = _normalize_period(params.get("period"), "month")
        try:
            limit = int(params.get("limit") or 5)
        except Exception:
            limit = 5
        label, ranked = _top_products(tenant_id, period, limit=limit)
        return _format_top_products(label, ranked, standalone=True)
    except Exception as err:
        logger.exception("kasir_top_products failed: %s", err)
        return safe_user_error("top")


def _on_session_start(event=None, **kwargs: Any) -> None:
    try:
        session_id = str(kwargs.get("session_id") or "")
        jids: list[str] = []
        _jids_in(kwargs, jids)
        _jids_in(event, jids)
        for jid in jids:
            phone = _phone_from_jid(jid)
            if len(phone) >= 8:
                _remember(session_id, phone)
                logger.info(
                    "kasir-tools session_start session=%s phone=%s",
                    session_id[:48],
                    phone,
                )
                return
        # No JID → leave cache untouched (never seed from KASIR_AGENT_PHONES).
    except Exception:
        logger.exception("kasir-tools on_session_start")


def _on_pre_tool_call(event=None, **kwargs: Any) -> None:
    try:
        session_id = str(kwargs.get("session_id") or "")
        jids: list[str] = []
        _jids_in(kwargs, jids)
        _jids_in(event, jids)
        for jid in jids:
            phone = _phone_from_jid(jid)
            if len(phone) >= 8:
                _remember(session_id, phone)
                return
    except Exception:
        logger.exception("kasir-tools pre_tool_call")


def register(ctx) -> None:
    from . import writes

    writes.bind(
        with_tenant=_with_tenant,
        active_products=_active_products,
        idr=_idr,
    )

    tools = (
        (
            "kasir_get_stock",
            {
                "name": "kasir_get_stock",
                "description": (
                    "Cek stok barang toko (langsung dari database). Panggil saat user "
                    "bertanya stok / sisa barang untuk nama tertentu. Opsional "
                    "product_query. Untuk 'stok mau abis / menipis' pakai kasir_low_stock."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_query": {
                            "type": "string",
                            "description": "Nama produk (opsional).",
                        },
                        "phone": {
                            "type": "string",
                            "description": "Nomor toko (opsional; biasanya otomatis).",
                        },
                    },
                    "required": [],
                },
            },
            _handle_stock,
        ),
        (
            "kasir_low_stock",
            {
                "name": "kasir_low_stock",
                "description": (
                    "Daftar produk yang stoknya menipis / mau habis, diurutkan "
                    "dari sisa terkecil. Panggil saat user tanya stok mau abis, "
                    "menipis, perlu restock, atau kritis. Default threshold=10."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "threshold": {
                            "type": "number",
                            "description": "Batas sisa (default 10).",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Jumlah produk (default 10).",
                        },
                        "phone": {
                            "type": "string",
                            "description": "Nomor toko (opsional; biasanya otomatis).",
                        },
                    },
                    "required": [],
                },
            },
            _handle_low_stock,
        ),
        (
            "kasir_list_products",
            {
                "name": "kasir_list_products",
                "description": (
                    "Daftar produk aktif toko (langsung dari database). Panggil saat "
                    "user minta menu / katalog / daftar barang."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phone": {
                            "type": "string",
                            "description": "Nomor toko (opsional; biasanya otomatis).",
                        },
                    },
                    "required": [],
                },
            },
            _handle_products,
        ),
        (
            "kasir_daily_report",
            {
                "name": "kasir_daily_report",
                "description": (
                    "Laporan penjualan + pembelian + ranking produk terlaris "
                    "(langsung dari database). period: today|week|month. "
                    "Pakai untuk omzet/laporan. Untuk pertanyaan 'produk paling "
                    "laris / paling oke' lebih tepat kasir_top_products."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "description": "today (default), week, atau month",
                        },
                        "phone": {
                            "type": "string",
                            "description": "Nomor toko (opsional; biasanya otomatis).",
                        },
                    },
                    "required": [],
                },
            },
            _handle_report,
        ),
        (
            "kasir_tutup_toko",
            {
                "name": "kasir_tutup_toko",
                "description": (
                    "Ritual tutup toko: laporan omzet *hari ini* + daftar stok "
                    "menipis dalam satu balasan. Panggil saat user bilang tutup "
                    "toko / tutup / closing / mau pulang. Jangan tanya periode."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "threshold": {
                            "type": "number",
                            "description": "Ambang stok menipis (default 10).",
                        },
                        "phone": {
                            "type": "string",
                            "description": "Nomor toko (opsional; biasanya otomatis).",
                        },
                    },
                    "required": [],
                },
            },
            _handle_tutup_toko,
        ),
        (
            "kasir_top_products",
            {
                "name": "kasir_top_products",
                "description": (
                    "Ranking produk terlaris berdasarkan qty + omzet dari "
                    "ecom_order_items. Panggil saat user tanya produk paling "
                    "laris / paling oke / best seller / penjualan per produk. "
                    "Default period=month. Jangan tanya periode dulu kecuali "
                    "user meminta periode spesifik."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "period": {
                            "type": "string",
                            "description": "month (default), week, atau today",
                        },
                        "limit": {
                            "type": "integer",
                            "description": "Jumlah produk (default 5, max 20).",
                        },
                        "phone": {
                            "type": "string",
                            "description": "Nomor toko (opsional; biasanya otomatis).",
                        },
                    },
                    "required": [],
                },
            },
            _handle_top_products,
        ),
        *writes.WRITE_TOOL_SPECS,
    )
    kind_by_name = {
        "kasir_get_stock": "stock",
        "kasir_low_stock": "low_stock",
        "kasir_list_products": "products",
        "kasir_daily_report": "report",
        "kasir_tutup_toko": "tutup",
        "kasir_top_products": "top",
        "kasir_draft_sale": "draft_sale",
        "kasir_repeat_last_sale": "draft_sale",
        "kasir_confirm_sale": "confirm_sale",
        "kasir_draft_purchase": "draft_purchase",
        "kasir_confirm_purchase": "confirm_purchase",
    }
    for name, schema, handler in tools:
        try:
            ctx.register_tool(
                name=name,
                toolset="kasir",
                schema=schema,
                handler=_user_safe_tool(handler, kind=kind_by_name.get(name, "generic")),
            )
        except Exception as exc:
            logger.error("kasir-tools: register_tool %s failed: %s", name, exc)

    for hook_name, hook_fn in (
        ("on_session_start", _on_session_start),
        ("pre_tool_call", _on_pre_tool_call),
    ):
        try:
            ctx.register_hook(hook_name, hook_fn)
        except Exception as exc:
            logger.warning("kasir-tools: hook %s unavailable: %s", hook_name, exc)

    logger.info(
        "kasir-tools registered (supabase=%s)",
        _supabase_url() or "(missing SUPABASE_URL)",
    )
