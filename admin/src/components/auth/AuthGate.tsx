"use client";

import React, { useEffect } from "react";
import { Alert, Button, Spin, Space } from "antd";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const MONO =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/**
 * Client gate for /admin/* — mounts children only when sessionStatus === authenticated.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
    const { sessionStatus, refreshSession, signOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isPublicAdminAuthRoute =
        pathname === "/admin/login" || pathname === "/admin/sign-in";

    useEffect(() => {
        if (isPublicAdminAuthRoute) return;
        if (sessionStatus !== "unauthenticated") return;
        const next =
            pathname && pathname.startsWith("/admin")
                ? `${pathname}${typeof window !== "undefined" ? window.location.search : ""}`
                : "/admin/ai-studio";
        console.warn("[auth-gate] AuthGate deny → login", next);
        router.replace(`/login?next=${encodeURIComponent(next)}`);
    }, [sessionStatus, pathname, router, isPublicAdminAuthRoute]);

    if (isPublicAdminAuthRoute) {
        return <>{children}</>;
    }

    if (sessionStatus === "loading") {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 10,
                    background: "#0b0e13",
                    color: "#f1f5f9",
                    fontFamily: MONO,
                }}
            >
                <img
                    src="/logo.png"
                    alt="Nusantarasoft"
                    className="h-9 w-9 animate-pulse object-contain"
                />
                <Spin size="small" />
                <span
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: "#94a3b8",
                    }}
                >
                    CHECKING SESSION…
                </span>
            </div>
        );
    }

    if (sessionStatus === "unreachable") {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 16,
                    background: "#0b0e13",
                    fontFamily: MONO,
                }}
            >
                <Alert
                    type="warning"
                    showIcon
                    style={{ maxWidth: 460, width: "100%", borderRadius: 0 }}
                    message="Unable to verify session"
                    description="Authentication server is unreachable. Your session token is still saved — retry or sign out to the login page."
                    action={
                        <Space direction="vertical">
                            <Button
                                type="primary"
                                style={{ borderRadius: 0 }}
                                onClick={() => void refreshSession()}
                            >
                                Retry
                            </Button>
                            <Button
                                style={{ borderRadius: 0 }}
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
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0b0e13",
                }}
            >
                <Spin size="small" />
            </div>
        );
    }

    return <>{children}</>;
}
