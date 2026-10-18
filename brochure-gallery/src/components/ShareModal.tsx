"use client";

import React, { useEffect, useState } from "react";
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Mail,
  MessageCircle,
  QrCode,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import type { TenantBrochure } from "@/lib/brochureTypes";
import type { VOTheme } from "@/lib/voTheme";
import {
  copyBrochureImageToClipboard,
  downloadBrochurePng,
  generateQrDataUrl,
  getBrochureDirectImageUrl,
  getBrochureEmbedUrl,
  getBrochureShareUrl,
  getSocialShareLinks,
  nativeShareBrochure,
  recordBrochureMetric,
} from "@/lib/shareUtils";

interface ShareModalProps {
  brochure: TenantBrochure | null;
  vo: VOTheme;
  darkMode: boolean;
  onClose: () => void;
  onMetricIncrement: (slug: string, metric: "shares" | "downloads") => void;
  onToast: (msg: string) => void;
}

type ShareTab = "social" | "qr" | "embed";

export default function ShareModal({
  brochure,
  vo,
  darkMode,
  onClose,
  onMetricIncrement,
  onToast,
}: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<ShareTab>("social");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    if (!brochure) return;
    const shareUrl = getBrochureShareUrl(brochure.slug);
    generateQrDataUrl(shareUrl, brochure.tenant_accent_color)
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [brochure]);

  if (!brochure) return null;

  const shareUrl = getBrochureShareUrl(brochure.slug);
  const imageUrl = getBrochureDirectImageUrl(brochure);
  const embedUrl = getBrochureEmbedUrl(brochure.slug);
  const links = getSocialShareLinks(brochure);
  const accent = brochure.tenant_accent_color || vo.accent;

  const iframeSnippet = `<iframe src="${embedUrl}" width="420" height="620" style="border:1px solid ${accent};border-radius:0;overflow:hidden;" loading="lazy" title="${brochure.title} — ${brochure.tenant_name}"></iframe>`;
  const markdownSnippet = `[![${brochure.title} — ${brochure.tenant_name}](${imageUrl})](${shareUrl})`;
  const htmlCardSnippet = `<a href="${shareUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;max-width:360px;background:#0b0e13;color:#f8fafc;border:1px solid ${accent};text-decoration:none;font-family:monospace;">
  <img src="${imageUrl}" alt="${brochure.title}" style="width:100%;display:block;" />
  <div style="padding:12px;border-top:2px solid ${accent};">
    <strong>${brochure.title}</strong><br/>
    <span style="color:${accent};font-size:12px;">${brochure.tenant_name} · Promo: ${brochure.promo_code}</span>
  </div>
</a>`;

  const triggerCopied = (key: string, label: string) => {
    setCopiedKey(key);
    onToast(label);
    setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2200);
  };

  const handleCopyText = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      triggerCopied(key, label);
      void recordBrochureMetric(brochure.slug, "shares");
      onMetricIncrement(brochure.slug, "shares");
    } catch {
      onToast("Copy failed — please select and copy manually");
    }
  };

  const handleCopyImagePixels = async () => {
    setBusyAction("copy-image");
    try {
      const ok = await copyBrochureImageToClipboard(brochure, true);
      if (ok) {
        triggerCopied("copy-image", "Brochure PNG image copied to clipboard! Paste anywhere (Ctrl+V)");
        void recordBrochureMetric(brochure.slug, "shares");
        onMetricIncrement(brochure.slug, "shares");
      } else {
        await navigator.clipboard.writeText(imageUrl);
        triggerCopied("copy-image", "Direct image URL copied to clipboard");
      }
    } catch {
      await navigator.clipboard.writeText(imageUrl);
      triggerCopied("copy-image", "Direct image URL copied to clipboard");
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadPng = async (withQrFooter: boolean) => {
    const actionKey = withQrFooter ? "dl-card" : "dl-png";
    setBusyAction(actionKey);
    try {
      await downloadBrochurePng(brochure, withQrFooter);
      onToast(
        withQrFooter
          ? "Downloaded branded social share card (with QR & promo)!"
          : "Downloaded high-res brochure PNG!"
      );
      void recordBrochureMetric(brochure.slug, "downloads");
      onMetricIncrement(brochure.slug, "downloads");
    } catch {
      window.open(imageUrl, "_blank");
    } finally {
      setBusyAction(null);
    }
  };

  const handleNativeShare = async () => {
    setBusyAction("native-share");
    try {
      const res = await nativeShareBrochure(brochure);
      if (res === "shared") {
        onToast("Shared via system share sheet!");
        void recordBrochureMetric(brochure.slug, "shares");
        onMetricIncrement(brochure.slug, "shares");
      } else if (res === "unsupported") {
        await navigator.clipboard.writeText(shareUrl);
        onToast("System share unavailable on this browser — link copied instead!");
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleSocialClick = (platform: string, url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    void recordBrochureMetric(brochure.slug, "shares");
    onMetricIncrement(brochure.slug, "shares");
    onToast(`Opened ${platform} share window`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(5, 7, 11, 0.82)",
        backdropFilter: "blur(12px)",
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden font-mono"
        style={{
          background: vo.surfaceStrong,
          border: `1px solid ${vo.borderStrong}`,
          borderTop: `3px solid ${accent}`,
          boxShadow: vo.shadow,
          color: vo.text,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{
            borderColor: vo.border,
            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex h-7 w-7 items-center justify-center text-xs font-bold"
              style={{ background: accent, color: "#080a0f" }}
            >
              <Share2 className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
                <span>UNIVERSAL SHARE STUDIO // OMNI-CHANNEL DISPATCH</span>
              </div>
              <div className="text-sm font-bold tracking-tight" style={{ color: vo.text }}>
                {brochure.title}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border transition-colors hover:opacity-80"
            style={{ borderColor: vo.borderStrong, color: vo.textMuted }}
            title="Close Share Studio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div
          className="flex border-b px-5"
          style={{
            borderColor: vo.border,
            background: darkMode ? "#080a0f" : "#f1f5f9",
          }}
        >
          {(
            [
              { id: "social", label: "01 // SOCIAL & IMAGE SHARE", icon: Share2 },
              { id: "qr", label: "02 // QR CODE & BOOTH CARD", icon: QrCode },
              { id: "embed", label: "03 // EMBED ANYWHERE", icon: Code2 },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-2 border-r px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all"
                style={{
                  borderColor: vo.border,
                  background: active ? vo.surfaceStrong : "transparent",
                  color: active ? accent : vo.textMuted,
                  borderTop: active ? `2px solid ${accent}` : "2px solid transparent",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-12">
          {/* Left Preview Column */}
          <div className="md:col-span-5">
            <div
              className="relative overflow-hidden border p-2.5"
              style={{
                borderColor: vo.borderStrong,
                background: darkMode ? "#080a0f" : "#f8fafc",
              }}
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden border" style={{ borderColor: vo.border }}>
                <img
                  src={brochure.image_url}
                  alt={brochure.title}
                  className="h-full w-full object-cover"
                />
                <div
                  className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 text-[10px]"
                  style={{
                    background: "rgba(8,10,15,0.88)",
                    border: `1px solid ${accent}`,
                    color: "#f8fafc",
                  }}
                >
                  <span className="truncate font-bold">{brochure.tenant_name}</span>
                  <span
                    className="px-1.5 py-0.5 text-[9.5px] font-extrabold"
                    style={{ background: accent, color: "#080a0f" }}
                  >
                    {brochure.promo_code}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[10.5px]" style={{ color: vo.textMuted }}>
                <span>SHARES: {brochure.shares_count}</span>
                <span>DOWNLOADS: {brochure.downloads_count}</span>
                <span>VIEWS: {brochure.views_count}</span>
              </div>
            </div>
          </div>

          {/* Right Action Column */}
          <div className="flex flex-col justify-between md:col-span-7">
            {activeTab === "social" && (
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                    INSTANT SOCIAL &amp; MESSAGING DISPATCH
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <button
                      onClick={() => handleSocialClick("WhatsApp", links.whatsapp)}
                      className="flex items-center gap-2 border px-3 py-2.5 text-left text-xs font-semibold transition-all hover:translate-y-[-1px]"
                      style={{
                        borderColor: "rgba(34,197,94,0.45)",
                        background: "rgba(34,197,94,0.1)",
                        color: vo.text,
                      }}
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-400" />
                      <div>
                        <div>WhatsApp</div>
                        <div className="text-[9.5px] opacity-70">Chat / Status</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSocialClick("Telegram", links.telegram)}
                      className="flex items-center gap-2 border px-3 py-2.5 text-left text-xs font-semibold transition-all hover:translate-y-[-1px]"
                      style={{
                        borderColor: "rgba(56,189,248,0.45)",
                        background: "rgba(56,189,248,0.1)",
                        color: vo.text,
                      }}
                    >
                      <Send className="h-4 w-4 text-sky-400" />
                      <div>
                        <div>Telegram</div>
                        <div className="text-[9.5px] opacity-70">Channel / DM</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSocialClick("X / Twitter", links.twitter)}
                      className="flex items-center gap-2 border px-3 py-2.5 text-left text-xs font-semibold transition-all hover:translate-y-[-1px]"
                      style={{
                        borderColor: vo.borderStrong,
                        background: vo.hoverBg,
                        color: vo.text,
                      }}
                    >
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      <div>
                        <div>X / Post</div>
                        <div className="text-[9.5px] opacity-70">With Card</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSocialClick("Facebook", links.facebook)}
                      className="flex items-center gap-2 border px-3 py-2.5 text-left text-xs font-semibold transition-all hover:translate-y-[-1px]"
                      style={{
                        borderColor: "rgba(59,130,246,0.45)",
                        background: "rgba(59,130,246,0.1)",
                        color: vo.text,
                      }}
                    >
                      <ExternalLink className="h-4 w-4 text-blue-400" />
                      <div>
                        <div>Facebook</div>
                        <div className="text-[9.5px] opacity-70">Feed Share</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSocialClick("LinkedIn", links.linkedin)}
                      className="flex items-center gap-2 border px-3 py-2.5 text-left text-xs font-semibold transition-all hover:translate-y-[-1px]"
                      style={{
                        borderColor: "rgba(99,102,241,0.45)",
                        background: "rgba(99,102,241,0.1)",
                        color: vo.text,
                      }}
                    >
                      <ExternalLink className="h-4 w-4 text-indigo-400" />
                      <div>
                        <div>LinkedIn</div>
                        <div className="text-[9.5px] opacity-70">B2B Network</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSocialClick("Email", links.email)}
                      className="flex items-center gap-2 border px-3 py-2.5 text-left text-xs font-semibold transition-all hover:translate-y-[-1px]"
                      style={{
                        borderColor: "rgba(251,146,60,0.45)",
                        background: "rgba(251,146,60,0.1)",
                        color: vo.text,
                      }}
                    >
                      <Mail className="h-4 w-4 text-orange-400" />
                      <div>
                        <div>Email</div>
                        <div className="text-[9.5px] opacity-70">Client Dispatch</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Copy Image Pixels & Native Share */}
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                    IMAGE CLIPBOARD &amp; POSTER DOWNLOAD
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      onClick={handleCopyImagePixels}
                      disabled={busyAction === "copy-image"}
                      className="flex items-center justify-between border px-3.5 py-2.5 text-xs font-bold transition-all"
                      style={{
                        borderColor: accent,
                        background: vo.selectedBg,
                        color: vo.text,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        {copiedKey === "copy-image" ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ImageIcon className="h-4 w-4" style={{ color: accent }} />
                        )}
                        <span>
                          {busyAction === "copy-image"
                            ? "Rendering PNG..."
                            : "Copy Image (PNG) to Clipboard"}
                        </span>
                      </span>
                    </button>

                    <button
                      onClick={handleNativeShare}
                      disabled={busyAction === "native-share"}
                      className="flex items-center justify-between border px-3.5 py-2.5 text-xs font-bold transition-all"
                      style={{
                        borderColor: vo.borderStrong,
                        background: vo.hoverBg,
                        color: vo.text,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-sky-400" />
                        <span>
                          {busyAction === "native-share"
                            ? "Opening OS Share..."
                            : "Native Device Share (File + Link)"}
                        </span>
                      </span>
                    </button>

                    <button
                      onClick={() => handleDownloadPng(true)}
                      disabled={busyAction === "dl-card"}
                      className="flex items-center justify-between border px-3.5 py-2.5 text-xs font-semibold transition-all"
                      style={{
                        borderColor: vo.borderStrong,
                        background: vo.hoverBg,
                        color: vo.text,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-emerald-400" />
                        <span>Download Share Card (+QR)</span>
                      </span>
                      <span className="text-[10px] opacity-60">PNG</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPng(false)}
                      disabled={busyAction === "dl-png"}
                      className="flex items-center justify-between border px-3.5 py-2.5 text-xs font-semibold transition-all"
                      style={{
                        borderColor: vo.borderStrong,
                        background: vo.hoverBg,
                        color: vo.text,
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-sky-400" />
                        <span>Download Original Poster</span>
                      </span>
                      <span className="text-[10px] opacity-60">HQ PNG</span>
                    </button>
                  </div>
                </div>

                {/* Permalink & Direct Image Link Copy */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                    DEEP-LINK PERMALINK &amp; RAW IMAGE URL
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="w-full border px-3 py-2 text-xs outline-none"
                      style={{
                        background: darkMode ? "#080a0f" : "#f8fafc",
                        borderColor: vo.borderStrong,
                        color: vo.text,
                      }}
                    />
                    <button
                      onClick={() =>
                        handleCopyText("share-url", shareUrl, "Brochure permalink copied!")
                      }
                      className="flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
                      style={{ background: accent, color: "#080a0f" }}
                    >
                      {copiedKey === "share-url" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>COPY LINK</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={imageUrl}
                      className="w-full border px-3 py-1.5 text-[11px] outline-none"
                      style={{
                        background: darkMode ? "#080a0f" : "#f8fafc",
                        borderColor: vo.border,
                        color: vo.textMuted,
                      }}
                    />
                    <button
                      onClick={() =>
                        handleCopyText("img-url", imageUrl, "Direct brochure image URL copied!")
                      }
                      className="flex shrink-0 items-center gap-1.5 border px-3 py-1.5 text-[11px] font-semibold"
                      style={{ borderColor: vo.borderStrong, color: vo.text }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      <span>IMAGE URL</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "qr" && (
              <div className="flex flex-col items-center justify-center space-y-4 py-2 text-center">
                <div
                  className="border p-4"
                  style={{
                    borderColor: accent,
                    background: "#ffffff",
                  }}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for ${brochure.title}`}
                      className="h-48 w-48"
                    />
                  ) : (
                    <div className="flex h-48 w-48 items-center justify-center text-xs text-slate-500">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: vo.text }}>
                    SCAN TO OPEN &amp; SHARE BROCHURE ON MOBILE
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: vo.textMuted }}>
                    Points directly to <span style={{ color: accent }}>{shareUrl}</span>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2.5">
                  {qrDataUrl && (
                    <a
                      href={qrDataUrl}
                      download={`${brochure.slug}-qr.png`}
                      onClick={() => {
                        void recordBrochureMetric(brochure.slug, "downloads");
                        onMetricIncrement(brochure.slug, "downloads");
                        onToast("Downloaded standalone QR code PNG!");
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold"
                      style={{ background: accent, color: "#080a0f" }}
                    >
                      <Download className="h-4 w-4" />
                      <span>DOWNLOAD QR STICKER (PNG)</span>
                    </a>
                  )}
                  <button
                    onClick={() => handleDownloadPng(true)}
                    className="flex items-center gap-2 border px-4 py-2 text-xs font-bold"
                    style={{ borderColor: accent, color: vo.text }}
                  >
                    <Download className="h-4 w-4" style={{ color: accent }} />
                    <span>DOWNLOAD POSTER + QR CARD</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "embed" && (
              <div className="space-y-3.5">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                      INTERACTIVE IFRAME WIDGET EMBED
                    </span>
                    <button
                      onClick={() =>
                        handleCopyText("embed-iframe", iframeSnippet, "Iframe embed snippet copied!")
                      }
                      className="flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: accent }}
                    >
                      {copiedKey === "embed-iframe" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>COPY IFRAME</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={3}
                    value={iframeSnippet}
                    className="w-full border p-2.5 text-[11px] outline-none"
                    style={{
                      background: darkMode ? "#080a0f" : "#f8fafc",
                      borderColor: vo.borderStrong,
                      color: vo.text,
                    }}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                      HTML CARD SNIPPET (FOR BLOGS / EMAILS / CMS)
                    </span>
                    <button
                      onClick={() =>
                        handleCopyText("embed-html", htmlCardSnippet, "HTML card snippet copied!")
                      }
                      className="flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: accent }}
                    >
                      {copiedKey === "embed-html" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>COPY HTML CARD</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={4}
                    value={htmlCardSnippet}
                    className="w-full border p-2.5 text-[11px] outline-none"
                    style={{
                      background: darkMode ? "#080a0f" : "#f8fafc",
                      borderColor: vo.borderStrong,
                      color: vo.text,
                    }}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
                      MARKDOWN IMAGE LINK (GITHUB / NOTION / DOCS)
                    </span>
                    <button
                      onClick={() =>
                        handleCopyText("embed-md", markdownSnippet, "Markdown snippet copied!")
                      }
                      className="flex items-center gap-1 text-[11px] font-bold"
                      style={{ color: accent }}
                    >
                      {copiedKey === "embed-md" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>COPY MARKDOWN</span>
                    </button>
                  </div>
                  <input
                    readOnly
                    value={markdownSnippet}
                    className="w-full border px-2.5 py-2 text-[11px] outline-none"
                    style={{
                      background: darkMode ? "#080a0f" : "#f8fafc",
                      borderColor: vo.borderStrong,
                      color: vo.text,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
