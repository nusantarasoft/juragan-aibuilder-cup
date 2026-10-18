# QA — D-39 Adityo @ b10d239 (Agentic OS light theme integration)

**Date:** 2026-10-17  
**Branch:** `cursor/integrate-adityo-b10d239-c3d5`  
**PR:** [#82](https://github.com/nusantarasoft/nusantarasoft-3/pull/82)  
**Source:** `development-adityo` @ `b10d239b7f5bc0802a0ae00d0ea2cc982023c440`  
**Base:** `master` @ `0dd00bd` (#81 Percakapan WA)  
**Head (QA PASS):** `9f7ea50`  
**Verdict:** **PASS** — 0 Playwright failures on focused gate.

## Scope applied

| Path | Action |
|------|--------|
| `admin/src/app/globals.css` | AOS light-mode CSS overrides (`.aos-root.aos-light`) |
| `AgenticOsDesktop.tsx`, `AgenticOsWorkspace.tsx` | Theme toggler + `aos-light` root class |
| `CMSLayoutImpl.tsx`, `animated-theme-toggler.tsx` | CMS ↔ AOS theme sync events |
| `Playbooks.tsx`, `registry.tsx` | Deep-link params `playbookId` / `moduleId` |
| `label-studio/page.tsx` + `f1-4-live-demo-fullstack.spec.ts` | **Live** tag only when API configured; **Not connected** on QA stack (F1-4 gate fix) |
| `tests/e2e/helpers/auth.ts` | Wait for login form (cold admin startup) |
| VO HUD, deploy scripts, SQL dumps | **Not imported** (same as prior integration notes) |

Merged **master @ `0dd00bd`** (#81) — Percakapan WA backend/UI + e2e spec included in browser gate.

## Gates

| Gate | Result | Notes |
|------|--------|-------|
| Conflict markers | **PASS** | no `<<<<<<<` in `admin/src` |
| `middleware npm run build` | **PASS** | nest build |
| `admin npm run build` | **PASS** | next build |
| Docker + `qa-bootstrap-f1-4-stack.sh` | **PASS** | `dockerd --storage-driver=vfs` |
| Migrations | **PASS** | **102** tracked, 0 failures |
| middleware vitest (full) | **PASS** | **1419** passed, 34 skipped (120 files) |
| admin vitest (full) | **PASS** | **116** passed, 2 skipped (26 files) |
| Playwright focused gate | **PASS** | **24/24** chromium, `--workers=1` (~2.7m) |
| Route crawl 320 | **SKIP** | per Akbar |

## Playwright (focused gate)

Host middleware QA env: `HERMES_BRIDGE_URL=http://127.0.0.1:8765` (mock from `studio-wa-conversations` spec + `scripts/qa-percakapan-wa-full-gate.sh`).

```bash
sudo dockerd --storage-driver=vfs &
bash scripts/qa-bootstrap-f1-4-stack.sh
PG_CONTAINER=postgres DB_USER=postgres sudo -E bash scripts/master-production/apply-migrations.sh
node scripts/init-cms-admin.mjs
# middleware: HERMES_BRIDGE_URL=http://127.0.0.1:8765 in .env.local + npm run start:dev
# admin: npm run build && npm run start -- -p 3003
cd admin && npx playwright install chromium
ONBOARDING_RATE_LIMIT_MAX=999 GRAPHQL_URL=http://127.0.0.1:4001/graphql PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 \
  UI_WAVE1_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
  UI_WAVE2_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
  UI_WAVE3_MEDIA_DIR=/workspace/.gstack/qa-reports/screenshots \
  D9_QA_MEDIA_DIR=/cursor/stores/self/media D9_DOCKER='sudo docker' \
  F1_4_QA_MEDIA_DIR=/cursor/stores/self/media F1_4_DOCKER='sudo docker' \
  npx playwright test tests/e2e/d9-deck-fullstack.spec.ts \
    tests/e2e/f1-4-live-demo-fullstack.spec.ts \
    tests/e2e/ui-wave-1-recruit-deeplinks.spec.ts tests/e2e/ui-wave-1-vo-inspector.spec.ts \
    tests/e2e/ui-wave-2-admin-buttons.spec.ts tests/e2e/ui-wave-3-admin-buttons.spec.ts \
    tests/e2e/studio-wa-conversations-fullstack.spec.ts \
    --project=chromium --workers=1
```

| Spec | Result |
|------|--------|
| `d9-deck-fullstack` | **2/2** |
| `f1-4-live-demo-fullstack` (incl. Label Studio unconfigured) | **3/3** |
| `ui-wave-1` | **3/3** |
| `ui-wave-2` | **7/7** |
| `ui-wave-3` | **4/4** |
| `studio-wa-conversations-fullstack` | **5/5** |

Log: `.gstack/qa-reports/qa-d39-playwright.log`

## Overall

**Integration QA PASS** for D-39. **Do not deploy** from this PR.
