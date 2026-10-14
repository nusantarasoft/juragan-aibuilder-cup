# QA — detached deploy (SSH-safe redeploy) (2026-10-14)

**Verdict: PASS**

## Scope

`deploy.ps1` step `[3/3]` starts `redeploy-detached.sh` on the server (setsid/nohup, timestamped log, lock/state under `/opt/nusantarasoft-3/logs/`). `-Attach` / `-Status` reconnect without merge/pull. `pull-on-server.sh` stdin path unchanged.

## Commands

```bash
bash -n scripts/master-production/redeploy-detached.sh
bash -n scripts/master-production/redeploy.sh
bash -n scripts/master-production/pull-on-server.sh
bash scripts/master-production/qa-deploy-detached.sh
pwsh -File scripts/master-production/qa-deploy-local-preflight.ps1
cd middleware && npm run build
```

## Verdict table

| Case | Result |
|------|--------|
| `bash -n` redeploy-detached + redeploy + pull-on-server | PASS |
| Simulated SSH client SIGKILL mid-run → remote job completes | PASS |
| Exit code retrievable via `status` (fake redeploy exit 7) | PASS |
| Concurrent `start` blocked (lock exit 2) | PASS |
| `deploy.ps1` parses (qa-deploy-local-preflight) | PASS |
| `middleware npm run build` | PASS |
| Live production SSH / full `deploy.ps1` | SKIP (no credentials; PO no merge/deploy) |

## Notes

- Logs: `/opt/nusantarasoft-3/logs/deploy-YYYYMMDD-HHMMSS.log`
- Lock: `.deploy.lock`; state: `.deploy.state`
- `_ssh.py` adds `capture` subcommand for status polling
