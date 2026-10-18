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
                <Text type="secondary">Checking session…</Text>
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
                    message="Unable to verify session"
                    description="Authentication server is unreachable. Your session token is still saved — retry or sign out to the login page."
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
                                Back to Login
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
