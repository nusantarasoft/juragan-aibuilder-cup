# Hermes Agent — local sidecar

Hermes runs next to WAHA in [`docker-compose.yml`](../docker-compose.yml) for smoke testing.
It does **not** replace WAHA or the UMKM WhatsApp pipeline yet (no middleware wiring).

Official Docker guide: [Hermes Docker docs](https://hermes-agent.nousresearch.com/docs/user-guide/docker)

## Ports (localhost only)

Host ports are **offset** from Hermes Desktop defaults (`8642`/`9119`) so both can run on the same laptop.

| Port | Use |
|------|-----|
| `127.0.0.1:8652` | Gateway / OpenAI-compatible API (container `:8642`) |
| `127.0.0.1:9129` | Dashboard (`HERMES_DASHBOARD=1`, container `:9119`) |
| `127.0.0.1:3010` | WAHA (unchanged) |

Override via `HERMES_GATEWAY_PORT` / `HERMES_DASHBOARD_PORT` in root `.env`.

## First-time setup

```powershell
mkdir volumes\hermes -Force
# Copy Hermes vars into your root .env if missing (see .env.example)
docker compose run --rm -it hermes setup
docker compose up -d hermes
```

`setup` writes provider keys and config into `./volumes/hermes` (bind-mounted to `/opt/data`).

Alternatively, set `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` in root `.env` and skip the wizard.

## Smoke test

```powershell
docker compose ps hermes
docker compose logs -f hermes
```

- Dashboard: http://127.0.0.1:9129  
- Gateway: http://127.0.0.1:8652  

WAHA dashboard stays at http://127.0.0.1:3010/dashboard — UMKM WhatsApp flow is unchanged.

## Notes

- Data dir `volumes/hermes/` is gitignored (secrets + sessions).
- Do not run two Hermes gateways against the same data directory.
- Production / `master-production` is out of scope until local smoke test passes.
- Replacing WAHA later needs a separate Hermes WhatsApp ↔ `StudioWhatsAppService` adapter.
