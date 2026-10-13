# QA — Hermes kanban volume ownership (scope A)

**Date:** 2026-10-13  
**Branch:** `cursor/hermes-kanban-volume-ownership-54fa`  
**Harness:** `scripts/master-production/qa-hermes-kanban-volume-ownership.sh`

## Verdict

**PASS** — simulate detects root-owned `kanban.db`; harden restores owner-writable `640` for Hermes uid.

## Gates

| Gate | Command / check | Result |
|------|-----------------|--------|
| Shell syntax | `bash -n up-hermes.sh`, `bash -n redeploy.sh` | PASS |
| Python syntax | `python3 -m py_compile hermes-kasir-posture.py` | PASS |
| Simulate failure | Mock `kanban.db` stat uid=0 mode=644 → `check_volume_ownership` FAIL | PASS |
| Verify fix | Temp volume → `harden_volume_ownership` → check PASS, mode `0o640` | PASS |
| Middleware build | Not touched | N/A |
| Deploy / merge | Out of scope (PR only, no merge) | N/A |

## Notes

- Full apply in `redeploy.sh` already calls posture; volume harden runs at end of apply without reading `state.db` or rewriting session creds.
- Production validation after merge: `hermes-kasir-posture.py check --docker --container nsoft3-hermes` + `docker logs nsoft3-hermes --since 10m` (no repeating kanban / s6 EPERM).
