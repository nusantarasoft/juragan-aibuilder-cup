"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const CMSLayoutMain = dynamic(() => import("./CMSLayoutMain"), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-screen items-center justify-center bg-[#0b0e13] font-mono text-xs text-slate-500">
            Loading admin…
        </div>
    ),
});

export type { AdminPanelId, AdminPanelState } from "./useAdminLayoutStore";
export { useAdminLayout, DEFAULT_ADMIN_PANELS } from "./useAdminLayoutStore";

type CMSLayoutMainProps = ComponentProps<typeof CMSLayoutMain>;

export default function CMSLayoutImpl(props: CMSLayoutMainProps) {
    return <CMSLayoutMain {...props} />;
}
