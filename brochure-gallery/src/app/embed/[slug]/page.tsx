import React from "react";
import { fetchBrochureBySlug } from "@/lib/serverStorage";
import { SEED_BROCHURES } from "@/lib/seedBrochures";

export const dynamic = "force-dynamic";

export default async function BrochureEmbedPage(context: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await context.params;
  const brochure = (await fetchBrochureBySlug(slug)) || SEED_BROCHURES[0];
  const accent = brochure.tenant_accent_color || "#fb923c";

  return (
    <div
      className="flex min-h-screen flex-col justify-between bg-[#080a0f] font-mono text-slate-100"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div>
        <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-6 w-6 items-center justify-center text-[11px] font-black"
              style={{ background: accent, color: "#080a0f" }}
            >
              {brochure.tenant_logo_initials}
            </span>
            <div>
              <div className="text-xs font-bold">{brochure.tenant_name}</div>
              <div className="text-[9.5px] uppercase" style={{ color: accent }}>
                {brochure.tenant_plan} · {brochure.category}
              </div>
            </div>
          </div>

          <span
            className="px-2 py-0.5 text-[10px] font-extrabold"
            style={{ background: accent, color: "#080a0f" }}
          >
            {brochure.promo_code}
          </span>
        </div>

        <div className="relative aspect-[3/4] w-full overflow-hidden bg-black">
          <img
            src={brochure.image_url}
            alt={brochure.title}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/15 bg-[#0b0e13] px-3.5 py-2.5 text-xs">
        <a
          href={`/b/${brochure.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold underline"
          style={{ color: accent }}
        >
          OPEN INTERACTIVE BROCHURE ↗
        </a>
        <a
          href={brochure.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1 font-extrabold text-[#080a0f]"
          style={{ background: "#22c55e" }}
        >
          {brochure.cta_label.toUpperCase()}
        </a>
      </div>
    </div>
  );
}
