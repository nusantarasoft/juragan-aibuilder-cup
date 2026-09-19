# Hermes architecture — UMKM kasir WhatsApp

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
Simulasi admin uses simulateInboundMessage, not this route. See docs/hermes-gaps.md G4.
```

Runtime diagram (containers / ports / outbound): [`diagrams/umkm-wa/L5-hermes-runtime.svg`](../diagrams/umkm-wa/L5-hermes-runtime.svg).  
Business + gate ladder: [`diagrams/umkm-wa/`](../diagrams/umkm-wa/README.md) (L0–L4).

---

## Components

| Piece | Role |
|-------|------|
| **Hermes Agent** | Container `hermes` / `nsoft3-hermes`. Runs gateway + Baileys WhatsApp. Volume `./volumes/hermes` → `/opt/data`. |
| **kasir-pipe** | Plugin: allowlist gate, DAFTAR funnel, bridge+pair proxy `:8765`. |
| **kasir-tools** | Plugin: stock/report/sale tools → PostgREST (Kong). Tenant from sender phone / pipe stamp — never `KASIR_AGENT_PHONES` as tenant fallback. |
| **kasir-probe** | Debug/probe plugin (ops). |
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
4. Hook returns `None` → Hermes agent runs with `kasir-tools`.
5. Tools read/write Supabase via service role. **No** POST to middleware webhook.

### Non-allowlisted (registration)

1. Same hook; sender not on allowlist.
2. If `KASIR_REGISTRATION=1` (default): pure state machine in `register.py` (DAFTAR / nama toko / YA / STATUS / BATAL). Replies via gateway adapter or bridge `/send`.
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
- Middleware short pointer: [`middleware/STUDIO_WHATSAPP.md`](../middleware/STUDIO_WHATSAPP.md)
- UMKM funnel business rules: [`docs/designs/umkm-wa-register-trial.md`](./designs/umkm-wa-register-trial.md)
- Production runbook: [`deploy-master-production.md`](./deploy-master-production.md)
