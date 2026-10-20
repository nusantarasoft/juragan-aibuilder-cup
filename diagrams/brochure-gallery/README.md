# Brochure Gallery Ladder Diagrams

Part of [`docs/brochure-gallery/README.md`](../../docs/brochure-gallery/README.md).

| Level | File | Description |
|-------|------|-------------|
| **L0 (Business)** | [`business/L0-omni-share-flow.svg`](./business/L0-omni-share-flow.svg) | Visitor discovery: WhatsApp-first onboarding with English UI (DAFTAR → kasir chat) + gallery + omni-channel share; header LOGIN for partner/admin only |
| **L0b (Business)** | [`business/L0b-showcase-onboarding.svg`](./business/L0b-showcase-onboarding.svg) | Public showcase entry: 5-step WA-first carousel, EN UI labels / owner phrases kept (DAFTAR → shop name/YA → STATUS → cek stok → `#gallery`) via `wa.me/62811924689` |
| **L1 (System)** | [`system/L1-brochure-gallery-flow.svg`](./system/L1-brochure-gallery-flow.svg) | Next.js `brochure-gallery` container (`:3004`), Supabase `tenant_brochures` + RPC, and MinIO S3 (`cms-media/brochures`) |
