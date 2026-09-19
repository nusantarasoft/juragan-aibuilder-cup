# Hermes Agent — WhatsApp transport (local + master-production)

Hermes is the **sole** WhatsApp transport for UMKM kasir (Baileys + `kasir-pipe` pipe-only).

**How it works (architecture):** [`hermes-architecture.md`](./hermes-architecture.md)

Official Docker guide: [Hermes Docker docs](https://hermes-agent.nousresearch.com/docs/user-guide/docker)

---

## Local (`docker-compose.yml`)

### Ports (localhost only)

| Port | Use |
|------|-----|
| `127.0.0.1:8652` | Gateway / OpenAI-compatible API (container `:8642`) |
| `127.0.0.1:9129` | Dashboard (`HERMES_DASHBOARD=1`, container `:9119`) |
| (docker network) `hermes:8765` | Bridge+pair proxy for middleware (`HERMES_BRIDGE_URL`) |

Override via `HERMES_GATEWAY_PORT` / `HERMES_DASHBOARD_PORT` in root `.env`.

### First-time setup

```powershell
mkdir volumes\hermes -Force
docker compose run --rm -it hermes setup
docker compose up -d hermes middleware
```

Set `WHATSAPP_PROVIDER=hermes` and `HERMES_BRIDGE_URL=http://hermes:8765` on middleware.

Kasir inbound does **not** go through the Nest webhook. `WHATSAPP_WEBHOOK_HMAC_KEY` is only needed if you use Nest `POST /api/studio/whatsapp/webhook` (Simulasi / legacy).

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

### Kasir WhatsApp: hide tool chrome

Hermes defaults to mid-turn bubbles like `⚙️ kasir_daily_report...` in WhatsApp.
Kasir should only send the final reply. Silence with:

```powershell
python scripts\master-production\silence-hermes-wa-tools.py
python scripts\master-production\silence-hermes-wa-tools.py --status
```

This sets `display.tool_progress: off` (and WhatsApp override), plus turns off
interim assistant messages / long-running / busy-ack chrome. Also re-applied by
`deploy-kasir-tools.py` on each deploy.

Also deployed by `deploy-kasir-tools.py`:
- `tools.tool_search.enabled: off` — kasir tools stay eager (no `⚙️ tool_search`)
- `volumes/hermes/SOUL.md` — asisten kasir (Bahasa, routing tool, konfirmasi *ya*)
- plugin tree under the Hermes volume (repo `scripts/master-production/hermes-plugins/`)

See `docs/deploy-master-production.md` and `docs/hermes-architecture.md`.
