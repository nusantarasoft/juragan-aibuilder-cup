import { NextResponse } from "next/server";
import { fetchBrochuresFromDb } from "@/lib/serverStorage";

export async function GET() {
  const { brochures, source, marketingCount, tenantBrochureCount } = await fetchBrochuresFromDb();
  return NextResponse.json(
    {
      success: true,
      source,
      count: brochures.length,
      marketingCount,
      tenantBrochureCount,
      brochures,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    }
  );
}
