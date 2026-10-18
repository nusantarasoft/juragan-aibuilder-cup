import type { TenantBrochure } from "./brochureTypes";

/** Slug prefix for Konten Marketing cards in the showcase (permalink /b/m-{uuid}). */
export const MARKETING_SLUG_PREFIX = "m-";

export type PublicMarketingItem = {
  id: string;
  imageUrl: string;
  caption: string;
  headline: string;
  productName: string;
  price: string;
  storeLabel: string;
  category: string | null;
  publishedAt: string | null;
};

export type MarketingGalleryResponse = {
  items: PublicMarketingItem[];
  page: number;
  limit: number;
  total: number;
};

export function marketingSlug(contentId: string): string {
  return `${MARKETING_SLUG_PREFIX}${contentId}`;
}

export function parseMarketingContentId(slug: string): string | null {
  if (!slug.startsWith(MARKETING_SLUG_PREFIX)) return null;
  const id = slug.slice(MARKETING_SLUG_PREFIX.length);
  return id.length > 0 ? id : null;
}

function marketingGalleryBaseUrl(): string {
  const explicit = process.env.MARKETING_GALLERY_BASE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const landing = process.env.NEXT_PUBLIC_LANDING_URL?.replace(/\/$/, "");
  if (landing) return `${landing}/public/marketing`;
  return "http://middleware:4001/public/marketing";
}

function storeInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "UM";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function slugifyStore(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "warung";
}

export function mapMarketingItemToBrochure(item: PublicMarketingItem): TenantBrochure {
  const title = item.headline?.trim() || item.productName;
  const slug = marketingSlug(item.id);
  const waText = `${title} — ${item.storeLabel}${item.price ? ` (${item.price})` : ""}`;
  return {
    id: item.id,
    tenant_id: null,
    tenant_name: item.storeLabel,
    tenant_slug: slugifyStore(item.storeLabel),
    tenant_plan: "UMKM",
    tenant_logo_initials: storeInitials(item.storeLabel),
    tenant_accent_color: "#22c55e",
    tenant_verified: true,
    title,
    slug,
    subtitle: item.price || item.productName,
    description: item.caption,
    category: item.category?.trim() || "UMKM · Konten Marketing",
    tags: ["konten-marketing", item.category].filter(Boolean) as string[],
    image_url: item.imageUrl,
    aspect_ratio: "3:4",
    featured: false,
    views_count: 0,
    shares_count: 0,
    downloads_count: 0,
    likes_count: 0,
    cta_label: "Order via WhatsApp",
    cta_url: `https://wa.me/?text=${encodeURIComponent(waText)}`,
    contact_phone: "",
    contact_email: "",
    location: "Indonesia",
    promo_code: "",
    valid_until: item.publishedAt
      ? new Date(new Date(item.publishedAt).getTime() + 90 * 86400000).toISOString().slice(0, 10)
      : "2099-12-31",
    highlights: [
      {
        x: 50,
        y: 72,
        label: item.productName,
        price: item.price || "—",
        detail: item.caption.slice(0, 120),
      },
    ],
    palette: ["#22c55e", "#38bdf8", "#0b0e13"],
    metadata: { source: "konten-marketing", marketingContentId: item.id },
    is_active: true,
    created_at: item.publishedAt || new Date().toISOString(),
    updated_at: item.publishedAt || undefined,
  };
}

async function fetchMarketingPage(page: number, limit: number): Promise<MarketingGalleryResponse> {
  const base = marketingGalleryBaseUrl();
  const url = `${base}/gallery?page=${page}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new Error(`Marketing gallery HTTP ${res.status}`);
  }
  return (await res.json()) as MarketingGalleryResponse;
}

/** Approved Konten Marketing items from middleware public API. */
export async function fetchMarketingBrochures(): Promise<TenantBrochure[]> {
  try {
    const limit = 60;
    let page = 1;
    let total = Infinity;
    const all: PublicMarketingItem[] = [];

    while (all.length < total && page <= 20) {
      const batch = await fetchMarketingPage(page, limit);
      total = batch.total ?? batch.items.length;
      all.push(...(batch.items ?? []));
      if (!batch.items?.length || batch.items.length < limit) break;
      page += 1;
    }

    return all.map(mapMarketingItemToBrochure);
  } catch (err) {
    console.warn("[marketing-gallery] fetch failed:", err);
    return [];
  }
}

export async function fetchMarketingBrochureById(id: string): Promise<TenantBrochure | null> {
  try {
    const base = marketingGalleryBaseUrl();
    const res = await fetch(`${base}/gallery/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const item = (await res.json()) as PublicMarketingItem;
    return mapMarketingItemToBrochure(item);
  } catch {
    return null;
  }
}
