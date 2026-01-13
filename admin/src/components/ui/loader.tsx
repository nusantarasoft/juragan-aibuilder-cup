// @ts-nocheck
"use client";
import { cn } from "@/lib/utils";
import React from "react";

export const Loader = ({
    className,
    size = "md",
}: {
    className?: string;
    size?: "sm" | "md" | "lg";
}) => {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    return (
        <div
            className={cn(
                "relative inline-flex",
                sizeClasses[size],
                className
            )}
        >
            <div className="absolute inset-0 rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
        </div>
    );
};

export const DotsLoader = ({
    className,
}: {
    className?: string;
}) => {
    return (
        <div className={cn("flex space-x-1", className)}>
            {[0, 1, 2].map((index) => (
                <div
                    key={index}
                    className="h-2 w-2 rounded-full bg-blue-500 animate-bounce"
                    style={{
                        animationDelay: `${index * 0.1}s`,
                    }}
                />
            ))}
        </div>
    );
};

export const PulseLoader = ({
    className,
    size = "md",
}: {
    className?: string;
    size?: "sm" | "md" | "lg";
}) => {
    const sizeClasses = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
    };

    return (
        <div
            className={cn(
                "relative inline-flex items-center justify-center",
                sizeClasses[size],
                className
            )}
        >
            <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
            <div className="relative h-1/2 w-1/2 rounded-full bg-blue-500" />
        </div>
    );
};

export const BarLoader = ({
    className,
}: {
    className?: string;
}) => {
    return (
        <div
            className={cn(
                "relative h-1 w-full max-w-xs overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700",
                className
            )}
        >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-shimmer" />
        </div>
    );
};
