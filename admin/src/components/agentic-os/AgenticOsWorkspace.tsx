"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Box } from "lucide-react";
import { startAosPolling, useAosStore } from "./lib/store";
import { APPS, APP_BY_ID, useOsUi, type AppId, type AppParams } from "./registry";
import { Toasts, cx } from "./ui/kit";

/**
 * Agentic OS as a regular admin page (tabbed). Same apps as the desktop
 * overlay in the Virtual Office.
 */
export function AgenticOsWorkspace({ initialApp = "overview", initialParams = {} }: { initialApp?: AppId; initialParams?: AppParams }) {
    const [cur, setCur] = useState<{ app: AppId; params: AppParams; nonce: number }>({ app: initialApp, params: initialParams, nonce: 0 });
    const { stats, status, error, settings } = useAosStore(useShallow((s) => ({ stats: s.stats, status: s.status, error: s.error, settings: s.settings })));

    useEffect(() => startAosPolling(4000), []);

    const open = useCallback((app: AppId, params: AppParams = {}) => {
        setCur({ app, params, nonce: Date.now() });
        const url = new URL(window.location.href);
        url.searchParams.set("app", app);
        const sync = (key: string, value: string | undefined) => (value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
        sync("agent", params.agentId);
        sync("tab", params.tab);
        sync("routine", params.routineId);
        sync("area", params.areaId);
        sync("workflow", params.workflowId);
        sync("run", params.runId);
        sync("view", params.view);
        window.history.replaceState(null, "", url.toString());
    }, []);

    // Apps call `useOsUi().launch(...)` to open other apps; on this page there is no desktop
    // overlay, so route those requests to the tabs instead.
    const request = useOsUi((s) => s.request);
    const lastNonce = useRef(request?.nonce ?? 0);
    useEffect(() => {
        if (request && request.nonce !== lastNonce.current) {
            lastNonce.current = request.nonce;
            open(request.app, request.params);
            useOsUi.setState({ open: false });
        }
    }, [request, open]);

    const def = APP_BY_ID[cur.app];

    return (
        <div className="dark flex h-[calc(100vh-150px)] min-h-[620px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#070b14] text-slate-100 shadow-xl">
            <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-white/[0.02] px-2 py-1.5">
                <span className="mr-2 flex shrink-0 items-center gap-1.5 px-2 text-[12px] font-bold text-white">
                    <Box className="h-4 w-4 text-indigo-300" /> Agentic OS
                </span>
                {APPS.map((a) => {
                    const badge = a.id === "governance" ? stats?.pendingApprovals : a.id === "tasks" ? stats?.reviewTasks : 0;
                    return (
                        <button
                            key={a.id}
                            type="button"
                            onClick={() => open(a.id)}
                            className={cx(
                                "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition",
                                cur.app === a.id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                                a.soon && "opacity-60",
                            )}
                        >
                            <a.icon className="h-3.5 w-3.5" style={{ color: a.color }} />
                            {a.name}
                            {a.layer && <span className="rounded bg-indigo-500/20 px-1 text-[9px] font-black text-indigo-200">{a.layer}</span>}
                            {!!badge && <span className="rounded-full bg-red-500 px-1.5 text-[9px] font-bold text-white">{badge}</span>}
                        </button>
                    );
                })}
                <div className="ml-auto flex shrink-0 items-center gap-2 pl-2 text-[11px]">
                    {status === "error" && <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-red-200" title={error ?? ""}>Backend offline</span>}
                    {settings?.killSwitch && <span className="rounded-md bg-red-500/20 px-2 py-0.5 font-semibold text-red-200">Frozen</span>}
                </div>
            </div>
            <div className="min-h-0 flex-1" key={`${cur.app}:${cur.nonce}`}>
                {def.render(cur.params, open)}
            </div>
            <Toasts />
        </div>
    );
}
