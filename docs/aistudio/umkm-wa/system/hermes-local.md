# Hermes Agent — WhatsApp transport (local + master-production)

**System doc** (AI Studio → UMKM WA). Architecture: [`hermes-architecture.md`](./hermes-architecture.md) · Gaps: [`hermes-gaps.md`](./hermes-gaps.md) · Pitch: [`../business/pitch.md`](../business/pitch.md) · Trial: [`../business/ops/register-trial.md`](../business/ops/register-trial.md)

Hermes is the **sole** WhatsApp transport for UMKM kasir (Baileys + `kasir-pipe` pipe-only).

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

Pin the image (do not leave bare `:latest` on shared machines):

```env
HERMES_IMAGE=nousresearch/hermes-agent:v2026.8.27
```

### First-time setup

```powershell
mkdir volumes\hermes -Force
docker compose run --rm -it hermes setup
docker compose up -d hermes middleware
```

After first pair, lock down Baileys session creds (Hermes security BP):

```bash
chmod 700 volumes/hermes/platforms/whatsapp/session
```

Enable kasir plugins in the Hermes volume (or run `deploy-kasir-tools` / copy plugins then `hermes plugins enable`):

- `kasir-pipe`, `kasir-tools` must appear under `plugins.enabled` in `volumes/hermes/config.yaml`

Set `WHATSAPP_PROVIDER=hermes` and `HERMES_BRIDGE_URL=http://hermes:8765` on middleware.

Optional: set `WHATSAPP_HOME_CHANNEL` to an ops/agent DM JID (`628…@s.whatsapp.net`) so Hermes does not nag `/sethome` on every new chat (gap **G12**).

Kasir inbound does **not** go through the Nest webhook. `WHATSAPP_WEBHOOK_HMAC_KEY` is only needed if you use Nest `POST /api/studio/whatsapp/webhook` (Simulasi / legacy).

`WHATSAPP_ALLOWED_USERS=*` on Hermes is intentional for the open DAFTAR funnel; the real gate is `kasir-pipe` → DB (see gaps **G2**).

### Smoke / health

```powershell
python scripts\master-production\hermes-smoke-test.py
python scripts\master-production\hermes-kasir-health.py
```

Pair via Admin → WhatsApp Gateway (or Hermes dashboard QR).

**Note:** A fresh `volumes/hermes/config.yaml` may still show stock defaults (`tool_progress: all`, empty `plugins.enabled`, `platform_toolsets.whatsapp: hermes-whatsapp`). Production posture is applied by `silence-hermes-wa-tools.py` / `deploy-kasir-tools.py` / `hermes-wa-tool-allowlist.py` — health script fails on plugin or tool-allowlist drift (gaps **G2**, **G5**, **G13**).

`KASIR_MULTIMODAL` compose default **off** (chat-only). **Prod soft GA ON** (2026-09-20): foto/suara pass through → STT/vision + draft jual. Wire: compose `KASIR_MULTIMODAL=${KASIR_MULTIMODAL:-0}` + `.env.master-production` (prod currently `1`).

**Multimodal smoke checklist**

1. `hermes-kasir-health.py` PASS (required checks) + `hermes-kasir-platform-locks.py check --docker` PASS (`stt.language=id`, `image_input_mode`, SOUL *Foto / voice*, no MEMORY.md).
2. Or one-shot: `HERMES_HOME=./volumes/hermes python3 scripts/master-production/hermes-kasir-posture.py apply` (also used by `redeploy.sh` / `deploy-kasir-tools.py` after hermes recreate).
3. **OFF (automated):** `docker exec -e HERMES_HOME=/opt/data nsoft3-hermes python3 /opt/data/multimodal-smoke.py off --phone 628…` → skip + refuse teks. Optional `--send` to deliver refuse over WA.
4. **OFF (manual QA):** allowlisted phone sends real foto/voice → same refuse; log `kasir-pipe: media refuse`.
5. **ON:** set `KASIR_MULTIMODAL=1` → recreate hermes → `multimodal-smoke.py on` + optional real media.
6. Facts still tools/DB only — never MEMORY.md ledger (diagram **L8**). Short-term per-chat WA history is OK (konteks thread); that is not store KB. See architecture Platform locks + **L0c** / **L7** / **L8**.

**W2 + soft GA 2026-09-20 (prod):** health + posture PASS; OFF/ON smoke; live foto ON; left **`KASIR_MULTIMODAL=1`** (dengan consult ON).

### Kurikulum consult (`KASIR_CONSULT`)

Compose/example default **off**. **Prod soft GA ON** (2026-09-20): ingest done (376 chunks), `KASIR_CONSULT_NOTEBOOK_ID` + shared `KASIR_CONSULT_KEY` set, flag **`1`** on hermes **and** middleware. Page cites (`KASIR_CONSULT_CITE_PAGES`) and metrics inject (`KASIR_CONSULT_INJECT_METRICS`) stay **0** until product asks. Ops runbook: [`../business/ops/consult-kurikulum.md`](../business/ops/consult-kurikulum.md).

```bash
# Local unit smoke (no Docker)
python3 scripts/master-production/hermes-consult-smoke.py off
python3 scripts/master-production/hermes-consult-smoke.py on

# Nest unit
cd middleware && npm run test -- src/studio/studio-umkm-pendamping.consult.spec.ts \
  src/studio/internal-kasir-consult.controller.spec.ts

# Container (after deploy copies consult-smoke.py)
docker exec -e HERMES_HOME=/opt/data nsoft3-hermes \
  python3 /opt/data/consult-smoke.py on --plugin-root /opt/data/plugins/kasir-tools
```

Flip both services together; recreate + `hermes-kasir-posture.py apply`. Diagrams **L8** / **L9**.

---

## Production (`docker-compose.master-production.yml`)

- Host public ports: `8090`, `3013`, `9010` only
- Hermes binds `127.0.0.1` only (SSH tunnel)
- `WHATSAPP_PROVIDER=hermes`
- Volume: `./volumes/hermes` (creds). Do not delete `creds.json` / logout without explicit ask.
- Default image pin: `nousresearch/hermes-agent:v2026.8.27` (override with `HERMES_IMAGE`)
- `WHATSAPP_HOME_CHANNEL` / `WHATSAPP_HOME_CHANNEL_NAME` — ops home JID (often same digits as paired agent)

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
- `volumes/hermes/SOUL.md` — asisten kasir (Bahasa, routing tool, konfirmasi *ya*; no `kasir_` / `draft_id` to user)
- plugin tree under the Hermes volume (repo `scripts/master-production/hermes-plugins/`), including `user_safe` (**G11**)

See [`../../../deploy-master-production.md`](../../../deploy-master-production.md) and [`hermes-architecture.md`](./hermes-architecture.md).
