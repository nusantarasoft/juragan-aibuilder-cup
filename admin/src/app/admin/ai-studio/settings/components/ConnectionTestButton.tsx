"use client";

import React, { useState } from "react";
import { Button, Form } from "antd";
import { ThunderboltOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { studioService } from "@/lib/studioService";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import type { LlmProvider } from "../types";

type Props = {
    provider: LlmProvider;
    label?: string;
};

export default function ConnectionTestButton({ provider, label }: Props) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    const form = Form.useFormInstance();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

    const runTest = async () => {
        setLoading(true);
        setResult(null);
        try {
            const values = form?.getFieldsValue?.() ?? {};
            const overrides =
                provider === "ollama"
                    ? {
                          ollama_base_url: values.ollama_base_url as string | undefined,
                          ollama_model: values.ollama_model as string | undefined,
                      }
                    : undefined;
            const res = await studioService.testAiConnection(provider, undefined, overrides);
            setResult(res);
        } catch (e: unknown) {
            setResult({
                success: false,
                message: e instanceof Error ? e.message : "Connection test failed",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Button
                size="small"
                icon={<ThunderboltOutlined />}
                loading={loading}
                onClick={runTest}
                style={{ borderRadius: 0, fontSize: 10.5, height: 24 }}
            >
                {label || "Test Connection"}
            </Button>
            {provider === "ollama" && !result && (
                <span className="font-mono" style={{ fontSize: 10, color: t.textMuted }}>
                    Probes form URL directly
                </span>
            )}
            {result && (
                <span
                    className="font-mono"
                    style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        background: result.success ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                        border: `1px solid ${result.success ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                        color: result.success ? "#22c55e" : "#ef4444",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                    }}
                >
                    {result.success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    {result.message}
                    {result.latencyMs != null ? ` (${result.latencyMs}ms)` : ""}
                </span>
            )}
        </div>
    );
}
