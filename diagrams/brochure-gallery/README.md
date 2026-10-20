# Brochure Gallery Ladder Diagrams

Part of [`docs/brochure-gallery/README.md`](../../docs/brochure-gallery/README.md).

| Level | File | Description |
|-------|------|-------------|
| **L0 (Business)** | [`business/L0-omni-share-flow.svg`](./business/L0-omni-share-flow.svg) | Visitor / Tenant discovery (incl. onboarding carousel → admin CTAs), hotspot inspection, and omni-channel brochure sharing flow |
| **L0b (Business)** | [`business/L0b-showcase-onboarding.svg`](./business/L0b-showcase-onboarding.svg) | Public showcase entry: 5-step onboarding carousel (register → login → gallery → AI Studio → Virtual Office) via `NEXT_PUBLIC_ADMIN_URL` |
| **L1 (System)** | [`system/L1-brochure-gallery-flow.svg`](./system/L1-brochure-gallery-flow.svg) | Next.js `brochure-gallery` container (`:3004`), Supabase `tenant_brochures` + RPC, and MinIO S3 (`cms-media/brochures`) |
