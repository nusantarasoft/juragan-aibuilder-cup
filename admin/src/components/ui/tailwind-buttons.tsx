// @ts-nocheck
"use client";
import React from "react";
import { cn } from "@/lib/utils";

// Collection of Tailwind CSS button styles
export const TailwindButton = ({
    children,
    variant = "default",
    className,
    ...props
}: {
    children: React.ReactNode;
    variant?: "default" | "gradient" | "outline" | "ghost" | "shimmer" | "brutal";
    className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const variants = {
        default:
            "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100",
        gradient:
            "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600",
        outline:
            "border-2 border-neutral-900 text-neutral-900 hover:bg-neutral-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-neutral-900",
        ghost:
            "text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800",
        shimmer:
            "bg-neutral-900 text-white relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        brutal:
            "bg-white text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 transition-all",
    };

    return (
        <button
            className={cn(
                "px-6 py-2.5 rounded-lg font-medium transition-all duration-200",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};

export const StatefulButton = ({
    children,
    loadingText = "Loading...",
    successText = "Success!",
    onClick,
    className,
}: {
    children: React.ReactNode;
    loadingText?: string;
    successText?: string;
    onClick?: () => Promise<void>;
    className?: string;
}) => {
    const [state, setState] = React.useState<"idle" | "loading" | "success">("idle");

    const handleClick = async () => {
        setState("loading");
        try {
            await onClick?.();
            setState("success");
            setTimeout(() => setState("idle"), 2000);
        } catch {
            setState("idle");
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={state !== "idle"}
            className={cn(
                "px-6 py-2.5 rounded-lg font-medium transition-all duration-200 min-w-[120px]",
                state === "idle" && "bg-neutral-900 text-white hover:bg-neutral-800",
                state === "loading" && "bg-neutral-600 text-white cursor-wait",
                state === "success" && "bg-green-500 text-white",
                className
            )}
        >
            {state === "idle" && children}
            {state === "loading" && (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    {loadingText}
                </span>
            )}
            {state === "success" && successText}
        </button>
    );
};
