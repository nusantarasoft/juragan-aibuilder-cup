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

WhatsApp transport = **Hermes only** (`nsoft3-hermes`). Binds **`127.0.0.1:8652` / `127.0.0.1:9129` only** (SSH tunnel) — not on the public IP. `WHATSAPP_PROVIDER=hermes`. Architecture: `docs/aistudio/umkm-wa/system/hermes-architecture.md`. Ops: `docs/aistudio/umkm-wa/system/hermes-local.md`. Gaps/status: `docs/aistudio/umkm-wa/system/hermes-gaps.md`. AI Studio hub: `docs/aistudio/README.md`.

App lain di server yang **tidak** disentuh: Portainer, pustaka, andromedia, ipustah, beapi-*, dll.

## Isolasi (aman untuk co-host)

`docker compose` selalu memakai file `docker-compose.master-production.yml` + project name `nsoft3-prod`. Redeploy **hanya** recreate/restart container `nsoft3-*`. Tidak `docker stop` / `docker rm` container di luar filter itu.

## Prasyarat (mesin Windows / Mac)

1. Repo lokal **bersih** sebelum merge/deploy: tidak ada perubahan tracked/untracked yang non-ignored. `deploy.ps1` **abort** di awal dengan daftar file jika tree kotor — **tanpa** auto-stash, auto-reset, atau `git clean`. Untuk eksperimen lokal, pakai **git worktree** terpisah (disarankan) atau commit dulu.
2. Python 3 + `paramiko` (`pip install paramiko`).
3. Env SSH:
   - `SSH_HOST=31.97.66.39`
   - `SSH_USER=root`
   - `SSH_PASS=...` (jangan commit / jangan paste ke chat)
<<<<<<< HEAD
4. Akses GitHub di server (salah satu):
   - `DEPLOY_GIT_URL=git@github.com:nusantarasoft/nusantarasoft-3.git` (deploy key read-only, disarankan), **atau**
   - `GITHUB_TOKEN=ghp_...` / fine-grained dengan Contents Read (jangan commit / jangan paste ke chat)
=======
4. Akses GitHub di server (disarankan deploy key read-only):
   - Jalankan sekali `scripts/master-production/setup-deploy-key.sh` dari laptop (SSH ke server) — lihat [Migrasi token → deploy key](#migrasi-token--deploy-key-ssh) di bawah.
   - Setelah key terpasang di GitHub: `DEPLOY_GIT_URL=git@github-nusantarasoft-3:nusantarasoft/nusantarasoft-3.git` (alias host + `core.sshCommand` di server), **atau**
   - Legacy: `GITHUB_TOKEN=ghp_...` / fine-grained Contents Read (jangan commit / jangan paste ke chat)
>>>>>>> origin/master

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
2. **Satu job detached di server** (upload script pull stdin-safe + `redeploy-detached.sh start PULL`): Hermes backup + `git fetch`/reset ke **SHA target** (`origin/master-production` setelah push), lalu `redeploy.sh` (bootstrap clone jika belum ada `.git`; `.env` + volume DB/storage + **`volumes/hermes` runtime** di-preserve). Sebelum reset, pull menar `volumes/hermes` ke tar di `backups/hermes-runtime/` (rotasi 5 file) dan stash/restore agar transisi **untrack** Hermes tidak menghapus runtime Hermes.
3. Isi `redeploy.sh` (jalan di dalam job yang sama):
   - build serial: middleware → landing-page → admin
   - pastikan DB `_supabase` / auth ownership
   - apply migrasi app
   - `docker compose ... up -d`
   - restart `nsoft3-nginx` (supaya upstream IP tidak stale → hindari 502)
   - **Hermes kasir posture** (`hermes-kasir-posture.py`) — restore `plugins.enabled` + display silence + allowlist + platform locks after hermes recreate; **volume ownership** (`chown`/`chmod` to container uid/gid so `kanban.db` and s6 logs are writable — no `state.db` / WA session content changes); multimodal OFF smoke
   - **prune image nsoft3** (opt-in) — default **off** di `redeploy.sh` step 9. Set `NSOFT3_PRUNE_IMAGES=1` on server untuk menjalankan `prune-nsoft3-images.sh` (hanya image `nsoft3-prod` / `nsoft3/*` / hermes unused + build cache unused >7d; tidak `docker system prune -a` global).
   - **UMKM smoke** (`smoke-umkm.sh`) — step 10: GraphQL `:8090`, `/internal/kasir-consult` auth + harmless `tanya` probe, Hermes WA connected, `hermes-kasir-posture.py check`. Tanpa tulis ledger / tanpa kirim WA. Coach probe hanya jika `KASIR_COACH_SMOKE_PHONE` di-set (tenant demo ops).

### Switch berguna

| Switch | Kapan |
|--------|--------|
| `-SkipMerge` | Merge/push sudah dilakukan; hanya pull + redeploy (tree harus tetap bersih) |
| `-SkipPush` | Merge lokal saja, jangan push (jarang; server tidak dapat commit baru) |
| `-SkipMerge -SkipPush` | Hanya pull server + redeploy (paling aman setelah merge sudah selesai) |
| `-AllowDirty` | Lewati **semua** sync git lokal; server tetap pull `origin/master-production`. **Tidak pernah** menghapus/meng-overwrite perubahan lokal |
| `-Attach` | Lewati merge/pull lokal; sambung ke redeploy server yang masih jalan (tail log sampai selesai) |
| `-Status` | Lewati merge/pull lokal; cetak status redeploy server + exit code jika sudah selesai |
| `NSOFT3_PRUNE_IMAGES=1` (di server, sebelum `redeploy.sh`) | Jalankan step 9 prune disk; default tanpa env = skip |

### Deploy detached (Mac sleep / SSH drop)

Step `[2/3]`–`[3/3]`: upload script pull + trigger `redeploy-detached.sh start <pull-script>` (bukan SSH session panjang). Git fetch, backup Hermes, dan build docker tetap jalan di server jika laptop tidur atau SSH putus. Polling status/tail memakai SSH capture pendek dengan retry. Sebelum SFTP upload, `deploy.ps1` menjalankan `mkdir -p /opt/nusantarasoft-3/logs` dan `scripts/master-production` di server (SFTP tidak membuat parent dir; install fresh tanpa folder `logs/` gagal upload).

| Item | Path |
|------|------|
| Log deploy | `/opt/nusantarasoft-3/logs/deploy-YYYYMMDD-HHMMSS.log` |
| Lock | `/opt/nusantarasoft-3/logs/.deploy.lock` |
| State | `/opt/nusantarasoft-3/logs/.deploy.state` — ditulis **segera** saat `start` (STATUS=`running`, LOG, SHA target, STARTED); diperbarui ke `success`/`failed` + EXIT saat job selesai |
| Lock (early) | `.deploy.lock` ditulis bersamaan state (PID=`0` + LOG) **sebelum** wrapper spawn; PID wrapper menggantikan `0` setelah `nohup` (D-8) |

Setelah putus: `deploy.ps1 -Attach` (tail sampai selesai) atau `-Status` (snapshot). Keduanya memastikan `logs/` ada, meng-upload `redeploy-detached.sh` terbaru, lalu poll status (lock/PID hidup menang atas state file stale; poll pertama retry idle ≤15s). Lock menolak deploy concurrent; jangan start deploy baru saat yang lama masih jalan.

## Hermes runtime (`volumes/hermes`)

- **Tidak** di-git: isi live (DB, config, channel map, gateway, cron, logs, skills cache) hanya di server.
- **Source of truth** plugin + seed: `scripts/master-production/hermes-plugins/` dan `scripts/master-production/hermes-home/`; `redeploy.sh` memanggil `hermes-kasir-posture.py apply --sync-plugins`.
- Fresh install: `mkdir -p volumes/hermes` (lihat `up-hermes.sh` / compose mount), lalu posture apply setelah container hermes up.
- **Ownership:** Host deploy as root can leave `kanban.db` as `root:root` `644` while Hermes runs as uid **10000** → “not writable” + s6-log EPERM. `hermes-kasir-posture.py apply` fixes **only** `kanban.db` (uid/gid from `.env` or volume dir stat; default **10000:10000**; never `docker exec id` or `chown -R`). Does not change `.env` (600) or session dir modes. Optional env: `HERMES_VOLUME_UID` / `HERMES_VOLUME_GID`.
- **Deploy key (parked):** `setup-deploy-key.sh` exists for a future SSH deploy-key migration; production pull stays **HTTPS + `GITHUB_TOKEN`** until that migration is explicitly scheduled.

## Verifikasi setelah deploy

Di server (atau dari laptop ke IP publik):

- Admin: `http://31.97.66.39:3013` (sering `307` redirect = OK)
- Landing/nginx: `http://31.97.66.39:8090` → diharapkan `200`
- GraphQL: `POST http://31.97.66.39:8090/graphql` dengan `{"query":"{ __typename }"}` → `200`
- Di server: `bash scripts/master-production/smoke-umkm.sh` (sama dengan step akhir `redeploy.sh`) → exit 0
- Pastikan app lain masih `Up`: `docker ps` (portainer, pustaka, andromedia, …)

## Troubleshooting

| Gejala | Tindakan |
|--------|----------|
| SSH / port 22, 9000, 8090 timeout | Server/network down; jangan ulang merge; tunggu lalu `-SkipMerge -SkipPush` |
| Mac sleep / SSH putus saat build | Redeploy tetap jalan di server; `-Attach` atau `-Status` (bukan deploy penuh kecuali pull sudah selesai) |
| Preflight `Local deploy aborted — working tree is not clean` | Commit/revert, pakai worktree bersih, atau `-AllowDirty` jika hanya redeploy server (tanpa sync lokal) |
| nginx `502` setelah recreate app | `docker restart nsoft3-nginx` (sudah otomatis di `redeploy.sh` terbaru) |
| Git pull gagal di server | Deploy key: ulang `setup-deploy-key.sh`, cek public key di GitHub Deploy keys; atau set `DEPLOY_GIT_URL` / `GITHUB_TOKEN` (legacy) |
| Unicode error di console Windows saat SSH | Set `$env:PYTHONIOENCODING="utf-8"`; `_ssh.py` sudah fallback replace |

## Migrasi token → deploy key (SSH)

**PO gate:** jangan jalankan di production sebelum PO lock; PR terpisah, no merge otomatis.

1. Dari root repo di Mac Akbar (env `SSH_HOST`, `SSH_USER`, `SSH_PASS` seperti deploy):

   ```powershell
   python scripts/master-production/_ssh.py script scripts/master-production/setup-deploy-key.sh
   ```

2. Salin **public key** dari output (private key tidak pernah dicetak) → GitHub repo `nusantarasoft/nusantarasoft-3` → **Settings → Deploy keys** → Add (read-only, no write).
3. Jalankan script lagi jika fetch pertama gagal karena key belum ada di GitHub.
4. Script di server: generate ed25519 di `/opt/nusantarasoft-3/.deploy-keys/`, alias SSH `github-nusantarasoft-3`, `git config core.sshCommand`, origin `git@github-nusantarasoft-3:nusantarasoft/nusantarasoft-3.git` — **hanya setelah** `git fetch`/`ls-remote` SSH sukses; rollback otomatis jika gagal.
5. Setelah sukses, deploy rutin cukup `DEPLOY_GIT_URL` ke URL SSH di atas (tanpa `GITHUB_TOKEN` di env).

## File terkait

- `scripts/master-production/setup-deploy-key.sh` — one-time migrasi HTTPS+token → deploy key SSH di server
- `scripts/master-production/deploy.ps1` — orkestrasi dari Windows/Mac (preflight + merge/push lokal **ff-only**, tanpa reset/clean lokal)
- `scripts/master-production/_deploy-local-git.ps1` — helper preflight + fast-forward lokal
- `scripts/master-production/pull-on-server.sh` — git pull/bootstrap di server
- `scripts/master-production/redeploy.sh` — build + up + migrasi + hermes posture + prune image nsoft3 + smoke UMKM
- `scripts/master-production/redeploy-detached.sh` — lock + setsid/nohup wrapper untuk redeploy (dipanggil deploy.ps1)
- `scripts/master-production/smoke-umkm.sh` — post-deploy health + consult smoke (standalone atau dari redeploy)
- `scripts/master-production/hermes-kasir-posture.py` — idempotent plugins/display/allowlist/locks after hermes recreate
- `scripts/master-production/hermes-multimodal-smoke.py` — OFF refuse / ON pass-through smoke
- `scripts/master-production/prune-nsoft3-images.sh` — disk hygiene: unused `nsoft3/*` / compose-project images + old build cache
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
