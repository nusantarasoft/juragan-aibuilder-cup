# QA — scope B deploy key setup script

**Branch:** `cursor/setup-deploy-key-ssh-9025`  
**Date:** 2026-10-13  
**Verdict:** **PASS** (static + local dry-run; no prod run)

## Gates

| Gate | Result | Notes |
|------|--------|-------|
| `bash -n setup-deploy-key.sh` | PASS | |
| `bash -n pull-on-server.sh` | PASS | |
| shellcheck | SKIP | not installed on agent VM |
| DRY_RUN=1 local temp repo | PASS | fake HTTPS origin; no writes |
| SKIP_FETCH=1 keygen + origin switch | PASS | `/tmp` git repo; idempotent re-run |
| Prod `/opt/nusantarasoft-3` | **NOT RUN** | PO lock — manual after merge |

## Commands run

```bash
bash -n scripts/master-production/setup-deploy-key.sh
bash -n scripts/master-production/pull-on-server.sh

# temp repo: HTTPS origin → SKIP_FETCH migration path
REMOTE_DIR=<tmp>/repo ROOT_SSH_DIR=<tmp>/root-ssh DRY_RUN=1 SKIP_FETCH=1 \
  bash scripts/master-production/setup-deploy-key.sh
REMOTE_DIR=<tmp>/repo ROOT_SSH_DIR=<tmp>/root-ssh DRY_RUN=0 SKIP_FETCH=1 \
  bash scripts/master-production/setup-deploy-key.sh
# re-run idempotent OK
```

## Out of scope (manual)

- Add printed deploy **public** key in GitHub Deploy keys before live fetch on prod.
