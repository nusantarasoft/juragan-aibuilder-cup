"use client";

import React from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
    IconHome,
    IconUser,
    IconBriefcase,
    IconMail,
    IconBrandGithub,
    IconBrandTwitter,
} from "@tabler/icons-react";

interface DockWidgetProps {
    items?: Array<{
        title: string;
        icon: React.ReactNode;
        href: string;
    }>;
    position?: "bottom" | "top";
}

// Default dock items
const defaultItems = [
    {
        title: "Home",
        icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "/",
    },
    {
        title: "About",
        icon: <IconUser className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "#about",
    },
    {
        title: "Portfolio",
        icon: <IconBriefcase className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "#portfolio",
    },
    {
        title: "Contact",
        icon: <IconMail className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "#contact",
    },
    {
        title: "GitHub",
        icon: <IconBrandGithub className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "https://github.com",
    },
    {
        title: "Twitter",
        icon: <IconBrandTwitter className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
        href: "https://twitter.com",
    },
];

export default function DockWidget({ items = defaultItems, position = "bottom" }: DockWidgetProps) {
    return (
        <div
            className="fixed left-1/2 -translate-x-1/2 z-50"
            style={{ [position]: position === "bottom" ? "1rem" : "1rem" }}
        >
            <FloatingDock
                items={items}
                desktopClassName="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-xl border border-neutral-200/50 dark:border-neutral-800/50"
                mobileClassName="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl"
            />
        </div>
    );
}

// Export for page builder
export const DockWidgetPreview = () => (
    <div className="flex justify-center gap-2 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">🏠</div>
        <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">👤</div>
        <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">💼</div>
        <div className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">📧</div>
    </div>
);
