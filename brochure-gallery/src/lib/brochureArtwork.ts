import type { TenantBrochure } from "./brochureTypes";

function escapeXml(unsafe: string): string {
  return String(unsafe ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine: number, maxLines = 3): string[] {
  const words = String(text || "").split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length <= maxCharsPerLine) {
      current = (current + " " + w).trim();
    } else {
      if (current) lines.push(current);
      current = w;
      if (lines.length >= maxLines - 1) break;
    }
  }
  const usedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const remaining = words.slice(usedWords).join(" ");
  if (remaining) {
    lines.push(
      remaining.length > maxCharsPerLine
        ? remaining.slice(0, maxCharsPerLine - 1) + "…"
        : remaining
    );
  }
  return lines.slice(0, maxLines);
}

function renderBrochureIllustration(
  slug: string,
  category: string,
  primary: string,
  secondary: string
): string {
  // 1. Coffee & Roastery
  if (slug.includes("kopi") || slug.includes("coffee")) {
    return `
      <g opacity="0.95">
        <circle cx="670" cy="370" r="155" fill="${primary}" fill-opacity="0.1" stroke="${primary}" stroke-width="2"/>
        <circle cx="670" cy="370" r="118" fill="#181009" stroke="${secondary}" stroke-width="1.5" stroke-dasharray="6 4"/>
        <path d="M605,345 L735,345 L720,435 C715,455 625,455 620,435 Z" fill="${primary}" fill-opacity="0.28" stroke="${primary}" stroke-width="3"/>
        <path d="M735,360 C765,360 765,410 726,412" fill="none" stroke="${primary}" stroke-width="3.5"/>
        <ellipse cx="670" cy="345" rx="65" ry="14" fill="#291a0d" stroke="#fde68a" stroke-width="2"/>
        <path d="M645,318 Q635,295 650,275" fill="none" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M670,312 Q660,285 678,265" fill="none" stroke="${primary}" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M695,318 Q685,295 700,275" fill="none" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round"/>
        <text x="670" y="482" text-anchor="middle" fill="#fde68a" font-family="monospace" font-size="12.5" font-weight="700">100% ARABICA ROASTERY</text>
      </g>
    `;
  }

  // 2. Nusantara Cuisine / Tumpeng Royal
  if (slug.includes("dapur-nusantara") || slug.includes("catering")) {
    return `
      <g opacity="0.95">
        <circle cx="670" cy="370" r="158" fill="${primary}" fill-opacity="0.11" stroke="${primary}" stroke-width="2"/>
        <circle cx="670" cy="370" r="122" fill="#1b090e" stroke="#facc15" stroke-width="1.5" stroke-dasharray="8 5"/>
        <ellipse cx="670" cy="438" rx="92" ry="20" fill="#15803d" fill-opacity="0.55" stroke="#22c55e" stroke-width="2"/>
        <polygon points="670,268 742,432 598,432" fill="#facc15" fill-opacity="0.88" stroke="#fde047" stroke-width="2.5"/>
        <line x1="635" y1="350" x2="705" y2="350" stroke="#dc2626" stroke-width="3"/>
        <line x1="615" y1="395" x2="725" y2="395" stroke="#dc2626" stroke-width="3"/>
        <text x="670" y="484" text-anchor="middle" fill="#fda4af" font-family="monospace" font-size="12.5" font-weight="700">AUTHENTIC REMPAH KRATON</text>
      </g>
    `;
  }

  // 3. Bakery & Patisserie / Croissant
  if (slug.includes("levain") || category.includes("Bakery")) {
    if (slug.includes("matcha")) {
      return `
        <g opacity="0.95">
          <circle cx="670" cy="370" r="155" fill="${primary}" fill-opacity="0.12" stroke="${primary}" stroke-width="2"/>
          <circle cx="670" cy="370" r="118" fill="#071b0f" stroke="#86efac" stroke-width="1.5" stroke-dasharray="6 4"/>
          <path d="M592,365 L748,365 C742,428 710,446 670,446 C630,446 598,428 592,365 Z" fill="${primary}" fill-opacity="0.28" stroke="#86efac" stroke-width="3"/>
          <path d="M670,275 C705,295 712,340 670,358 C628,340 635,295 670,275 Z" fill="#22c55e" fill-opacity="0.45" stroke="#86efac" stroke-width="2.5"/>
          <line x1="670" y1="285" x2="670" y2="352" stroke="#dcfce7" stroke-width="2"/>
          <text x="670" y="482" text-anchor="middle" fill="#86efac" font-family="monospace" font-size="12.5" font-weight="700">UJI KYOTO FIRST HARVEST</text>
        </g>
      `;
    }
    return `
      <g opacity="0.95">
        <circle cx="670" cy="370" r="155" fill="${primary}" fill-opacity="0.12" stroke="${primary}" stroke-width="2"/>
        <circle cx="670" cy="370" r="118" fill="#1c1108" stroke="#facc15" stroke-width="1.5" stroke-dasharray="6 4"/>
        <path d="M585,395 C580,320 635,285 670,285 C705,285 760,320 755,395 C740,420 715,395 705,375 C690,355 650,355 635,375 C625,395 600,420 585,395 Z" fill="${primary}" fill-opacity="0.38" stroke="#fde047" stroke-width="3"/>
        <path d="M622,330 Q670,305 718,330" fill="none" stroke="#fde047" stroke-width="2"/>
        <path d="M635,355 Q670,335 705,355" fill="none" stroke="#fde047" stroke-width="2"/>
        <text x="670" y="480" text-anchor="middle" fill="#fed7aa" font-family="monospace" font-size="12.5" font-weight="700">AOP FRENCH BUTTER BAKE</text>
      </g>
    `;
  }

  // 4. Japanese Dining / Ramen & Izakaya
  if (slug.includes("kurotora") || slug.includes("ramen")) {
    return `
      <g opacity="0.95">
        <circle cx="670" cy="370" r="156" fill="#dc2626" fill-opacity="0.16" stroke="${primary}" stroke-width="2"/>
        <circle cx="670" cy="345" r="76" fill="#ef4444" fill-opacity="0.32" stroke="#fca5a5" stroke-width="1.5"/>
        <line x1="590" y1="305" x2="758" y2="332" stroke="#fde047" stroke-width="4" stroke-linecap="round"/>
        <line x1="590" y1="325" x2="758" y2="338" stroke="#fde047" stroke-width="4" stroke-linecap="round"/>
        <path d="M582,368 L758,368 C752,432 718,452 670,452 C622,452 588,432 582,368 Z" fill="#180909" stroke="${primary}" stroke-width="3"/>
        <path d="M608,388 L732,388" stroke="#fca5a5" stroke-width="2" stroke-dasharray="8 6"/>
        <text x="670" y="485" text-anchor="middle" fill="#fca5a5" font-family="monospace" font-size="12.5" font-weight="700">18H COLLAGEN TONKOTSU</text>
      </g>
    `;
  }

  // 5. Burgers & Smokehouse
  if (slug.includes("smokehouse") || slug.includes("burger")) {
    return `
      <g opacity="0.95">
        <circle cx="670" cy="370" r="155" fill="${primary}" fill-opacity="0.12" stroke="${primary}" stroke-width="2"/>
        <circle cx="670" cy="370" r="120" fill="#1a0c05" stroke="#facc15" stroke-width="1.5" stroke-dasharray="8 4"/>
        <path d="M595,355 C595,295 745,295 745,355 Z" fill="#f97316" fill-opacity="0.42" stroke="#fdba74" stroke-width="3"/>
        <rect x="588" y="364" width="164" height="16" rx="8" fill="#7c2d12" stroke="#facc15" stroke-width="2"/>
        <polygon points="605,364 635,380 655,364 695,382 720,364" fill="#facc15"/>
        <rect x="588" y="386" width="164" height="16" rx="8" fill="#7c2d12" stroke="#fb923c" stroke-width="2"/>
        <rect x="598" y="408" width="144" height="24" rx="10" fill="#f97316" fill-opacity="0.38" stroke="#fdba74" stroke-width="2.5"/>
        <text x="670" y="480" text-anchor="middle" fill="#fdba74" font-family="monospace" font-size="12.5" font-weight="700">14H WOODFIRE SMOKEHOUSE</text>
      </g>
    `;
  }

  // 6. Fashion & Batik Heritage
  if (slug.includes("batik") || category.includes("Fashion")) {
    return `
      <g opacity="0.95">
        <circle cx="670" cy="370" r="156" fill="none" stroke="${primary}" stroke-width="2"/>
        <circle cx="670" cy="370" r="122" fill="none" stroke="${primary}" stroke-width="1.2" stroke-dasharray="8 6"/>
        <ellipse cx="670" cy="296" rx="40" ry="70" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="2"/>
        <ellipse cx="670" cy="444" rx="40" ry="70" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="2"/>
        <ellipse cx="596" cy="370" rx="70" ry="40" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="2"/>
        <ellipse cx="744" cy="370" rx="70" ry="40" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="2"/>
        <circle cx="670" cy="370" r="26" fill="#1c1408" stroke="#fde047" stroke-width="3"/>
        <text x="670" y="484" text-anchor="middle" fill="#fde047" font-family="monospace" font-size="12.5" font-weight="700">ROYAL BATIK TULIS ATELIER</text>
      </g>
    `;
  }

  // 7. Beauty, Wellness & Spa
  return `
    <g opacity="0.95">
      <circle cx="670" cy="370" r="155" fill="${primary}" fill-opacity="0.12" stroke="${primary}" stroke-width="2"/>
      <circle cx="670" cy="370" r="118" fill="#071923" stroke="#67e8f9" stroke-width="1.5" stroke-dasharray="6 4"/>
      <path d="M670,275 C705,310 708,365 670,395 C632,365 635,310 670,275 Z" fill="${primary}" fill-opacity="0.35" stroke="#67e8f9" stroke-width="2.5"/>
      <path d="M610,335 C645,335 668,365 668,395 C630,395 605,368 610,335 Z" fill="${secondary}" fill-opacity="0.28" stroke="#67e8f9" stroke-width="2"/>
      <path d="M730,335 C695,335 672,365 672,395 C710,395 735,368 730,335 Z" fill="${secondary}" fill-opacity="0.28" stroke="#67e8f9" stroke-width="2"/>
      <ellipse cx="670" cy="415" rx="78" ry="16" fill="none" stroke="#67e8f9" stroke-width="2"/>
      <text x="670" y="482" text-anchor="middle" fill="#67e8f9" font-family="monospace" font-size="12.5" font-weight="700">BOTANICAL SPA &amp; WELLNESS</text>
    </g>
  `;
}

export function generateBrochureSvg(brochure: TenantBrochure): string {
  const primary = brochure.tenant_accent_color || brochure.palette?.[0] || "#fb923c";
  const secondary = brochure.palette?.[1] || "#facc15";
  const bgDark = brochure.palette?.[2] || "#0b0e13";

  const titleLines = wrapText(brochure.title, 26, 3);
  const subtitleLines = wrapText(brochure.subtitle || brochure.description, 46, 2);
  const highlights = (brochure.highlights || []).slice(0, 3);
  const tags = (brochure.tags || []).slice(0, 4);
  const edition = String(brochure.metadata?.edition || "EDITION 2026");

  const highlightCardsSvg = highlights
    .map((h, idx) => {
      const y = 585 + idx * 112;
      return `
        <g transform="translate(56, ${y})">
          <rect x="0" y="0" width="788" height="96" fill="#0b0e13" fill-opacity="0.86" stroke="${
            idx === 0 ? primary : "rgba(255,255,255,0.16)"
          }" stroke-width="${idx === 0 ? "2" : "1"}"/>
          <rect x="0" y="0" width="6" height="96" fill="${idx % 2 === 0 ? primary : secondary}"/>
          <circle cx="38" cy="48" r="16" fill="${primary}" fill-opacity="0.2" stroke="${primary}" stroke-width="1.5"/>
          <text x="38" y="53" text-anchor="middle" fill="${primary}" font-family="monospace" font-size="14" font-weight="700">0${
            idx + 1
          }</text>
          <text x="72" y="38" fill="#f8fafc" font-family="sans-serif" font-size="20" font-weight="800">${escapeXml(
            h.label
          )}</text>
          <text x="72" y="68" fill="#94a3b8" font-family="sans-serif" font-size="13.5">${escapeXml(
            h.detail.length > 74 ? h.detail.slice(0, 72) + "…" : h.detail
          )}</text>
          <rect x="560" y="22" width="206" height="50" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="1.5"/>
          <text x="663" y="53" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="17" font-weight="800">${escapeXml(
            h.price
          )}</text>
        </g>
      `;
    })
    .join("\n");

  const tagsSvg = tags
    .map((tag, i) => {
      const x = 56 + i * 168;
      return `
        <g transform="translate(${x}, 518)">
          <rect x="0" y="0" width="156" height="32" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
          <text x="78" y="21" text-anchor="middle" fill="#e2e8f0" font-family="monospace" font-size="11.5" font-weight="600">#${escapeXml(
            tag.toUpperCase()
          )}</text>
        </g>
      `;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" width="900" height="1200">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080a0f"/>
      <stop offset="55%" stop-color="${bgDark}"/>
      <stop offset="100%" stop-color="#05070b"/>
    </linearGradient>
    <radialGradient id="glowPrimary" cx="75%" cy="30%" r="55%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="${primary}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowSecondary" cx="20%" cy="80%" r="50%">
      <stop offset="0%" stop-color="${secondary}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondary}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="techGrid" width="45" height="45" patternUnits="userSpaceOnUse">
      <path d="M 45 0 L 0 0 0 45" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Canvas Background -->
  <rect width="900" height="1200" fill="url(#bgGrad)"/>
  <rect width="900" height="1200" fill="url(#glowPrimary)"/>
  <rect width="900" height="1200" fill="url(#glowSecondary)"/>
  <rect width="900" height="1200" fill="url(#techGrid)"/>

  <!-- Top Accent Bar -->
  <rect x="0" y="0" width="900" height="8" fill="${primary}"/>
  <rect x="28" y="28" width="844" height="1144" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="1.5"/>

  <!-- Corner Frame Marks -->
  <path d="M 28 52 L 28 28 L 52 28" fill="none" stroke="${primary}" stroke-width="3"/>
  <path d="M 848 28 L 872 28 L 872 52" fill="none" stroke="${primary}" stroke-width="3"/>
  <path d="M 28 1148 L 28 1172 L 52 1172" fill="none" stroke="${primary}" stroke-width="3"/>
  <path d="M 848 1172 L 872 1172 L 872 1148" fill="none" stroke="${primary}" stroke-width="3"/>

  <!-- Header Strip -->
  <rect x="56" y="56" width="788" height="76" fill="#0b0e13" fill-opacity="0.86" stroke="rgba(255,255,255,0.14)" stroke-width="1"/>
  <rect x="56" y="56" width="76" height="76" fill="${primary}"/>
  <text x="94" y="104" text-anchor="middle" fill="#080a0f" font-family="monospace" font-size="28" font-weight="900">${escapeXml(
    brochure.tenant_logo_initials || "NS"
  )}</text>

  <text x="152" y="88" fill="#f8fafc" font-family="sans-serif" font-size="21" font-weight="800">${escapeXml(
    brochure.tenant_name.toUpperCase()
  )}</text>
  <text x="152" y="113" fill="${primary}" font-family="monospace" font-size="12.5" font-weight="600">OFFICIAL TENANT SHOWCASE // ${escapeXml(
    brochure.category.toUpperCase()
  )}</text>

  <rect x="668" y="72" width="156" height="44" fill="rgba(255,255,255,0.04)" stroke="${primary}" stroke-width="1.2"/>
  <text x="746" y="92" text-anchor="middle" fill="#94a3b8" font-family="monospace" font-size="10">EDITION</text>
  <text x="746" y="108" text-anchor="middle" fill="#f8fafc" font-family="monospace" font-size="11.5" font-weight="700">${escapeXml(
    edition.toUpperCase()
  )}</text>

  <!-- Illustration Stage -->
  ${renderBrochureIllustration(brochure.slug, brochure.category, primary, secondary)}

  <!-- Editorial Headline Block -->
  <g transform="translate(56, 185)">
    <rect x="0" y="0" width="195" height="28" fill="${primary}" fill-opacity="0.18" stroke="${primary}" stroke-width="1"/>
    <text x="97" y="19" text-anchor="middle" fill="${primary}" font-family="monospace" font-size="12" font-weight="700">OFFICIAL BROCHURE</text>

    ${titleLines
      .map(
        (line, idx) =>
          `<text x="0" y="${78 + idx * 54}" fill="#ffffff" font-family="sans-serif" font-size="42" font-weight="900" letter-spacing="-0.5">${escapeXml(
            line
          )}</text>`
      )
      .join("\n    ")}

    ${subtitleLines
      .map(
        (line, idx) =>
          `<text x="0" y="${248 + idx * 26}" fill="#cbd5e1" font-family="sans-serif" font-size="17" font-weight="500">${escapeXml(
            line
          )}</text>`
      )
      .join("\n    ")}
  </g>

  <!-- Tags Strip -->
  ${tagsSvg}

  <!-- Featured Highlights Header -->
  <line x1="56" y1="568" x2="844" y2="568" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="56" y="560" fill="${primary}" font-family="monospace" font-size="11.5" font-weight="700" letter-spacing="2">FEATURED HIGHLIGHTS &amp; PRICING</text>

  <!-- Highlight Cards -->
  ${highlightCardsSvg}

  <!-- Promo & Contact Tear-Off Footer -->
  <g transform="translate(56, 940)">
    <rect x="0" y="0" width="788" height="190" fill="#080a0f" stroke="${primary}" stroke-width="2" stroke-dasharray="10 6"/>
    <rect x="0" y="0" width="788" height="36" fill="${primary}" fill-opacity="0.16"/>
    <text x="20" y="23" fill="${primary}" font-family="monospace" font-size="12.5" font-weight="700">EXCLUSIVE TENANT VOUCHER // SHAREABLE DIGITAL BROCHURE</text>
    <text x="768" y="23" text-anchor="end" fill="#94a3b8" font-family="monospace" font-size="11.5">VALID UNTIL: ${escapeXml(
      brochure.valid_until || "2026-12-31"
    )}</text>

    <text x="24" y="76" fill="#94a3b8" font-family="monospace" font-size="12">VOUCHER CODE</text>
    <rect x="24" y="86" width="230" height="46" fill="${primary}"/>
    <text x="139" y="116" text-anchor="middle" fill="#080a0f" font-family="monospace" font-size="21" font-weight="900">${escapeXml(
      brochure.promo_code || "PROMO2026"
    )}</text>

    <text x="284" y="78" fill="#f8fafc" font-family="sans-serif" font-size="18" font-weight="800">${escapeXml(
      brochure.location || "Jakarta & Bali"
    )}</text>
    <text x="284" y="106" fill="${secondary}" font-family="monospace" font-size="15" font-weight="700">WA / TEL: ${escapeXml(
      brochure.contact_phone || "+62 811-924-689"
    )}</text>
    <text x="284" y="130" fill="#94a3b8" font-family="monospace" font-size="13">${escapeXml(
      brochure.contact_email || "hello@nusantarasoft.id"
    )}</text>

    <text x="24" y="166" fill="#64748b" font-family="monospace" font-size="11">VERIFIED TENANT BROCHURE · SHARE LINK: /b/${escapeXml(
      brochure.slug
    )}</text>

    <!-- Stylized Verification Stamp -->
    <g transform="translate(650, 52)">
      <rect x="0" y="0" width="112" height="112" fill="#0b0e13" stroke="${primary}" stroke-width="1.5"/>
      <rect x="10" y="10" width="26" height="26" fill="${primary}"/>
      <rect x="76" y="10" width="26" height="26" fill="${primary}"/>
      <rect x="10" y="76" width="26" height="26" fill="${primary}"/>
      <rect x="44" y="44" width="24" height="24" fill="${secondary}"/>
      <rect x="76" y="76" width="12" height="12" fill="#ffffff"/>
      <rect x="90" y="90" width="12" height="12" fill="${primary}"/>
      <rect x="44" y="14" width="12" height="12" fill="#ffffff"/>
      <rect x="14" y="44" width="12" height="12" fill="#ffffff"/>
    </g>
  </g>
</svg>`;
}
