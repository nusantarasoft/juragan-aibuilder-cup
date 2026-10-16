"use client";

import React, { useEffect } from "react";
import { Alert, Button, Spin, Space, Typography } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const { Text } = Typography;

/**
 * Client gate for /admin/* — mounts children only when sessionStatus === authenticated.
 * MacDock in root layout is residual chrome (HOLD D17).
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { sessionStatus, refreshSession, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (sessionStatus !== "unauthenticated") return;
        const next = pathname && pathname.startsWith("/admin")
            ? `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`
            : "/admin/dashboard";
        console.warn("[auth-gate] AuthGate deny → login", next);
        router.replace(`/login?next=${encodeURIComponent(next)}`);
    }, [sessionStatus, pathname, router]);

    if (sessionStatus === "loading") {
        return (
            <div
                style={{
                    minHeight: "60vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 12,
                }}
            >
                <Spin size="large" />
                <Text type="secondary">Memeriksa sesi…</Text>
            </div>
        );
    }

    if (sessionStatus === "unreachable") {
        return (
            <div
                style={{
                    minHeight: "60vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                }}
            >
                <Alert
                    type="warning"
                    showIcon
                    style={{ maxWidth: 480, width: "100%" }}
                    message="Tidak bisa verifikasi sesi"
                    description="Server autentikasi tidak terjangkau. Token Anda masih disimpan — coba lagi, atau keluar ke halaman login."
                    action={
                        <Space direction="vertical">
                            <Button type="primary" onClick={() => void refreshSession()}>
                                Retry
                            </Button>
                            <Button
                                onClick={() => {
                                    void signOut().finally(() => {
                                        router.replace("/login");
                                    });
                                }}
                            >
                                Ke login
                            </Button>
                        </Space>
                    }
                />
            </div>
        );
    }

    if (sessionStatus === "unauthenticated") {
        return (
            <div
                style={{
                    minHeight: "60vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Spin />
            </div>
        );
    }

    return <>{children}</>;
}
