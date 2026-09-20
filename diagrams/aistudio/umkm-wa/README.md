# AI Studio — UMKM WA diagrams

Part of [docs/aistudio/](../../../docs/aistudio/README.md).

| Bagian | Folder | Level |
|--------|--------|-------|
| **Business** | [business/](./business/) | L0–L4 |
| **System** | [system/](./system/) | L5 |

## Untuk sales / pitch (disarankan)

| Level | SVG |
|-------|-----|
| **L0** | [L0-bisnis-besar.svg](./business/L0-bisnis-besar.svg) |
| **L0b** | [L0b-kasir-harian.svg](./business/L0b-kasir-harian.svg) — ritual stok/jual/laporan |
| **L1** | [L1-shared-inbox.svg](./business/L1-shared-inbox.svg) |
| **L2** | [L2-aktor-swimlane.svg](./business/L2-aktor-swimlane.svg) |

Docs: [pitch.md](../../../docs/aistudio/umkm-wa/business/pitch.md)

## Detail internal (ops) — L3–L4

Label masih teknis; bukan pintu sales.

| Level | SVG |
|-------|-----|
| **L3** | [L3-gate-teknis.svg](./business/L3-gate-teknis.svg) |
| **L4** | [L4-wizard-state.svg](./business/L4-wizard-state.svg) |

Ops docs: [business/ops/](../../../docs/aistudio/umkm-wa/business/ops/)

## System (L5–L6)

| Level | SVG |
|-------|-----|
| **L5** | [L5-hermes-runtime.svg](./system/L5-hermes-runtime.svg) — containers / pipe / bridge |
| **L6** | [L6-kasir-agent-path.svg](./system/L6-kasir-agent-path.svg) — SOUL → kasir-tools → DB; dangerous toolsets off |

Docs: [hermes-architecture.md](../../../docs/aistudio/umkm-wa/system/hermes-architecture.md)

### Render Mermaid → SVG

From repo root (needs `@mermaid-js/mermaid-cli`):

```bash
npx -y @mermaid-js/mermaid-cli -i diagrams/aistudio/umkm-wa/business/L0b-kasir-harian.mmd -o diagrams/aistudio/umkm-wa/business/L0b-kasir-harian.svg
npx -y @mermaid-js/mermaid-cli -i diagrams/aistudio/umkm-wa/system/L6-kasir-agent-path.mmd -o diagrams/aistudio/umkm-wa/system/L6-kasir-agent-path.svg
npx -y @mermaid-js/mermaid-cli -i diagrams/aistudio/umkm-wa/business/L0-bisnis-besar.mmd -o diagrams/aistudio/umkm-wa/business/L0-bisnis-besar.svg
npx -y @mermaid-js/mermaid-cli -i diagrams/aistudio/umkm-wa/system/L5-hermes-runtime.mmd -o diagrams/aistudio/umkm-wa/system/L5-hermes-runtime.svg
```
