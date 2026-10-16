# Model stack — UMKM WA kasir + konsultan

Lock decisions for which model does which job. Sales pitch stays free of eng IDs; this doc is for ops/eng.

Diagram: [L10 model stack](../../../../diagrams/aistudio/umkm-wa/system/L10-model-stack.svg) · consult hop: [L9](../../../../diagrams/aistudio/umkm-wa/system/L9-kasir-consult.svg).

## Locked choices (soft GA)

| Job | Where | Provider / model | Why |
|-----|--------|------------------|-----|
| **Kasir agent + tools** (jual/stok/laporan/tutup, routing `kasir_consult`) | Hermes | OpenRouter **`z-ai/glm-5.3-flash`** (G21) | GLM tools murah (~10× full 5.3); tetap keluarga Z.ai |
| **STT suara** | Hermes gateway | Local **Whisper `base`** (`faster-whisper`), `stt.language=id` | Gratis (CPU); bukan token OpenRouter |
| **Vision foto** | Hermes `auxiliary.vision` | OpenRouter **`qwen/qwen3-vl-30b-a3b-instruct`** (G22) | Qwen3-VL MoE (~3B aktif); OCR/nota; path self-host lebih ringan dari 32B dense |
| **Consult retrieve** | Nest Studio RAG | Embed **`gemini-embedding-001`** (`google_ai`) | Notebook kurikulum; jangan ganti tanpa reindex |
| **Consult synthesize** | Nest `AiRouter` | OpenRouter **`qwen/qwen3.7-flash`** via `KASIR_CONSULT_SYNTH_*` | Murah, Bahasa Indonesia natural; grounded Q&A pendek; **bukan** Hermes main |

```
Owner WA
  ├─ teks ──────────────────────────────► GLM 5.3 Flash (Hermes main + tools)
  ├─ voice → Whisper base ─────────────► GLM 5.3 Flash
  ├─ foto → Qwen3-VL 30B A3B (aux) ────► deskripsi teks → GLM 5.3 Flash
  └─ tanya… → Nest embed → Qwen3.7 Flash synthesize → WA
```

Hermes dan Nest **boleh share** `OPENROUTER_API_KEY` — beda model slug.

**Catatan biaya:** Vision Qwen3-VL ~$0.13/$0.52 (hanya saat foto). Main Flash jauh lebih murah dari full GLM 5.3. Jangan set Qwen3-VL sebagai Hermes **main** — job tools tetap GLM Flash.

**Self-host path (vision):** `Qwen/Qwen3-VL-30B-A3B-Instruct` (HF) + vLLM; aktif ~3B → GPU lebih hemat vs 32B dense.

## Env (middleware)

Compose defaults (`.env.master-production` boleh override):

```bash
KASIR_CONSULT_SYNTH_PROVIDER=openrouter
KASIR_CONSULT_SYNTH_MODEL=qwen/qwen3.7-flash
OPENROUTER_API_KEY=sk-or-...   # same key as Hermes OK
```

- Jika `KASIR_CONSULT_SYNTH_PROVIDER` **kosong** → synthesize ikut Admin **AI Studio → Settings** `default_llm_provider`.
- Key OpenRouter: kolom `studio_settings.openrouter_api_key` **atau** env `OPENROUTER_API_KEY` (env fallback).
- Alternatif katalog consult: `qwen/qwen3.8-flash` / `qwen/qwen3.5-flash-02-23`, atau `google/gemini-2.5-flash`.

## Hermes lock (posture)

Applied by `hermes-kasir-posture.py` after every hermes recreate; health **fails** on drift:

```yaml
model:
  default: z-ai/glm-5.3-flash
  provider: openrouter
  base_url: https://openrouter.ai/api/v1
auxiliary:
  vision:
    provider: openrouter
    model: qwen/qwen3-vl-30b-a3b-instruct
agent:
  image_input_mode: auto
```

## Deploy checklist

1. Migration `00000000000106_studio_settings_openrouter.sql` (OpenRouter columns).
2. Middleware punya `OPENROUTER_API_KEY` + synth env.
3. Recreate hermes + `hermes-kasir-posture.py apply` (GLM Flash + Qwen3-VL vision).
4. Smoke: `jual…` / foto rak / `tanya cara tentukan harga jual`.

Full go-live: [`../../../deploy-master-production.md`](../../../deploy-master-production.md). Ops consult: [`../business/ops/consult-kurikulum.md`](../business/ops/consult-kurikulum.md).

## Admin UI

Provider **OpenRouter** di AI Studio Settings (default katalog consult: Qwen3.7 Flash). Mengaktifkan OpenRouter sebagai *default LLM Studio* mempengaruhi Chat/RAG/CRM Nest lain — **consult** tetap bisa dipin lewat env di atas tanpa mengubah default Studio.

## Jangan

- Jangan set Hermes main ke Qwen-VL — tool-calling kasir tetap GLM Flash.
- Jangan ganti embedding tanpa reindex notebook.
- Jangan campur ledger stok ke RAG buku (L8 / L9).
- Jangan biarkan Hermes drift ke Claude Opus (posture/health fail-closed).

## Related

- Architecture: [`hermes-architecture.md`](./hermes-architecture.md)
- Gaps G21→G22: [`hermes-gaps.md`](./hermes-gaps.md)
- Local ops: [`hermes-local.md`](./hermes-local.md)
