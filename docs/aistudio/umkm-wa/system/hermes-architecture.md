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
      │     ├─ media + KASIR_MULTIMODAL=0 → refuse teks + skip
      │     ├─ allowlist OK  → stamp per-chat (v2) → Hermes LLM + kasir-tools → Supabase
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
Agent path (SOUL → tools): [`L6-kasir-agent-path.svg`](../../../../diagrams/aistudio/umkm-wa/system/L6-kasir-agent-path.svg).  
Inbound gate order: [`L7-inbound-gate.svg`](../../../../diagrams/aistudio/umkm-wa/system/L7-inbound-gate.svg).
Knowledge / SOUL locks: [`L8-knowledge-soul.svg`](../../../../diagrams/aistudio/umkm-wa/system/L8-knowledge-soul.svg).
Business ladder: [`diagrams/aistudio/umkm-wa/business/`](../../../../diagrams/aistudio/umkm-wa/business/) (L0–L4 + L0b ritual + **L0c** chat-only).

---

## Components

| Piece | Role |
|-------|------|
| **Hermes Agent** | Container `hermes` / `nsoft3-hermes`. Runs gateway + Baileys WhatsApp. Volume `./volumes/hermes` → `/opt/data`. |
| **kasir-pipe** | Plugin: allowlist gate, **chat-only media refuse** (`KASIR_MULTIMODAL=0`), DAFTAR funnel, bridge+pair proxy `:8765`, **`transform_llm_output` egress sanitize** (`user_safe`). |
| **kasir-tools** | Plugin: stock/report/sale/**tutup toko** tools → PostgREST (Kong). Tenant from sender phone / pipe stamp — never `KASIR_AGENT_PHONES` as tenant fallback. Sale/purchase drafts mirrored to `runtime/kasir_drafts.json` (15m TTL). After draft, best-effort `/send-poll` confirm. `kasir_repeat_last_sale` uses `kasir_last_sale.json` (24h). `kasir_tutup_toko` = omzet hari ini + stok menipis. |
| **kasir-probe** | Debug/probe plugin (ops). |
| **user_safe** | Shared sanitize on tool returns + DAFTAR `_send_wa_text` + agent `transform_llm_output` (gap **G11**). |
| **HermesProvider** | Nest transport: outbound + session/QR via bridge. |
| **studio_whatsapp_config** | Enabled tenants + `business_phone` ∪ `allowlist_phones` + notebook. |
| **studio_umkm_registrations** | DAFTAR drafts/pending (wizard). |

Shared **one** business WhatsApp number (not one Hermes profile per tenant). Tenants are separated by owner phone on the allowlist.

---

## Platform locks (2026-09-20 eng review)

Settled product/architecture defaults for UMKM kasir on Hermes. Do not invert without a new review.

| Lock | Default | Rationale |
|------|---------|-------------|
| **Modality** | **Chat-only** in prod (`KASIR_MULTIMODAL=0`). **Flag OFF:** polite text refuse — no vision/STT. **Flag ON:** pipe passes media; Hermes gateway STT (`stt.language=id`) + `agent.image_input_mode=auto` annotate; SOUL *Foto / voice* → `kasir_draft_sale` / purchase → poll. Applied by `hermes-kasir-platform-locks.py` (config ready even while flag stays 0). Not custom vision tools; WA toolsets stay `clarify`+`kasir` (no `vision`/`stt` toolsets) | Cheap micro path first; eng review Q1 / D10A |
| **Knowledge** | Live facts (stok, harga, omzet, jual/beli) = **`kasir-tools` → PostgREST/DB** only. **Kurikulum bisnis** (prefix `tanya` / `konsultasi` / `pendamping`) = **`kasir_consult` → Nest** `POST /internal/kasir-consult` → Studio RAG notebook (`KASIR_CONSULT_NOTEBOOK_ID`) — **not** ledger RAG. Compose default **`KASIR_CONSULT=0`**; **prod soft GA `=1`** (2026-09-20) after ingest 376 chunks — flip both Hermes + Nest together. Optional later = per-tenant SOP docs with `tenant_id` filter. Diagrams **L8** / **L9**. Studio RAG: [`rag-architecture.md`](../../studio/system/rag-architecture.md). Health WARNs if `MEMORY.md` appears as store KB | Accuracy + isolation; eng review Q2 + consult HOLD → soft GA |
| **Character / memory** | **One shared** `SOUL.md` (“Asisten Kasir Warung”). **Short-term:** Hermes keeps **per-chat WA session history** (konteks thread / nomor) — bukan KB toko. Per-toko uniqueness = allowlist + tenant-scoped tools + app state (`kasir_drafts` / `kasir_last_sale`). Sender stamp is a **multi-chat map** (`kasir_active_sender.json` v2) keyed by chat — not one global phone. Do **not** use global `MEMORY.md` as store KB; multi-SOUL per tenant is out until product sells custom agents. Diagram **L8** | Brand consistency; eng review Q3 / D9A |
| **Skills vs tools** | Owner jobs (“cek stok”, “jual”, “laporan”, “tutup toko”) are **`kasir-tools` + SOUL routing**, not Hermes Skills packs. Keep coding/browser Hermes skills off the kasir WA path | Explicit, testable, tenant-safe; skill-ifying invites the wrong toolset for warung |
| **Tool allowlist** | **FIXED (G13):** `platform_toolsets.whatsapp` = `clarify` + `kasir` only. Applied by `hermes-wa-tool-allowlist.py` on deploy; `hermes-kasir-health.py` **fails** if terminal/browser/… reappear | Eng review 2026-09-20 D7A + D8A / T1 |

```
User text ("cek stok indomie")
      │
      ▼
SOUL.md routing table  ──►  kasir_get_stock (tool)  ──►  Supabase
      │                         │
      │                         └── NOT a Hermes Skill file
      └── shared persona (not per-tenant SOUL)
```

---

## Inbound paths

### Allowlisted (kasir AIDLC)

1. Message hits Hermes WhatsApp adapter.
2. `kasir-pipe` `pre_gateway_dispatch`: if `KASIR_MULTIMODAL` is off (default) and the event is photo/voice/audio/video/document/sticker (`message_type` / `media_urls`), send short refuse (“ketik jual/stok…”) and `action: skip` — **no** agent, vision, or STT.
3. If multimodal **on** + media: pass through. Gateway STT (voice→text, `stt.language=id`) and/or image annotate (`agent.image_input_mode=auto`) run before/alongside the agent — **not** via WhatsApp `vision`/`stt` toolsets (those stay disabled by G13).
4. Else (text, or media after pass-through): sender phone or LID matches allowlist cache (DB + `KASIR_AGENT_PHONES` emergency).
5. Pipe stamps `kasir_active_sender.json` under `KASIR_IDENTITY_DIR` (default `/opt/data/runtime`) for tool tenant resolve.
6. Hook returns `None` → Hermes agent runs with shared `SOUL.md` + `kasir-tools`. Media turns: SOUL *Foto / voice* routes to `kasir_draft_sale` / `kasir_draft_purchase` → poll. Kurikulum turns (`tanya` / `konsultasi` / `pendamping`): SOUL → `kasir_consult` → Nest (see **L9**). Returns wrapped via `user_safe`.
7. Tools read/write Supabase via service role. **No** POST to middleware webhook for ledger facts. **No** MEMORY.md / RAG for stok/harga/omzet. Consult RAG is Nest-only on the kurikulum notebook.

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

Agent replies to allowlisted chats go through the Hermes gateway. Last-mile denylist: `kasir-pipe` `transform_llm_output` → `user_safe` (gap **G11**). Hermes also runs `_sanitize_gateway_final_response` for provider-error redaction.

---

## Env (critical)

| Variable | Where | Purpose |
|----------|--------|---------|
| `WHATSAPP_PROVIDER=hermes` | middleware | Transport selection (always hermes in this repo) |
| `HERMES_BRIDGE_URL` | middleware | Default `http://hermes:8765` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | hermes plugins | Allowlist + tools + registrations |
| `KASIR_AGENT_PHONES` | hermes | Emergency allowlist for **pipe only** (not tenant fallback in tools) |
| `KASIR_REGISTRATION` | hermes | `1` = DAFTAR funnel; `0` = silent skip |
| `KASIR_MULTIMODAL` | hermes | `0` (default) = chat-only refuse; `1` = pass media → gateway STT/vision + SOUL → draft jual/beli. Config posture via `hermes-kasir-platform-locks.py` |
| `KASIR_CONSULT` | hermes **and** middleware | Compose default `0` (“belum aktif”); prod soft GA **`1`**. Allow `kasir_consult` → Nest RAG. Flip both sides together |
| `KASIR_CONSULT_URL` | hermes | Default `http://middleware:4001/internal/kasir-consult` |
| `KASIR_CONSULT_KEY` | hermes + middleware | Shared secret → header `X-Kasir-Consult-Key` (fail-closed if unset) |
| `KASIR_CONSULT_NOTEBOOK_ID` | middleware only | Studio notebook with ingested UKM PDF (prod: `48aee243-…`, 376 chunks) |
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
| Photo/voice while `KASIR_MULTIMODAL=0` | “Maaf, kasir ini masih chat teks saja. Ketik saja jual/stok/laporan ya.” + skip agent |
| Photo/voice while `KASIR_MULTIMODAL=1` | Gateway annotate → SOUL draft jual/beli → poll Ya/Batal (same as typed sale) |
| `tanya …` while `KASIR_CONSULT=0` | “Konsultasi kurikulum belum aktif…” (tool always registered; no Nest call / Nest also returns off) |
| `tanya …` while `KASIR_CONSULT=1` + miss chunks | Fixed miss copy — no free LLM |
| Nest consult timeout/5xx | “Layanan konsultasi lagi sibuk…” |
| Topik jelas di luar toko/buku (mis. kripto) | Sering refuse SOUL/scope sebelum Nest — jangan mengarang harga luar |
| Model invents stok without tool | Soft-ban in SOUL + tools-only facts (L8); egress `user_safe` still strips tool names |
| Bridge/proxy down | Admin QR / approve notify fail; agent may still chat if Baileys up |
| LID unmapped | Allowlist miss → registration path |

---

## Deploy note

Plugin code lives in the repo under `scripts/master-production/hermes-plugins/`. Production Hermes loads from the container volume (synced by `deploy-kasir-tools.py` / related deploy scripts). Merging this repo alone does not update a running host until that deploy step runs.

---

## Related docs

- Studio RAG: [`rag-architecture.md`](../../studio/system/rag-architecture.md) · diagrams [L1–L4](../../../../diagrams/aistudio/studio/system/)
- Ops quickstart: [`hermes-local.md`](./hermes-local.md)
- Gaps: [`hermes-gaps.md`](./hermes-gaps.md)
- Middleware short pointer: [`middleware/STUDIO_WHATSAPP.md`](../../../../middleware/STUDIO_WHATSAPP.md)
- UMKM funnel (sales pitch): [`../business/pitch.md`](../business/pitch.md)
- UMKM funnel (ops/trial): [`../business/ops/register-trial.md`](../business/ops/register-trial.md)
- Hub: [`../../README.md`](../../README.md)
- Production runbook: [`../../../deploy-master-production.md`](../../../deploy-master-production.md)
