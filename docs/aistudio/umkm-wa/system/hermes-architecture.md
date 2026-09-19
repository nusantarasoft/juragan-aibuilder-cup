# Hermes architecture — UMKM kasir WhatsApp

**System doc** (AI Studio → UMKM WA). Pitch: [`../business/pitch.md`](../business/pitch.md) · Trial ops: [`../business/ops/register-trial.md`](../business/ops/register-trial.md).

Hermes is the **sole** WhatsApp transport for UMKM kasir. This doc is the source of truth for **how it works**. For ports, first-time setup, and smoke commands, see [`hermes-local.md`](./hermes-local.md).

Official product docs: [Hermes Docker](https://hermes-agent.nousresearch.com/docs/user-guide/docker).

**Gaps vs Hermes best practice (status + remediation):** [`hermes-gaps.md`](./hermes-gaps.md)

---

## Mental model (read this first)

**Wrong:** WhatsApp → middleware webhook → Nest brain → reply.

**Right:** WhatsApp → Hermes (Baileys) → `kasir-pipe` gate → Hermes agent + `kasir-tools` **or** DAFTAR wizard. Middleware talks to Hermes only for **outbound** send and **pair/QR** via the bridge proxy on `:8765`.

```
WhatsApp users
      │
      ▼
Hermes container (Baileys :3000 loopback + Gateway + plugins)
      │
      ├─ kasir-pipe (pre_gateway_dispatch)
      │     ├─ allowlist OK  → stamp active sender → Hermes LLM + kasir-tools → Supabase
      │     └─ deny         → DAFTAR wizard (non-LLM)  |  silent skip if KASIR_REGISTRATION=0
      │
      └─ HTTP 0.0.0.0:8765  → proxy Baileys + /pair/* (admin QR)

Middleware (Nest)
      │
      └─ HermesProvider → HERMES_BRIDGE_URL (http://hermes:8765)
            send / send-poll / pair / media
            (approve/reject notify, Admin WhatsApp Gateway)

Nest POST /api/studio/whatsapp/webhook → **410** by default (set WHATSAPP_WEBHOOK_ENABLED=1 only for legacy).
Simulasi admin uses simulateInboundMessage, not this route. See hermes-gaps.md G4.
```

Runtime diagram: [`diagrams/aistudio/umkm-wa/system/L5-hermes-runtime.svg`](../../../../diagrams/aistudio/umkm-wa/system/L5-hermes-runtime.svg).  
Business ladder: [`diagrams/aistudio/umkm-wa/business/`](../../../../diagrams/aistudio/umkm-wa/business/) (L0–L4).

---

## Components

| Piece | Role |
|-------|------|
| **Hermes Agent** | Container `hermes` / `nsoft3-hermes`. Runs gateway + Baileys WhatsApp. Volume `./volumes/hermes` → `/opt/data`. |
| **kasir-pipe** | Plugin: allowlist gate, DAFTAR funnel, bridge+pair proxy `:8765`. |
| **kasir-tools** | Plugin: stock/report/sale tools → PostgREST (Kong). Tenant from sender phone / pipe stamp — never `KASIR_AGENT_PHONES` as tenant fallback. Sale/purchase drafts mirrored to `runtime/kasir_drafts.json` (15m TTL). After draft, best-effort `/send-poll` confirm. `kasir_repeat_last_sale` uses `kasir_last_sale.json` (24h). |
| **kasir-probe** | Debug/probe plugin (ops). |
| **user_safe** | Shared sanitize on tool returns + DAFTAR `_send_wa_text` denylist (gap **G11**). |
| **HermesProvider** | Nest transport: outbound + session/QR via bridge. |
| **studio_whatsapp_config** | Enabled tenants + `business_phone` ∪ `allowlist_phones` + notebook. |
| **studio_umkm_registrations** | DAFTAR drafts/pending (wizard). |

Shared **one** business WhatsApp number (not one Hermes profile per tenant). Tenants are separated by owner phone on the allowlist.

---

## Inbound paths

### Allowlisted (kasir AIDLC)

1. Message hits Hermes WhatsApp adapter.
2. `kasir-pipe` `pre_gateway_dispatch`: sender phone or LID matches allowlist cache (DB + `KASIR_AGENT_PHONES` emergency).
3. Pipe stamps `kasir_active_sender.json` under `KASIR_IDENTITY_DIR` (default `/opt/data/runtime`) for tool tenant resolve.
4. Hook returns `None` → Hermes agent runs with `kasir-tools` (returns wrapped via `user_safe`).
5. Tools read/write Supabase via service role. **No** POST to middleware webhook.

### Non-allowlisted (registration)

1. Same hook; sender not on allowlist.
2. If `KASIR_REGISTRATION=1` (default): pure state machine in `register.py` (DAFTAR / nama toko / YA / STATUS / BATAL). Replies via gateway adapter or bridge `/send` (denylist-sanitized).
3. If `KASIR_REGISTRATION=0`: `action: skip` (silent).
4. On unexpected errors: busy fallback message (never silent-drop).

LID note: inbound JIDs are often `@lid`. Allowlist phones are expanded via `lid-mapping-{phone}.json` in `KASIR_WA_SESSION_DIR`.

---

## Outbound paths (middleware → Hermes)

| Use | How |
|-----|-----|
| Admin QR / pair / logout / rebind | `HermesProvider` → `GET/POST /pair/*` on `:8765` |
| Approve / reject notify to owner | `sendText` → `POST /send` |
| Buttons / lists | try `POST /send-poll`; caller may fall back to text |

Bridge binds `127.0.0.1:3000` inside the Hermes container. Other containers cannot reach it; kasir-pipe proxies `0.0.0.0:8765` → that loopback.

Agent replies to allowlisted chats go through the Hermes gateway (not `_send_wa_text`). Hard egress sanitize is residual — see gaps **G11** / TODOS.

---

## Env (critical)

| Variable | Where | Purpose |
|----------|--------|---------|
| `WHATSAPP_PROVIDER=hermes` | middleware | Transport selection (always hermes in this repo) |
| `HERMES_BRIDGE_URL` | middleware | Default `http://hermes:8765` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | hermes plugins | Allowlist + tools + registrations |
| `KASIR_AGENT_PHONES` | hermes | Emergency allowlist for **pipe only** (not tenant fallback in tools) |
| `KASIR_REGISTRATION` | hermes | `1` = DAFTAR funnel; `0` = silent skip |
| `KASIR_WA_SESSION_DIR` | hermes | Baileys session + LID maps |
| `KASIR_IDENTITY_DIR` | hermes | Active-sender stamp for tools |
| `KASIR_BRIDGE_PROXY_PORT` | hermes | Default `8765` |
| `WHATSAPP_BRIDGE_PORT` | hermes | Baileys upstream, default `3000` |
| `WHATSAPP_HOME_CHANNEL` | hermes | Ops/home chat JID (e.g. paired agent `628…@s.whatsapp.net`) — suppresses Hermes `/sethome` nag (**G12**). Not an UMKM owner chat. |
| `WHATSAPP_HOME_CHANNEL_NAME` | hermes | Display name for home channel (default `Ops`) |

`WHATSAPP_WEBHOOK_HMAC_KEY` is for the Nest webhook endpoint (Simulasi / legacy). **Kasir-pipe does not forward inbound WA to middleware**, so Hermes does not need that key for the kasir path.

---

## Failure modes (short)

| Failure | User sees |
|---------|-----------|
| Allowlist DB down and no `KASIR_AGENT_PHONES` | Treat as deny → DAFTAR or skip |
| Registration DB error | “Sistem daftar sedang sibuk…” |
| Unexpected pipe exception | Busy fallback + skip agent |
| Bridge/proxy down | Admin QR / approve notify fail; agent may still chat if Baileys up |
| LID unmapped | Allowlist miss → registration path |

---

## Deploy note

Plugin code lives in the repo under `scripts/master-production/hermes-plugins/`. Production Hermes loads from the container volume (synced by `deploy-kasir-tools.py` / related deploy scripts). Merging this repo alone does not update a running host until that deploy step runs.

---

## Related docs

- Ops quickstart: [`hermes-local.md`](./hermes-local.md)
- Gaps: [`hermes-gaps.md`](./hermes-gaps.md)
- Middleware short pointer: [`middleware/STUDIO_WHATSAPP.md`](../../../../middleware/STUDIO_WHATSAPP.md)
- UMKM funnel (sales pitch): [`../business/pitch.md`](../business/pitch.md)
- UMKM funnel (ops/trial): [`../business/ops/register-trial.md`](../business/ops/register-trial.md)
- Hub: [`../../README.md`](../../README.md)
- Production runbook: [`../../../deploy-master-production.md`](../../../deploy-master-production.md)
