# AI Studio

AI Studio adalah modul utama Admin CMS NusantaraSoft (default landing route `/admin` → `/admin/ai-studio`) untuk **knowledge (notebook)**, **rekrut & kelola agen AI**, **Agentic OS**, **Virtual Office**, **pengaturan AI/gateway**, dan **tenant kasir WhatsApp UMKM**.

Admin UI (default `/admin/ai-studio`):

```text
AI Studio (/admin/ai-studio)
├── Studio (notebook)         /admin/ai-studio
├── Partner (UMKM WA)         /admin/ai-studio/partner
├── Knowledge Research        /admin/ai-studio/knowledge-research
├── Showcase                  /admin/ai-studio/showcase
├── Messages                  /admin/ai-studio/messages
└── Settings                  /admin/ai-studio/settings (LLM Models + Embeddings + WhatsApp Gateway)

Top Bar / Surface Launcher (outside AI Studio submenu):
├── Agentic OS                /admin/agentic-os
└── Virtual Office            /admin/virtual-office
```

## Modul dokumen

| Modul | Dokumen |
|-------|---------|
| **Studio** (notebook) | [studio/](./studio/) — use cases + [RAG architecture](./studio/system/rag-architecture.md) |
| **UMKM kasir WhatsApp** | [umkm-wa/](./umkm-wa/) |
| **Agentic OS · first live employee** | [studio/business/agentic-os-first-employee.md](./studio/business/agentic-os-first-employee.md) |
| **Google Cloud Run Deploy** | [../deploy-cloud-run.md](../deploy-cloud-run.md) |

Diagrams: [`diagrams/aistudio/studio/`](../../diagrams/aistudio/studio/README.md) (RAG L1–L4) · [`diagrams/aistudio/umkm-wa/`](../../diagrams/aistudio/umkm-wa/README.md) (kasir WA)

### UMKM kasir WA — mulai di sini

| Siapa | Buka |
|-------|------|
| **Sales / tenant / orang bisnis** | [umkm-wa/business/pitch.md](./umkm-wa/business/pitch.md) |
| **Tim internal** (trial / checklist) | [umkm-wa/business/ops/](./umkm-wa/business/ops/) |
| **Development** (catatan sistem) | [umkm-wa/system/](./umkm-wa/system/) |

Diagram: [`diagrams/aistudio/umkm-wa/`](../../diagrams/aistudio/umkm-wa/README.md)

### Studio notebook — mulai di sini

| Siapa | Buka |
|-------|------|
| **Use cases Admin** | [studio/README.md](./studio/README.md) |
| **RAG / embedding (eng)** | [studio/system/rag-architecture.md](./studio/system/rag-architecture.md) |

Diagrams RAG: [`diagrams/aistudio/studio/system/`](../../diagrams/aistudio/studio/system/README.md)
