# AI Studio — WhatsApp via Hermes

Kasir WhatsApp runs **inside Hermes** (Baileys + plugins `kasir-pipe` / `kasir-tools`). Middleware does **not** receive production inbound WA for kasir.

Canonical architecture: [`docs/aistudio/umkm-wa/system/hermes-architecture.md`](../docs/aistudio/umkm-wa/system/hermes-architecture.md) · ops: [`docs/aistudio/umkm-wa/system/hermes-local.md`](../docs/aistudio/umkm-wa/system/hermes-local.md) · hub: [`docs/aistudio/README.md`](../docs/aistudio/README.md)

## Setup

### 1. Environment (middleware)

```env
WHATSAPP_PROVIDER=hermes
HERMES_BRIDGE_URL=http://hermes:8765
KASIR_PIPE_SESSION=hermes
```

Optional (Simulasi / legacy Nest webhook only — **not** kasir inbound):

```env
WHATSAPP_WEBHOOK_HMAC_KEY=your-webhook-secret
```

Hermes plugins need `SUPABASE_URL` + service role (and optional `KASIR_AGENT_PHONES`, `KASIR_REGISTRATION`) — see architecture doc.

### 2. Docker

```bash
docker compose up -d hermes middleware
```

- Hermes dashboard: `127.0.0.1:9129` (SSH tunnel on production — not public)
- Pair QR: Admin → **WhatsApp Gateway** (`HermesProvider` → `:8765` `/pair/*`)
- Kasir chat: allowlisted numbers → Hermes agent; others → DAFTAR funnel in `kasir-pipe`

### 3. Admin

1. Pair nomor bisnis di **WhatsApp Gateway**
2. Tambah UMKM + allowlist nomor pemilik (`studio_whatsapp_config`)
3. Uji lewat **Simulasi chat** (Nest inbound pipeline without live WA) — separate from Hermes production path
4. After Approve, owner should get notify via middleware → Hermes `/send`, then can `cek stok`

## Catatan skema

Kolom DB `studio_whatsapp_config.session_name` menyimpan nama sesi/inbox (biasanya `hermes`).

`POST /api/studio/whatsapp/webhook` returns **410 Gone** by default (pipe-only). Escape hatch: `WHATSAPP_WEBHOOK_ENABLED=1`. Admin **Simulasi chat** does not use this route (`simulateInboundMessage`).

Lihat juga: `docs/deploy-master-production.md`, `docs/aistudio/umkm-wa/system/hermes-gaps.md`.
