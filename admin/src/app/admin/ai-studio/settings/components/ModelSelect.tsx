"use client";

import React from "react";
import { AutoComplete, Form, Select } from "antd";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";
import { CHAT_MODEL_CATALOG, EMBEDDING_MODEL_CATALOG } from "../constants/modelCatalog";
import type { LlmProvider } from "../types";

type Props = {
    name: string | string[];
    label: string;
    provider?: LlmProvider;
    embeddingProvider?: keyof typeof EMBEDDING_MODEL_CATALOG;
    placeholder?: string;
    rules?: { required?: boolean; message?: string }[];
};

export default function ModelSelect({ name, label, provider, embeddingProvider, placeholder, rules }: Props) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);

    const catalog = provider
        ? CHAT_MODEL_CATALOG[provider]
        : embeddingProvider
          ? EMBEDDING_MODEL_CATALOG[embeddingProvider]
          : [];

    const labelNode = (
        <span className="font-mono uppercase" style={{ fontSize: 10, color: t.textSecondary, letterSpacing: "0.05em" }}>
            {label}
        </span>
    );

    if (provider === "ollama") {
        return (
            <Form.Item
                name={name}
                label={labelNode}
                rules={rules}
                preserve
                style={{ marginBottom: 8 }}
                extra={
                    <span className="font-mono" style={{ fontSize: 10, color: t.textMuted }}>
                        Run `ollama pull &lt;model&gt;` if not installed
                    </span>
                }
            >
                <AutoComplete
                    size="small"
                    options={catalog}
                    placeholder={placeholder || "llama3.2"}
                    style={{ borderRadius: 0, fontSize: 11.5 }}
                    filterOption={(input, option) =>
                        String(option?.value ?? "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                    }
                />
            </Form.Item>
        );
    }

    return (
        <Form.Item name={name} label={labelNode} rules={rules} preserve style={{ marginBottom: 8 }}>
            <Select
                size="small"
                showSearch
                placeholder={placeholder || "Select or type model ID"}
                options={catalog}
                optionFilterProp="label"
                style={{ borderRadius: 0, fontSize: 11.5 }}
                dropdownRender={(menu) => (
                    <>
                        {menu}
                        <div className="font-mono" style={{ padding: "4px 8px", fontSize: 10, color: t.textMuted }}>
                            You can also type a custom model ID
                        </div>
                    </>
                )}
            />
        </Form.Item>
    );
}
