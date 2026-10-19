"use client";

import React from "react";
import { Checkbox, Form, Input } from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";

type Props = {
    configured: boolean;
};

export default function VertexServiceAccountField({ configured }: Props) {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);

    return (
        <div style={{ marginBottom: 8 }}>
            <Form.Item
                style={{ marginBottom: configured ? 4 : 0 }}
                label={
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="font-mono uppercase" style={{ fontSize: 10, color: t.textSecondary, letterSpacing: "0.05em" }}>
                            Vertex Service Account JSON
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
                                <SafetyCertificateOutlined /> SA Stored
                            </span>
                        )}
                    </div>
                }
            >
                <Form.Item name="google_service_account_json" noStyle>
                    <Input.TextArea
                        rows={3}
                        placeholder={
                            configured
                                ? "•••• service account stored — paste new JSON to replace (or leave blank)"
                                : '{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
                        }
                        style={{
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 11,
                            borderRadius: 0,
                        }}
                    />
                </Form.Item>
            </Form.Item>
            {configured && (
                <Form.Item name="clear_google_service_account_json" valuePropName="checked" style={{ marginBottom: 0 }}>
                    <Checkbox style={{ fontSize: 11, color: t.textSecondary }}>
                        Remove stored service account on save
                    </Checkbox>
                </Form.Item>
            )}
        </div>
    );
}
