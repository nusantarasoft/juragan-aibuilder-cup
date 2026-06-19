"use client";

import React, { useState } from "react";
import { Button, Form, Tag } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import { studioService } from "@/lib/studioService";
import type { LlmProvider } from "../types";

type Props = {
    provider: LlmProvider;
    label?: string;
};

export default function ConnectionTestButton({ provider, label }: Props) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Button icon={<ThunderboltOutlined />} loading={loading} onClick={runTest}>
                {label || "Test Connection"}
            </Button>
            {provider === "ollama" && (
                <span style={{ fontSize: 12, color: "#888" }}>
                    Tests the URL in the form (save after changing)
                </span>
            )}
            {result && (
                <Tag color={result.success ? "success" : "error"}>
                    {result.message}
                    {result.latencyMs != null ? ` (${result.latencyMs}ms)` : ""}
                </Tag>
            )}
        </div>
    );
}
