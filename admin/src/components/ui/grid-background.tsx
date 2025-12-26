"use client";
import { cn } from "@/lib/utils";
import React from "react";

export function GridBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                "h-[50rem] w-full dark:bg-black bg-white dark:bg-grid-white/[0.2] bg-grid-black/[0.2] relative flex items-center justify-center",
                className
            )}
        >
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            {children}
        </div>
    );
}

export function GridSmallBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                "h-[50rem] w-full dark:bg-black bg-white dark:bg-grid-small-white/[0.2] bg-grid-small-black/[0.2] relative flex items-center justify-center",
                className
            )}
        >
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            {children}
        </div>
    );
}

export function DotBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
    return (
        <div
            className={cn(
                "h-[50rem] w-full dark:bg-black bg-white dark:bg-dot-white/[0.2] bg-dot-black/[0.2] relative flex items-center justify-center",
                className
            )}
        >
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
            {children}
        </div>
    );
}
