# Agentic OS — first real employee (UMKM Kasir)

Thin slice: one **live** employee recruited from **AI Studio** (UMKM WhatsApp Kasir), shown in **Agentic OS** and the **Virtual Office**, separate from **Demo** simulated agents.

## Data (read-only)

Middleware GraphQL query `aosKasirLiveSnapshot(tenantId)` requires **Bearer auth** (`AosAuthGuard` + tenant scoping: admins → platform default tenant; `super_admin` may pass another `tenantId`). It aggregates tenant-scoped rows:

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
| Agentic OS → Overview / Agent Studio | Kasir card with **Live** + **AI Studio**; 8 active Wayang agents (`nakula`, `arjuna`, `gatot`, `yudhis`, `drupadi`, `kresna`, `semar`, `petruk`) operating strictly on the 8 current system modules |
| Virtual Office | Kasir avatar at desk `ops-1` with live metrics; 8 Wayang avatars across 3 floor zones (`AI Studio & Gateway`, `Knowledge & Marketing`, `WhatsApp & Partner Ops`) |

## Active Agent Roster & System Modules

All agents, playbooks, task templates, memory map signposts, routines, workflows, and goals operate strictly on the **8 active system modules**:

| Module ID | Label | Route | Assigned Agents |
|-----------|-------|-------|-----------------|
| `ai-studio` | Studio | `/admin/ai-studio` | Nakula, Yudhistira |
| `partner` | Partner | `/admin/ai-studio/partner` | Kresna, Petruk |
| `knowledge` | Knowledge Research | `/admin/ai-studio/knowledge-research` | Yudhistira, Drupadi, Semar |
| `marketing` | Showcase | `/admin/ai-studio/showcase` | Drupadi, Kresna |
| `wa-conversations` | Messages | `/admin/ai-studio/messages` | Semar, Petruk |
| `whatsapp-gateway` | Settings (WhatsApp Gateway) | `/admin/ai-studio/settings?tab=whatsapp` | Arjuna |
| `settings` | Settings | `/admin/ai-studio/settings` | Nakula, Arjuna, Gatotkaca |
| `agentic-os` | Agentic OS | `/admin/agentic-os` | Gatotkaca, Petruk |

`STUDIO_UMKM_DAILY_REPORT_ENABLED` stays `false`; this slice does not enable daily report cron or change Hermes/WA routing.
