"use client";

import React from "react";
import { Alert, Collapse, Typography } from "antd";
import ProviderPanel from "./ProviderPanel";
import type { LlmProvider, StudioAiStatus } from "../types";
import { PROVIDER_LABELS } from "../types";

const { Text } = Typography;

type Props = {
    activeProvider: LlmProvider | undefined;
    status: StudioAiStatus | null;
};

export default function OptionalProvidersPanel({ activeProvider, status }: Props) {
    const inactive = (["anthropic", "google", "openai", "ollama"] as LlmProvider[]).filter(
        (p) => p !== activeProvider,
    );

    if (inactive.length === 0) return null;

    return (
        <div style={{ marginTop: 8 }}>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Hanya provider bertanda Aktif yang dipakai oleh semua modul (CRM, ITSM, PM, AI Studio, dll.). Provider lain di bawah opsional — simpan kredensial untuk ganti cepat nanti."
            />
            <Collapse
                items={inactive.map((p) => ({
                    key: p,
                    label: (
                        <span>
                            {PROVIDER_LABELS[p]}{" "}
                            <Text type="secondary">(tidak aktif)</Text>
                        </span>
                    ),
                    children: (
                        <ProviderPanel
                            provider={p}
                            isActive={false}
                            configured={status?.providers.find((x) => x.provider === p)?.configured}
                        />
                    ),
                }))}
            />
        </div>
    );
}
