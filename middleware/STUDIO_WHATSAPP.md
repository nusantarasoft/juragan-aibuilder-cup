# AI Studio — WhatsApp via Hermes

Kasir WhatsApp runs **inside Hermes** (Baileys + plugins `kasir-pipe` / `kasir-tools`). Middleware does **not** receive production inbound WA for kasir.

Canonical architecture: [`docs/hermes-architecture.md`](../docs/hermes-architecture.md) · ops: [`docs/hermes-local.md`](../docs/hermes-local.md)

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

`POST /api/studio/whatsapp/webhook` remains for Simulasi/legacy. It is **not** the kasir production inbound path (pipe-only). A fail-closed guard is tracked in `TODOS.md`.

Lihat juga: `docs/deploy-master-production.md`.
