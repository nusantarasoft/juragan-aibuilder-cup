# Studio system diagrams (RAG)

| Level | File | Isi |
|-------|------|-----|
| **L1** | [L1-rag-ingest](./L1-rag-ingest.svg) | Upload → extract → chunk → embed → DB |
| **L2** | [L2-rag-ask](./L2-rag-ask.svg) | Query embed → match → synthesize / miss |
| **L3** | [L3-embed-vs-llm](./L3-embed-vs-llm.svg) | Lock embedding; LLM boleh diganti |
| **L4** | [L4-rag-consumers](./L4-rag-consumers.svg) | Studio Chat (notebook) vs WA kurikulum shared |
| **L5** | [L5-riset-knowledge](./L5-riset-knowledge.svg) | Riset Knowledge: fetch → review → merge kurikulum |
| **L5b** | [L5-konten-marketing](./L5-konten-marketing.svg) | Konten Marketing: generate → review → galeri publik |

Docs: [rag-architecture.md](../../../docs/aistudio/studio/system/rag-architecture.md)  
WA knowledge locks: [L8 umkm-wa](../../umkm-wa/system/L8-knowledge-soul.svg)
