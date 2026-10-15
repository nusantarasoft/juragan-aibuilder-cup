# QA — F2-4 tenant agent settings (2026-10-15)

**Branch:** `cursor/f2-4-tenant-settings-impl-cfc7`  
**Head SHA:** `cadde00a2755653863e277e0f0e4b76299a96a25`  
**Overall verdict:** **PASS**

## Screenshot index

| State | File | Result |
|-------|------|--------|
| `/admin/my-agents` | `/cursor/stores/self/media/f2-4-my-agents.png` | **PASS** |
| Libur toggle | `/cursor/stores/self/media/f2-4-my-agents-libur.png` | **PASS** |
| VO drawer Libur + settings | `/cursor/stores/self/media/f2-4-vo-drawer-libur.png` | **PASS** |

Stack: Docker (`docker.io` + `dockerd`) → `scripts/qa-bootstrap-f1-4-stack.sh` → `PG_CONTAINER=postgres bash scripts/master-production/apply-migrations.sh` → middleware `:4001` (`CAPTCHA_DISABLED=true`, `ONBOARDING_RATE_LIMIT_MAX=999`, `KASIR_CONSULT=1`) + admin `:3003`. **No GraphQL mocks.**

## Verdict table

| Area | Gate | Result | Evidence |
|------|------|--------|----------|
| **Build** | `middleware npm run build` | **PASS** | nest build (prior run) |
| **Build** | `admin npm run build` | **PASS** | next build (prior run) |
| **Backend** | `aos-agent-work-gate.spec.ts` | **PASS** | quiet hours + pause |
| **Backend** | `aos-tenant-agent-settings.graphql.auth.spec.ts` | **PASS** | unauth + cross-tenant list |
| **Backend** | `internal-kasir-consult.controller.spec.ts` | **PASS** | gate wiring |
| **Browser** | `f2-4-tenant-settings-fullstack.spec.ts` chromium | **PASS** | 2/2 live GraphQL |
| **Browser** | Screenshots `f2-4-*.png` | **PASS** | 3 files under `/cursor/stores/self/media/` |

## Commands run

```bash
sudo apt-get install -y docker.io docker-compose-v2
sudo dockerd &
bash scripts/qa-bootstrap-f1-4-stack.sh
PG_CONTAINER=postgres POSTGRES_DB=nusantarasoft sudo bash scripts/master-production/apply-migrations.sh
# middleware/.env.local + admin/.env.local (QA captcha/rate limits; not committed)
# tmux: middleware npm run start:dev :4001, admin npm run dev :3003
bash scripts/f2-4-browser-qa.sh
cd middleware && npm test -- --run aos-agent-work-gate aos-tenant-agent-settings.graphql internal-kasir-consult
```

## Safety

- No merge / deploy per PO instruction.
- Backlog F2-4: **QA PASS** — await Akbar PR approve (not merged in this run).
