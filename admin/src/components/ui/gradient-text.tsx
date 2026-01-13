// @ts-nocheck
"use client";
import { cn } from "@/lib/utils";
import React from "react";

export const GradientText = ({
    children,
    className,
    colors = ["#40c9ff", "#e81cff", "#40c9ff"],
    animationSpeed = 3,
    showBorder = false,
}: {
    children: React.ReactNode;
    className?: string;
    colors?: string[];
    animationSpeed?: number;
    showBorder?: boolean;
}) => {
    const gradientStyle = {
        backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
        backgroundSize: "200% 100%",
        animation: `gradient ${animationSpeed}s linear infinite`,
    };

    return (
        <>
            <style jsx>{`
        @keyframes gradient {
          0% {
            background-position: 200% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
      `}</style>
            <span
                className={cn(
                    "bg-clip-text text-transparent",
                    showBorder && "px-2 py-1 rounded-lg border border-white/20",
                    className
                )}
                style={gradientStyle}
            >
                {children}
            </span>
        </>
    );
};

export const AnimatedGradientText = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <span
            className={cn(
                "inline-flex animate-text-gradient bg-gradient-to-r from-[#b2a8fd] via-[#8678f9] to-[#c7d2fe] bg-[200%_auto] bg-clip-text text-transparent",
                className
            )}
        >
            {children}
        </span>
    );
};
