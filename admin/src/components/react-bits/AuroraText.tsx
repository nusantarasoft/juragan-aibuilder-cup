"use client";

import React from "react";

interface AuroraTextProps {
    children: React.ReactNode;
    className?: string;
    colors?: string[];
    speed?: number;
}

export const AuroraText: React.FC<AuroraTextProps> = ({
    children,
    className = "",
    colors = ["#FF0080", "#7928CA", "#0070F3", "#38bdf8"],
    speed = 1,
}) => {
    const gradientId = `aurora-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <span
            className={`inline-block font-bold ${className}`}
            style={{
                backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
                backgroundSize: "400% 400%",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                animation: "aurora-flow 4s ease infinite",
            }}
        >
            {children}
        </span>
    );
};
