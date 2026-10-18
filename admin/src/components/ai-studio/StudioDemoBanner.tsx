"use client";

import React from "react";
import { Alert, Tag } from "antd";

/** Visible on AI Studio screens that only show client-side / in-memory demo data (Phase 1 honesty). */
export function StudioDemoModeTag() {
    return (
        <Tag
            color="gold"
            className="font-mono !text-[10px]"
            style={{ margin: 0, borderRadius: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
            Demo
        </Tag>
    );
}

export function StudioDemoBanner({ title, detail }: { title: string; detail?: string }) {
    return (
        <Alert
            type="warning"
            showIcon={false}
            message={
                <span className="flex flex-wrap items-center gap-1.5 text-[11px] leading-tight">
                    <StudioDemoModeTag />
                    <span>
                        <strong className="font-mono uppercase tracking-wider">{title}</strong>
                        {detail ? <span className="opacity-80">{` — ${detail}`}</span> : null}
                    </span>
                </span>
            }
            style={{ marginBottom: 6, borderRadius: 0, padding: "4px 8px" }}
        />
    );
}

/** AI Studio surfaces backed by middleware + DB (F1-4 / P2-1). */
export function StudioLiveModeTag() {
    return (
        <Tag
            color="green"
            className="font-mono !text-[10px]"
            style={{ margin: 0, borderRadius: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}
        >
            Live
        </Tag>
    );
}

export function StudioLiveBanner({ title, detail }: { title: string; detail?: string }) {
    return (
        <Alert
            type="info"
            showIcon={false}
            message={
                <span className="flex flex-wrap items-center gap-1.5 text-[11px] leading-tight">
                    <StudioLiveModeTag />
                    <span>
                        <strong className="font-mono uppercase tracking-wider">{title}</strong>
                        {detail ? <span className="opacity-80">{` — ${detail}`}</span> : null}
                    </span>
                </span>
            }
            style={{ marginBottom: 6, borderRadius: 0, padding: "4px 8px" }}
        />
    );
}
