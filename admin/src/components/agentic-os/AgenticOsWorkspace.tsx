"use client";

import React, { useCallback, useEffect } from "react";
import { startAosPolling } from "./lib/store";
import { useOsUi, type AppId, type AppParams } from "./registry";
import { AgenticOsDesktop } from "./AgenticOsDesktop";

/**
 * Agentic OS as a regular admin page. Same desktop as the Virtual Office
 * overlay: the overview deck is the home screen, apps open as windows and the
 * front-most app is mirrored into the URL so links can deep-link into it.
 */
export function AgenticOsWorkspace({ initialApp = "overview", initialParams = {} }: { initialApp?: AppId; initialParams?: AppParams }) {
    useEffect(() => startAosPolling(4000), []);

    // There is no overlay on this page: launch requests are handled by the desktop below,
    // so keep the overlay flag closed.
    const isOpen = useOsUi((s) => s.open);
    useEffect(() => {
        if (isOpen) useOsUi.setState({ open: false });
    }, [isOpen]);

    const syncUrl = useCallback((app: AppId, params: AppParams) => {
        const url = new URL(window.location.href);
        if (app === "overview") url.searchParams.delete("app");
        else url.searchParams.set("app", app);
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

    return (
        <div className="h-[calc(100vh-150px)] min-h-[640px] overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl">
            <AgenticOsDesktop
                initialApp={initialApp}
                initialParams={initialParams}
                onRouteChange={syncUrl}
                consumePendingRequest={false}
                exit={{ label: "virtual office", onClick: () => (window.location.href = "/admin/virtual-office") }}
            />
        </div>
    );
}
