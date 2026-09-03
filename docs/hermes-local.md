# Hermes Agent — WhatsApp transport (local + master-production)

Hermes is the **sole** WhatsApp transport for UMKM kasir (Baileys + `kasir-pipe` pipe-only).

Official Docker guide: [Hermes Docker docs](https://hermes-agent.nousresearch.com/docs/user-guide/docker)

---

## Local (`docker-compose.yml`)

### Ports (localhost only)

| Port | Use |
|------|-----|
| `127.0.0.1:8652` | Gateway / OpenAI-compatible API (container `:8642`) |
| `127.0.0.1:9129` | Dashboard (`HERMES_DASHBOARD=1`, container `:9119`) |

Override via `HERMES_GATEWAY_PORT` / `HERMES_DASHBOARD_PORT` in root `.env`.

### First-time setup

```powershell
mkdir volumes\hermes -Force
docker compose run --rm -it hermes setup
docker compose up -d hermes middleware
```

Set `WHATSAPP_PROVIDER=hermes` and `WHATSAPP_WEBHOOK_HMAC_KEY` (same value on middleware + hermes).

### Smoke

```powershell
python scripts\master-production\hermes-smoke-test.py
```

Pair via Admin → WhatsApp Gateway (or Hermes dashboard QR).

---

## Production (`docker-compose.master-production.yml`)

- Host public ports: `8090`, `3013`, `9010` only
- Hermes binds `127.0.0.1` only (SSH tunnel)
- `WHATSAPP_PROVIDER=hermes`
- Volume: `./volumes/hermes` (creds). Do not delete `creds.json` / logout without explicit ask.

See `docs/deploy-master-production.md`.
