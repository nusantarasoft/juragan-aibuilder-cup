# F2-3 — Connect WhatsApp (tenant owner ops)

Design: [docs/design/f2-3-tenant-wa-connection.md](../design/f2-3-tenant-wa-connection.md)

## v1 model

- **One shared NS WhatsApp** (Hermes/kasir). Tenants do **not** pair QR.
- **Platform admin** pairs Hermes at `/admin/ai-studio/ai-gateway` (unchanged).
- Tenant owner: `/admin/connect-wa` — phone → OTP (WA; **mock in QA**) → staff whitelist (max 5) → **Aktifkan**.
- Sidebar (tenant owner): **AI Studio → Hubungkan WhatsApp** (also **Rekrut karyawan**, **Karyawan AI saya**, **Pemakaian**); hidden from platform admin menu.
- **WA terhubung** = owner OTP verified + **Aktifkan** + notebook → lifts F2-2 outbound gate.
- `tenant_owner` hitting `/admin/ai-studio/umkm` is **redirected** to connect wizard (D8).

## Env (middleware)

| Variable | Purpose |
|----------|---------|
| `WA_OTP_MOCK=true` | **QA/local only** — return `mockCode` in GraphQL, skip Hermes send; **startup fails if set in production** |
| `WA_OTP_SECRET` | HMAC pepper for pending OTP hashes; **required in production** (no `f2-3-dev-wa-otp` default) |

Production: OTP is sent to **owner phone only** via shared NS WhatsApp (`WaOtpOutboundService` → Hermes `/send`). If send fails, GraphQL returns an honest error (no “sent” claim).

## v1 storage & limits (in-memory)

| Concern | Behavior |
|---------|----------|
| Pending OTP | In-process `Map` (key `storeId:phone`); **lost on middleware restart** |
| Rate limits | Same sliding window as F2-1 (`onboarding-rate-limit.ts`); **resets on restart** |
| Abuse keys | Per store, per phone, per IP (request); per store+phone (verify) |

Acceptable for v1 single-replica QA/prod; use Redis for multi-replica continuity later.

## QA

- No real customer WA blasts — use mock OTP from `requestOwnerWaOtp.mockCode`.
- Full stack `:4001` / `:3003`, Playwright `admin/tests/e2e/f2-3-connect-wa-fullstack.spec.ts`.
