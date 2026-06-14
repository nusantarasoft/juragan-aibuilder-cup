import type { Metadata, Viewport } from "next";
// Removed Geist font to fix build network error
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/components/providers/SocketProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nusantarasoft CMS",
  description: "Content Management System with Interactive Page Builder",
  manifest: "/manifest.json",
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
    <html lang="en">
      <body
        className="antialiased"
      >
        <AntdRegistry>
          <ConfigProvider locale={enUS}>
            <AuthProvider>
              <SocketProvider>
                {children}
              </SocketProvider>
            </AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

