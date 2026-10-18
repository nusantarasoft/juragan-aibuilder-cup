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
    const inactive = (["anthropic", "google", "openai", "groq", "openrouter", "ollama"] as LlmProvider[]).filter(
        (p) => p !== activeProvider,
    );

    if (inactive.length === 0) return null;

    return (
        <div style={{ marginTop: 8 }}>
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="Only the provider marked Active is used by all modules (CRM, ITSM, PM, AI Studio, etc.). Other providers below are optional — store credentials for quick switching later."
            />
            <Collapse
                items={inactive.map((p) => ({
                    key: p,
                    label: (
                        <span>
                            {PROVIDER_LABELS[p]}{" "}
                            <Text type="secondary">(inactive)</Text>
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
