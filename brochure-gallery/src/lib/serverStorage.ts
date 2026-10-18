import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type { TenantBrochure } from "./brochureTypes";
import { SEED_BROCHURES } from "./seedBrochures";

const SUPABASE_URL =
  process.env.SUPABASE_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "http://kong:8000";

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc1MjE1MjE4LCJleHAiOjIxNDU5MTY4MDB9.6q7QrCyLzEJ-m2Mw8Y29BNR_tF3fKAfbXhdcc4HKxhE";

const S3_ENDPOINT =
  process.env.S3_INTERNAL_ENDPOINT ||
  process.env.S3_ENDPOINT ||
  process.env.NEXT_PUBLIC_S3_ENDPOINT ||
  "http://minio:9000";

const S3_BUCKET =
  process.env.S3_BUCKET ||
  process.env.NEXT_PUBLIC_S3_BUCKET ||
  "cms-media";

const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "minioadmin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "minioadmin";
const S3_REGION = process.env.S3_REGION || "us-east-1";

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

function normalizeBrochureRow(row: Record<string, unknown>): TenantBrochure {
  return {
    id: String(row.id || ""),
    tenant_id: row.tenant_id ? String(row.tenant_id) : null,
    tenant_name: String(row.tenant_name || "Nusantarasoft Tenant"),
    tenant_slug: String(row.tenant_slug || "nusantarasoft"),
    tenant_plan: String(row.tenant_plan || "Enterprise"),
    tenant_logo_initials: String(row.tenant_logo_initials || "NS"),
    tenant_accent_color: String(row.tenant_accent_color || "#fb923c"),
    tenant_verified: Boolean(row.tenant_verified ?? true),
    title: String(row.title || "Untitled Brochure"),
    slug: String(row.slug || "untitled"),
    subtitle: String(row.subtitle || ""),
    description: String(row.description || ""),
    category: String(row.category || "Enterprise Cloud & AI"),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    image_url: String(row.image_url || `/api/brochure-svg/${row.slug}`),
    aspect_ratio: String(row.aspect_ratio || "3:4"),
    featured: Boolean(row.featured ?? false),
    views_count: Number(row.views_count ?? 0),
    shares_count: Number(row.shares_count ?? 0),
    downloads_count: Number(row.downloads_count ?? 0),
    likes_count: Number(row.likes_count ?? 0),
    cta_label: String(row.cta_label || "Inquire via WhatsApp"),
    cta_url: String(row.cta_url || "https://wa.me/62811924689"),
    contact_phone: String(row.contact_phone || "+62 811-924-689"),
    contact_email: String(row.contact_email || "info@nusantarasoft.id"),
    location: String(row.location || "Indonesia"),
    promo_code: String(row.promo_code || "NUSANTARA26"),
    valid_until: String(row.valid_until || "2026-12-31"),
    highlights: Array.isArray(row.highlights)
      ? (row.highlights as TenantBrochure["highlights"])
      : [],
    palette: Array.isArray(row.palette)
      ? row.palette.map(String)
      : ["#fb923c", "#38bdf8", "#0b0e13"],
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as TenantBrochure["metadata"])
        : {},
    is_active: Boolean(row.is_active ?? true),
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function fetchBrochuresFromDb(): Promise<{
  brochures: TenantBrochure[];
  source: "supabase" | "seed";
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("tenant_brochures")
      .select("*")
      .eq("is_active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return { brochures: SEED_BROCHURES, source: "seed" };
    }

    return {
      brochures: data.map((r) => normalizeBrochureRow(r as Record<string, unknown>)),
      source: "supabase",
    };
  } catch {
    return { brochures: SEED_BROCHURES, source: "seed" };
  }
}

export async function fetchBrochureBySlug(slug: string): Promise<TenantBrochure | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("tenant_brochures")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!error && data) {
      return normalizeBrochureRow(data as Record<string, unknown>);
    }
  } catch {
    // Fallback to seed below
  }
  return SEED_BROCHURES.find((b) => b.slug === slug) || null;
}

export async function uploadBrochureAssetToS3(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<{ s3Key: string; publicUrl: string } | null> {
  try {
    const buffer = typeof body === "string" ? Buffer.from(body, "utf-8") : body;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    const publicEndpoint =
      process.env.NEXT_PUBLIC_S3_ENDPOINT || "http://127.0.0.1:9000";
    return {
      s3Key: key,
      publicUrl: `${publicEndpoint}/${S3_BUCKET}/${key}`,
    };
  } catch (err) {
    console.warn("[S3 Upload Warning]", err);
    return null;
  }
}
