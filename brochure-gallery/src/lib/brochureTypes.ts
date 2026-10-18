export interface BrochureHighlight {
  x: number; // percentage 0-100 on brochure image
  y: number; // percentage 0-100 on brochure image
  label: string;
  price: string;
  detail: string;
}

export interface BrochureMetadata {
  edition?: string;
  pages?: number;
  printSpec?: string;
  resolution?: string;
  s3Key?: string;
  [key: string]: unknown;
}

export interface TenantBrochure {
  id: string;
  tenant_id?: string | null;
  tenant_name: string;
  tenant_slug: string;
  tenant_plan: "Enterprise" | "Professional" | "Starter" | "UMKM" | string;
  tenant_logo_initials: string;
  tenant_accent_color: string;
  tenant_verified: boolean;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  category: string;
  tags: string[];
  image_url: string;
  aspect_ratio: "3:4" | "16:9" | "1:1" | string;
  featured: boolean;
  views_count: number;
  shares_count: number;
  downloads_count: number;
  likes_count: number;
  cta_label: string;
  cta_url: string;
  contact_phone: string;
  contact_email: string;
  location: string;
  promo_code: string;
  valid_until: string;
  highlights: BrochureHighlight[];
  palette: string[];
  metadata: BrochureMetadata;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export type GalleryViewMode = "masonry" | "deck3d";

