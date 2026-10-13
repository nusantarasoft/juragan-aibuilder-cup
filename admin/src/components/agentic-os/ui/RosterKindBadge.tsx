"use client";

import React from "react";
import type { AgentRosterKind } from "../lib/types";
import { cx } from "./kit";

export function RosterKindBadge({ kind, className }: { kind: AgentRosterKind; className?: string }) {
    if (kind === "live") {
        return (
            <span
                className={cx(
                    "inline-flex shrink-0 items-center gap-0.5 rounded-md border border-emerald-400/35 bg-emerald-400/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-emerald-300",
                    className,
                )}
            >
                <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                Live
            </span>
        );
    }
    return (
        <span
            className={cx(
                "inline-flex shrink-0 rounded-md border border-amber-400/30 bg-amber-400/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-amber-300",
                className,
            )}
        >
            Demo
        </span>
    );
}
