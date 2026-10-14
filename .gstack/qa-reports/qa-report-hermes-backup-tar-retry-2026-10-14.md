# QA — Hermes runtime backup tar retry (2026-10-14)

**Verdict: PASS**

## Scope

`pull-on-server.sh` Hermes pre-pull tar backup: tolerate live-writer `tar` exit 1, retry, staging + SQLite snapshot. No Hermes stop, no chown, no WA/session mutation.

## Commands

```bash
bash -n scripts/master-production/pull-on-server.sh
bash -n scripts/master-production/hermes-runtime-backup.sh
bash scripts/master-production/qa-hermes-runtime-backup.sh
cd middleware && npm run build
```

## Cases

| Case | Result |
|------|--------|
| `bash -n` pull + helper | PASS |
| `shellcheck` | SKIP (not installed) |
| `hermes_tar_exit_acceptable` exit 1 + "file changed" | PASS |
| exit 2 → fatal | PASS |
| exit 1 without file-changed message → fatal | PASS |
| Mock tar exit 1 file-changed → backup succeeds, WARNING | PASS |
| Mock tar exit 2 → backup fails | PASS |
| Staging copy-then-tar creates archive | PASS |
| `middleware npm run build` | PASS |

## Not run

- Live server deploy / SSH (no credentials)
- Full `deploy.ps1` end-to-end

## Root cause addressed

Deploy 2026-10-14: `tar: hermes: file changed as we read it` (exit 1) during live `volumes/hermes` backup aborted `pull-on-server.sh` under `set -e`.
