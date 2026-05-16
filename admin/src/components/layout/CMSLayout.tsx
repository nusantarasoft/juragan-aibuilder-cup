"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

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
