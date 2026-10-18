"use client";

import React from "react";
import { Typography } from "antd";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";

const { Text, Paragraph } = Typography;

export default function IntegrationsPanel() {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    return (
        <div>
            <Text strong style={{ display: "block", marginBottom: 12, color: t.textPrimary }}>
                WhatsApp
            </Text>
            <Paragraph style={{ marginBottom: 0, color: t.textSecondary }}>
                WhatsApp transport uses Hermes. Pair numbers and manage sessions in{" "}
                <a href="/admin/ai-studio/ai-gateway">WhatsApp Gateway</a>.
                The Hermes dashboard is accessed via SSH tunnel — no dashboard URL is stored in settings.
            </Paragraph>
        </div>
    );
}
