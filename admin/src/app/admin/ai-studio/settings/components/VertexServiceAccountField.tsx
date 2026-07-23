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
                        ? "Kosongkan untuk mempertahankan kredensial tersimpan. Dipakai untuk Vertex chat & embedding; fallback ADC jika kosong."
                        : "Paste isi file service-account.json dari GCP (client_email + private_key). Project ID bisa diambil dari JSON jika field Project ID kosong."
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
                                    ? "•••• service account tersimpan — paste JSON baru untuk mengganti"
                                    : '{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
                            }
                            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}
                        />
                    </Form.Item>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Model chat/embedding tetap diganti di field di bawah / tab Embeddings — tanpa sentuh env server.
                    </Text>
                </div>
            </Form.Item>
            {configured && (
                <Form.Item
                    name="clear_google_service_account_json"
                    valuePropName="checked"
                    style={{ marginTop: -8 }}
                >
                    <Checkbox>Hapus service account tersimpan saat Save</Checkbox>
                </Form.Item>
            )}
        </>
    );
}
