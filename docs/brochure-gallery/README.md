# Tenant Brochure Showcase (`brochure-gallery`)

`brochure-gallery` is a standalone Next.js 16 frontend container (`http://localhost:3004`) styled with the Nusantarasoft **Agentic OS (`VO_LIGHT` / `VO_DARK`)** design language. It defaults to **Light Mode** and persists the user's Light/Dark preference in browser `localStorage` (`brochure-gallery-theme`).

## Surface & Architecture Summary

| Surface / Endpoint | URL / Port | Purpose |
|--------------------|------------|---------|
| **Public Showcase App** | `http://localhost:3004` (`brochure-gallery:3000`) | Streamlined tenant brochure showcase (`Grid` & `3D Stage` views, category filters, highlight pin inspector, Light/Dark mode persisted in `localStorage`, and image sharing) |
| **Brochure Permalink** | `http://localhost:3004/b/[slug]` | Direct shareable deep-link with server-rendered OpenGraph & Twitter `summary_large_image` cards |
| **External Widget Embed** | `http://localhost:3004/embed/[slug]` | Frameless embeddable brochure card for external `<iframe>` integrations |
| **Poster SVG Renderer** | `http://localhost:3004/api/brochure-svg/[slug]` | High-resolution brochure SVG poster renderer with CORS (`Access-Control-Allow-Origin: *`) & MinIO S3 sync |
| **Brochures Read API** | `http://localhost:3004/api/brochures` | `GET` list of active tenant brochures from Supabase `public.tenant_brochures` |
| **Admin CMS Surface** | `http://localhost:3003/admin/tenants/brochures` | Admin CMS embedded showcase view & surface launcher entry |

### Production (`master-production` / `nsoft3-prod`)

| Surface | URL |
|---------|-----|
| Public showcase | `http://31.97.66.39:3014` (`nsoft3-brochure-gallery`) |
| Admin launcher | `http://31.97.66.39:3013/admin/tenants/brochures` |

Compose: `docker-compose.master-production.yml` service `brochure-gallery`. Redeploy builds it with middleware / landing / admin (`scripts/master-production/redeploy.sh`). Migration: `supabase/migrations/20261018100000_tenant_brochures_gallery.sql`.

## Seeded Tenant Brochures (Food & Beverage + Multi-Category Retail)

1. **Kopi Senja & Roastery Nusantara** (`kopi-senja-archipelago-menu`) — *Food & Beverage*
2. **Dapur Nusantara Heritage Dining** (`dapur-nusantara-royal-catering`) — *Food & Beverage*
3. **Maison Levain Boulangerie & Patisserie** (`maison-levain-sourdough-patisserie`) — *Bakery & Dessert*
4. **Kurotora Ramen & Charcoal Izakaya** (`kurotora-truffle-ramen-izakaya`) — *Food & Beverage*
5. **Uji Komorebi Matcha & Tea House** (`uji-komorebi-ceremonial-matcha`) — *Bakery & Dessert*
6. **Smokehouse 62 Woodfire Grill & Burger** (`smokehouse-62-brisket-burger`) — *Food & Beverage*
7. **Sekar Jagad Heritage Batik & Resort Wear** (`sekar-jagad-royal-batik-lookbook`) — *Fashion & Lifestyle*
8. **Botanika Sanctuary Spa & Skincare** (`botanika-balinese-spa-skincare`) — *Beauty & Wellness*

## Sharing Capabilities (`ShareModal` & `shareUtils`)

1. **Social & Messaging Dispatch**: 1-click formatted sharing to **WhatsApp**, **Telegram**, **X (Twitter)**, **Facebook**, **LinkedIn**, and **Email**.
2. **Native Web Share API**: Uses `navigator.share` (with rasterized `image/png` file attachment when supported by the device OS).
3. **Copy Image Pixels to Clipboard**: Rasterizes the brochure poster + branded tenant QR footer onto an HTML5 `<canvas>` and writes `image/png` directly to `navigator.clipboard`.
4. **High-Res Poster & QR Booth Downloads**: Download standalone PNG poster, composite Share Card with QR code, or standalone QR sticker.
5. **Embed Anywhere**: Copyable `<iframe>` widget, HTML card snippet, and Markdown badge.

## Diagrams

- Index: [`diagrams/brochure-gallery/README.md`](../../diagrams/brochure-gallery/README.md)
- Business Flow (L0): [`diagrams/brochure-gallery/business/L0-omni-share-flow.svg`](../../diagrams/brochure-gallery/business/L0-omni-share-flow.svg)
- System Architecture (L1): [`diagrams/brochure-gallery/system/L1-brochure-gallery-flow.svg`](../../diagrams/brochure-gallery/system/L1-brochure-gallery-flow.svg)
