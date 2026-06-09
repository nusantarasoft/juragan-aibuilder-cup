# AI Studio — WhatsApp via WAHA

Chat AI Studio (RAG + database penjualan) dapat diakses lewat WhatsApp menggunakan [WAHA](https://waha.devlike.pro/) (WhatsApp HTTP API, non-resmi / WhatsApp Web). Notifikasi WhatsApp juga memakai WAHA.

## Setup

### 1. Environment (root `.env`)

```env
WAHA_API_KEY=your-api-key-from-waha-init
WAHA_SESSION=default
WAHA_WEBHOOK_HMAC_KEY=your-webhook-secret
NEXT_PUBLIC_WAHA_DASHBOARD_URL=http://localhost:3010/dashboard
```

Generate credentials: jalankan container WAHA sekali dan ikuti log/dashboard, atau `docker compose run --rm waha` sesuai dokumentasi WAHA.

### 2. Docker

```bash
docker compose up -d waha
# Middleware dev di host:
cd middleware && npm run start:dev
```

- WAHA: http://localhost:3010 (Swagger), http://localhost:3010/dashboard (pairing QR)
- Webhook (middleware di **host**): `WHATSAPP_HOOK_URL=http://<LAN-IP>:4001/api/studio/whatsapp/webhook` (lihat `ipconfig`; `host.docker.internal` sering gagal di Windows)
- Webhook (middleware di **Docker**): `http://middleware:4001/api/studio/whatsapp/webhook`

Setelah ubah `WHATSAPP_HOOK_URL`, recreate WAHA: `docker compose up -d waha --force-recreate`

### 3. Database

```bash
Get-Content .\middleware\sql\studio_whatsapp.sql -Raw | docker exec -i postgres psql -U supabase_admin -d nusantarasoft -v ON_ERROR_STOP=1
```

### 4. Pair WhatsApp

1. Buka WAHA Dashboard → login (lihat env `WAHA_DASHBOARD_*` jika dikonfigurasi)
2. Start session `default` → scan QR dengan WhatsApp bisnis
3. Status harus **WORKING**

### 5. Admin — AI Studio → WhatsApp

1. Pilih **notebook** (harus punya sumber terindeks / sales views untuk pertanyaan penjualan)
2. Aktifkan **Aktifkan balasan WhatsApp**
3. Simpan
4. Isi **allowlist nomor** (wajib di `NODE_ENV=production` atau `STUDIO_WHATSAPP_REQUIRE_ALLOWLIST=true`; di dev kosong = semua nomor)

### 6. Uji

Kirim pesan ke nomor yang terhubung:

- "Berapa penjualan hari ini?"
- "Produk apa yang paling laris?"
- Kirim gambar + caption

## UMKM (catat penjualan + laporan)

Untuk use case **UMKM** — catat penjualan dan laporan harian lewat WA — lihat **[STUDIO_UMKM.md](./STUDIO_UMKM.md)** (setup) dan **[STUDIO_UMKM_FLOW.md](./STUDIO_UMKM_FLOW.md)** (alur & diagram flow).

## Arsitektur

- **Inbound:** WAHA → `POST /api/studio/whatsapp/webhook` → `StudioWhatsAppService` → UMKM / `StudioService.chat()` / guided flow
- **Outbound:** `WahaClientService.sendText` / `sendImage` / `sendFile`
- **Sesi:** `studio_whatsapp_sessions` maps `chat_id` ↔ `studio_conversations` (`channel=whatsapp`)

## Troubleshooting

### Status tetap `SCAN_QR_CODE` padahal sudah scan / chat sudah tampil

Ini **bug engine WEBJS** di WAHA ([issue #1690](https://github.com/devlikeapro/waha/issues/1690)): UI dashboard menampilkan chat, tapi API tetap `SCAN_QR_CODE` sehingga **tidak bisa kirim/balas pesan**.

**Solusi:**

1. Default engine: **WEBJS** (NOWEB sering `Connection Failure` / stuck `STARTING` di Docker Windows)
2. Reset sesi (hapus volume lama NOWEB/WEBJS yang bentrok):

```powershell
.\scripts\waha-reset-session.ps1
```

3. `docker compose pull waha` lalu recreate (perbaikan bug #1690 di image terbaru)
4. Scan QR sampai API **`WORKING`** — cek: `GET /api/sessions/default` dengan header `X-Api-Key`

| Gejala | Penyebab umum |
|--------|----------------|
| Pesan masuk, tidak ada balasan | `WHATSAPP_HOOK_URL` salah — WAHA container tidak reach middleware (Windows: pakai LAN IP, bukan `host.docker.internal`) |
| Log middleware: `invalid input syntax for type uuid: "wa:..."` | Sudah diperbaiki — `user_id` WA tidak boleh string `wa:phone` |
| Chat tampil di dashboard, status masih SCAN QR | Bug WEBJS → pakai NOWEB + reset volume |
| `sendText failed` | `WAHA_API_KEY` kosong di `middleware/.env.local` |
| Allowlist | Nomor harus format `628...` tanpa `+` |

Cek log middleware: `Webhook message session=default` harus muncul saat chat masuk.

## Keamanan

- Set `WAHA_WEBHOOK_HMAC_KEY` di production; middleware memvalidasi header `X-Webhook-Hmac`
- **Allowlist:** di production (`NODE_ENV=production`) atau `STUDIO_WHATSAPP_REQUIRE_ALLOWLIST=true`, allowlist wajib — tanpa nomor terdaftar, pesan ditolak dan aktivasi di admin ditolak
- **Rate limit:** `STUDIO_WHATSAPP_RATE_LIMIT_PER_MINUTE` (default `10`) per nomor pengirim; kelebihan mendapat balasan singkat tanpa memanggil LLM
- Protokol WhatsApp Web berisiko session putus / pembatasan; gunakan nomor dedicated

## Notifikasi

Channel WhatsApp di modul Notifications memakai `WahaClientService` yang sama (`sendText`).
