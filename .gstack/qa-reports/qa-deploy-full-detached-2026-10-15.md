# QA: full detached deploy (pull + redeploy)

**Date:** 2026-10-15  
**Branch:** `cursor/deploy-full-detached-8408`  
**Head SHA:** `69cf698`  
**Scope:** PR #27 follow-up — pull no longer runs over live SSH; one detached job runs pull → redeploy.

## Verdict

**PASS** — simulated SSH drops after trigger and mid-pull; shell syntax; `deploy.ps1` parse; middleware build.

## Checks

| Check | Result | Notes |
|-------|--------|--------|
| `bash -n redeploy-detached.sh` | PASS | |
| `bash -n pull-on-server.sh` | PASS | |
| `qa-deploy-full-detached.sh` | PASS | SSH drop @ 0.2s (fast pull) + @ 1.0s (3s slow pull); `STATUS=done`, `EXIT=0` |
| `qa-deploy-detached.sh` (regression) | PASS | redeploy-only detached + lock |
| `deploy.ps1` PowerShell parse | PASS | 1764 tokens, 0 parse errors (pwsh 7.4.6) |
| `middleware npm run build` | PASS | after `npm ci` in `middleware/` |

## Commands

```bash
bash scripts/master-production/qa-deploy-full-detached.sh
bash scripts/master-production/qa-deploy-detached.sh
cd middleware && npm ci && npm run build
/tmp/pwsh/pwsh -NoProfile -Command '... ParseFile deploy.ps1 ...'
```

## Behavior under test

- `deploy.ps1` uploads pull script to `/opt/nusantarasoft-3/logs/.deploy-pull-*.sh` and calls `redeploy-detached.sh start <pull>`.
- Detached wrapper runs pull (Hermes backup + fetch/reset to `TARGET_SHA`) then `redeploy.sh` (posture + smoke).
- Lock/state/log unchanged under `/opt/nusantarasoft-3/logs/`.
- `-Attach` / `-Status` unchanged (poll via short SSH capture + retries).
