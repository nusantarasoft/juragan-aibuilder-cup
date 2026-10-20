"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flame,
  Layers,
  LayoutGrid,
  LogIn,
  MapPin,
  Maximize2,
  MessageCircle,
  Moon,
  Pause,
  Play,
  Search,
  Share2,
  Sun,
  Tag,
} from "lucide-react";
import type { GalleryViewMode, TenantBrochure } from "@/lib/brochureTypes";
import { SEED_BROCHURES } from "@/lib/seedBrochures";
import { getVOTheme, type VOTheme } from "@/lib/voTheme";
import {
  copyBrochureImageToClipboard,
  getBrochureShareUrl,
  getSocialShareLinks,
} from "@/lib/shareUtils";
import ShareModal from "./ShareModal";
import BrochureLightboxModal from "./BrochureLightboxModal";
import OnboardingCarousel from "./OnboardingCarousel";
import { adminPath } from "@/lib/adminUrl";

interface BrochureGalleryAppProps {
  initialBrochures?: TenantBrochure[];
  initialSelectedSlug?: string;
}

const THEME_STORAGE_KEY = "brochure-gallery-theme";

function TiltBrochureCard({
  brochure,
  vo,
  darkMode,
  onInspect,
  onShare,
  onToast,
}: {
  brochure: TenantBrochure;
  vo: VOTheme;
  darkMode: boolean;
  onInspect: (b: TenantBrochure) => void;
  onShare: (b: TenantBrochure) => void;
  onToast: (msg: string) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, hover: false });
  const accent = brochure.tenant_accent_color || vo.accent;
  const social = getSocialShareLinks(brochure);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 9;
    const rx = (0.5 - py) * 9;
    setTilt({ rx, ry, gx: Math.round(px * 100), gy: Math.round(py * 100), hover: true });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, hover: false });
  };

  const handleCopyPromo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(brochure.promo_code);
      onToast(`Voucher code ${brochure.promo_code} copied!`);
    } catch {
      // ignore
    }
  };

  const handleQuickCopyPng = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const ok = await copyBrochureImageToClipboard(brochure, true);
      if (ok) {
        onToast("Brochure PNG copied to clipboard! Paste anywhere (Ctrl+V)");
      } else {
        await navigator.clipboard.writeText(getBrochureShareUrl(brochure.slug));
        onToast("Brochure share link copied!");
      }
    } catch {
      await navigator.clipboard.writeText(getBrochureShareUrl(brochure.slug));
      onToast("Brochure share link copied!");
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onInspect(brochure)}
      className="group relative flex cursor-pointer flex-col justify-between overflow-hidden font-mono transition-shadow duration-200"
      style={{
        background: vo.surfaceStrong,
        border: `1px solid ${tilt.hover ? accent : vo.borderStrong}`,
        borderTop: `2px solid ${accent}`,
        boxShadow: tilt.hover
          ? darkMode
            ? `0 22px 48px -12px rgba(0,0,0,0.65), 0 0 24px -6px ${accent}55`
            : `0 20px 40px -12px rgba(15,23,42,0.18), 0 0 20px -6px ${accent}44`
          : "none",
        transform: tilt.hover
          ? `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateY(-3px)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg)",
        transition: "transform 0.14s ease-out, border-color 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* Interactive Cursor Glare Overlay */}
      {tilt.hover && (
        <div
          className="pointer-events-none absolute inset-0 z-10 opacity-20"
          style={{
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, ${accent}, transparent 55%)`,
          }}
        />
      )}

      <div>
        {/* Top Tenant Strip */}
        <div
          className="flex items-center justify-between border-b px-3.5 py-2.5"
          style={{
            borderColor: vo.border,
            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center text-[11px] font-extrabold"
              style={{ background: accent, color: "#080a0f" }}
            >
              {brochure.tenant_logo_initials}
            </span>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold" style={{ color: vo.text }}>
                {brochure.tenant_name}
              </div>
              <div
                className="truncate text-[9.5px] uppercase tracking-wider"
                style={{ color: accent }}
              >
                {brochure.category}
              </div>
            </div>
          </div>

          {brochure.featured && (
            <span
              className="flex shrink-0 items-center gap-1 px-1.5 py-0.5 text-[9px] font-extrabold uppercase"
              style={{
                background: "rgba(251,146,60,0.18)",
                color: "#ea580c",
                border: "1px solid rgba(251,146,60,0.45)",
              }}
            >
              <Flame className="h-2.5 w-2.5" /> FEATURED
            </span>
          )}
        </div>

        {/* Brochure Image Stage */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#05070b]">
          <img
            src={brochure.image_url}
            alt={brochure.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />

          {/* Floating Highlights Pill */}
          <div
            className="absolute left-2.5 top-2.5 flex items-center gap-1 px-2 py-1 text-[10px] font-bold"
            style={{
              background: "rgba(8, 10, 15, 0.85)",
              border: `1px solid ${accent}`,
              color: "#f8fafc",
            }}
          >
            <Layers className="h-3 w-3" style={{ color: accent }} />
            <span>{brochure.highlights.length} HIGHLIGHTS</span>
          </div>

          {/* Floating Quick Actions on Hover */}
          <div
            className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-between gap-1.5 p-2.5 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(to top, rgba(5,7,11,0.96) 0%, rgba(5,7,11,0.75) 75%, transparent 100%)",
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInspect(brochure);
              }}
              className="flex flex-1 items-center justify-center gap-1 border py-1.5 text-[10.5px] font-bold text-white"
              style={{
                background: "rgba(11,14,19,0.9)",
                borderColor: "rgba(255,255,255,0.25)",
              }}
            >
              <Maximize2 className="h-3 w-3" style={{ color: accent }} />
              <span>INSPECT</span>
            </button>

            <button
              onClick={handleQuickCopyPng}
              className="flex items-center justify-center gap-1 border px-2.5 py-1.5 text-[10.5px] font-bold text-white"
              style={{
                background: "rgba(11,14,19,0.9)",
                borderColor: "rgba(255,255,255,0.25)",
              }}
              title="Copy Brochure PNG Image to Clipboard"
            >
              <Copy className="h-3 w-3" style={{ color: accent }} />
              <span>PNG</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(brochure);
              }}
              className="flex flex-1 items-center justify-center gap-1 py-1.5 text-[10.5px] font-extrabold"
              style={{ background: accent, color: "#080a0f" }}
            >
              <Share2 className="h-3 w-3" />
              <span>SHARE</span>
            </button>
          </div>
        </div>

        {/* Brochure Title & Highlight Callout */}
        <div className="p-3.5">
          <h3 className="line-clamp-1 font-sans text-sm font-extrabold" style={{ color: vo.text }}>
            {brochure.title}
          </h3>
          <p
            className="mt-1 line-clamp-2 font-sans text-xs leading-relaxed"
            style={{ color: vo.textMuted }}
          >
            {brochure.subtitle}
          </p>

          {brochure.highlights[0] && (
            <div
              className="mt-2.5 flex items-center justify-between border px-2.5 py-1.5 text-[11px]"
              style={{
                borderColor: vo.border,
                background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
              }}
            >
              <span className="truncate font-medium" style={{ color: vo.textMuted }}>
                {brochure.highlights[0].label}
              </span>
              <span className="shrink-0 font-bold" style={{ color: accent }}>
                {brochure.highlights[0].price}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Voucher & Instant Share Bar */}
      <div
        className="flex items-center justify-between border-t px-3.5 py-2.5 text-[10.5px]"
        style={{
          borderColor: vo.border,
          background: darkMode ? "#080a0f" : "#f1f5f9",
        }}
      >
        <button
          onClick={handleCopyPromo}
          className="flex items-center gap-1.5 border border-dashed px-2 py-0.5 text-[10px] font-bold transition-opacity hover:opacity-80"
          style={{ borderColor: accent, color: accent }}
          title="Click to copy promo voucher code"
        >
          <Tag className="h-2.5 w-2.5" />
          <span>{brochure.promo_code}</span>
        </button>

        <div className="flex items-center gap-1.5">
          <a
            href={social.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-6 items-center gap-1 border px-2 text-[10px] font-bold"
            style={{
              borderColor: "rgba(34,197,94,0.45)",
              background: "rgba(34,197,94,0.12)",
              color: "#16a34a",
            }}
            title="Share directly to WhatsApp"
          >
            <MessageCircle className="h-3 w-3" />
            <span>WA</span>
          </a>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(brochure);
            }}
            className="flex h-6 items-center gap-1 px-2.5 text-[10px] font-extrabold"
            style={{ background: accent, color: "#080a0f" }}
            title="Share Brochure Image Anywhere"
          >
            <Share2 className="h-3 w-3" />
            <span>SHARE</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BrochureGalleryApp({
  initialBrochures = SEED_BROCHURES,
  initialSelectedSlug,
}: BrochureGalleryAppProps) {
  const [brochures, setBrochures] = useState<TenantBrochure[]>(initialBrochures);

  // Default view is always Light Mode (darkMode = false), persisted in browser localStorage if user toggles it
  const [darkMode, setDarkMode] = useState(false);

  // Showcase View Mode & Filters
  const [viewMode, setViewMode] = useState<GalleryViewMode>("masonry");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // 3D Showcase Stage state
  const [deckIndex, setDeckIndex] = useState(0);
  const [autoPlayDeck, setAutoPlayDeck] = useState(false);

  // Active Modals
  const [inspectedBrochure, setInspectedBrochure] = useState<TenantBrochure | null>(() => {
    if (!initialSelectedSlug) return null;
    return initialBrochures.find((b) => b.slug === initialSelectedSlug) || null;
  });
  const [shareBrochure, setShareBrochure] = useState<TenantBrochure | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const vo = useMemo(() => getVOTheme(darkMode, "#fb923c"), [darkMode]);

  // Restore saved light/dark preference from browser storage on mount (defaults to light mode)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "dark") {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
      } else {
        setDarkMode(false);
        document.documentElement.classList.remove("dark");
      }
    } catch {
      // default to light mode
    }
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
        document.documentElement.classList.toggle("dark", next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  useEffect(() => {
    fetch("/api/brochures", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.brochures) && json.brochures.length > 0) {
          setBrochures(json.brochures);
        }
      })
      .catch(() => {
        // Keep seeded brochures
      });
  }, []);

  // Keyboard shortcut Cmd/Ctrl + K for quick search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    brochures.forEach((b) => set.add(b.category));
    return ["ALL", ...Array.from(set)];
  }, [brochures]);

  const filteredBrochures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return brochures.filter((b) => {
      if (selectedCategory !== "ALL" && b.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.tenant_name.toLowerCase().includes(q) ||
        b.subtitle.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.promo_code.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [brochures, searchQuery, selectedCategory]);

  useEffect(() => {
    if (deckIndex >= filteredBrochures.length) {
      setDeckIndex(0);
    }
  }, [deckIndex, filteredBrochures.length]);

  useEffect(() => {
    if (!autoPlayDeck || filteredBrochures.length <= 1) return;
    const id = setInterval(() => {
      setDeckIndex((i) => (i + 1) % filteredBrochures.length);
    }, 3600);
    return () => clearInterval(id);
  }, [autoPlayDeck, filteredBrochures.length]);

  const activeDeckBrochure =
    filteredBrochures[deckIndex] || filteredBrochures[0] || brochures[0];

  return (
    <div
      className="min-h-screen font-mono transition-colors duration-200"
      style={{
        background: vo.canvas,
        color: vo.text,
      }}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP SHOWCASE HEADER (Admin Styling, Light Mode Default)
         ═══════════════════════════════════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-30 border-b px-4 py-3"
        style={{
          background: vo.glass,
          backdropFilter: vo.blur,
          borderColor: vo.borderStrong,
          borderTop: `2px solid ${vo.accent}`,
        }}
      >
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Nusantarasoft"
              className="h-7 w-7 shrink-0 object-contain"
            />

            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: vo.accent }}
                >
                  NUSANTARASOFT // TENANT BROCHURE SHOWCASE
                </span>
              </div>
              <h1
                className="font-sans text-sm font-black tracking-tight sm:text-base"
                style={{ color: vo.text }}
              >
                Interactive Tenant Brochure Gallery — Share Anywhere
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[220px] max-w-md flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
              style={{ color: vo.textMuted }}
            />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenant, product, category, or voucher... (Ctrl+K)"
              className="w-full border py-1.5 pl-9 pr-14 text-xs outline-none transition-colors"
              style={{
                background: darkMode ? "#080a0f" : "#ffffff",
                borderColor: searchQuery ? vo.accent : vo.borderStrong,
                color: vo.text,
              }}
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px]"
                style={{ color: vo.textMuted }}
              >
                CLEAR
              </button>
            ) : (
              <span
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border px-1.5 py-0.5 text-[9.5px]"
                style={{ borderColor: vo.border, color: vo.textDim }}
              >
                ⌘K
              </span>
            )}
          </div>

          {/* Right Controls: Login Button + View Switcher + Light/Dark Toggle */}
          <div className="flex items-center gap-2">
            {/* Juragan Login Button — uses baked NEXT_PUBLIC_ADMIN_URL */}
            <a
              href={adminPath("/login")}
              className="flex h-8 items-center gap-1.5 border px-3 text-[11px] font-extrabold uppercase tracking-wider transition-opacity hover:opacity-90"
              style={{
                background: vo.accent,
                borderColor: vo.accent,
                color: "#080a0f",
              }}
              title="Sign in to Juragan AI Studio"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>LOGIN</span>
            </a>

            {/* Showcase View Mode Toggle */}
            <div className="flex items-center border" style={{ borderColor: vo.borderStrong }}>
              {(
                [
                  { id: "masonry", label: "GRID", icon: LayoutGrid },
                  { id: "deck3d", label: "3D STAGE", icon: Box },
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const active = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setViewMode(m.id)}
                    className="flex h-8 items-center gap-1.5 px-3 text-[11px] font-bold uppercase tracking-wider transition-all"
                    style={{
                      background: active ? vo.accent : "transparent",
                      color: active ? "#080a0f" : vo.textMuted,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Light / Dark Mode Toggle (Saved in Browser Storage) */}
            <button
              onClick={handleToggleDarkMode}
              className="flex h-8 items-center gap-1.5 border px-2.5 text-[11px] font-semibold"
              style={{ borderColor: vo.borderStrong, color: vo.text }}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">LIGHT</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-700" />
                  <span className="hidden sm:inline">DARK</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. ONBOARDING CAROUSEL (above gallery) + CATEGORY / SHOWCASE STAGE
         ═══════════════════════════════════════════════════════════════════════ */}
      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5">
        <OnboardingCarousel vo={vo} darkMode={darkMode} />

        {/* Category Pills — gallery anchor for onboarding “Ke Galeri” CTA */}
        <section
          id="gallery"
          className="flex flex-wrap items-center justify-between gap-3 border p-3 scroll-mt-20"
          style={{
            background: vo.surfaceStrong,
            borderColor: vo.borderStrong,
          }}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="border px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    borderColor: active ? vo.accent : vo.border,
                    background: active ? vo.accent : "transparent",
                    color: active ? "#080a0f" : vo.textMuted,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="text-[11px]" style={{ color: vo.textMuted }}>
            SHOWCASING <strong style={{ color: vo.accent }}>{filteredBrochures.length}</strong>{" "}
            BROCHURES
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════════
            3A. GRID SHOWCASE (3D TILT BROCHURE CARDS)
           ═══════════════════════════════════════════════════════════════════════ */}
        {viewMode === "masonry" && (
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBrochures.map((b) => (
              <TiltBrochureCard
                key={b.slug}
                brochure={b}
                vo={vo}
                darkMode={darkMode}
                onInspect={(item) => setInspectedBrochure(item)}
                onShare={(item) => setShareBrochure(item)}
                onToast={showToast}
              />
            ))}
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════
            3B. 3D PERSPECTIVE SHOWCASE STAGE
           ═══════════════════════════════════════════════════════════════════════ */}
        {viewMode === "deck3d" && activeDeckBrochure && (
          <section
            className="relative overflow-hidden border p-6"
            style={{
              background: vo.surfaceStrong,
              borderColor: vo.borderStrong,
              borderTop: `3px solid ${activeDeckBrochure.tenant_accent_color || vo.accent}`,
            }}
          >
            {/* Ambient Palette Glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-20 transition-all duration-700"
              style={{
                background: `radial-gradient(circle at 50% 42%, ${
                  activeDeckBrochure.tenant_accent_color || vo.accent
                }, transparent 65%)`,
              }}
            />

            {/* Stage Top Bar */}
            <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: activeDeckBrochure.tenant_accent_color || vo.accent }}
                >
                  3D BROCHURE SHOWCASE // {deckIndex + 1} OF {filteredBrochures.length} ·{" "}
                  {activeDeckBrochure.category}
                </div>
                <h2 className="font-sans text-lg font-black" style={{ color: vo.text }}>
                  {activeDeckBrochure.title} — {activeDeckBrochure.tenant_name}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoPlayDeck((a) => !a)}
                  className="flex items-center gap-1.5 border px-3 py-1.5 text-xs font-bold"
                  style={{
                    borderColor: autoPlayDeck
                      ? activeDeckBrochure.tenant_accent_color
                      : vo.borderStrong,
                    background: autoPlayDeck ? vo.selectedBg : vo.hoverBg,
                    color: vo.text,
                  }}
                >
                  {autoPlayDeck ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  <span>{autoPlayDeck ? "PAUSE" : "AUTO-PLAY"}</span>
                </button>

                <button
                  onClick={() => setShareBrochure(activeDeckBrochure)}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold"
                  style={{
                    background: activeDeckBrochure.tenant_accent_color || vo.accent,
                    color: "#080a0f",
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>SHARE THIS BROCHURE</span>
                </button>
              </div>
            </div>

            {/* 3D Cards Carousel */}
            <div className="relative z-10 flex min-h-[500px] items-center justify-center py-4">
              <button
                onClick={() =>
                  setDeckIndex(
                    (i) => (i - 1 + filteredBrochures.length) % filteredBrochures.length
                  )
                }
                className="absolute left-2 z-30 flex h-11 w-11 items-center justify-center border transition-transform hover:scale-110"
                style={{
                  background: vo.surfaceStrong,
                  borderColor: activeDeckBrochure.tenant_accent_color || vo.accent,
                  color: vo.text,
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="relative flex h-[480px] w-full max-w-4xl items-center justify-center">
                {filteredBrochures.map((b, idx) => {
                  const offset = idx - deckIndex;
                  if (Math.abs(offset) > 2) return null;
                  const isCenter = offset === 0;
                  const translateX = offset * 210;
                  const scale = isCenter ? 1 : 1 - Math.abs(offset) * 0.16;
                  const rotateY = offset * -24;
                  const zIndex = 20 - Math.abs(offset) * 5;
                  const opacity = isCenter ? 1 : 0.45;

                  return (
                    <div
                      key={b.slug}
                      onClick={() => {
                        if (isCenter) setInspectedBrochure(b);
                        else setDeckIndex(idx);
                      }}
                      className="absolute cursor-pointer transition-all duration-500"
                      style={{
                        width: "340px",
                        transform: `translateX(${translateX}px) scale(${scale}) perspective(1100px) rotateY(${rotateY}deg)`,
                        zIndex,
                        opacity,
                      }}
                    >
                      <div
                        className="overflow-hidden border-2 shadow-2xl"
                        style={{
                          borderColor: isCenter
                            ? b.tenant_accent_color || vo.accent
                            : vo.borderStrong,
                          background: "#0b0e13",
                        }}
                      >
                        <img
                          src={b.image_url}
                          alt={b.title}
                          className="aspect-[3/4] w-full object-cover"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setDeckIndex((i) => (i + 1) % filteredBrochures.length)}
                className="absolute right-2 z-30 flex h-11 w-11 items-center justify-center border transition-transform hover:scale-110"
                style={{
                  background: vo.surfaceStrong,
                  borderColor: activeDeckBrochure.tenant_accent_color || vo.accent,
                  color: vo.text,
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Active Brochure Action Dock */}
            <div
              className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3 border p-4"
              style={{
                background: vo.canvas,
                borderColor: activeDeckBrochure.tenant_accent_color || vo.accent,
              }}
            >
              <div>
                <div className="text-xs font-bold" style={{ color: vo.text }}>
                  {activeDeckBrochure.subtitle}
                </div>
                <div
                  className="mt-1 flex flex-wrap items-center gap-3 text-[11px]"
                  style={{ color: vo.textMuted }}
                >
                  <span>VOUCHER: {activeDeckBrochure.promo_code}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {activeDeckBrochure.location}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setInspectedBrochure(activeDeckBrochure)}
                  className="border px-3.5 py-2 text-xs font-bold"
                  style={{ borderColor: vo.borderStrong, color: vo.text }}
                >
                  VIEW HIGHLIGHTS
                </button>
                <button
                  onClick={() => setShareBrochure(activeDeckBrochure)}
                  className="px-4 py-2 text-xs font-extrabold"
                  style={{
                    background: activeDeckBrochure.tenant_accent_color || vo.accent,
                    color: "#080a0f",
                  }}
                >
                  SHARE IMAGE ANYWHERE
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          4. LIGHTBOX INSPECTOR & UNIVERSAL SHARE MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      <BrochureLightboxModal
        brochure={inspectedBrochure}
        vo={vo}
        darkMode={darkMode}
        onClose={() => setInspectedBrochure(null)}
        onPrev={() => {
          if (!inspectedBrochure) return;
          const idx = filteredBrochures.findIndex((b) => b.slug === inspectedBrochure.slug);
          const prevIdx = (idx - 1 + filteredBrochures.length) % filteredBrochures.length;
          setInspectedBrochure(filteredBrochures[prevIdx]);
        }}
        onNext={() => {
          if (!inspectedBrochure) return;
          const idx = filteredBrochures.findIndex((b) => b.slug === inspectedBrochure.slug);
          const nextIdx = (idx + 1) % filteredBrochures.length;
          setInspectedBrochure(filteredBrochures[nextIdx]);
        }}
        onOpenShare={(b) => setShareBrochure(b)}
        onToast={showToast}
      />

      <ShareModal
        brochure={shareBrochure}
        vo={vo}
        darkMode={darkMode}
        onClose={() => setShareBrochure(null)}
        onMetricIncrement={() => {}}
        onToast={showToast}
      />

      {/* Toast Notification Pill */}
      {toastMessage && (
        <div
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 border px-4 py-2.5 text-xs font-bold shadow-2xl"
          style={{
            background: "#080a0f",
            borderColor: vo.accent,
            borderLeft: `4px solid ${vo.accent}`,
            color: "#f8fafc",
          }}
        >
          <CheckCircle2 className="h-4 w-4" style={{ color: vo.accent }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
