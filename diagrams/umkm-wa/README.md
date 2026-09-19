# UMKM WA — Diagram alur bertingkat

Folder: `diagrams/umkm-wa/`

Baca **dari L0 ke L4**. Setiap level menambah detail; L0 cukup untuk paham bisnis.

| Level | File SVG | Isi |
|-------|----------|-----|
| **L0** | [L0-bisnis-besar.svg](./L0-bisnis-besar.svg) | Cerita bisnis satu garis: Owner → nomor NS → DAFTAR → Approve → kasir |
| **L1** | [L1-shared-inbox.svg](./L1-shared-inbox.svg) | 1 nomor NS shared, banyak tenant by HP owner |
| **L2** | [L2-aktor-swimlane.svg](./L2-aktor-swimlane.svg) | Owner vs Admin: siapa melakukan apa |
| **L3** | [L3-gate-teknis.svg](./L3-gate-teknis.svg) | Gate allowlist → AIDLC vs wizard DAFTAR |
| **L4** | [L4-wizard-state.svg](./L4-wizard-state.svg) | State machine Intro → … → Approved |

Sumber Mermaid (opsional, untuk edit ulang): file `.mmd` dengan nama sama.

Dokumen aturan: [docs/designs/umkm-wa-register-trial.md](../docs/designs/umkm-wa-register-trial.md)

## Cara buka

- Klik SVG di GitHub / Finder / browser  
- Atau seret ke Chrome/Safari  
