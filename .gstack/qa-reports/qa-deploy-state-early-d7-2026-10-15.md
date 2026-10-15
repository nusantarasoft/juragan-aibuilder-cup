# QA: D-7 deploy state early write + stale lock priority

**Date:** 2026-10-15  
**Branch:** `cursor/deploy-state-early-d7-bebf`  
**Scope:** `logs/.deploy.state` at detached start; `-Status`/`-Attach` sync helper + lock/PID over stale state.

## Verdict

**PASS**

## Checks

| Check | Result | Notes |
|-------|--------|--------|
| `qa-deploy-state-early.sh` | PASS | State file + `STATUS=running` immediately; stale success state overridden by live lock; final `success` |
| `qa-deploy-detached.sh` | PASS | SSH drop mid-run; lock concurrent start |
| `qa-deploy-full-detached.sh` | PASS | SSH drop @ 0.2s + @ 1.0s during pull |
| `bash -n` redeploy-detached / pull-on-server | PASS | via QA scripts |
| `deploy.ps1` PowerShell parse | PASS | pwsh 7.4.6 portable, 0 parse errors |
| `middleware npm run build` | PASS | after `npm ci` |

## Commands

```bash
bash scripts/master-production/qa-deploy-state-early.sh
bash scripts/master-production/qa-deploy-detached.sh
bash scripts/master-production/qa-deploy-full-detached.sh
cd middleware && npm ci && npm run build
/tmp/pwsh/pwsh -NoProfile -Command 'ParseFile deploy.ps1 ...'
```

## Behavior under test

- `redeploy-detached.sh start` writes `.deploy.state` before spawning wrapper; includes LOG, SHA, STATUS=running.
- `status` prefers live `.deploy.lock` PID over stale state (prior deploy success).
- Terminal STATUS is `success` / `failed` (legacy `done` mapped in `deploy.ps1`).
- `deploy.ps1 -Attach` / `-Status` call `Sync-RemoteDeployHelper` (mkdir logs + upload latest detached script).
