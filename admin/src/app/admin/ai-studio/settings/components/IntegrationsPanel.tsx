"use client";

import React from "react";
import { useAdminLayout } from "@/components/layout/CMSLayout";
import { getVOTheme } from "@/components/layout/voTheme";

export default function IntegrationsPanel() {
    const { darkMode } = useAdminLayout();
    const t = getVOTheme(darkMode);
    return (
        <div style={{ fontSize: 11.5, color: t.textSecondary }}>
            <strong style={{ color: t.textPrimary }}>WhatsApp Gateway (Hermes)</strong> — Pair numbers, inspect QR sessions, and configure SME AI bots directly in the <strong>WhatsApp Gateway</strong> tab above.
        </div>
    );
}
