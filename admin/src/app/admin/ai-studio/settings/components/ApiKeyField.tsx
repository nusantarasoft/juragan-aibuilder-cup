"use client";

import React from "react";
import { Checkbox, Form, Input } from "antd";
import { KeyOutlined } from "@ant-design/icons";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";

type Props = {
    name: string;
    label: string;
    configured: boolean;
    clearFieldName: string;
    placeholder?: string;
};

export default function ApiKeyField({ name, label, configured, clearFieldName, placeholder }: Props) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);

    return (
        <div style={{ marginBottom: 8 }}>
            <Form.Item
                style={{ marginBottom: configured ? 4 : 0 }}
                label={
                    <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                        <span className="font-mono uppercase" style={{ fontSize: 10, color: t.textSecondary, letterSpacing: "0.05em" }}>
                            {label}
                        </span>
                        {configured && (
                            <span
                                className="font-mono uppercase"
                                style={{
                                    fontSize: 9,
                                    padding: "0px 5px",
                                    background: "rgba(34,197,94,0.12)",
                                    border: "1px solid rgba(34,197,94,0.4)",
                                    color: "#22c55e",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                }}
                            >
                                <KeyOutlined /> Key Stored
                            </span>
                        )}
                    </div>
                }
            >
                <Form.Item name={name} noStyle>
                    <Input.Password
                        size="small"
                        placeholder={configured ? "•••••••• (leave blank to keep current key)" : placeholder}
                        style={{ borderRadius: 0, fontSize: 11.5 }}
                    />
                </Form.Item>
            </Form.Item>
            {configured && (
                <Form.Item name={clearFieldName} valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Checkbox style={{ fontSize: 11, color: t.textSecondary }}>
                        Remove stored API key on save
                    </Checkbox>
                </Form.Item>
            )}
        </div>
    );
}
