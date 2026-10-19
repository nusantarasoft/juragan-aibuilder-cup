# Messages — super-admin inbox (`/admin/ai-studio/messages`, AI Studio)

**Audience:** eng + ops · **Pitch:** [`../business/pitch.md`](../business/pitch.md) · **Hermes runtime:** [`hermes-architecture.md`](./hermes-architecture.md)

Nusantarasoft **super admin** can watch WhatsApp threads between store owners (whitelist on the shared NS business number) and Kasir/Pendamping (Hermes), reply as a human, and **Take over** / **Return to AI** with a 30-minute idle auto-release on human takeover (not on message retention). Legacy route `/admin/ai-studio/percakapan-wa` automatically redirects to `/admin/ai-studio/messages`.

---

## Product locks (Akbar — binding)

| Lock | Decision |
|------|----------|
| **Human reply signature** | Every outbound human message from admin is sent and stored as: `{teks admin}` + `\n\n— Admin Nusantarasoft` (exact suffix). Implemented in Nest `formatStudioWaHumanOutboundText` → `HermesProvider.sendText`. |
| **Retention** | **No limit.** Rows in `studio_wa_messages` / `studio_wa_conversations` are kept indefinitely. **No** purge job, **no** TTL cron on history. |
| **History start** | Empty at feature activation. **No** backfill from Hermes `state.db` or legacy `studio_conversations` (410 webhook). Only turns recorded after deploy via `POST /internal/wa-turn`. |

---

## Data model

| Table | Purpose |
|-------|---------|
| `studio_wa_conversations` | One row per `(tenant_id, owner_phone)` — preview, takeover state, `chat_jid` for outbound |
| `studio_wa_messages` | Turns: `author_kind` ∈ `owner` \| `ai` \| `human` |

RLS: **service_role only** (no `anon`, no `USING (true)` on authenticated). Admin UI reads via Nest GraphQL (super_admin).

Migration: `supabase/migrations/20261017120000_studio_wa_conversations.sql`

---

## Flow

```
Owner WA inbound
  → kasir-pipe (allowlist OK)
  → POST /internal/wa-turn { author_kind: owner, ... }  (best-effort)
  → if takeover active: skip agent (no AI send)
  → else Hermes agent + kasir-tools
  → transform_llm_output → POST wa-turn { author_kind: ai }

Super admin /admin/ai-studio/messages
  → GraphQL studioWa* (super_admin only)
  → Poll list + open thread every ~5s while tab visible (pause when hidden)
  → Take over → takeover_active + takeover_until (+30m per human reply)
  → Human reply → sendText(suffixed) + wa-turn human + audit_logs

kasir_consult + phone during takeover
  → POST /internal/kasir-consult → { status: human_handoff, text: '' }
```

Internal auth: header `x-kasir-consult-key` (same as kasir-consult).

**Whitelist source of truth:** Hermes (`kasir-pipe`) and Nest `POST /internal/wa-turn` both resolve senders via `studio_whatsapp_config` (`business_phone` + `allowlist_phones`). Saves sync `tenant_wa_whitelist` for F2 onboarding. **D-40:** one owner number per store — see [docs/backlog.md](../../../../docs/backlog.md) D-40.

Diagram: [L12-percakapan-wa.svg](../../../../diagrams/aistudio/umkm-wa/system/L12-percakapan-wa.svg)

---

## Hermes deploy (not in this repo deploy)

After middleware migration + Nest image:

1. `python scripts/master-production/deploy-kasir-tools.py` (or full redeploy) to ship updated `kasir-pipe` / `kasir-tools`.
2. `python scripts/master-production/hermes-kasir-posture.py` (standard posture restore).

Do **not** commit or copy live `state.db`, `config.yaml`, `channel_directory.json`, or session creds.

---

## Admin UI

- Menu: **AI Studio → Messages** (`/admin/ai-studio/messages`; legacy `/admin/ai-studio/percakapan-wa` redirects)
- English Tactical HUD copy; empty state: **No WA conversations yet**
- Thread labels: **AI** / **Human** (+ admin name on human rows) / **Owner**
- Auto-refresh ~5s (visible tab) so inbound owner messages appear during takeover without manual reload

Access: **super_admin** only (server-enforced on every query/mutation).
