"use client";

import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Layers,
  MapPin,
  MessageCircle,
  Minimize2,
  Share2,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { TenantBrochure } from "@/lib/brochureTypes";
import type { VOTheme } from "@/lib/voTheme";
import {
  copyBrochureImageToClipboard,
  downloadBrochurePng,
  getBrochureShareUrl,
  getSocialShareLinks,
} from "@/lib/shareUtils";

interface BrochureLightboxModalProps {
  brochure: TenantBrochure | null;
  vo: VOTheme;
  darkMode: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenShare: (brochure: TenantBrochure) => void;
  onToast: (msg: string) => void;
}

export default function BrochureLightboxModal({
  brochure,
  vo,
  darkMode,
  onClose,
  onPrev,
  onNext,
  onOpenShare,
  onToast,
}: BrochureLightboxModalProps) {
  const [zoom, setZoom] = useState(1);
  const [showHotspots, setShowHotspots] = useState(true);
  const [activeHotspotIdx, setActiveHotspotIdx] = useState<number>(0);

  useEffect(() => {
    setZoom(1);
    setActiveHotspotIdx(0);
  }, [brochure?.slug]);

  useEffect(() => {
    if (!brochure) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [brochure, onClose, onPrev, onNext]);

  if (!brochure) return null;

  const accent = brochure.tenant_accent_color || vo.accent;
  const social = getSocialShareLinks(brochure);
  const shareUrl = getBrochureShareUrl(brochure.slug);

  const handleCopyPromo = async () => {
    try {
      await navigator.clipboard.writeText(brochure.promo_code);
      onToast(`Copied voucher code: ${brochure.promo_code}`);
    } catch {
      // ignore
    }
  };

  const handleQuickCopyPng = async () => {
    try {
      const ok = await copyBrochureImageToClipboard(brochure, true);
      if (ok) {
        onToast("Brochure PNG copied to clipboard! Paste anywhere (Ctrl+V)");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        onToast("Brochure link copied to clipboard!");
      }
    } catch {
      await navigator.clipboard.writeText(shareUrl);
      onToast("Brochure link copied to clipboard!");
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-5"
      style={{
        background: "rgba(5, 7, 11, 0.88)",
        backdropFilter: "blur(16px)",
      }}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden font-mono"
        style={{
          background: vo.surfaceStrong,
          border: `1px solid ${vo.borderStrong}`,
          borderTop: `3px solid ${accent}`,
          boxShadow: vo.shadow,
          color: vo.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Showcase Header */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
          style={{
            borderColor: vo.border,
            background: darkMode ? "#080a0f" : "#f1f5f9",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-7 w-7 items-center justify-center text-xs font-extrabold"
              style={{ background: accent, color: "#080a0f" }}
            >
              {brochure.tenant_logo_initials}
            </span>
            <div>
              <div
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                style={{ color: accent }}
              >
                <span>{brochure.tenant_name}</span>
                <span>·</span>
                <span>{brochure.category}</span>
              </div>
              <div className="text-xs font-bold sm:text-sm">{brochure.title}</div>
            </div>
          </div>

          {/* Zoom, Pins & Share Controls */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.35).toFixed(2))))}
              className="flex h-8 items-center gap-1 border px-2.5 text-[11px]"
              style={{ borderColor: vo.borderStrong, color: vo.text }}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-bold" style={{ color: accent }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.7, Number((z + 0.35).toFixed(2))))}
              className="flex h-8 items-center gap-1 border px-2.5 text-[11px]"
              style={{ borderColor: vo.borderStrong, color: vo.text }}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            {zoom !== 1 && (
              <button
                onClick={() => setZoom(1)}
                className="flex h-8 items-center gap-1 border px-2 text-[10.5px]"
                style={{ borderColor: vo.borderStrong, color: vo.textMuted }}
              >
                <Minimize2 className="h-3 w-3" />
                <span>100%</span>
              </button>
            )}

            <button
              onClick={() => setShowHotspots((s) => !s)}
              className="flex h-8 items-center gap-1.5 border px-2.5 text-[11px] font-semibold"
              style={{
                borderColor: showHotspots ? accent : vo.borderStrong,
                background: showHotspots ? vo.selectedBg : "transparent",
                color: showHotspots ? accent : vo.textMuted,
              }}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>PINS ({brochure.highlights.length})</span>
            </button>

            <button
              onClick={() => onOpenShare(brochure)}
              className="flex h-8 items-center gap-1.5 px-3 text-[11px] font-bold"
              style={{ background: accent, color: "#080a0f" }}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>SHARE</span>
            </button>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center border"
              style={{ borderColor: vo.borderStrong, color: vo.textMuted }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Split Body */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
          {/* Left Brochure Poster Canvas */}
          <div
            className="relative flex min-h-[420px] items-center justify-center overflow-auto border-b p-4 lg:col-span-7 lg:border-b-0 lg:border-r"
            style={{
              borderColor: vo.border,
              background: "#05070b",
            }}
          >
            <button
              onClick={onPrev}
              className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border transition-transform hover:scale-105"
              style={{
                background: "rgba(11,14,19,0.9)",
                borderColor: accent,
                color: "#f8fafc",
              }}
              title="Previous Brochure (←)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              onClick={onNext}
              className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center border transition-transform hover:scale-105"
              style={{
                background: "rgba(11,14,19,0.9)",
                borderColor: accent,
                color: "#f8fafc",
              }}
              title="Next Brochure (→)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div
              className="relative transition-transform duration-200"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                maxWidth: "440px",
                width: "100%",
              }}
            >
              <img
                src={brochure.image_url}
                alt={brochure.title}
                className="block w-full border shadow-2xl"
                style={{ borderColor: accent }}
              />

              {showHotspots &&
                brochure.highlights.map((h, idx) => {
                  const isSelected = activeHotspotIdx === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveHotspotIdx(idx)}
                      style={{
                        left: `${h.x}%`,
                        top: `${h.y}%`,
                        background: isSelected ? accent : "#080a0f",
                        color: isSelected ? "#080a0f" : "#ffffff",
                        borderColor: accent,
                      }}
                      className="group absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 text-xs font-extrabold shadow-lg transition-transform hover:scale-125"
                      title={`${h.label} — ${h.price}`}
                    >
                      <span>0{idx + 1}</span>
                      <span
                        className="pointer-events-none absolute inset-0 animate-ping opacity-40"
                        style={{ background: accent }}
                      />
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Right Brochure Highlights & Instant Share Panel */}
          <div className="flex flex-col justify-between p-5 lg:col-span-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[10px] font-bold uppercase"
                  style={{
                    borderColor: accent,
                    background: vo.selectedBg,
                    color: accent,
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  {brochure.category}
                </span>

                <div
                  className="flex items-center gap-1 text-[11px]"
                  style={{ color: vo.textMuted }}
                >
                  <MapPin className="h-3.5 w-3.5" style={{ color: accent }} />
                  <span>{brochure.location}</span>
                </div>
              </div>

              <div>
                <h2
                  className="font-sans text-lg font-extrabold leading-snug"
                  style={{ color: vo.text }}
                >
                  {brochure.title}
                </h2>
                <p
                  className="mt-1.5 font-sans text-xs leading-relaxed"
                  style={{ color: vo.textMuted }}
                >
                  {brochure.description}
                </p>
              </div>

              {/* Brochure Highlights */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: accent }}
                  >
                    FEATURED HIGHLIGHTS &amp; PRICING (CLICK PIN TO VIEW)
                  </span>
                </div>
                <div className="space-y-2">
                  {brochure.highlights.map((h, idx) => {
                    const active = activeHotspotIdx === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveHotspotIdx(idx)}
                        className="cursor-pointer border p-3 transition-all"
                        style={{
                          borderColor: active ? accent : vo.border,
                          borderLeft: `3px solid ${active ? accent : vo.borderStrong}`,
                          background: active ? vo.selectedBg : vo.hoverBg,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold" style={{ color: vo.text }}>
                            0{idx + 1}. {h.label}
                          </span>
                          <span
                            className="shrink-0 px-2 py-0.5 text-[11px] font-extrabold"
                            style={{ background: accent, color: "#080a0f" }}
                          >
                            {h.price}
                          </span>
                        </div>
                        <p className="mt-1 font-sans text-[11.5px]" style={{ color: vo.textMuted }}>
                          {h.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Promo Voucher */}
              <div
                className="flex items-center justify-between border border-dashed p-3"
                style={{
                  borderColor: accent,
                  background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
                }}
              >
                <div>
                  <div
                    className="text-[9.5px] uppercase tracking-wider"
                    style={{ color: vo.textMuted }}
                  >
                    PROMO VOUCHER (VALID UNTIL {brochure.valid_until})
                  </div>
                  <div className="text-sm font-extrabold" style={{ color: accent }}>
                    {brochure.promo_code}
                  </div>
                </div>
                <button
                  onClick={handleCopyPromo}
                  className="flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-bold"
                  style={{ borderColor: accent, color: vo.text }}
                >
                  <Copy className="h-3.5 w-3.5" style={{ color: accent }} />
                  <span>COPY CODE</span>
                </button>
              </div>
            </div>

            {/* Bottom Share & Inquiry Action Bar */}
            <div className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: vo.border }}>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onOpenShare(brochure)}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-extrabold"
                  style={{ background: accent, color: "#080a0f" }}
                >
                  <Share2 className="h-4 w-4" />
                  <span>SHARE IMAGE ANYWHERE</span>
                </button>

                <a
                  href={brochure.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 border py-2.5 text-xs font-bold"
                  style={{
                    borderColor: "#22c55e",
                    background: "rgba(34,197,94,0.14)",
                    color: vo.text,
                  }}
                >
                  <MessageCircle className="h-4 w-4 text-emerald-400" />
                  <span>{brochure.cta_label.toUpperCase()}</span>
                </a>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleQuickCopyPng}
                  className="flex items-center justify-center gap-1.5 border py-2 text-[11px] font-semibold"
                  style={{ borderColor: vo.borderStrong, color: vo.text }}
                >
                  <Copy className="h-3.5 w-3.5" style={{ color: accent }} />
                  <span>COPY PNG</span>
                </button>

                <button
                  onClick={() => {
                    void downloadBrochurePng(brochure, true);
                    onToast("Downloading brochure share card PNG...");
                  }}
                  className="flex items-center justify-center gap-1.5 border py-2 text-[11px] font-semibold"
                  style={{ borderColor: vo.borderStrong, color: vo.text }}
                >
                  <Download className="h-3.5 w-3.5 text-sky-400" />
                  <span>SAVE PNG</span>
                </button>

                <a
                  href={social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 border py-2 text-[11px] font-semibold"
                  style={{ borderColor: vo.borderStrong, color: vo.text }}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                  <span>WA SHARE</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
