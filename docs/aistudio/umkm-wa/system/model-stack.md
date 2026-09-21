# Model stack — UMKM WA kasir + konsultan

Lock decisions for which model does which job. Sales pitch stays free of eng IDs; this doc is for ops/eng.

Diagram: [L10 model stack](../../../../diagrams/aistudio/umkm-wa/system/L10-model-stack.svg) · consult hop: [L9](../../../../diagrams/aistudio/umkm-wa/system/L9-kasir-consult.svg).

## Locked choices (soft GA)

| Job | Where | Provider / model | Why |
|-----|--------|------------------|-----|
| **Kasir agent + tools** (jual/stok/laporan/tutup, routing `kasir_consult`) | Hermes | OpenRouter **`google/gemini-2.5-flash`** (G15 posture) | Cost lock vs Claude Opus; tool loop + multimodal native foto |
| **STT suara** | Hermes gateway | Local **Whisper `base`** (`faster-whisper`), `stt.language=id` | Gratis (CPU); bukan token OpenRouter |
| **Vision foto** (default) | Hermes | Same Flash native (`agent.image_input_mode=auto`) | Satu model; optional later: `auxiliary.vision` → Flash Lite / Gemma |
| **Consult retrieve** | Nest Studio RAG | Embed **`gemini-embedding-001`** (`google_ai`) | Notebook kurikulum; jangan ganti tanpa reindex |
| **Consult synthesize** | Nest `AiRouter` | OpenRouter **`qwen/qwen3.7-flash`** via `KASIR_CONSULT_SYNTH_*` | Murah, Bahasa Indonesia natural; grounded Q&A pendek; **bukan** Hermes main |

```
Owner WA
  ├─ teks / voice(Whisper) / foto(Flash vision)
  └─► Hermes main = Gemini 2.5 Flash  ──tools──► ledger
                    │
                    └─ tanya… ──► Nest retrieve (embed) ──► synthesize Qwen3.7 Flash ──► WA
```

Hermes dan Nest **boleh share** `OPENROUTER_API_KEY` — beda model slug.

## Env (middleware)

Compose defaults (`.env.master-production` boleh override):

```bash
KASIR_CONSULT_SYNTH_PROVIDER=openrouter
KASIR_CONSULT_SYNTH_MODEL=qwen/qwen3.7-flash
OPENROUTER_API_KEY=sk-or-...   # same key as Hermes OK
```

- Jika `KASIR_CONSULT_SYNTH_PROVIDER` **kosong** → synthesize ikut Admin **AI Studio → Settings** `default_llm_provider`.
- Key OpenRouter: kolom `studio_settings.openrouter_api_key` **atau** env `OPENROUTER_API_KEY` (env fallback).
- Alternatif katalog: `qwen/qwen3.8-flash` / `qwen/qwen3.5-flash-02-23`, atau `google/gemini-2.5-flash` (ID paling aman).

## Deploy checklist

1. Migration `00000000000106_studio_settings_openrouter.sql` (OpenRouter columns).
2. Middleware punya `OPENROUTER_API_KEY` + synth env di atas (compose default sudah Qwen3.7).
3. Recreate **middleware** (admin rebuild kalau UI Settings ikut).
4. Smoke WA: `tanya cara tentukan harga jual` → jawaban kurikulum, bukan free-chat Hermes.

Full go-live: [`../../../deploy-master-production.md`](../../../deploy-master-production.md). Ops consult: [`../business/ops/consult-kurikulum.md`](../business/ops/consult-kurikulum.md).

## Admin UI

Provider **OpenRouter** di AI Studio Settings (default katalog: Qwen3.7 Flash). Mengaktifkan OpenRouter sebagai *default LLM Studio* mempengaruhi Chat/RAG/CRM Nest lain — **consult** tetap bisa dipin lewat env di atas tanpa mengubah default Studio.

## Jangan

- Jangan set Hermes main ke Qwen hanya karena consult — tool-calling kasir tetap Flash (G15).
- Jangan ganti embedding tanpa reindex notebook.
- Jangan campur ledger stok ke RAG buku (L8 / L9).

## Related

- Architecture: [`hermes-architecture.md`](./hermes-architecture.md)
- Gaps G15: [`hermes-gaps.md`](./hermes-gaps.md)
- Local ops: [`hermes-local.md`](./hermes-local.md)
