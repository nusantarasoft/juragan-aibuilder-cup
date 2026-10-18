import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/serverStorage";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      metric?: "views" | "shares" | "downloads" | "likes";
    };
    const metric = body.metric || "views";

    const { data, error } = await supabaseAdmin.rpc("increment_brochure_metric", {
      p_slug: slug,
      p_metric: metric,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      brochure: data,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Metric update failed";
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
