import React from "react";
import type { Metadata } from "next";
import BrochureGalleryApp from "@/components/BrochureGalleryApp";
import { fetchBrochureBySlug, fetchBrochuresFromDb } from "@/lib/serverStorage";

export const dynamic = "force-dynamic";

export async function generateMetadata(context: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await context.params;
  const brochure = await fetchBrochureBySlug(slug);
  if (!brochure) {
    return {
      title: "Brochure Not Found — Nusantarasoft Brochure Vault",
    };
  }

  const title = `${brochure.title} — ${brochure.tenant_name}`;
  const description = `${brochure.subtitle || brochure.description} (Promo: ${brochure.promo_code})`;
  const ogImage = brochure.image_url.startsWith("http")
    ? brochure.image_url
    : `/api/brochure-svg/${brochure.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 900, height: 1200, alt: brochure.title }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BrochurePermalinkPage(context: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await context.params;
  const { brochures } = await fetchBrochuresFromDb();
  return <BrochureGalleryApp initialBrochures={brochures} initialSelectedSlug={slug} />;
}
