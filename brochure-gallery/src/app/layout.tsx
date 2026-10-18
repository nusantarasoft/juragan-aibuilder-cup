import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nusantarasoft — Tenant Brochure Showcase",
  description:
    "Interactive tenant brochure image gallery with highlight pins, QR cards, and instant image sharing.",
  openGraph: {
    title: "Nusantarasoft — Tenant Brochure Showcase",
    description:
      "Explore and share official tenant brochures across Food & Beverage, Fashion, and Wellness partners.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nusantarasoft Tenant Brochure Showcase",
    description:
      "Interactive tenant brochure gallery with instant social, PNG & QR sharing.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
