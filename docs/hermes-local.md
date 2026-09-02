# Hermes Agent — local sidecar + master-production Phase 1

Hermes runs next to WAHA for smoke / Phase 1 pipe-only probing.
It does **not** replace WAHA or the UMKM WhatsApp pipeline until `WHATSAPP_PROVIDER=hermes` after a documented server probe.

Design: [`docs/designs/waha-to-hermes-migration.md`](./designs/waha-to-hermes-migration.md)  
Eng plan: [`docs/designs/waha-to-hermes-eng-review.md`](./designs/waha-to-hermes-eng-review.md)

Official Docker guide: [Hermes Docker docs](https://hermes-agent.nousresearch.com/docs/user-guide/docker)

---

## Local (`docker-compose.yml`)

### Ports (localhost only)

Host ports are **offset** from Hermes Desktop defaults (`8642`/`9119`) so both can run on the same laptop.

| Port | Use |
|------|-----|
| `127.0.0.1:8652` | Gateway / OpenAI-compatible API (container `:8642`) |
| `127.0.0.1:9129` | Dashboard (`HERMES_DASHBOARD=1`, container `:9119`) |
| `127.0.0.1:3010` | WAHA (unchanged) |

Override via `HERMES_GATEWAY_PORT` / `HERMES_DASHBOARD_PORT` in root `.env`.

### First-time setup

```powershell
mkdir volumes\hermes -Force
# Copy Hermes vars into your root .env if missing (see .env.example)
docker compose run --rm -it hermes setup
docker compose up -d hermes
```

`setup` writes provider keys and config into `./volumes/hermes` (bind-mounted to `/opt/data`).

Alternatively, set `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` in root `.env` and skip the wizard.

### Smoke test

```powershell
docker compose ps hermes
docker compose logs -f hermes
```

- Dashboard: http://127.0.0.1:9129  
- Gateway: http://127.0.0.1:8652  

WAHA dashboard stays at http://127.0.0.1:3010/dashboard — UMKM WhatsApp flow is unchanged.

---

## Production (`docker-compose.master-production.yml`) — Phase 1 (E0)

**Server:** `31.97.66.39` · path `/opt/nusantarasoft-3` · project `nsoft3-prod` · container `nsoft3-hermes`

Live kasir transport is **Hermes** (`WHATSAPP_PROVIDER=hermes`). WAHA stays in compose for rollback only.

### Isolation

| Rule | Value |
|------|--------|
| Image | **Pinned** via `HERMES_IMAGE` (default `nousresearch/hermes-agent:v2026.8.27`) — never bare `:latest` |
| Memory | `deploy.resources.limits.memory: 2g` (pipe-only; raise only if enabling LLM agent) |
| Host ports | `127.0.0.1:8652` / `127.0.0.1:9129` only — **not** on public IP |
| Middleware URL | `HERMES_BASE_URL=http://hermes:8642` on `nsoft3-net` |
| Kasir provider | Keep `WHATSAPP_PROVIDER=waha` until Phase 2+ |
| LLM keys | **Not required** for pipe-only Phase 1 — do not set OpenAI/Anthropic/OpenRouter on prod for this probe |
| WAHA | Stays live on pilot number; Hermes pairs a **test number** only (one WhatsApp Web session per phone) |

Dual-run budget: WAHA ~2g + Hermes ~2g + rest of stack — watch `free -h` / `docker stats` after first `up`.

### Deploy Hermes only (server)

```bash
cd /opt/nusantarasoft-3
mkdir -p volumes/hermes
# Ensure .env.master-production has HERMES_IMAGE + WHATSAPP_PROVIDER=waha (see .env.master-production.example)
docker compose -f docker-compose.master-production.yml --env-file .env.master-production up -d hermes
docker compose -f docker-compose.master-production.yml --env-file .env.master-production ps hermes
docker compose -f docker-compose.master-production.yml --env-file .env.master-production logs -f hermes
```

Dashboard via SSH tunnel (from laptop):

```bash
ssh -L 9129:127.0.0.1:9129 root@31.97.66.39
# then open http://127.0.0.1:9129
```

**Login GUI:** username `admin`. Password + secret: `scripts/master-production/deploy.local.env` (gitignored; also mirrored on server `.env.master-production`).

Env keys: `HERMES_DASHBOARD_BASIC_AUTH_USERNAME` / `_PASSWORD` / `_SECRET`.

Or QR / WhatsApp setup via:

```bash
docker compose -f docker-compose.master-production.yml --env-file .env.master-production exec -it hermes hermes whatsapp
```

### Phase 1 probe checklist (E1 — blocks adapter merge)

Document results here (or in a dated note under this section) before any `HermesProvider` PR:

1. [ ] Hermes container healthy; session paired on **test number** (not pilot)
2. [ ] Pipe-only: inbound does **not** get an Hermes LLM/agent reply
3. [ ] Forward to `http://middleware:4001/api/studio/whatsapp/webhook` with HMAC (`x-webhook-hmac` / `WAHA_WEBHOOK_HMAC_KEY`)
4. [ ] Middleware log shows one inbound; capture payload shape (normalizer yes/no)
5. [x] Exact config path chosen: **`pre_gateway_dispatch` plugin `kasir-pipe`** (see below)

**Working pipe-only config (plugin path — preferred):**

Plugin source (tracked): `scripts/master-production/hermes-plugins/kasir-pipe/`  
Runtime path on server: `volumes/hermes/plugins/kasir-pipe/` (`HERMES_HOME=/opt/data`)

`config.yaml`:

```yaml
plugins:
  enabled:
    - kasir-pipe
```

Compose / env on `nsoft3-hermes` (no LLM keys):

| Var | Value |
|-----|--------|
| `WHATSAPP_ENABLED` | `true` |
| `KASIR_WHATSAPP_WEBHOOK_URL` | `http://middleware:4001/api/studio/whatsapp/webhook` |
| `WAHA_WEBHOOK_HMAC_KEY` | same as middleware / WAHA hook |
| `KASIR_PIPE_SESSION` | `hermes` (webhook `session` field) |
| `KASIR_BRIDGE_PROXY` / `_PORT` | outbound proxy `0.0.0.0:8765` → bridge `127.0.0.1:3000` |
| Middleware `HERMES_BRIDGE_URL` | `http://hermes:8765` (used when `WHATSAPP_PROVIDER=hermes`) |

Middleware transport (repo): `middleware/src/whatsapp/` — `WhatsAppTransport` + `WahaProvider` + `HermesProvider`. Default env remains **`WHATSAPP_PROVIDER=waha`** until Phase 2 QA + Phase 3 cutover.

**Pair test number (interactive — you must scan):**

```bash
# laptop tunnel
ssh -L 9129:127.0.0.1:9129 root@31.97.66.39
# open http://127.0.0.1:9129 → login admin → WhatsApp → QR
# OR:
cd /opt/nusantarasoft-3
docker compose -f docker-compose.master-production.yml --env-file .env.master-production exec -it hermes hermes whatsapp
```

Use a **test phone**, never the pilot number still on WAHA.

**Cutover (2026-09-03):** Hermes is the live WhatsApp transport.

- Middleware `WHATSAPP_PROVIDER=hermes`; `HERMES_BRIDGE_URL=http://hermes:8765`
- Number `62811924689` (Nusantarasoft) paired on Hermes; WAHA session `default` left **FAILED** (same number — expected). Container `nsoft3-waha` still up for rollback.
- Bridge allowlist `WHATSAPP_ALLOWED_USERS=*` so inbound reaches kasir-pipe; middleware production allowlist is the real gate. No LLM keys.
- Adapter started `bridge.js` (`Bridge ready status: connected`). `GET /pair/status` → **WORKING**.
- Outbound probe `POST /send` → `200 success` (HermesProvider path).
- HMAC fail-closed unchanged. Pending sales/purchases were empty at flip.

Rollback: set `WHATSAPP_PROVIDER=waha`, recreate middleware, restart WAHA session + re-QR if needed.

### Notes

- Data dir `volumes/hermes/` is gitignored (secrets + sessions).
- Do not run two Hermes gateways against the same data directory.
- Replacing WAHA needs `WhatsAppTransport` + cutover preflight — see eng review.
