# QA — deploy logs dir hotfix (2026-10-15)

**Verdict: PASS** (no live prod SSH; local simulation + #29 regression suite)

| Check | Result | Evidence |
|-------|--------|----------|
| Fresh tree without `logs/` blocks pull path | PASS | `qa-deploy-logs-dir-hotfix.sh` |
| `mkdir -p` then pull script write | PASS | same |
| `bash -n` generated pull script | PASS | same |
| SSH drop after trigger (#29) | PASS | `qa-deploy-full-detached.sh` |
| SSH drop during pull (#29) | PASS | same |
| Detached lock + client kill (#29) | PASS | `qa-deploy-detached.sh` |
| `deploy.ps1` PowerShell parse | PASS | pwsh 7.4.6, 1814 tokens, 0 errors |
| `middleware npm run build` | PASS | `nest build` exit 0 |

```bash
bash scripts/master-production/qa-deploy-logs-dir-hotfix.sh
bash scripts/master-production/qa-deploy-detached.sh
bash scripts/master-production/qa-deploy-full-detached.sh
/tmp/pwsh/pwsh -NoProfile -Command '... ParseFile deploy.ps1 ...'
cd middleware && npm ci && npm run build
```

**Fix:** `deploy.ps1` runs `mkdir -p /opt/nusantarasoft-3/logs` and `scripts/master-production` via SSH before SFTP uploads.
