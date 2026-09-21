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
  title: "NusantaraSoft — Business Support System di WhatsApp",
  description:
    "Catat stok, jual, laporan, dan tanya tips usaha — semua lewat chat WhatsApp. Tanpa app baru.",
  keywords:
    "Business Support System, WhatsApp UMKM, usaha mikro, konsultan usaha, stok warung, NusantaraSoft",
  openGraph: {
    title: "NusantaraSoft — Business Support System di WhatsApp",
    description:
      "Operasional toko + konsultan usaha. Cukup chat WhatsApp. Ketik DAFTAR ke +62 811-924-689.",
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "NusantaraSoft — Business Support System di WhatsApp",
    description:
      "Cek stok, catat jual, tips usaha — tanpa unduh app. +62 811-924-689",
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
