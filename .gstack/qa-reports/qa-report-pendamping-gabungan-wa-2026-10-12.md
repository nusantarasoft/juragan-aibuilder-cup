# QA Report — Pendamping Gabungan on live WA

**Date:** 2026-10-12  
**Branch:** `cursor/pendamping-gabungan-wa-6dd7`  
**Scope:** Nest coach mode on `POST /internal/kasir-consult`, Hermes routing, Sim path parity  

## Method

Automated unit/scenario tests (no live WA pod in this run). Scenarios mapped from PO delivery gates.

| Scenario | Evidence | Result |
|----------|----------|--------|
| Pendamping with store data (coach path) | `studio-umkm-pendamping.service.spec.ts` synthesize + tools | **PASS** |
| Pendamping exact alias → coach (Sim) | `studio-umkm-pendamping.scenario.spec.ts` | **PASS** |
| Flag OFF (`umkm_pendamping_enabled: false`) | scenario + `gateAndCoach` / blocked intake | **PASS** |
| Empty shop | service golden `empty_shop` plan | **PASS** |
| `tanya` unchanged (no coach mode) | `test_consult.py::test_tanya_unchanged_no_coach_mode` | **PASS** |
| Coach alias → HTTP `mode=coach` + phone | `test_consult.py::test_coach_alias_sends_mode_and_phone` | **PASS** |
| Nest coach mode auth + flag | `internal-kasir-consult.controller.spec.ts` | **PASS** |
| Coach without phone → busy (Hermes) | `test_consult.py::test_coach_alias_without_phone_busy` | **PASS** |

## Commands run

```bash
python3 scripts/master-production/hermes-plugins/kasir-tools/test_consult.py
cd middleware && npm test -- --run \
  src/studio/internal-kasir-consult.controller.spec.ts \
  src/studio/studio-umkm-pendamping.routing.spec.ts \
  src/studio/studio-umkm-pendamping.scenario.spec.ts \
  src/studio/studio-umkm-pendamping.service.spec.ts
```

## Overall

**PASS** (automated gates). Live Hermes + middleware integration not exercised in this environment.
