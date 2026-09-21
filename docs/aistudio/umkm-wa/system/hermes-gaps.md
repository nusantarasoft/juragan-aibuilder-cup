# Hermes — gaps vs official best practice

**System doc** (AI Studio → UMKM WA). Architecture: [`hermes-architecture.md`](./hermes-architecture.md) · Ops: [`hermes-local.md`](./hermes-local.md) · Pitch: [`../business/pitch.md`](../business/pitch.md) · Trial: [`../business/ops/register-trial.md`](../business/ops/register-trial.md)

Tracked after comparing L5 (current as-built) with [Hermes docs](https://hermes-agent.nousresearch.com/docs/) (WhatsApp Baileys / Cloud API, Docker, Security, Hooks).

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
| **G6** | Session Baileys `chmod 700` | Low | **FIXED** | Runbook + health WARN. **2026-09-20:** `hermes-kasir-posture.py apply` enforces `chmod 700` on session dir. |
| **G7** | Assert boot kasir plugins | Med | **FIXED** | `hermes-kasir-health.py` (+ dipakai deploy G2). |
| **G8** | Dashboard / API publik | High | **DONE** | Bind `127.0.0.1` + SSH tunnel. |
| **G9** | Tool progress chrome di WA | Low | **DONE** | Silence via deploy / posture. |
| **G10** | Bridge proxy `:8765` custom | — | **DONE** | Perlu Nest pair/send; ada di L5. |
| **G11** | Teks sistem/tool bocor ke user WA | High (UX/trust) | **FIXED** | `user_safe` sanitize + wrap semua tool return; draft tanpa `draft_id`/nama tool; confirm latest `(phone,kind)`; denylist `_send_wa_text` (DAFTAR); SOUL harden; `reject_reason` cap. **Egress:** `kasir-pipe` `transform_llm_output` (1.3.5) sanitizes agent final reply before WA. |
| **G12** | Hermes nag `/sethome` / “No home channel” | Med (UX) | **FIXED** | Set `WHATSAPP_HOME_CHANNEL` (ops chat JID) di compose/env. Nag fires on first message when home unset (`gateway/run.py`). UMKM: **ignore** — jangan `/sethome` di chat toko (itu mengalihkan cron ke mereka). |
| **G13** | Built-in Hermes toolsets (terminal/browser/…) aktif di platform WhatsApp | High (security) | **FIXED** | `hermes-wa-tool-allowlist.py` sets `platform_toolsets.whatsapp` → `clarify` + `kasir`; deploy applies; `hermes-kasir-health.py` fail-closed. |
| **G14** | Hermes recreate menghapus posture (plugins/silence) | High (ops) | **FIXED** | `hermes-kasir-posture.py` di `redeploy.sh` + `deploy-kasir-tools.py` setelah recreate. **Jangan** recreate `nsoft3-hermes` manual tanpa posture. |
| **G15** | LLM drift ke Claude Opus (stock Hermes / OpenRouter) | High (cost) | **SUPERSEDED → G16** | Was Flash lock; then GLM + Gemma; G17–G18 trials; G19 Qwen3-VL. |
| **G16** | Kasir main/vision model lock | High (cost + modality) | **SUPERSEDED → G17** | Was GLM 5.3 + Gemma 31B vision; Gemma baca foto lemah. |
| **G17** | Vision quality + self-host path | High (UX foto) | **SUPERSEDED → G18** | Was `qwen2.5-vl-32b-instruct`; then Flash trial. |
| **G18** | Vision cost trial (Qwen3.7 Flash) | Med (UX foto / cost) | **SUPERSEDED → G19** | Flash murah; pilih kembali VL khusus OCR. |
| **G19** | Vision → Qwen3-VL 32B | High (UX foto) | **FIXED** | `auxiliary.vision` → `qwen/qwen3-vl-32b-instruct` (termurah di Qwen3-VL Instruct OR); main `z-ai/glm-5.3`; health **fail-closed**. |

---

## Watchlist — jangan lupa (bukan “nanti saja di kepala”)

| ID | Apa | Kenapa mudah kelupaan | Di mana tracked | Next action |
|----|-----|------------------------|-----------------|-------------|
| **W1** | Manual recreate hermes | `docker compose … recreate hermes` tanpa posture → plugins kosong **atau LLM balik Claude** | G14–G15 FIXED + runbook | Selalu: `hermes-kasir-posture.py apply` atau `deploy-kasir-tools.py` |
| **W2** | Live foto/voice QA | Smoke otomatis masih event sintetis | TODOS *done 2026-09-20* | **DONE** — OFF refuse + live ON; **prod soft GA `KASIR_MULTIMODAL=1`** (2026-09-20, dengan consult ON) |
| **W3** | Disk build cache | Prune hanya unused >7d; sisa cache aktif bisa besar | `prune-nsoft3-images.sh` | OK otomatis tiap redeploy; pantau `docker system df` kalau disk naik |
| **W4** | Product backlog di luar deploy | Staff roles / Auth P2 / Cloud API | `TODOS.md` UMKM + Auth | Bukan residual bug deploy |

---

## Urutan beresin (sisa)

_Tidak ada gap OPEN untuk deploy/posture._ G1 HOLD (produk). Watchlist W2 closed 2026-09-20 (live refuse + smoke). G14 FIXED; G15–G18 superseded by **G19** (GLM + Qwen3-VL 32B) enforced by posture scripts.

## Leak checklist (QA / live WA)

Fail if user-visible WhatsApp text contains any of:

- `kasir_`
- `draft_id`
- `traceback` / `urllib` / `PGRST` / `HTTPError` / `RuntimeError`
- `http://` or `https://` (no product links today)
- Raw JSON tool schemas (e.g. `"unit_price":`)

Manual paths:

1. Owner allowlist: `cek stok` / `laporan` / `daftar barang`
2. Owner: jual → ringkasan → `ya` (no tool names; sale confirms)
3. Non-owner: `DAFTAR` wizard copy stays human
4. Rejected registration: toxic admin reason → clean/generic on WA

Unit:

```bash
cd scripts/master-production/hermes-plugins/kasir-tools
python3 -m unittest test_user_safe_copy.py -v
```

**Residual (D8):** ~~Allowlisted agent replies go Hermes gateway without denylist~~ — **closed 2026-09-20:** `kasir-pipe` hooks `transform_llm_output` and runs `user_safe` (same denylist as tool returns / DAFTAR). Hermes built-in `_sanitize_gateway_final_response` still redacts provider errors/secrets; our hook catches `kasir_*` / `draft_id` paraphrases.

---

## Cara cek cepat

```bash
python3 scripts/master-production/hermes-kasir-health.py
HERMES_HOME=/opt/nusantarasoft-3/volumes/hermes \
  python3 scripts/master-production/hermes-kasir-posture.py check
docker exec -e HERMES_HOME=/opt/data nsoft3-hermes \
  python3 /opt/data/multimodal-smoke.py off --phone 6287859031592
python3 -m unittest scripts/master-production/hermes-plugins/kasir-tools/test_user_safe_copy.py -v
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-19 | Register; G3–G7 FIXED; G4 FIXED; G2 MITIGATED |
| 2026-09-19 | **G1 HOLD** — tetap Baileys (produk) |
| 2026-09-19 | **G2 FIXED** — deploy + smoke fail-closed jika plugin kasir absen |
| 2026-09-19 | **G11 FIXED** — user-facing leak harden (sanitize, draft UX, DAFTAR denylist, QA checklist) |
| 2026-09-19 | **G12 FIXED** — `WHATSAPP_HOME_CHANNEL` ops JID suppresses Hermes home-channel nag |
| 2026-09-19 | Moved under `docs/aistudio/umkm-wa/system/` |
| 2026-09-20 | **G13 FIXED** — WhatsApp tool allowlist (`clarify`+`kasir`) + health/deploy fail-closed |
| 2026-09-20 | Chat-only refuse (`KASIR_MULTIMODAL=0`), stamp v2, `kasir_tutup_toko`; diagrams L0c + L7 |
| 2026-09-20 | **G11 egress** — `transform_llm_output` in kasir-pipe 1.3.5 (`user_safe` denylist) |
| 2026-09-20 | Platform locks Q1–Q3 harden — `hermes-kasir-platform-locks.py` (STT id + image_input), SOUL Foto/voice + no MEMORY KB, diagram **L8** |
| 2026-09-20 | **G14 FIXED** + Watchlist W1–W4; posture enforces session `chmod 700` (G6) |
| 2026-09-20 | **W2 DONE** — live media refuse + OFF/ON smoke on prod; flag stays `0` |
| 2026-09-20 | **W2 ON live** — time-boxed then **soft GA left `KASIR_MULTIMODAL=1`** (dengan consult ON) |
| 2026-09-21 | **G15 FIXED** — posture + health lock LLM to `google/gemini-2.5-flash` via OpenRouter (no Claude Opus drift) |
| 2026-09-21 | Consult synthesize → OpenRouter **Qwen3.7 Flash** (`KASIR_CONSULT_SYNTH_*`; was DeepSeek); Nest OpenRouter provider; docs **model-stack** + diagram **L10** |
| 2026-09-21 | **G16 FIXED** — Hermes main → `z-ai/glm-5.3`; vision → `google/gemma-4-31b-it` (`auxiliary.vision`); health fail-closed |
| 2026-09-21 | **G17 FIXED** — vision → `qwen/qwen2.5-vl-32b-instruct` (Gemma baca foto lemah; open weight → self-host later) |
| 2026-09-21 | **G18 FIXED** — vision → `qwen/qwen3.7-flash` (trial murah; rollback ke Qwen3-VL bila OCR lemah) |
| 2026-09-21 | **G19 FIXED** — vision → `qwen/qwen3-vl-32b-instruct` (termurah Qwen3-VL Instruct; open → self-host) |
