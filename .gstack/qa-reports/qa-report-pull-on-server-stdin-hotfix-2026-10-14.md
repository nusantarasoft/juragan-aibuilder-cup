# QA — pull-on-server stdin hotfix (2026-10-14)

**Verdict: PASS** (re-verified on `cursor/hermes-backup-inline-stdin-77f8` @ `e260c0b`)

## Scope

Fix deploy break: `deploy.ps1` pipes `pull-on-server.sh` to `bash -s`; sourcing `hermes-runtime-backup.sh` via `BASH_SOURCE[0]` fails under `set -u`. Helpers inlined; UTF-8 BOM removed from `pull-on-server.sh`.

## Commands

```bash
bash -n scripts/master-production/pull-on-server.sh
bash -n scripts/master-production/hermes-runtime-backup.sh
bash scripts/master-production/qa-pull-on-server-stdin.sh
bash scripts/master-production/qa-hermes-runtime-backup.sh
cd middleware && npm run build
```

## Cases

| Case | Result |
|------|--------|
| `bash -n` pull + helper | PASS |
| `bash -s` stdin path (fake `/opt` layout, mock tar exit 1 file-changed) | PASS |
| Hermes backup tar + stash/restore via stdin pull | PASS |
| `qa-hermes-runtime-backup.sh` unit cases | PASS |
| `middleware npm run build` | PASS |

## Audit

- `deploy.ps1` / `_ssh.py`: only `pull-on-server.sh` is piped to `bash -s`; `redeploy.sh` runs as on-disk path (OK).

## Not run

- Live `deploy.ps1` / SSH
