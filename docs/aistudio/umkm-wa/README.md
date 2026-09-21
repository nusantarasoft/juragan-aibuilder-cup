# AI Studio — UMKM Business Support System (WhatsApp)

Satu nomor WhatsApp bisnis shared; banyak toko dipisah by nomor pemilik. Pemilik daftar lewat chat (**DAFTAR**); admin setujui di `/admin/ai-studio/umkm`; lalu **Business Support System** (stok, jual, laporan, **tutup toko**, **tanya kurikulum**) lewat **chat teks**.

## Pilih audiens

| Siapa | Buka |
|-------|------|
| **Sales / tenant / bisnis** | [business/pitch.md](./business/pitch.md) |
| **Owner usaha mikro (penawaran + contoh)** | [business/penawaran-usaha-mikro.md](./business/penawaran-usaha-mikro.md) |
| **Landing `/kasir`** | [`landing-page/src/app/kasir`](../../../landing-page/src/app/kasir/) |
| **Tim internal** (trial) | [business/ops/](./business/ops/) — termasuk [consult-kurikulum.md](./business/ops/consult-kurikulum.md) |
| **Development** | [system/](./system/) — [model-stack.md](./system/model-stack.md) (GLM Hermes / Qwen3-VL vision / Qwen consult / Whisper) · architecture · gaps · local |

Diagram: [diagrams/aistudio/umkm-wa](../../../diagrams/aistudio/umkm-wa/README.md) — pitch L0–L2 (+ L0b ritual, **L0c** chat-only, **L0d** tanya vs stok); system L5–**L10**.
