"use client";

import React from "react";
import { Card, Form, Input, Typography } from "antd";

const { Text } = Typography;

export default function IntegrationsPanel() {
    return (
        <Card title="WhatsApp / WAHA">
            <Form.Item
                name="waha_dashboard_url"
                label="WAHA Dashboard URL"
                extra="Used by AI Gateway and UMKM pages to open the WAHA dashboard."
            >
                <Input placeholder="http://127.0.0.1:3010/dashboard" />
            </Form.Item>
            <Text type="secondary">
                This URL is shared across AI Studio integration pages — no separate env variable needed.
            </Text>
        </Card>
    );
}
