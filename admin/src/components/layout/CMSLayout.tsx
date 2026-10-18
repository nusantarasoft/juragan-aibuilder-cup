"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

export type { AdminPanelId, AdminPanelState } from "./useAdminLayoutStore";
export { useAdminLayout, DEFAULT_ADMIN_PANELS } from "./useAdminLayoutStore";

const CMSLayoutImpl = dynamic(() => import("./CMSLayoutImpl"), {
    ssr: false,
    loading: () => (
        <div id="cms-pro-layout" style={{ height: "100vh" }} aria-hidden />
    ),
});

type CMSLayoutProps = ComponentProps<typeof CMSLayoutImpl>;

export default function CMSLayout(props: CMSLayoutProps) {
    return <CMSLayoutImpl {...props} />;
}
