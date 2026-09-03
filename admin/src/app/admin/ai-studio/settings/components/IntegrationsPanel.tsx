"use client";

import React from "react";
import { Typography } from "antd";

const { Text, Paragraph } = Typography;

export default function IntegrationsPanel() {
    return (
        <div>
            <Text strong style={{ display: "block", marginBottom: 12, color: "#111827" }}>
                WhatsApp
            </Text>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Transport WhatsApp memakai Hermes. Pair nomor dan kelola sesi di{' '}
                <a href="/admin/ai-studio/ai-gateway">WhatsApp Gateway</a>.
                Dashboard Hermes diakses via SSH tunnel — tidak ada URL dashboard di settings.
            </Paragraph>
        </div>
    );
}
