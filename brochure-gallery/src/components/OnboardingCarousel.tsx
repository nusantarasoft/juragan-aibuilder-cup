"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  LayoutDashboard,
  LogIn,
  Sparkles,
  UserPlus,
} from "lucide-react";
import type { VOTheme } from "@/lib/voTheme";
import { adminPath } from "@/lib/adminUrl";

export type OnboardingStep = {
  id: string;
  stepLabel: string;
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
  external?: boolean;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

function buildSteps(): OnboardingStep[] {
  return [
    {
      id: "register",
      stepLabel: "Mulai di sini",
      title: "Daftar trial Juragan",
      body: "UMKM baru? Aktifkan trial 14 hari lewat halaman register — tanpa perlu sudah punya akun.",
      ctaLabel: "Daftar Trial",
      href: adminPath("/register"),
      external: true,
      icon: UserPlus,
    },
    {
      id: "login",
      stepLabel: "Sudah punya akun",
      title: "Masuk ke Juragan",
      body: "Login ke AI Studio admin untuk mengelola toko, agen, dan konten marketing Anda.",
      ctaLabel: "Masuk / Login",
      href: adminPath("/login"),
      external: true,
      icon: LogIn,
    },
    {
      id: "catalog",
      stepLabel: "Jelajahi dulu",
      title: "Lihat katalog brosur",
      body: "Scroll ke galeri di bawah: contoh brosur tenant, pin highlight, dan cara bagikan ke WhatsApp.",
      ctaLabel: "Ke Galeri",
      href: "#gallery",
      external: false,
      icon: Compass,
    },
    {
      id: "studio",
      stepLabel: "Setelah login",
      title: "Buka AI Studio",
      body: "Studio adalah pusat kerja: notebook, konten marketing, partner UMKM, dan showcase material.",
      ctaLabel: "Buka AI Studio",
      href: adminPath("/admin/ai-studio"),
      external: true,
      icon: Sparkles,
    },
    {
      id: "admin",
      stepLabel: "Kelola toko",
      title: "Virtual Office & Admin",
      body: "Masuk Virtual Office untuk permukaan operasional toko — agen, workspace, dan kontrol admin.",
      ctaLabel: "Buka Virtual Office",
      href: adminPath("/admin/virtual-office"),
      external: true,
      icon: LayoutDashboard,
    },
  ];
}

interface OnboardingCarouselProps {
  vo: VOTheme;
  darkMode: boolean;
}

export default function OnboardingCarousel({ vo, darkMode }: OnboardingCarouselProps) {
  const steps = React.useMemo(() => buildSteps(), []);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);

  const go = useCallback(
    (next: number, direction: 1 | -1) => {
      setDir(direction);
      setIndex(((next % steps.length) + steps.length) % steps.length);
    },
    [steps.length],
  );

  useEffect(() => {
    if (paused || steps.length <= 1) return;
    const id = window.setInterval(() => go(index + 1, 1), 5200);
    return () => window.clearInterval(id);
  }, [paused, index, go, steps.length]);

  const step = steps[index];
  const Icon = step.icon;

  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (step.href.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(step.href);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const slideVariants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 36 : -36 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -28 : 28 }),
  };

  return (
    <section
      aria-label="Panduan onboarding Juragan"
      className="relative overflow-hidden border"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        background: darkMode
          ? `linear-gradient(135deg, ${vo.surface} 0%, #12161f 48%, ${vo.surfaceStrong} 100%)`
          : `linear-gradient(135deg, #fff7ed 0%, ${vo.surfaceStrong} 55%, #fff 100%)`,
        borderColor: vo.borderStrong,
        borderTop: `3px solid ${vo.accent}`,
      }}
    >
      {/* Motion 1: ambient accent wash */}
      <motion.div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-30"
        style={{
          background: `radial-gradient(circle, ${vo.accent} 0%, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.22, 0.34, 0.22] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col gap-5 px-4 py-6 sm:px-6 sm:py-7 lg:flex-row lg:items-stretch lg:gap-10 lg:px-8">
        {/* Brand + progress (one composition, not a dashboard) */}
        <div className="flex shrink-0 flex-col justify-between gap-4 lg:w-[240px]">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.28em]"
              style={{ color: vo.accent }}
            >
              Juragan · Panduan Awal
            </p>
            <h2
              className="mt-2 font-sans text-xl font-black tracking-tight sm:text-2xl"
              style={{ color: vo.text }}
            >
              Cara mulai pakai produk
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed" style={{ color: vo.textMuted }}>
              Dari daftar trial sampai buka studio — lima langkah singkat untuk UMKM & partner
              Nusantarasoft.
            </p>
          </div>

          {/* Step rail */}
          <div className="flex items-center gap-2" role="tablist" aria-label="Langkah onboarding">
            {steps.map((s, i) => {
              const active = i === index;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Langkah ${i + 1}: ${s.title}`}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  className="h-1.5 flex-1 transition-all duration-300"
                  style={{
                    background: active ? vo.accent : vo.borderStrong,
                    transform: active ? "scaleY(1.35)" : "scaleY(1)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Active step stage */}
        <div className="relative min-h-[168px] flex-1 overflow-hidden">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step.id}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full flex-col justify-between gap-4 sm:flex-row sm:items-end"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex items-center gap-3">
                  {/* Motion 2: icon accent pulse on step change */}
                  <motion.span
                    className="flex h-10 w-10 items-center justify-center"
                    style={{
                      background: vo.accentSoft,
                      border: `1px solid ${vo.accent}`,
                      color: vo.accent,
                    }}
                    initial={{ scale: 0.86, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.35 }}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.span>
                  <div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: vo.textDim }}
                    >
                      {String(index + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}{" "}
                      · {step.stepLabel}
                    </span>
                  </div>
                </div>

                <h3
                  className="font-sans text-lg font-extrabold tracking-tight sm:text-xl"
                  style={{ color: vo.text }}
                >
                  {step.title}
                </h3>
                <p
                  className="mt-2 max-w-xl text-sm leading-relaxed"
                  style={{ color: vo.textMuted }}
                >
                  {step.body}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => go(index - 1, -1)}
                  className="flex h-10 w-10 items-center justify-center border transition-opacity hover:opacity-80"
                  style={{ borderColor: vo.borderStrong, color: vo.text }}
                  aria-label="Langkah sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1, 1)}
                  className="flex h-10 w-10 items-center justify-center border transition-opacity hover:opacity-80"
                  style={{ borderColor: vo.borderStrong, color: vo.text }}
                  aria-label="Langkah berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <a
                  href={step.href}
                  onClick={handleCtaClick}
                  target={step.external ? "_blank" : undefined}
                  rel={step.external ? "noopener noreferrer" : undefined}
                  className="inline-flex h-10 items-center gap-2 px-5 text-[11px] font-extrabold uppercase tracking-[0.14em] transition-opacity hover:opacity-90"
                  style={{
                    background: vo.accentGradient,
                    color: "#080a0f",
                    boxShadow: vo.accentGlow,
                  }}
                >
                  {step.ctaLabel}
                </a>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
