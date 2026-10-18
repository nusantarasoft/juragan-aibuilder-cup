import { NextRequest, NextResponse } from "next/server";
import { fetchBrochureBySlug, uploadBrochureAssetToS3 } from "@/lib/serverStorage";
import { generateBrochureSvg } from "@/lib/brochureArtwork";
import { SEED_BROCHURES } from "@/lib/seedBrochures";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const cleanSlug = slug.replace(/\.svg$/i, "");

  const brochure =
    (await fetchBrochureBySlug(cleanSlug)) || SEED_BROCHURES[0];

  const svg = generateBrochureSvg(brochure);

  // Best-effort sync to MinIO S3 bucket in background
  void uploadBrochureAssetToS3(`brochures/${cleanSlug}.svg`, svg, "image/svg+xml");

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
