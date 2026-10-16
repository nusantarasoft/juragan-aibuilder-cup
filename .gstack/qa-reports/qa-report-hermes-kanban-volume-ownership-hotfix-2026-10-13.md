# QA — Hermes kanban volume ownership hotfix (PR #11 regression)

**Date:** 2026-10-13  
**Branch:** `cursor/hermes-kanban-volume-ownership-54fa`  
**Harness:** `scripts/master-production/qa-hermes-kanban-volume-ownership.sh`

## Verdict

**PASS** — ownership fix only; no deploy-key SSH migration in scope.

## Gates

| Gate | Command / check | Result |
|------|-----------------|--------|
| Shell syntax | `bash -n up-hermes.sh`, `bash -n redeploy.sh` | PASS |
| Python syntax | `python3 -m py_compile hermes-kasir-posture.py` | PASS |
| Simulate failure | Mock root-owned `kanban.db` → `check_volume_ownership` FAIL | PASS |
| Repro fix | Volume uid 10000, `.env` 600 → only `kanban.db` → `10000:10000` `640` | PASS |
| exec-id-returns-root | `docker exec id` mock root → resolve uses stat; no chown to `0:0` | PASS |
| All-root skip | Ambiguous uid → `resolve` None, harden noop | PASS |
| Middleware build | Not touched | N/A |
| Deploy / merge | Out of scope (PR only) | N/A |

## Notes

- Reverts PR #11 behavior: no `chown -R`, no `docker exec id`, default **10000:10000**.
- Deploy-key migration **not** in this PR; HTTPS + `GITHUB_TOKEN` unchanged.
- Post-merge on server: `hermes-kasir-posture.py apply --ownership-only --docker` then `check`.
