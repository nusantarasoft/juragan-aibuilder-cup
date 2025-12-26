"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const ResizableNavbar = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    const { scrollY } = useScroll();
    const [isScrolled, setIsScrolled] = useState(false);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 50);
    });

    return (
        <motion.nav
            className={cn(
                "fixed top-4 inset-x-0 mx-auto z-50 transition-all duration-300",
                isScrolled ? "max-w-lg" : "max-w-4xl",
                className
            )}
            animate={{
                width: isScrolled ? "fit-content" : "100%",
                padding: isScrolled ? "8px 24px" : "12px 32px",
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
        >
            <div
                className={cn(
                    "flex items-center justify-between rounded-full border border-neutral-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md shadow-lg",
                    isScrolled ? "px-4 py-2" : "px-8 py-3"
                )}
            >
                {children}
            </div>
        </motion.nav>
    );
};

export const NavbarLogo = ({
    href = "/",
    children,
}: {
    href?: string;
    children: React.ReactNode;
}) => {
    return (
        <Link href={href} className="font-bold text-lg text-neutral-900 dark:text-white">
            {children}
        </Link>
    );
};

export const NavbarItems = ({
    items,
    className,
}: {
    items: { name: string; href: string }[];
    className?: string;
}) => {
    return (
        <div className={cn("flex items-center gap-6", className)}>
            {items.map((item) => (
                <Link
                    key={item.name}
                    href={item.href}
                    className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white transition-colors"
                >
                    {item.name}
                </Link>
            ))}
        </div>
    );
};

export const NavbarCTA = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <button
            className={cn(
                "px-4 py-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-medium hover:opacity-90 transition-opacity",
                className
            )}
        >
            {children}
        </button>
    );
};
