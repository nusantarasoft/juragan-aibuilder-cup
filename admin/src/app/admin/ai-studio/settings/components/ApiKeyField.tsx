"use client";

import React from "react";
import { Checkbox, Form, Input, Tag } from "antd";
import { KeyOutlined } from "@ant-design/icons";

type Props = {
    name: string;
    label: string;
    configured: boolean;
    clearFieldName: string;
    placeholder?: string;
};

export default function ApiKeyField({ name, label, configured, clearFieldName, placeholder }: Props) {
    return (
        <>
            <Form.Item label={label} extra={configured ? "Leave blank to keep the current key." : undefined}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {configured && (
                        <Tag icon={<KeyOutlined />} color="success">
                            API key configured
                        </Tag>
                    )}
                    <Form.Item name={name} noStyle>
                        <Input.Password placeholder={configured ? "••••••••••••••••" : placeholder} />
                    </Form.Item>
                </div>
            </Form.Item>
            {configured && (
                <Form.Item name={clearFieldName} valuePropName="checked" style={{ marginTop: -8 }}>
                    <Checkbox>Remove stored API key on save</Checkbox>
                </Form.Item>
            )}
        </>
    );
}
