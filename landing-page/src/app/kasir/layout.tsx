import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./kasir.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-kasir-display",
  weight: ["500", "600", "700"],
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-kasir-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NusantaraSoft — Kasir & konsultan usaha di WhatsApp",
  description:
    "Catat stok, jual, laporan, dan tanya tips usaha — semua lewat chat WhatsApp. Tanpa app baru.",
  keywords:
    "kasir WhatsApp, UMKM, usaha mikro, konsultan usaha, stok warung, NusantaraSoft",
  openGraph: {
    title: "NusantaraSoft — Kasir & konsultan di WhatsApp",
    description:
      "Kasir harian + konsultan usaha. Cukup chat WhatsApp.",
    type: "website",
    locale: "id_ID",
  },
};

export default function KasirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      lang="id"
      className={`${display.variable} ${sans.variable} kasir-root`}
    >
      {children}
    </div>
  );
}
