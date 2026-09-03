# AI Studio — WhatsApp via Hermes

Chat AI Studio (RAG + database penjualan) diakses lewat WhatsApp menggunakan **Hermes** (Baileys bridge + plugin `kasir-pipe`). Brain kasir tetap di middleware (`StudioWhatsAppService` / `StudioUmkmService`).

## Setup

### 1. Environment

```env
WHATSAPP_PROVIDER=hermes
HERMES_BRIDGE_URL=http://hermes:8765
WHATSAPP_WEBHOOK_HMAC_KEY=your-webhook-secret
KASIR_WHATSAPP_WEBHOOK_URL=http://middleware:4001/api/studio/whatsapp/webhook
KASIR_PIPE_SESSION=hermes
```

Legacy alias (masih dibaca sebagai fallback): `WAHA_WEBHOOK_HMAC_KEY`.

### 2. Docker

```bash
docker compose up -d hermes middleware
```

- Hermes dashboard: `127.0.0.1:9129` (SSH tunnel on production — not public)
- Pair QR: Admin → **WhatsApp Gateway**
- Webhook: kasir-pipe → `POST /api/studio/whatsapp/webhook` (HMAC fail-closed)

### 3. Admin

1. Pair nomor bisnis di **WhatsApp Gateway**
2. Tambah UMKM + allowlist nomor pemilik
3. Uji lewat **Simulasi chat** (pipeline inbound tanpa kirim WA live)

## Catatan skema

Kolom DB `studio_whatsapp_config.waha_session` masih dipakai sebagai nama sesi/inbox legacy (biasanya `default` / `hermes`). Tidak merujuk ke layanan WAHA.

Lihat juga: `docs/hermes-local.md`, `docs/deploy-master-production.md`.
