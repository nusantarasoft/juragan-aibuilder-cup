# Hermes — gaps vs official best practice

Tracked after comparing L5 (current as-built) with [Hermes docs](https://hermes-agent.nousresearch.com/docs/) (WhatsApp Baileys / Cloud API, Docker, Security, Hooks).

Architecture: [`hermes-architecture.md`](./hermes-architecture.md) · Ops: [`hermes-local.md`](./hermes-local.md)

**Status legend**

| Status | Meaning |
|--------|---------|
| **DONE** | Already matches BP / no further work |
| **FIXED** | Closed in repo (this tracker) |
| **MITIGATED** | Residual risk accepted; controls documented |
| **HOLD** | Product chose not to change for now |
| **OPEN** | Actionable; not done yet |
| **DEFERRED** | Large / product decision; not this cycle |

---

## Gap register

| ID | Gap | Severity | Status | Keterangan |
|----|-----|----------|--------|------------|
| **G1** | Production WA = Baileys, bukan Cloud API | High (ops/ban) | **HOLD** | **2026-09-19:** tetap Baileys dulu (QR Admin + shared inbox, tanpa WABA/webhook Meta). Cloud API hanya jika ban/stability memaksa. |
| **G2** | `WHATSAPP_ALLOWED_USERS=*` (gateway terbuka) | High jika plugin mati | **FIXED** | Gate tetap di `kasir-pipe`. Deploy `deploy-kasir-tools.py` + `hermes-smoke-test.py` **fail** jika `kasir-pipe`/`kasir-tools` tidak di `plugins.enabled`. Health: `hermes-kasir-health.py`. |
| **G3** | Image `:latest` di local compose / `.env.example` | Med | **FIXED** | Local default + `.env.example` pin `v2026.8.27` (sama pola prod). |
| **G4** | Nest `POST …/whatsapp/webhook` dual-brain | Med | **FIXED** | Default **410 Gone** unless `WHATSAPP_WEBHOOK_ENABLED=1`. Simulasi = `simulateInboundMessage`. |
| **G5** | Volume lokal `config.yaml` ≠ prod | Med | **FIXED** | Doc + health WARN/FAIL pada drift. |
| **G6** | Session Baileys `chmod 700` | Low | **FIXED** | Runbook + health WARN. |
| **G7** | Assert boot kasir plugins | Med | **FIXED** | `hermes-kasir-health.py` (+ dipakai deploy G2). |
| **G8** | Dashboard / API publik | High | **DONE** | Bind `127.0.0.1` + SSH tunnel. |
| **G9** | Tool progress chrome di WA | Low | **DONE** | Silence via deploy. |
| **G10** | Bridge proxy `:8765` custom | — | **DONE** | Perlu Nest pair/send; ada di L5. |

---

## Urutan beresin (sisa)

_Tidak ada gap OPEN._ G1 HOLD sampai ada keputusan produk baru.

---

## Cara cek cepat

```bash
python3 scripts/master-production/hermes-kasir-health.py
HERMES_CONTAINER=nsoft3-hermes python3 scripts/master-production/hermes-kasir-health.py --docker
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-19 | Register; G3–G7 FIXED; G4 FIXED; G2 MITIGATED |
| 2026-09-19 | **G1 HOLD** — tetap Baileys (produk) |
| 2026-09-19 | **G2 FIXED** — deploy + smoke fail-closed jika plugin kasir absen |
