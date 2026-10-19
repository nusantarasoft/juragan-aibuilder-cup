import type { Metadata, Viewport } from "next";
// Removed Geist font to fix build network error
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/components/providers/SocketProvider";

import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import "./globals.css";
export const metadata: Metadata = {
  title: "Nusantarasoft CMS",
  description: "Content Management System with Interactive Page Builder",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/logo.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NS Admin",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <AntdRegistry>
          <ConfigProvider locale={enUS}>
            <App>
              <AuthProvider>
                <SocketProvider>
                  {children}
                </SocketProvider>
              </AuthProvider>
            </App>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

