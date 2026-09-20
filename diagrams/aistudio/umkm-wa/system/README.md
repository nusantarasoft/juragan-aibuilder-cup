# System diagrams (L5–L7)

| Level | File | Isi |
|-------|------|-----|
| **L5** | [L5-hermes-runtime](./L5-hermes-runtime.svg) | Containers, ports, pipe, media-refuse, middleware bridge |
| **L6** | [L6-kasir-agent-path](./L6-kasir-agent-path.svg) | Allowlisted turn: SOUL → kasir-tools → DB; `transform_llm_output` egress; dangerous toolsets off |
| **L7** | [L7-inbound-gate](./L7-inbound-gate.svg) | Gate order: `KASIR_MULTIMODAL` → allowlist → stamp v2 → tool routes (incl. tutup toko) |

Index: [../README.md](../README.md) · Docs: [hermes-architecture.md](../../../docs/aistudio/umkm-wa/system/hermes-architecture.md)
