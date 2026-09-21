# System diagrams (L5–L10)

| Level | File | Isi |
|-------|------|-----|
| **L5** | [L5-hermes-runtime](./L5-hermes-runtime.svg) | Containers, ports, pipe, media-refuse, middleware bridge |
| **L6** | [L6-kasir-agent-path](./L6-kasir-agent-path.svg) | Allowlisted turn: SOUL → kasir-tools → DB **atau** Nest consult; egress; dangerous toolsets off |
| **L7** | [L7-inbound-gate](./L7-inbound-gate.svg) | Gate order: multimodal OFF refuse / ON STT+vision → allowlist → stamp v2 → tool routes |
| **L8** | [L8-knowledge-soul](./L8-knowledge-soul.svg) | Tools/DB facts; `tanya`→`kasir_consult`→Nest kurikulum; satu SOUL; no MEMORY/RAG ledger |
| **L9** | [L9-kasir-consult](./L9-kasir-consult.svg) | Consult hop: Hermes → Nest gate → embed → match → synthesize / miss |
| **L10** | [L10-model-stack](./L10-model-stack.svg) | Model lock: Whisper STT, GLM 5.3 Flash Hermes, Gemma vision, embed Gemini, Qwen synthesize |

Index: [../README.md](../README.md) · Docs: [hermes-architecture.md](../../../docs/aistudio/umkm-wa/system/hermes-architecture.md) · Model stack: [model-stack.md](../../../docs/aistudio/umkm-wa/system/model-stack.md) · Ops consult: [consult-kurikulum.md](../../../docs/aistudio/umkm-wa/business/ops/consult-kurikulum.md)
