# Agentic OS — first real employee (UMKM Kasir)

Thin slice: one **live** employee recruited from **AI Studio** (UMKM WhatsApp Kasir), shown in **Agentic OS** and the **Virtual Office**, separate from **Demo** simulated agents.

## Data (read-only)

Middleware GraphQL query `aosKasirLiveSnapshot(tenantId)` aggregates tenant-scoped rows:

| Metric | Source |
|--------|--------|
| Chat WA hari ini | `studio_whatsapp_sessions.last_message_at` (count today, Asia/Jakarta) |
| Transaksi tercatat | `ecom_orders.created_at` (count today, Asia/Jakarta) |
| Aktivitas terakhir | Max of latest session message / order timestamp |
| WA online | Hermes `getSessionStatus().connected` (read-only; no WA sends) |

Tenant mapping uses `studio_whatsapp_config.tenant_id` (falls back through requested tenant, `default`, AOS default UUID).

When reads fail or no config: `available: false`, UI shows **data tidak tersedia** for Kasir (no silent mock).

## UI

| Surface | Behavior |
|---------|----------|
| Agentic OS → Overview / Agent Studio | Kasir card with **Live** + **AI Studio**; roster agents tagged **Demo** |
| Virtual Office | Kasir avatar at desk `ops-1` with live metrics; other avatars **Demo** sim |

`STUDIO_UMKM_DAILY_REPORT_ENABLED` stays `false`; this slice does not enable daily report cron or change Hermes/WA routing.
