"""Test-only uncapped aggregate oracle (eng E8 / D10 A).

Do NOT import from production report path. Intentionally has NO limit=500 —
copying Hermes ``_orders_in_period`` cap would false-green multi-month parity.
"""

from __future__ import annotations

from typing import Any


def aggregate_period(
    orders: list[dict[str, Any]],
    items: list[dict[str, Any]],
    purchases: list[dict[str, Any]],
    *,
    top_n: int = 5,
) -> dict[str, Any]:
    """Apply the same status filters as ``kasir_period_report`` SQL."""
    active_orders = [
        o
        for o in orders
        if str(o.get("status") or "").lower() not in ("cancelled", "refunded")
    ]
    order_ids = {str(o["id"]) for o in active_orders if o.get("id")}
    revenue = sum(float(o.get("total_amount") or 0) for o in active_orders)
    purchase_total = sum(
        float(p.get("total_cost") or 0)
        for p in purchases
        if str(p.get("status") or "").lower() == "completed"
    )

    product_map: dict[str, dict[str, Any]] = {}
    for row in items:
        if str(row.get("order_id") or "") not in order_ids:
            continue
        if str(row.get("status") or "").lower() in ("cancelled", "returned"):
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
    )[: max(1, min(top_n, 20))]

    return {
        "order_count": len(active_orders),
        "revenue": revenue,
        "purchase_total": purchase_total,
        "top_products": ranked,
    }
