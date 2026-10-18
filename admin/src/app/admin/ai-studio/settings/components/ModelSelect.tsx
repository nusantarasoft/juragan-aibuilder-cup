"use client";

import React from "react";
import { AutoComplete, Form, Select } from "antd";
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
    const catalog = provider
        ? CHAT_MODEL_CATALOG[provider]
        : embeddingProvider
          ? EMBEDDING_MODEL_CATALOG[embeddingProvider]
          : [];

    if (provider === "ollama") {
        return (
            <Form.Item
                name={name}
                label={label}
                rules={rules}
                preserve
                extra="Run `ollama pull <model>` if the model is not installed yet"
            >
                <AutoComplete
                    options={catalog}
                    placeholder={placeholder || "llama3.2"}
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
        <Form.Item name={name} label={label} rules={rules} preserve>
            <Select
                showSearch
                placeholder={placeholder || "Select or type model ID"}
                options={catalog}
                optionFilterProp="label"
                dropdownRender={(menu) => (
                    <>
                        {menu}
                        <div style={{ padding: "4px 8px", fontSize: 11, color: "#888" }}>
                            You can type a custom model ID
                        </div>
                    </>
                )}
            />
        </Form.Item>
    );
}
