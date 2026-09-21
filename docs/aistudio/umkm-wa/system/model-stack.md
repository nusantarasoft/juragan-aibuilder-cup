# Model stack — UMKM WA kasir + konsultan

Lock decisions for which model does which job. Sales pitch stays free of eng IDs; this doc is for ops/eng.

Diagram: [L10 model stack](../../../../diagrams/aistudio/umkm-wa/system/L10-model-stack.svg) · consult hop: [L9](../../../../diagrams/aistudio/umkm-wa/system/L9-kasir-consult.svg).

## Locked choices (soft GA)

| Job | Where | Provider / model | Why |
|-----|--------|------------------|-----|
| **Kasir agent + tools** (jual/stok/laporan/tutup, routing `kasir_consult`) | Hermes | OpenRouter **`z-ai/glm-5.3`** (G16/G17 posture) | Best GLM for agent/tools; teks-only → vision dipisah |
| **STT suara** | Hermes gateway | Local **Whisper `base`** (`faster-whisper`), `stt.language=id` | Gratis (CPU); bukan token OpenRouter |
| **Vision foto** | Hermes `auxiliary.vision` | OpenRouter **`qwen/qwen2.5-vl-32b-instruct`** (G17) | OCR/nota/rak lebih tajam dari Gemma; **Apache-2.0** → nanti self-host (vLLM / HF) |
| **Consult retrieve** | Nest Studio RAG | Embed **`gemini-embedding-001`** (`google_ai`) | Notebook kurikulum; jangan ganti tanpa reindex |
| **Consult synthesize** | Nest `AiRouter` | OpenRouter **`qwen/qwen3.7-flash`** via `KASIR_CONSULT_SYNTH_*` | Murah, Bahasa Indonesia natural; grounded Q&A pendek; **bukan** Hermes main |

```
Owner WA
  ├─ teks ──────────────────────────────► GLM 5.3 (Hermes main + tools)
  ├─ voice → Whisper base ─────────────► GLM 5.3
  ├─ foto → Qwen2.5-VL 32B (aux.vision) ► deskripsi teks → GLM 5.3
  └─ tanya… → Nest embed → Qwen3.7 Flash synthesize → WA
```

Hermes dan Nest **boleh share** `OPENROUTER_API_KEY` — beda model slug.

**Catatan biaya:** GLM 5.3 reasoning selalu on (lebih mahal/lambat dari Flash). Vision Qwen-VL hanya saat ada foto.

**Self-host path (vision):** weights `Qwen/Qwen2.5-VL-32B-Instruct` (HF, Apache-2.0). Soft GA tetap lewat OpenRouter; nanti ganti `auxiliary.vision` ke base_url lokal (vLLM OpenAI-compatible) tanpa ganti keluarga model.

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
  default: z-ai/glm-5.3
  provider: openrouter
  base_url: https://openrouter.ai/api/v1
auxiliary:
  vision:
    provider: openrouter
    model: qwen/qwen2.5-vl-32b-instruct
agent:
  image_input_mode: auto
```

## Deploy checklist

1. Migration `00000000000106_studio_settings_openrouter.sql` (OpenRouter columns).
2. Middleware punya `OPENROUTER_API_KEY` + synth env.
3. Recreate hermes + `hermes-kasir-posture.py apply` (GLM + Qwen-VL vision).
4. Smoke: `jual…` / foto rak / `tanya cara tentukan harga jual`.

Full go-live: [`../../../deploy-master-production.md`](../../../deploy-master-production.md). Ops consult: [`../business/ops/consult-kurikulum.md`](../business/ops/consult-kurikulum.md).

## Admin UI

Provider **OpenRouter** di AI Studio Settings (default katalog consult: Qwen3.7 Flash). Mengaktifkan OpenRouter sebagai *default LLM Studio* mempengaruhi Chat/RAG/CRM Nest lain — **consult** tetap bisa dipin lewat env di atas tanpa mengubah default Studio.

## Jangan

- Jangan set Hermes main ke Qwen hanya karena consult — tool-calling kasir tetap GLM.
- Jangan ganti embedding tanpa reindex notebook.
- Jangan campur ledger stok ke RAG buku (L8 / L9).
- Jangan biarkan Hermes drift ke Claude Opus (posture/health fail-closed).
- Jangan lock vision ke Gemini/Claude kalau target jangka panjang self-host (weights tertutup).

## Related

- Architecture: [`hermes-architecture.md`](./hermes-architecture.md)
- Gaps G16→G17: [`hermes-gaps.md`](./hermes-gaps.md)
- Local ops: [`hermes-local.md`](./hermes-local.md)
