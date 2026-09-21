# AI Studio — UMKM WA diagrams

Part of [docs/aistudio/](../../../docs/aistudio/README.md).

| Bagian | Folder | Level |
|--------|--------|-------|
| **Business** | [business/](./business/) | L0–L4 (+ L0b, L0c, **L0d**) |
| **System** | [system/](./system/) | L5–**L10** |

## Untuk sales / pitch (disarankan)

| Level | SVG | Isi |
|-------|-----|-----|
| **L0** | [L0-bisnis-besar.svg](./business/L0-bisnis-besar.svg) | DAFTAR → Approve → kasir |
| **L0b** | [L0b-kasir-harian.svg](./business/L0b-kasir-harian.svg) | Ritual: stok / jual / ya / laporan / tutup toko / **tanya** |
| **L0c** | [L0c-chat-only.svg](./business/L0c-chat-only.svg) | **Chat teks dulu** — foto/suara → arahkan ketik jual/stok |
| **L0d** | [L0d-tanya-kurikulum.svg](./business/L0d-tanya-kurikulum.svg) | **Tanya buku** ≠ angka toko |
| **L1** | [L1-shared-inbox.svg](./business/L1-shared-inbox.svg) | Satu nomor bisnis, banyak toko |
| **L2** | [L2-aktor-swimlane.svg](./business/L2-aktor-swimlane.svg) | Owner vs admin |

Docs: [pitch.md](../../../docs/aistudio/umkm-wa/business/pitch.md)

## Detail internal (ops) — L3–L4

Label masih teknis; bukan pintu sales.

| Level | SVG |
|-------|-----|
| **L3** | [L3-gate-teknis.svg](./business/L3-gate-teknis.svg) |
| **L4** | [L4-wizard-state.svg](./business/L4-wizard-state.svg) |

Ops docs: [business/ops/](../../../docs/aistudio/umkm-wa/business/ops/) · [consult-kurikulum.md](../../../docs/aistudio/umkm-wa/business/ops/consult-kurikulum.md)

## System (L5–L10)

| Level | SVG | Isi |
|-------|-----|-----|
| **L5** | [L5-hermes-runtime.svg](./system/L5-hermes-runtime.svg) | Containers / pipe / media-refuse / bridge |
| **L6** | [L6-kasir-agent-path.svg](./system/L6-kasir-agent-path.svg) | SOUL → kasir-tools → DB **atau** Nest consult |
| **L7** | [L7-inbound-gate.svg](./system/L7-inbound-gate.svg) | Gate: multimodal OFF refuse / ON STT+vision → allowlist → stamp → tools |
| **L8** | [L8-knowledge-soul.svg](./system/L8-knowledge-soul.svg) | Fakta = tools/DB; `tanya`→consult→Nest kurikulum; satu SOUL; no MEMORY/RAG ledger |
| **L9** | [L9-kasir-consult.svg](./system/L9-kasir-consult.svg) | Hop: Hermes → Nest gate → embed → match → synthesize / miss |
| **L10** | [L10-model-stack.svg](./system/L10-model-stack.svg) | Model lock: Whisper / GLM Hermes / Qwen3-VL vision / Qwen synth |

Studio notebook RAG (embed vs LLM, ingest/ask): [`../studio/system/`](../studio/system/README.md) L1–L4 · [rag-architecture.md](../../../docs/aistudio/studio/system/rag-architecture.md)

Docs: [hermes-architecture.md](../../../docs/aistudio/umkm-wa/system/hermes-architecture.md) · [model-stack.md](../../../docs/aistudio/umkm-wa/system/model-stack.md)

### Render Mermaid → SVG

From repo root (needs network; uses [mermaid.ink](https://mermaid.ink) if CLI missing):

```bash
# Optional local CLI:
# npx -y @mermaid-js/mermaid-cli -i …/L0d-tanya-kurikulum.mmd -o …/L0d-tanya-kurikulum.svg
```

Prefer committing both `.mmd` (source) and `.svg` (preview in GitHub/docs).
