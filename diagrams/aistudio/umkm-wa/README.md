# AI Studio — UMKM WA diagrams

Part of [docs/aistudio/](../../../docs/aistudio/README.md).

| Bagian | Folder | Level |
|--------|--------|-------|
| **Business** | [business/](./business/) | L0–L4 (+ L0b, L0c) |
| **System** | [system/](./system/) | L5–L7 |

## Untuk sales / pitch (disarankan)

| Level | SVG | Isi |
|-------|-----|-----|
| **L0** | [L0-bisnis-besar.svg](./business/L0-bisnis-besar.svg) | DAFTAR → Approve → kasir |
| **L0b** | [L0b-kasir-harian.svg](./business/L0b-kasir-harian.svg) | Ritual: stok / jual / ya / satu lagi / belanja / laporan / **tutup toko** |
| **L0c** | [L0c-chat-only.svg](./business/L0c-chat-only.svg) | **Chat teks dulu** — foto/suara → arahkan ketik jual/stok |
| **L1** | [L1-shared-inbox.svg](./business/L1-shared-inbox.svg) | Satu nomor bisnis, banyak toko |
| **L2** | [L2-aktor-swimlane.svg](./business/L2-aktor-swimlane.svg) | Owner vs admin |

Docs: [pitch.md](../../../docs/aistudio/umkm-wa/business/pitch.md)

## Detail internal (ops) — L3–L4

Label masih teknis; bukan pintu sales.

| Level | SVG |
|-------|-----|
| **L3** | [L3-gate-teknis.svg](./business/L3-gate-teknis.svg) |
| **L4** | [L4-wizard-state.svg](./business/L4-wizard-state.svg) |

Ops docs: [business/ops/](../../../docs/aistudio/umkm-wa/business/ops/)

## System (L5–L7)

| Level | SVG | Isi |
|-------|-----|-----|
| **L5** | [L5-hermes-runtime.svg](./system/L5-hermes-runtime.svg) | Containers / pipe / media-refuse / bridge |
| **L6** | [L6-kasir-agent-path.svg](./system/L6-kasir-agent-path.svg) | SOUL → kasir-tools → DB; toolsets berbahaya OFF |
| **L7** | [L7-inbound-gate.svg](./system/L7-inbound-gate.svg) | Urutan gate: multimodal → allowlist → stamp → tools (stok/jual/laporan/**tutup**) |

Docs: [hermes-architecture.md](../../../docs/aistudio/umkm-wa/system/hermes-architecture.md)

### Render Mermaid → SVG

From repo root (needs network; uses [mermaid.ink](https://mermaid.ink) if CLI missing):

```bash
# Optional local CLI:
# npx -y @mermaid-js/mermaid-cli -i …/L0c-chat-only.mmd -o …/L0c-chat-only.svg
```

Prefer committing both `.mmd` (source) and `.svg` (preview in GitHub/docs).
