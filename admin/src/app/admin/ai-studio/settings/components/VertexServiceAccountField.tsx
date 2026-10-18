"use client";

import React from "react";
import { Checkbox, Form, Input, Tag, Typography } from "antd";
import { SafetyCertificateOutlined } from "@ant-design/icons";

const { Text } = Typography;

type Props = {
    configured: boolean;
};

export default function VertexServiceAccountField({ configured }: Props) {
    return (
        <>
            <Form.Item
                label="Vertex Service Account JSON"
                extra={
                    configured
                        ? "Leave blank to keep stored credentials. Used for Vertex chat & embedding; falls back to ADC if empty."
                        : "Paste the contents of service-account.json from GCP (client_email + private_key). Project ID can be extracted from JSON if the Project ID field is empty."
                }
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {configured && (
                        <Tag icon={<SafetyCertificateOutlined />} color="success">
                            Service account configured
                        </Tag>
                    )}
                    <Form.Item name="google_service_account_json" noStyle>
                        <Input.TextArea
                            rows={6}
                            placeholder={
                                configured
                                    ? "•••• service account stored — paste new JSON to replace"
                                    : '{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
                            }
                            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}
                        />
                    </Form.Item>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Chat/embedding models can still be changed in the fields below / Embeddings tab — without touching server env.
                    </Text>
                </div>
            </Form.Item>
            {configured && (
                <Form.Item
                    name="clear_google_service_account_json"
                    valuePropName="checked"
                    style={{ marginTop: -8 }}
                >
                    <Checkbox>Remove stored service account on Save</Checkbox>
                </Form.Item>
            )}
        </>
    );
}
