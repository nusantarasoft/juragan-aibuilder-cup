# P2-5 — Dedicated WhatsApp inbox (ops)

**Design:** [docs/design/p2-5-dedicated-wa.md](../design/p2-5-dedicated-wa.md)

## Env flags

| Flag | Purpose |
|------|---------|
| `WA_DEDICATED_PAIR_MOCK=1` | QA/Demo: simulate pair without Hermes QR (non-production) |
| `WA_DEDICATED_PAIR_MOCK_PHONE` | Optional mock business digits (default `6281999900001`) |
| `WA_TENANT_DEDICATED_PAIR=1` | Allow tenant_owner live QR via `/admin/connect-wa` |

## Hermes

- Dedicated sessions use kasir-pipe `GET/POST /pair/*?session=umkm-{slug}` with creds under `platforms/whatsapp/sessions/{id}/`.
- **Production kasir-pipe inbound** still uses the platform default session until ops register additional WA profiles — DB mapping is source of truth for middleware routing/outbound gates.

## Fail closed

Store with `wa_inbox_mode=dedicated` and missing `wa_dedicated_paired_at` / business phone cannot **Aktifkan** or pass outbound customer send gate.
