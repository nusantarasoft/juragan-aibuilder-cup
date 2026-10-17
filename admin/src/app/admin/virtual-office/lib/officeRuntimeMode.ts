import type { OsSettings } from "@/components/agentic-os/lib/types";

/** Explicit UI demo mode only — mock roster; never infer demo from backend errors. */
export function isUiDemoMode(settings: OsSettings | null | undefined): boolean {
    return settings?.uiDemoMode === true;
}

export type OfficeRuntimeKind = "live" | "demo";

export function resolveOfficeRuntimeKind(
    settings: OsSettings | null | undefined,
    aosStatus: "idle" | "loading" | "ready" | "error",
    hasSyncedOnce: boolean,
): OfficeRuntimeKind | "connecting" {
    if (isUiDemoMode(settings)) return "demo";
    if (hasSyncedOnce) return "live";
    if (aosStatus === "loading" || aosStatus === "idle") return "connecting";
    if (aosStatus === "error") return "connecting";
    return "live";
}

/** True when the tenant has no Agentic OS agents on the floor (Kasir-only or empty). */
export function isEmptyLiveOffice(agents: { id: string; dbId?: string }[]): boolean {
    return !agents.some((a) => Boolean(a.dbId));
}
