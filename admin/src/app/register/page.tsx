"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Card, Form, Input, Typography, Spin } from "antd";
import { ShopOutlined, MailOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { graphql, storeAuthTokens } from "@/lib/graphqlClient";
import { useAuth } from "@/context/AuthContext";

const { Title, Text, Paragraph } = Typography;

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
            setError("Selesaikan verifikasi captcha sebelum mendaftar.");
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
                router.replace("/admin/virtual-office");
                return;
            }
            setSuccess(r.message || "Periksa email untuk verifikasi, lalu masuk.");
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #0f766e 0%, #134e4a 100%)",
                padding: 24,
            }}
        >
            <Card style={{ width: "100%", maxWidth: 440, borderRadius: 12 }}>
                <Title level={3} style={{ marginBottom: 4 }}>
                    Daftar toko
                </Title>
                <Paragraph type="secondary">
                    Trial 14 hari — Virtual Office kosong, rekrut agen setelah verifikasi email.
                </Paragraph>
                {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}
                {captchaError && (
                    <Alert type="warning" message={captchaError} style={{ marginBottom: 16 }} showIcon />
                )}
                {success && (
                    <Alert type="success" message={success} style={{ marginBottom: 16 }} showIcon />
                )}
                <Form layout="vertical" onFinish={onFinish} disabled={loading}>
                    <Form.Item
                        name="storeName"
                        label="Nama toko"
                        rules={[{ required: true, min: 2, message: "Nama toko wajib" }]}
                    >
                        <Input prefix={<ShopOutlined />} placeholder="Warung Bahagia" />
                    </Form.Item>
                    <Form.Item name="ownerName" label="Nama pemilik">
                        <Input prefix={<UserOutlined />} placeholder="Optional" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: true, type: "email" }]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="owner@example.com" />
                    </Form.Item>
                    <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, min: 8, message: "Minimal 8 karakter" }]}
                    >
                        <Input.Password prefix={<LockOutlined />} />
                    </Form.Item>
                    {captchaMode === "turnstile" && <div ref={turnstileRef} style={{ marginBottom: 16 }} />}
                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            Buat akun trial
                        </Button>
                    </Form.Item>
                </Form>
                <Text type="secondary">
                    Sudah punya akun? <Link href="/login">Masuk</Link>
                </Text>
                {loading && (
                    <div style={{ textAlign: "center", marginTop: 12 }}>
                        <Spin />
                    </div>
                )}
            </Card>
        </div>
    );
}
