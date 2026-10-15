"use client";

import React from "react";
import { Alert, Tag } from "antd";

/** Visible on AI Studio screens that only show client-side / in-memory demo data (Phase 1 honesty). */
export function StudioDemoModeTag() {
    return (
        <Tag color="gold" style={{ margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Demo
        </Tag>
    );
}

export function StudioDemoBanner({ title, detail }: { title: string; detail?: string }) {
    return (
        <Alert
            type="warning"
            showIcon
            message={
                <span className="flex flex-wrap items-center gap-2">
                    <StudioDemoModeTag />
                    <span>
                        <strong>{title}</strong>
                        {detail ? ` — ${detail}` : null}
                    </span>
                </span>
            }
            style={{ marginBottom: 16 }}
        />
    );
}
