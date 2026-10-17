# QA: deploy status hotfix (D-8)

**Date:** 2026-10-15  
**Branch:** `cursor/deploy-status-hotfix-f451`  
**Base:** `origin/master` (includes D-7 / #36)  
**Scope:** Early `.deploy.lock` + `.deploy.state` before wrapper spawn; `-Status` idle retry on first poll; status treats in-flight state without live PID.

## Verdict

**PASS**

## Checks

| Check | Result | Notes |
|-------|--------|--------|
| `bash -n redeploy-detached.sh` | PASS | via qa-deploy-state-early |
| `qa-deploy-state-early.sh` | PASS | state + lock immediately; immediate/mid-build `STATUS=running`; final success |
| `qa-deploy-detached.sh` | PASS | SSH drop sim + concurrent lock |
| `qa-deploy-full-detached.sh` | PASS | SSH drop after trigger + mid-pull |
| `qa-deploy-logs-dir-hotfix.sh` | PASS | mkdir before SFTP |
| `qa-pull-on-server-stdin.sh` | PASS | deploy.ps1 stdin path |
| `deploy.ps1` PowerShell parse | PASS | qa-deploy-local-preflight.ps1 (pwsh 7.4.6) |
| `middleware npm run build` | PASS | after `npm ci` |

## Commands

```bash
bash scripts/master-production/qa-deploy-state-early.sh
bash scripts/master-production/qa-deploy-detached.sh
bash scripts/master-production/qa-deploy-full-detached.sh
bash scripts/master-production/qa-deploy-logs-dir-hotfix.sh
bash scripts/master-production/qa-pull-on-server-stdin.sh
/tmp/pwsh/pwsh -NoProfile -File scripts/master-production/qa-deploy-local-preflight.ps1
cd middleware && npm ci && npm run build
```

## Behavior under test

- `redeploy-detached.sh start` writes `.deploy.lock` (PID `0` + LOG) and `.deploy.state` before `setsid` wrapper.
- Mac `deploy.ps1 -Status` / attach polling retries `STATUS=idle` up to 15s on the first poll only.
- Terminal `success`/`failed` unchanged after job completes.
