"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Button, Card, Typography, Alert, Space, Divider, Spin } from "antd";
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { safeAdminPath } from "@/lib/safeAdminPath";

const { Title, Text } = Typography;

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn, verifyTwoFactor, sessionStatus, loading } = useAuth();
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState("");

    const nextPath = useMemo(
        () => safeAdminPath(searchParams.get("next")),
        [searchParams],
    );

    // D6 / D15: bounce or restore only when me succeeded (authenticated)
    useEffect(() => {
        if (sessionStatus === "authenticated") {
            router.replace(nextPath);
        }
    }, [sessionStatus, nextPath, router]);

    const onFinish = async (values: { email: string; password: string }) => {
        setFormLoading(true);
        setError(null);

        const result = await signIn(values.email, values.password);

        if (result.error) {
            setError(result.error);
        } else if (result.requiresTwoFactor) {
            setShowTwoFactor(true);
        } else {
            router.replace(nextPath);
        }

        setFormLoading(false);
    };

    const onVerifyTwoFactor = async () => {
        setFormLoading(true);
        setError(null);

        const result = await verifyTwoFactor(twoFactorCode);

        if (result.error) {
            setError(result.error);
        } else {
            router.replace(nextPath);
        }

        setFormLoading(false);
    };

    if (loading || sessionStatus === "authenticated") {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 12,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
            >
                <Spin size="large" />
                <Text style={{ color: "#fff" }}>
                    {sessionStatus === "authenticated" ? "Mengalihkan…" : "Memeriksa sesi…"}
                </Text>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                padding: 24,
            }}
        >
            <Card
                style={{
                    width: "100%",
                    maxWidth: 420,
                    borderRadius: 12,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                    <Title level={2} style={{ marginBottom: 8 }}>
                        Nusantarasoft CMS
                    </Title>
                    <Text type="secondary">
                        Sign in to manage your content
                    </Text>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                )}

                {!showTwoFactor ? (
                    <Form
                        name="login"
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                        initialValues={{
                            email: "",
                            password: "",
                        }}
                    >
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { required: true, message: "Please enter your email" },
                                { type: "email", message: "Please enter a valid email" },
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="admin@nusantarasoft.local"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Password"
                            rules={[
                                { required: true, message: "Please enter your password" },
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Enter password"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={formLoading}
                                block
                            >
                                Sign In
                            </Button>
                        </Form.Item>
                    </Form>
                ) : (
                    <div>
                        <Divider>Two-Factor Authentication</Divider>
                        <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                            Enter the 6-digit code from your authenticator app
                        </Text>
                        <Space.Compact style={{ width: "100%", marginBottom: 16 }}>
                            <Input
                                prefix={<SafetyCertificateOutlined />}
                                placeholder="000000"
                                value={twoFactorCode}
                                onChange={(e) => setTwoFactorCode(e.target.value)}
                                maxLength={6}
                                style={{ textAlign: "center", fontSize: 20, letterSpacing: 8 }}
                            />
                        </Space.Compact>
                        <Button
                            type="primary"
                            onClick={onVerifyTwoFactor}
                            loading={formLoading}
                            block
                            disabled={twoFactorCode.length !== 6}
                        >
                            Verify
                        </Button>
                        <Button
                            type="link"
                            onClick={() => {
                                setShowTwoFactor(false);
                                setTwoFactorCode("");
                            }}
                            style={{ marginTop: 8 }}
                            block
                        >
                            Back to Login
                        </Button>
                    </div>
                )}

                <Divider />

                <Text type="secondary" style={{ display: "block", textAlign: "center" }}>
                    Super Admin: admin@nusantarasoft.local
                </Text>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <React.Suspense
            fallback={
                <div
                    style={{
                        minHeight: "100vh",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Spin size="large" />
                </div>
            }
        >
            <LoginForm />
        </React.Suspense>
    );
}
