"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, ConfigProvider, Form, Input, Spin, theme } from "antd";
import {
    ShopOutlined,
    MailOutlined,
    LockOutlined,
    UserOutlined,
    ArrowRightOutlined,
} from "@ant-design/icons";
import { Handshake, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { graphql, storeAuthTokens } from "@/lib/graphqlClient";
import { useAuth } from "@/context/AuthContext";
import { useAdminLayout } from "@/components/layout/CMSLayoutContext";
import { getVOTheme } from "@/components/layout/voTheme";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";

const MONO =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const ORANGE = "#fb923c";

type RegisterResult = {
    registerTenant: {
        tenantId: string;
        storeId: string;
        emailVerified: boolean;
        accessToken?: string;
        refreshToken?: string;
        message: string;
    };
};

type CaptchaConfig = {
    onboardingCaptchaConfig: { mode: string; siteKey?: string | null };
};

declare global {
    interface Window {
        turnstile?: {
            render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
            reset: (widgetId: string) => void;
        };
    }
}

export default function RegisterPage() {
    const router = useRouter();
    const { refreshSession } = useAuth();
    const darkMode = useAdminLayout((s) => s.darkMode);
    const setDarkMode = useAdminLayout((s) => s.setDarkMode);
    const vo = getVOTheme(darkMode);
    const light = !darkMode;

    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string>("");
    const [captchaMode, setCaptchaMode] = useState<string>("loading");
    const [captchaError, setCaptchaError] = useState<string | null>(null);
    const turnstileRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const loadDevToken = useCallback(async () => {
        const allowDev = process.env.NEXT_PUBLIC_ONBOARDING_DEV_CAPTCHA === "true";
        if (!allowDev) {
            setCaptchaError("Dev captcha is not enabled for this build.");
            return;
        }
        try {
            const d = await graphql<{ onboardingCaptchaDevToken: string }>(
                `query { onboardingCaptchaDevToken }`,
            );
            setCaptchaToken(d.onboardingCaptchaDevToken);
        } catch (e) {
            setCaptchaError(e instanceof Error ? e.message : String(e));
        }
    }, []);

    useEffect(() => {
        graphql<CaptchaConfig>(`query { onboardingCaptchaConfig { mode siteKey } }`)
            .then(async (d) => {
                const { mode, siteKey } = d.onboardingCaptchaConfig;
                setCaptchaMode(mode);
                if (mode === "disabled") {
                    setCaptchaToken("");
                    return;
                }
                if (mode === "dev") {
                    await loadDevToken();
                    return;
                }
                if (mode === "turnstile" && siteKey && turnstileRef.current) {
                    const script = document.createElement("script");
                    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
                    script.async = true;
                    script.onload = () => {
                        if (!window.turnstile || !turnstileRef.current) return;
                        widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
                            sitekey: siteKey,
                            callback: (token: string) => setCaptchaToken(token),
                        });
                    };
                    document.body.appendChild(script);
                }
            })
            .catch((e) => setCaptchaError(e instanceof Error ? e.message : String(e)));
    }, [loadDevToken]);

    const onFinish = async (values: {
        email: string;
        password: string;
        storeName: string;
        ownerName?: string;
    }) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        if (captchaMode !== "disabled" && !captchaToken.trim()) {
            setError("Please complete the captcha verification before registering.");
            setLoading(false);
            return;
        }
        try {
            const data = await graphql<RegisterResult>(
                `mutation Register($input: RegisterTenantInput!) {
                    registerTenant(input: $input) {
                        tenantId storeId emailVerified accessToken refreshToken message
                    }
                }`,
                {
                    variables: {
                        input: {
                            email: values.email,
                            password: values.password,
                            storeName: values.storeName,
                            ownerName: values.ownerName,
                            captchaToken: captchaToken,
                        },
                    },
                },
            );
            const r = data.registerTenant;
            if (r.accessToken && r.refreshToken && r.emailVerified) {
                storeAuthTokens(r.accessToken, r.refreshToken);
                await refreshSession();
                router.replace("/admin/ai-studio/partner");
                return;
            }
            setSuccess(r.message || "Check your email to verify your account, then sign in.");
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: "#10b981",
                    borderRadius: 0,
                    fontFamily: MONO,
                    colorBgContainer: light ? "#ffffff" : "#0e131b",
                    colorBorder: light ? "rgba(15, 23, 42, 0.16)" : "rgba(255, 255, 255, 0.14)",
                },
            }}
        >
            <div
                className="flex h-screen w-screen flex-col overflow-hidden font-mono select-none"
                style={{
                    background: vo.canvas,
                    color: vo.text,
                    fontFamily: MONO,
                }}
            >
                <header
                    style={{
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0 12px",
                        borderBottom: `1px solid ${vo.border}`,
                        background: light ? "rgba(255, 255, 255, 0.94)" : "rgba(11, 14, 19, 0.95)",
                        fontSize: 10,
                        letterSpacing: "0.14em",
                        flexShrink: 0,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <img
                            src="/logo.png"
                            alt="Nusantarasoft"
                            className="h-5 w-5 shrink-0 object-contain"
                        />
                        <span style={{ fontWeight: 700, letterSpacing: "0.22em", color: vo.text }}>
                            NUSANTARASOFT
                        </span>
                        <span style={{ color: "#10b981", fontSize: 9.5 }}>· PARTNER ONBOARDING</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Link
                            href="/login"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                height: 22,
                                padding: "0 8px",
                                border: `1px solid ${vo.border}`,
                                fontSize: 9.5,
                                color: vo.textMuted,
                                textDecoration: "none",
                            }}
                        >
                            sign in
                        </Link>
                        <AnimatedThemeToggler
                            isDark={darkMode}
                            onThemeChange={(next) => setDarkMode(next)}
                            size={13}
                            className="!p-0 flex h-[22px] w-[22px] items-center justify-center !rounded-none border border-white/15 text-slate-300 transition hover:border-white/35 hover:text-white"
                        />
                    </div>
                </header>

                <div
                    className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto"
                    style={{ padding: 8 }}
                >
                    <div
                        style={{
                            width: "100%",
                            maxWidth: 440,
                            background: vo.surface,
                            border: `1px solid ${vo.border}`,
                            borderTop: "2px solid #10b981",
                            padding: 12,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingBottom: 8,
                                borderBottom: `1px solid ${vo.borderSubtle}`,
                                marginBottom: 10,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <Handshake className="h-4 w-4" style={{ color: "#10b981" }} />
                                <span
                                    style={{
                                        fontSize: 11,
                                        fontWeight: 800,
                                        letterSpacing: "0.14em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    REGISTER PARTNER STORE
                                </span>
                            </div>
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 8.5,
                                    fontWeight: 700,
                                    padding: "1px 5px",
                                    border: "1px solid rgba(16, 185, 129, 0.45)",
                                    background: "rgba(16, 185, 129, 0.12)",
                                    color: "#10b981",
                                }}
                            >
                                <ShieldCheck className="h-3 w-3" />
                                <span>14-DAY TRIAL</span>
                            </span>
                        </div>

                        <div style={{ fontSize: 10, color: vo.textMuted, marginBottom: 10 }}>
                            Provision an isolated Partner & AI Studio workspace with WhatsApp Kasir and 3D Virtual HQ.
                        </div>

                        {error && (
                            <Alert
                                type="error"
                                message={error}
                                style={{ marginBottom: 10, borderRadius: 0, fontSize: 11, padding: "6px 10px" }}
                                showIcon
                            />
                        )}
                        {captchaError && (
                            <Alert
                                type="warning"
                                message={captchaError}
                                style={{ marginBottom: 10, borderRadius: 0, fontSize: 11, padding: "6px 10px" }}
                                showIcon
                            />
                        )}
                        {success && (
                            <Alert
                                type="success"
                                message={success}
                                style={{ marginBottom: 10, borderRadius: 0, fontSize: 11, padding: "6px 10px" }}
                                showIcon
                            />
                        )}

                        <Form layout="vertical" size="middle" onFinish={onFinish} disabled={loading}>
                            <Form.Item
                                name="storeName"
                                label={
                                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: vo.textMuted }}>
                                        Partner / Store Name
                                    </span>
                                }
                                style={{ marginBottom: 8 }}
                                rules={[{ required: true, min: 2, message: "Store name is required" }]}
                            >
                                <Input
                                    prefix={<ShopOutlined style={{ color: vo.textDim }} />}
                                    placeholder="Nusantara Kopi & Roastery"
                                    style={{ borderRadius: 0, fontSize: 12, height: 32 }}
                                />
                            </Form.Item>

                            <Form.Item
                                name="ownerName"
                                label={
                                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: vo.textMuted }}>
                                        Owner Name
                                    </span>
                                }
                                style={{ marginBottom: 8 }}
                            >
                                <Input
                                    prefix={<UserOutlined style={{ color: vo.textDim }} />}
                                    placeholder="Optional"
                                    style={{ borderRadius: 0, fontSize: 12, height: 32 }}
                                />
                            </Form.Item>

                            <Form.Item
                                name="email"
                                label={
                                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: vo.textMuted }}>
                                        Email
                                    </span>
                                }
                                style={{ marginBottom: 8 }}
                                rules={[{ required: true, type: "email", message: "Valid email is required" }]}
                            >
                                <Input
                                    prefix={<MailOutlined style={{ color: vo.textDim }} />}
                                    placeholder="owner@partner.id"
                                    style={{ borderRadius: 0, fontSize: 12, height: 32 }}
                                />
                            </Form.Item>

                            <Form.Item
                                name="password"
                                label={
                                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: vo.textMuted }}>
                                        Password
                                    </span>
                                }
                                style={{ marginBottom: 10 }}
                                rules={[{ required: true, min: 8, message: "Minimum 8 characters" }]}
                            >
                                <Input.Password
                                    prefix={<LockOutlined style={{ color: vo.textDim }} />}
                                    placeholder="Minimum 8 characters"
                                    style={{ borderRadius: 0, fontSize: 12, height: 32 }}
                                />
                            </Form.Item>

                            {captchaMode === "turnstile" && <div ref={turnstileRef} style={{ marginBottom: 10 }} />}

                            <Form.Item style={{ marginBottom: 8 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    block
                                    loading={loading}
                                    icon={<ArrowRightOutlined />}
                                    iconPosition="end"
                                    style={{
                                        height: 34,
                                        borderRadius: 0,
                                        fontWeight: 800,
                                        fontSize: 11,
                                        letterSpacing: "0.16em",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Create Partner Trial
                                </Button>
                            </Form.Item>
                        </Form>

                        <div
                            style={{
                                paddingTop: 8,
                                borderTop: `1px solid ${vo.borderSubtle}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                fontSize: 9.5,
                                color: vo.textMuted,
                            }}
                        >
                            <span>Already have an operator account?</span>
                            <Link
                                href="/login"
                                style={{
                                    color: ORANGE,
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    textDecoration: "none",
                                }}
                            >
                                Sign In →
                            </Link>
                        </div>

                        {loading && (
                            <div style={{ textAlign: "center", marginTop: 8 }}>
                                <Spin size="small" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}
