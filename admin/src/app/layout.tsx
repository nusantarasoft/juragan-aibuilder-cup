import type { Metadata } from "next";
// Removed Geist font to fix build network error
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nusantarasoft CMS",
  description: "Content Management System with Interactive Page Builder",
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
                {children}
              </AuthProvider>
            </App>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

