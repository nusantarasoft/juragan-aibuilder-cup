"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Form, Input, Button, Alert, Spin, ConfigProvider, theme } from "antd";
import {
    UserOutlined,
    LockOutlined,
    SafetyCertificateOutlined,
    ArrowRightOutlined,
    ThunderboltOutlined,
    CheckCircleFilled,
} from "@ant-design/icons";
import {
    BookOpen,
    Box,
    Cpu,
    Handshake,
    Megaphone,
    MessageSquare,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
    Terminal,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { safeAdminPath } from "@/lib/safeAdminPath";
import { useAdminLayout } from "@/components/layout/CMSLayoutContext";
import { getVOTheme } from "@/components/layout/voTheme";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";

const MONO =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const ORANGE = "#fb923c";

interface LaunchSurface {
    id: string;
    code: string;
    label: string;
    route: string;
    desc: string;
    color: string;
    icon: LucideIcon;
}

const LAUNCH_SURFACES: LaunchSurface[] = [
    {
        id: "ai-studio",
        code: "ST",
        label: "AI Studio",
        route: "/admin/ai-studio",
        desc: "Notebooks, RAG sources & grounded chat",
        color: "#fb923c",
        icon: Sparkles,
    },
    {
        id: "partner",
        code: "PT",
        label: "Partner",
        route: "/admin/ai-studio/partner",
        desc: "UMKM & partner registry, WA Kasir simulator",
        color: "#10b981",
        icon: Handshake,
    },
    {
        id: "knowledge-research",
        code: "KR",
        label: "Knowledge Research",
        route: "/admin/ai-studio/knowledge-research",
        desc: "Autonomous web research & vector indexing",
        color: "#38bdf8",
        icon: BookOpen,
    },
    {
        id: "showcase",
        code: "SH",
        label: "Showcase",
        route: "/admin/ai-studio/showcase",
        desc: "Generate showcase materials & brochures",
        color: "#f43f5e",
        icon: Megaphone,
    },
    {
        id: "messages",
        code: "MG",
        label: "Messages",
        route: "/admin/ai-studio/messages",
        desc: "Live WhatsApp customer & partner desk",
        color: "#a855f7",
        icon: MessageSquare,
    },
    {
        id: "settings",
        code: "CF",
        label: "Settings",
        route: "/admin/ai-studio/settings",
        desc: "AI providers, models & WhatsApp Gateway",
        color: "#f59e0b",
        icon: SlidersHorizontal,
    },
    {
        id: "virtual-office",
        code: "VO",
        label: "Virtual Office",
        route: "/admin/virtual-office",
        desc: "3D spatial AI agent headquarters",
        color: "#22d3ee",
        icon: Box,
    },
    {
        id: "agentic-os",
        code: "OS",
        label: "Agentic OS",
        route: "/admin/agentic-os",
        desc: "Command deck, rings & 3D orbit telemetry",
        color: "#818cf8",
        icon: Cpu,
    },
];

const SYSTEM_NODES = [
    { code: "PG-VEC", label: "PostgreSQL + pgvector", status: "ONLINE", color: "#10b981" },
    { code: "GQL-MW", label: "NestJS GraphQL Gateway", status: "ONLINE", color: "#38bdf8" },
    { code: "RAG-AI", label: "Multi-LLM RAG Engine", status: "READY", color: "#fb923c" },
    { code: "WA-HMS", label: "Hermes WhatsApp Bridge", status: "ACTIVE", color: "#a855f7" },
];

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn, verifyTwoFactor, sessionStatus, loading } = useAuth();
    const darkMode = useAdminLayout((s) => s.darkMode);
    const setDarkMode = useAdminLayout((s) => s.setDarkMode);
    const vo = getVOTheme(darkMode);
    const light = !darkMode;

    const [form] = Form.useForm();
    const [formLoading, setFormLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState("");

    const defaultNextPath = useMemo(
        () => safeAdminPath(searchParams.get("next")),
        [searchParams],
    );

    const [selectedRoute, setSelectedRoute] = useState<string>(defaultNextPath);

    useEffect(() => {
        setSelectedRoute(defaultNextPath);
    }, [defaultNextPath]);

    // Bounce or restore only when session is authenticated
    useEffect(() => {
        if (sessionStatus === "authenticated") {
            router.replace(selectedRoute || defaultNextPath);
        }
    }, [sessionStatus, selectedRoute, defaultNextPath, router]);

    const onFinish = async (values: { email: string; password: string }) => {
        setFormLoading(true);
        setError(null);

        const result = await signIn(values.email, values.password);

        if (result.error) {
            setError(result.error);
        } else if (result.requiresTwoFactor) {
            setShowTwoFactor(true);
        } else {
            router.replace(selectedRoute || defaultNextPath);
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
            router.replace(selectedRoute || defaultNextPath);
        }

        setFormLoading(false);
    };

    const handleQuickFillAdmin = () => {
        form.setFieldsValue({
            email: "admin@nusantarasoft.local",
        });
    };

    const activeSurface = useMemo(
        () =>
            LAUNCH_SURFACES.find((s) => s.route === selectedRoute) ?? {
                id: "custom",
                code: "GO",
                label: "Target Route",
                route: selectedRoute,
                desc: "Authenticated post-login redirect target",
                color: ORANGE,
                icon: Sparkles,
            },
        [selectedRoute],
    );

    if (loading || sessionStatus === "authenticated") {
        return (
            <div
                className="font-mono"
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 10,
                    background: vo.canvas,
                    color: vo.text,
                    fontFamily: MONO,
                }}
            >
                <img
                    src="/logo.png"
                    alt="Nusantarasoft"
                    className="h-10 w-10 animate-pulse object-contain"
                />
                <Spin size="small" />
                <span
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        color: vo.textMuted,
                    }}
                >
                    {sessionStatus === "authenticated"
                        ? `ROUTING TO ${selectedRoute}…`
                        : "VERIFYING OPERATOR SESSION…"}
                </span>
            </div>
        );
    }

    return (
        <ConfigProvider
            theme={{
                algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: ORANGE,
                    borderRadius: 0,
                    fontFamily: MONO,
                    colorBgContainer: light ? "#ffffff" : "#0e131b",
                    colorBorder: light ? "rgba(15, 23, 42, 0.16)" : "rgba(255, 255, 255, 0.14)",
                },
            }}
        >
            <div
                data-testid="tactical-login-root"
                className="flex h-screen w-screen flex-col overflow-hidden font-mono select-none"
                style={{
                    background: vo.canvas,
                    color: vo.text,
                    fontFamily: MONO,
                }}
            >
                {/* ================================================================= */}
                {/* TOP TACTICAL STATUS BAR (36px / h-9 — Matches Admin OS)           */}
                {/* ================================================================= */}
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
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <img
                                src="/logo.png"
                                alt="Nusantarasoft"
                                className="h-5 w-5 shrink-0 object-contain"
                            />
                            <span
                                style={{
                                    fontWeight: 700,
                                    letterSpacing: "0.22em",
                                    color: vo.text,
                                }}
                            >
                                NUSANTARASOFT
                            </span>
                            <span style={{ color: ORANGE, fontSize: 9.5 }}>· AUTH GATE</span>
                        </div>

                        <span
                            style={{
                                width: 1,
                                height: 14,
                                background: vo.border,
                            }}
                        />

                        <span className="hidden items-center gap-1.5 sm:flex">
                            <span
                                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                                style={{ background: "#10b981" }}
                            />
                            <span style={{ color: vo.textDim }}>GATE</span>·
                            <span style={{ color: vo.text, fontWeight: 700 }}>SECURE</span>
                        </span>

                        <span className="hidden items-center gap-1.5 md:flex">
                            <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ background: "#38bdf8" }}
                            />
                            <span style={{ color: vo.textDim }}>TARGET</span>·
                            <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                                {activeSurface.route}
                            </span>
                        </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Link
                            href="/register"
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                height: 22,
                                padding: "0 8px",
                                border: `1px solid ${vo.border}`,
                                fontSize: 9.5,
                                color: vo.textMuted,
                                textDecoration: "none",
                                letterSpacing: "0.08em",
                            }}
                        >
                            <span>partner trial</span>
                        </Link>

                        <span title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                            <AnimatedThemeToggler
                                isDark={darkMode}
                                onThemeChange={(next) => setDarkMode(next)}
                                size={13}
                                className="!p-0 flex h-[22px] w-[22px] items-center justify-center !rounded-none border border-white/15 text-slate-300 transition hover:border-white/35 hover:text-white"
                            />
                        </span>
                    </div>
                </header>

                {/* ================================================================= */}
                {/* MAIN COMPACT 2-PANE TACTICAL WORKSPACE                            */}
                {/* ================================================================= */}
                <div
                    className="flex min-h-0 flex-1 overflow-y-auto lg:overflow-hidden"
                    style={{
                        padding: 8,
                        gap: 8,
                    }}
                >
                    <div
                        className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-2 lg:grid-cols-12"
                        style={{ alignSelf: "center" }}
                    >
                        {/* ============================================================= */}
                        {/* LEFT PANE: BRAND TELEMETRY & TARGET ROUTE SELECTOR (7 COLS)   */}
                        {/* ============================================================= */}
                        <div
                            className="flex flex-col justify-between lg:col-span-7"
                            style={{
                                background: vo.surface,
                                border: `1px solid ${vo.border}`,
                                borderTop: "2px solid #38bdf8",
                                padding: 12,
                                gap: 10,
                            }}
                        >
                            {/* Brand Identity Header */}
                            <div>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        gap: 10,
                                        paddingBottom: 10,
                                        borderBottom: `1px solid ${vo.borderSubtle}`,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div
                                            style={{
                                                width: 42,
                                                height: 42,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                border: `1px solid ${vo.border}`,
                                                background: light
                                                    ? "rgba(15, 23, 42, 0.03)"
                                                    : "rgba(255, 255, 255, 0.03)",
                                                flexShrink: 0,
                                            }}
                                        >
                                            <img
                                                src="/logo.png"
                                                alt="Nusantarasoft CMS"
                                                className="h-8 w-8 object-contain"
                                            />
                                        </div>
                                        <div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 6,
                                                }}
                                            >
                                                <h1
                                                    style={{
                                                        margin: 0,
                                                        fontSize: 15,
                                                        fontWeight: 800,
                                                        letterSpacing: "0.08em",
                                                        color: vo.text,
                                                    }}
                                                >
                                                    Nusantarasoft CMS
                                                </h1>
                                                <span
                                                    style={{
                                                        fontSize: 8.5,
                                                        fontWeight: 700,
                                                        padding: "1px 5px",
                                                        border: "1px solid rgba(251, 146, 60, 0.55)",
                                                        background: "rgba(251, 146, 60, 0.14)",
                                                        color: ORANGE,
                                                        letterSpacing: "0.14em",
                                                    }}
                                                >
                                                    v3.2 HUD
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 10,
                                                    color: vo.textMuted,
                                                    marginTop: 2,
                                                }}
                                            >
                                                Enterprise AI Studio, Partner Network, RAG Knowledge & 3D Virtual HQ
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mini Orbital Radar Emblem */}
                                    <div className="hidden sm:flex items-center gap-2">
                                        <svg viewBox="-22 -22 44 44" className="h-10 w-10">
                                            <circle
                                                r={19}
                                                fill="none"
                                                stroke="#38bdf8"
                                                strokeOpacity={0.4}
                                                strokeWidth={0.9}
                                                strokeDasharray="4 2"
                                            >
                                                <animateTransform
                                                    attributeName="transform"
                                                    type="rotate"
                                                    from="0"
                                                    to="360"
                                                    dur="20s"
                                                    repeatCount="indefinite"
                                                />
                                            </circle>
                                            <ellipse
                                                rx={14}
                                                ry={6}
                                                transform="rotate(-28)"
                                                fill="none"
                                                stroke="#fb923c"
                                                strokeWidth={1}
                                                strokeOpacity={0.75}
                                            >
                                                <animateTransform
                                                    attributeName="transform"
                                                    type="rotate"
                                                    from="360"
                                                    to="0"
                                                    dur="12s"
                                                    repeatCount="indefinite"
                                                />
                                            </ellipse>
                                            <circle r={3} fill={activeSurface.color} />
                                        </svg>
                                    </div>
                                </div>

                                {/* Post-Login Destination Routing Matrix */}
                                <div style={{ marginTop: 10 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            marginBottom: 6,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 9.5,
                                                fontWeight: 700,
                                                letterSpacing: "0.18em",
                                                textTransform: "uppercase",
                                                color: "#38bdf8",
                                            }}
                                        >
                                            ■ POST-LOGIN ROUTING DESTINATION
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 9,
                                                color: vo.textDim,
                                                letterSpacing: "0.08em",
                                            }}
                                        >
                                            SELECT WORKSPACE TO LAUNCH
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                                        {LAUNCH_SURFACES.map((surf) => {
                                            const Icon = surf.icon;
                                            const active = selectedRoute === surf.route;
                                            return (
                                                <button
                                                    key={surf.id}
                                                    type="button"
                                                    data-testid={`login-route-${surf.id}`}
                                                    onClick={() => setSelectedRoute(surf.route)}
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "flex-start",
                                                        justifyContent: "space-between",
                                                        padding: "7px 8px",
                                                        border: `1px solid ${
                                                            active ? surf.color : vo.border
                                                        }`,
                                                        borderTop: `2px solid ${surf.color}`,
                                                        background: active
                                                            ? `${surf.color}16`
                                                            : light
                                                              ? "rgba(15, 23, 42, 0.015)"
                                                              : "rgba(255, 255, 255, 0.015)",
                                                        color: vo.text,
                                                        cursor: "pointer",
                                                        textAlign: "left",
                                                        transition: "all 0.12s ease",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "space-between",
                                                            width: "100%",
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: 8.5,
                                                                fontWeight: 800,
                                                                padding: "1px 4px",
                                                                border: `1px solid ${surf.color}66`,
                                                                background: `${surf.color}18`,
                                                                color: surf.color,
                                                            }}
                                                        >
                                                            [{surf.code}]
                                                        </span>
                                                        <Icon
                                                            className="h-3.5 w-3.5"
                                                            style={{ color: surf.color }}
                                                        />
                                                    </div>
                                                    <div
                                                        className="truncate w-full"
                                                        style={{
                                                            fontSize: 10.5,
                                                            fontWeight: 700,
                                                            color: vo.text,
                                                        }}
                                                    >
                                                        {surf.label}
                                                    </div>
                                                    <div
                                                        className="line-clamp-1 w-full"
                                                        style={{
                                                            fontSize: 8.5,
                                                            color: vo.textMuted,
                                                            marginTop: 1,
                                                        }}
                                                    >
                                                        {surf.route.replace("/admin", "")}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Live Infrastructure Telemetry Footer Strip */}
                            <div
                                style={{
                                    paddingTop: 8,
                                    borderTop: `1px solid ${vo.borderSubtle}`,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        letterSpacing: "0.18em",
                                        textTransform: "uppercase",
                                        color: vo.textDim,
                                        marginBottom: 5,
                                    }}
                                >
                                    SUBSYSTEM HEALTH MATRIX
                                </div>
                                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                                    {SYSTEM_NODES.map((node) => (
                                        <div
                                            key={node.code}
                                            style={{
                                                padding: "5px 7px",
                                                border: `1px solid ${vo.border}`,
                                                borderLeft: `2px solid ${node.color}`,
                                                background: light
                                                    ? "rgba(15, 23, 42, 0.02)"
                                                    : "rgba(255, 255, 255, 0.02)",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    fontSize: 8.5,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                <span style={{ color: vo.textMuted }}>{node.code}</span>
                                                <span style={{ color: node.color }}>● {node.status}</span>
                                            </div>
                                            <div
                                                className="truncate"
                                                style={{
                                                    fontSize: 9,
                                                    color: vo.text,
                                                    marginTop: 1,
                                                }}
                                            >
                                                {node.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ============================================================= */}
                        {/* RIGHT PANE: OPERATOR AUTHENTICATION TERMINAL (5 COLS)         */}
                        {/* ============================================================= */}
                        <div
                            className="flex flex-col justify-between lg:col-span-5"
                            style={{
                                background: vo.surface,
                                border: `1px solid ${vo.border}`,
                                borderTop: `2px solid ${ORANGE}`,
                                padding: 12,
                                gap: 10,
                            }}
                        >
                            <div>
                                {/* Terminal Header */}
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
                                        <Terminal className="h-3.5 w-3.5" style={{ color: ORANGE }} />
                                        <span
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 800,
                                                letterSpacing: "0.16em",
                                                textTransform: "uppercase",
                                                color: vo.text,
                                            }}
                                        >
                                            OPERATOR SIGN IN
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
                                            letterSpacing: "0.12em",
                                        }}
                                    >
                                        <ShieldCheck className="h-3 w-3" />
                                        <span>JWT · TLS</span>
                                    </span>
                                </div>

                                {error && (
                                    <Alert
                                        message={error}
                                        type="error"
                                        showIcon
                                        style={{
                                            marginBottom: 10,
                                            borderRadius: 0,
                                            fontSize: 11,
                                            padding: "6px 10px",
                                        }}
                                    />
                                )}

                                {!showTwoFactor ? (
                                    <Form
                                        form={form}
                                        name="login"
                                        onFinish={onFinish}
                                        layout="vertical"
                                        size="middle"
                                        initialValues={{
                                            email: "",
                                            password: "",
                                        }}
                                    >
                                        <Form.Item
                                            name="email"
                                            label={
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        letterSpacing: "0.14em",
                                                        textTransform: "uppercase",
                                                        color: vo.textMuted,
                                                    }}
                                                >
                                                    Email
                                                </span>
                                            }
                                            style={{ marginBottom: 10 }}
                                            rules={[
                                                { required: true, message: "Please enter your email" },
                                                { type: "email", message: "Please enter a valid email" },
                                            ]}
                                        >
                                            <Input
                                                type="email"
                                                prefix={<UserOutlined style={{ color: vo.textDim }} />}
                                                placeholder="admin@nusantarasoft.local"
                                                style={{
                                                    borderRadius: 0,
                                                    fontSize: 12,
                                                    height: 34,
                                                }}
                                            />
                                        </Form.Item>

                                        <Form.Item
                                            name="password"
                                            label={
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        letterSpacing: "0.14em",
                                                        textTransform: "uppercase",
                                                        color: vo.textMuted,
                                                    }}
                                                >
                                                    Password
                                                </span>
                                            }
                                            style={{ marginBottom: 10 }}
                                            rules={[
                                                { required: true, message: "Please enter your password" },
                                            ]}
                                        >
                                            <Input.Password
                                                prefix={<LockOutlined style={{ color: vo.textDim }} />}
                                                placeholder="Enter password"
                                                style={{
                                                    borderRadius: 0,
                                                    fontSize: 12,
                                                    height: 34,
                                                }}
                                            />
                                        </Form.Item>

                                        {/* Selected Target Route Readout Banner */}
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                                padding: "5px 8px",
                                                marginBottom: 10,
                                                border: `1px solid ${activeSurface.color}55`,
                                                borderLeft: `2px solid ${activeSurface.color}`,
                                                background: `${activeSurface.color}12`,
                                                fontSize: 9.5,
                                            }}
                                        >
                                            <span style={{ color: vo.textMuted }}>
                                                ROUTE ON AUTH:
                                            </span>
                                            <span
                                                style={{
                                                    fontWeight: 700,
                                                    color: activeSurface.color,
                                                }}
                                            >
                                                [{activeSurface.code}] {activeSurface.route}
                                            </span>
                                        </div>

                                        <Form.Item style={{ marginBottom: 0 }}>
                                            <Button
                                                type="primary"
                                                htmlType="submit"
                                                loading={formLoading}
                                                block
                                                icon={<ArrowRightOutlined />}
                                                iconPosition="end"
                                                style={{
                                                    height: 36,
                                                    borderRadius: 0,
                                                    fontWeight: 800,
                                                    fontSize: 11,
                                                    letterSpacing: "0.18em",
                                                    textTransform: "uppercase",
                                                }}
                                            >
                                                Sign In
                                            </Button>
                                        </Form.Item>
                                    </Form>
                                ) : (
                                    <div>
                                        <div
                                            style={{
                                                fontSize: 10,
                                                fontWeight: 700,
                                                letterSpacing: "0.16em",
                                                textTransform: "uppercase",
                                                color: ORANGE,
                                                marginBottom: 4,
                                            }}
                                        >
                                            ■ TWO-FACTOR AUTHENTICATION
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 10.5,
                                                color: vo.textMuted,
                                                marginBottom: 10,
                                            }}
                                        >
                                            Enter the 6-digit verification code from your authenticator app.
                                        </div>
                                        <Input
                                            prefix={<SafetyCertificateOutlined />}
                                            placeholder="000000"
                                            value={twoFactorCode}
                                            onChange={(e) => setTwoFactorCode(e.target.value)}
                                            maxLength={6}
                                            style={{
                                                textAlign: "center",
                                                fontSize: 18,
                                                letterSpacing: 8,
                                                borderRadius: 0,
                                                marginBottom: 10,
                                                height: 38,
                                            }}
                                        />
                                        <Button
                                            type="primary"
                                            onClick={onVerifyTwoFactor}
                                            loading={formLoading}
                                            block
                                            disabled={twoFactorCode.length !== 6}
                                            style={{
                                                height: 34,
                                                borderRadius: 0,
                                                fontWeight: 800,
                                                fontSize: 11,
                                                letterSpacing: "0.16em",
                                                textTransform: "uppercase",
                                            }}
                                        >
                                            Verify
                                        </Button>
                                        <Button
                                            type="text"
                                            onClick={() => {
                                                setShowTwoFactor(false);
                                                setTwoFactorCode("");
                                            }}
                                            block
                                            style={{
                                                marginTop: 6,
                                                height: 28,
                                                borderRadius: 0,
                                                fontSize: 10,
                                                letterSpacing: "0.12em",
                                                textTransform: "uppercase",
                                                color: vo.textMuted,
                                            }}
                                        >
                                            Back to Login
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Quick-Fill Super Admin & Partner Trial Footer */}
                            <div
                                style={{
                                    paddingTop: 8,
                                    borderTop: `1px solid ${vo.borderSubtle}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 6,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "5px 8px",
                                        border: `1px solid ${vo.border}`,
                                        background: light
                                            ? "rgba(15, 23, 42, 0.02)"
                                            : "rgba(255, 255, 255, 0.02)",
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: 8.5,
                                                fontWeight: 700,
                                                letterSpacing: "0.14em",
                                                textTransform: "uppercase",
                                                color: vo.textDim,
                                            }}
                                        >
                                            SUPER ADMIN ACCOUNT
                                        </div>
                                        <div
                                            className="truncate"
                                            style={{
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                                color: vo.text,
                                            }}
                                        >
                                            admin@nusantarasoft.local
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleQuickFillAdmin}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                            padding: "3px 7px",
                                            fontSize: 9,
                                            fontWeight: 700,
                                            letterSpacing: "0.12em",
                                            textTransform: "uppercase",
                                            border: "1px solid rgba(251, 146, 60, 0.55)",
                                            background: "rgba(251, 146, 60, 0.14)",
                                            color: ORANGE,
                                            cursor: "pointer",
                                        }}
                                    >
                                        <ThunderboltOutlined />
                                        <span>Fill Email</span>
                                    </button>
                                </div>

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        fontSize: 9.5,
                                        color: vo.textMuted,
                                    }}
                                >
                                    <span>New UMKM / Partner store?</span>
                                    <Link
                                        href="/register"
                                        style={{
                                            color: "#10b981",
                                            fontWeight: 700,
                                            letterSpacing: "0.08em",
                                            textTransform: "uppercase",
                                            textDecoration: "none",
                                        }}
                                    >
                                        Initialize 14-Day Trial →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ConfigProvider>
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
                        background: "#0b0e13",
                    }}
                >
                    <Spin size="small" />
                </div>
            }
        >
            <LoginForm />
        </React.Suspense>
    );
}
