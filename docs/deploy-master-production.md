# Deploy master-production (go-live)

Runbook untuk deploy `nusantarasoft-3` ke server production **tanpa mengganggu container app lain**.

## Ringkasan

| Item | Nilai |
|------|--------|
| Branch go-live | `master-production` |
| Server | `31.97.66.39` |
| Path di server | `/opt/nusantarasoft-3` |
| Compose | `docker-compose.master-production.yml` |
| Env (git-ignored) | `.env.master-production` |
| Compose project | `nsoft3-prod` |
| Network | `nsoft3-net` |
| Container prefix | `nsoft3-*` |

### Port yang di-publish (hanya ini)

| Port | Service |
|------|---------|
| `8090` | nginx (landing, `/graphql`, supabase proxy) |
| `3013` | admin |
| `9010` | MinIO S3 API |

WhatsApp transport = **Hermes only** (`nsoft3-hermes`). Binds **`127.0.0.1:8652` / `127.0.0.1:9129` only** (SSH tunnel) — not on the public IP. `WHATSAPP_PROVIDER=hermes`. Architecture: `docs/hermes-architecture.md`. Ops: `docs/hermes-local.md`. Gaps/status: `docs/hermes-gaps.md`.

App lain di server yang **tidak** disentuh: Portainer, pustaka, andromedia, ipustah, beapi-*, dll.

## Isolasi (aman untuk co-host)

`docker compose` selalu memakai file `docker-compose.master-production.yml` + project name `nsoft3-prod`. Redeploy **hanya** recreate/restart container `nsoft3-*`. Tidak `docker stop` / `docker rm` container di luar filter itu.

## Prasyarat (mesin Windows)

1. Repo lokal bersih (atau commit dulu) sebelum merge/deploy.
2. Python 3 + `paramiko` (`pip install paramiko`).
3. Env SSH:
   - `SSH_HOST=31.97.66.39`
   - `SSH_USER=root`
   - `SSH_PASS=...` (jangan commit / jangan paste ke chat)
4. Akses GitHub di server (salah satu):
   - `DEPLOY_GIT_URL=git@github.com:spygunpro/nusantarasoft-3.git` (deploy key read-only, disarankan), **atau**
   - `GITHUB_TOKEN=ghp_...` / fine-grained dengan Contents Read (jangan commit / jangan paste ke chat)

## Alur standar

Dari root repo:

```powershell
$env:SSH_HOST="31.97.66.39"
$env:SSH_USER="root"
$env:SSH_PASS="********"
$env:GITHUB_TOKEN="ghp_********"   # atau DEPLOY_GIT_URL=git@...
$env:PYTHONIOENCODING="utf-8"
powershell -ExecutionPolicy Bypass -File scripts/master-production/deploy.ps1
```

Script melakukan:

1. Checkout `master-production`, **merge** `origin/master` ke dalamnya, **push** `origin/master-production`.
2. Di server: `git fetch` + hard reset ke `origin/master-production` (bootstrap clone jika belum ada `.git`; `.env` + volume DB/storage di-preserve).
3. Jalankan `scripts/master-production/redeploy.sh`:
   - build serial: middleware → landing-page → admin
   - pastikan DB `_supabase` / auth ownership
   - apply migrasi app
   - `docker compose ... up -d`
   - restart `nsoft3-nginx` (supaya upstream IP tidak stale → hindari 502)

### Switch berguna

| Switch | Kapan |
|--------|--------|
| `-SkipMerge` | Merge/push sudah dilakukan; hanya pull + redeploy |
| `-SkipPush` | Merge lokal saja, jangan push (jarang; server tidak dapat commit baru) |
| `-SkipMerge -SkipPush` | Hanya pull server + redeploy (paling aman setelah merge sudah selesai) |

## Verifikasi setelah deploy

Di server (atau dari laptop ke IP publik):

- Admin: `http://31.97.66.39:3013` (sering `307` redirect = OK)
- Landing/nginx: `http://31.97.66.39:8090` → diharapkan `200`
- GraphQL: `POST http://31.97.66.39:8090/graphql` dengan `{"query":"{ __typename }"}` → `200`
- Pastikan app lain masih `Up`: `docker ps` (portainer, pustaka, andromedia, …)

## Troubleshooting

| Gejala | Tindakan |
|--------|----------|
| SSH / port 22, 9000, 8090 timeout | Server/network down; jangan ulang merge; tunggu lalu `-SkipMerge -SkipPush` |
| `Working tree is dirty` | Commit/stash dulu, atau `-SkipMerge` jika hanya mau redeploy |
| nginx `502` setelah recreate app | `docker restart nsoft3-nginx` (sudah otomatis di `redeploy.sh` terbaru) |
| Git pull gagal di server | Set `DEPLOY_GIT_URL` / `GITHUB_TOKEN`; pastikan token tidak bocor di chat |
| Unicode error di console Windows saat SSH | Set `$env:PYTHONIOENCODING="utf-8"`; `_ssh.py` sudah fallback replace |

## File terkait

- `scripts/master-production/deploy.ps1` — orkestrasi dari Windows
- `scripts/master-production/pull-on-server.sh` — git pull/bootstrap di server
- `scripts/master-production/redeploy.sh` — build + up + migrasi
- `scripts/master-production/apply-migrations.sh` — SQL migrasi
- `scripts/master-production/_ssh.py` — helper SSH/SFTP
- `docker-compose.master-production.yml`
- `.env.master-production.example`

## Instruksi singkat untuk AI

Jika user bilang “deploy production” / “deploy master-production”:

1. Konfirmasi isolasi: hanya stack `nsoft3-*`.
2. Jangan menyimpan secret di file repo / jangan minta user paste token ke chat kalau bisa dihindari; pakai env lokal.
3. Jalankan `deploy.ps1` (merge dari `master` kecuali user minta skip).
4. Setelah selesai, verifikasi URL di atas + `docker ps` untuk app non-nsoft3 masih hidup.
5. Jangan `docker compose down` tanpa filter project, dan jangan restart container di luar `nsoft3-*` kecuali diminta eksplisit.
