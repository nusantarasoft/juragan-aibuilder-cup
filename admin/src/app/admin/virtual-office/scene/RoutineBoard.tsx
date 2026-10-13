"use client";

/**
 * Routine board — a 3D wall screen in the War Room that mirrors the Agentic OS
 * Pulse (next runs, last status, active workflows). Read-only (MAPS "Screen"):
 * it is drawn into a CanvasTexture so agents walking past occlude it properly,
 * and clicking it opens Pulse in the Agentic OS overlay.
 */

import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import { useOsUi } from "@/components/agentic-os/lib/osUi";
import { startPhase3Polling, usePhase3Store } from "@/components/agentic-os/lib/phase3Store";
import { startPulsePolling, usePulseStore } from "@/components/agentic-os/lib/pulseStore";
import { useAosStore } from "@/components/agentic-os/lib/store";
import type { OsAgent, OsPulseStatus, OsRoutine, OsWorkflowRun } from "@/components/agentic-os/lib/types";
import { PALETTE, type Lighting } from "../lib/floorplan";

const W = 1200;
const H = 520;
const KIND_COLOR: Record<string, string> = { prompt: "#a855f7", playbook: "#22d3ee", check: "#34d399", workflow: "#c084fc" };
const STATUS_COLOR: Record<string, string> = {
    success: "#22c55e",
    failed: "#ef4444",
    blocked: "#f59e0b",
    timeout: "#f97316",
    running: "#38bdf8",
    waiting_approval: "#f59e0b",
    cancelled: "#94a3b8",
};

function rel(iso: string | null, now: number) {
    if (!iso) return "—";
    const m = Math.round((new Date(iso).getTime() - now) / 60_000);
    if (m <= 0) return "now";
    if (m < 60) return `in ${m}m`;
    if (m < 60 * 24) return `in ${Math.round(m / 60)}h`;
    return `in ${Math.round(m / 1440)}d`;
}

function ellipsis(ctx: CanvasRenderingContext2D, text: string, max: number) {
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
    return `${t}…`;
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
    ctx.font = "600 19px Inter, system-ui, sans-serif";
    const w = ctx.measureText(text).width + 22;
    ctx.fillStyle = `${color}33`;
    ctx.strokeStyle = `${color}aa`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - w, y - 15, w, 28, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, x - w / 2, y + 6);
    ctx.textAlign = "left";
    return w;
}

function draw(
    ctx: CanvasRenderingContext2D,
    d: { routines: OsRoutine[]; status: OsPulseStatus | null; wfRuns: OsWorkflowRun[]; agents: OsAgent[]; now: number; ready: boolean; hover: boolean },
) {
    const { routines, status, wfRuns, agents, now } = d;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#071226");
    g.addColorStop(1, "#020617");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // subtle scanlines
    ctx.fillStyle = "rgba(255,255,255,0.018)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    ctx.strokeStyle = d.hover ? "#818cf8" : "rgba(129,140,248,0.45)";
    ctx.lineWidth = d.hover ? 6 : 3;
    ctx.strokeRect(3, 3, W - 6, H - 6);

    // Header
    ctx.fillStyle = "#fb923c";
    ctx.font = "800 30px Inter, system-ui, sans-serif";
    ctx.fillText("PULSE · ROUTINE BOARD", 36, 58);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "500 24px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), W - 36, 58);
    ctx.textAlign = "left";
    if (status) {
        let x = W - 130;
        x -= pill(ctx, x, 50, status.killSwitch ? "KILL SWITCH" : status.pulseEnabled ? "PULSE ON" : "PAUSED", status.killSwitch ? "#ef4444" : status.pulseEnabled ? "#22c55e" : "#94a3b8") + 10;
        pill(ctx, x, 50, status.llmMode === "dry_run" ? "DRY RUN" : status.providerReady ? "LIVE" : "NO PROVIDER", status.llmMode === "dry_run" ? "#38bdf8" : status.providerReady ? "#a855f7" : "#f59e0b");
    }
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(36, 80, W - 72, 2);

    if (!d.ready) {
        ctx.fillStyle = "#64748b";
        ctx.font = "500 26px Inter, system-ui, sans-serif";
        ctx.fillText("Waiting for the Agentic OS…", 36, 140);
        return;
    }

    // Left: next runs
    const leftW = 700;
    ctx.fillStyle = "#64748b";
    ctx.font = "700 18px Inter, system-ui, sans-serif";
    ctx.fillText("NEXT RUNS", 36, 116);
    ctx.fillText("LAST", 36 + leftW - 70, 116);
    const list = routines
        .filter((r) => !r.archivedAt)
        .sort((a, b) => Number(b.enabled) - Number(a.enabled) || (a.nextRunAt ?? "~").localeCompare(b.nextRunAt ?? "~"))
        .slice(0, 7);
    list.forEach((r, i) => {
        const y = 156 + i * 48;
        const a = agents.find((x) => x.id === r.agentId);
        ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.045)";
        ctx.fillRect(28, y - 30, leftW, 44);
        ctx.fillStyle = r.enabled ? "#e2e8f0" : "#64748b";
        ctx.font = "700 22px Inter, system-ui, sans-serif";
        ctx.fillText(r.enabled ? rel(r.nextRunAt, now) : "paused", 40, y);
        ctx.fillStyle = KIND_COLOR[r.kind] ?? "#94a3b8";
        ctx.beginPath();
        ctx.arc(160, y - 7, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = r.enabled ? "#f8fafc" : "#94a3b8";
        ctx.font = "600 22px Inter, system-ui, sans-serif";
        ctx.fillText(ellipsis(ctx, r.name, 330), 178, y);
        if (a) {
            ctx.fillStyle = a.color;
            ctx.font = "500 19px Inter, system-ui, sans-serif";
            ctx.fillText(ellipsis(ctx, a.name, 120), 520, y);
        }
        pill(ctx, 28 + leftW - 8, y - 6, (r.lastStatus ?? "never").toUpperCase(), STATUS_COLOR[r.lastStatus ?? ""] ?? "#64748b");
    });
    if (!list.length) {
        ctx.fillStyle = "#64748b";
        ctx.font = "500 22px Inter, system-ui, sans-serif";
        ctx.fillText("No routines yet — add one in Pulse", 40, 160);
    }

    // Right: workflows + today
    const rx = 36 + leftW + 30;
    const rw = W - rx - 36;
    ctx.fillStyle = "#64748b";
    ctx.font = "700 18px Inter, system-ui, sans-serif";
    ctx.fillText("WORKFLOWS", rx, 116);
    const active = wfRuns.filter((r) => r.status === "running" || r.status === "waiting_approval");
    const shown = (active.length ? active : wfRuns).slice(0, 3);
    shown.forEach((r, i) => {
        const y = 156 + i * 48;
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.fillRect(rx - 8, y - 30, rw + 8, 44);
        const c = STATUS_COLOR[r.status] ?? "#94a3b8";
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(rx + 8, y - 7, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f8fafc";
        ctx.font = "600 21px Inter, system-ui, sans-serif";
        ctx.fillText(ellipsis(ctx, r.workflowName, rw - 170), rx + 26, y);
        pill(ctx, rx + rw, y - 6, r.status === "waiting_approval" ? "APPROVAL" : r.status.toUpperCase(), c);
    });
    if (!shown.length) {
        ctx.fillStyle = "#64748b";
        ctx.font = "500 20px Inter, system-ui, sans-serif";
        ctx.fillText("No workflow runs yet", rx, 160);
    }

    if (status) {
        const y0 = 330;
        ctx.fillStyle = "#64748b";
        ctx.font = "700 18px Inter, system-ui, sans-serif";
        ctx.fillText("TODAY", rx, y0);
        const cells: [string, number, string][] = [
            ["runs", status.runsToday, "#e2e8f0"],
            ["ok", status.successToday, "#22c55e"],
            ["failed", status.failedToday, "#ef4444"],
            ["blocked", status.blockedToday, "#f59e0b"],
        ];
        const cw = rw / cells.length;
        cells.forEach(([label, v, c], i) => {
            const x = rx + i * cw;
            ctx.fillStyle = c;
            ctx.font = "800 40px Inter, system-ui, sans-serif";
            ctx.fillText(String(v), x, y0 + 52);
            ctx.fillStyle = "#64748b";
            ctx.font = "500 17px Inter, system-ui, sans-serif";
            ctx.fillText(label, x, y0 + 76);
        });
        // daily cap bar
        const pct = Math.min(100, status.dailyRuns.pct);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(rx, y0 + 100, rw, 10);
        ctx.fillStyle = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#22c55e";
        ctx.fillRect(rx, y0 + 100, (rw * pct) / 100, 10);
        ctx.fillStyle = "#64748b";
        ctx.font = "500 16px Inter, system-ui, sans-serif";
        ctx.fillText(`daily cap ${status.dailyRuns.used}/${status.dailyRuns.limit} · queue ${status.queueDepth}`, rx, y0 + 134);
    }

    ctx.fillStyle = d.hover ? "#c7d2fe" : "#475569";
    ctx.font = "500 16px Inter, system-ui, sans-serif";
    ctx.fillText(d.hover ? "Click to open Pulse in the Agentic OS" : "Agentic OS · read-only screen", 36, H - 22);
}

export function RoutineBoard({ position, lighting, width = 5.6, height = (5.6 * H) / W }: { position: [number, number, number]; lighting: Lighting; width?: number; height?: number }) {
    const { routines, status, pulseReady } = usePulseStore(useShallow((s) => ({ routines: s.routines, status: s.status, pulseReady: s.state === "ready" })));
    const wfRuns = usePhase3Store((s) => s.workflowRuns) ?? [];
    const wfActive = wfRuns.some((r) => r.status === "running" || r.status === "waiting_approval");
    const agents = useAosStore((s) => s.agents);
    const launch = useOsUi((s) => s.launch);
    const [hover, setHover] = useState(false);
    const [tick, setTick] = useState(0);
    const pal = PALETTE[lighting];

    useEffect(() => startPulsePolling(20_000), []);
    useEffect(() => startPhase3Polling(20_000), []);
    useEffect(() => {
        const t = setInterval(() => setTick((n) => n + 1), 30_000);
        return () => clearInterval(t);
    }, []);

    const { canvas, texture } = useMemo(() => {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return { canvas: c, texture: t };
    }, []);

    useEffect(() => () => texture.dispose(), [texture]);

    useEffect(() => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        draw(ctx, { routines, status, wfRuns, agents, now: Date.now(), ready: pulseReady, hover });
        texture.needsUpdate = true;
    }, [canvas, texture, routines, status, wfRuns, agents, pulseReady, hover, tick]);

    useEffect(() => {
        document.body.style.cursor = hover ? "pointer" : "";
        return () => {
            document.body.style.cursor = "";
        };
    }, [hover]);

    return (
        <group position={position}>
            <mesh position-z={-0.03} castShadow>
                <boxGeometry args={[width + 0.2, height + 0.2, 0.06]} />
                <meshStandardMaterial
                    color={pal.dark}
                    metalness={0.5}
                    roughness={0.35}
                    emissive={wfActive ? "#f59e0b" : "#000000"}
                    emissiveIntensity={wfActive ? (lighting === "night" ? 0.9 : 0.4) : 0}
                />
            </mesh>
            <mesh
                position-z={0.002}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHover(true);
                }}
                onPointerOut={() => setHover(false)}
                onClick={(e) => {
                    e.stopPropagation();
                    launch("pulse", {});
                }}
            >
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial map={texture} toneMapped={false} color={lighting === "night" ? "#d4d4d8" : "#ffffff"} />
            </mesh>
        </group>
    );
}
