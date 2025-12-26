"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export const GlowingEffect = ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    variant = "default",
    glow = true,
    className,
    movementDuration = 2,
    borderWidth = 1,
}: {
    blur?: number;
    inactiveZone?: number;
    proximity?: number;
    spread?: number;
    variant?: "default" | "white";
    glow?: boolean;
    className?: string;
    movementDuration?: number;
    borderWidth?: number;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            container.style.setProperty("--mouse-x", `${x}px`);
            container.style.setProperty("--mouse-y", `${y}px`);
        };

        container.addEventListener("mousemove", handleMouseMove);
        return () => container.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
                glow && "opacity-100",
                className
            )}
            style={
                {
                    "--blur": `${blur}px`,
                    "--spread": spread,
                    "--movement-duration": `${movementDuration}s`,
                    "--border-width": `${borderWidth}px`,
                } as React.CSSProperties
            }
        >
            <div
                className={cn(
                    "glow",
                    "rounded-[inherit]",
                    "after:content-[''] after:rounded-[inherit] after:absolute after:inset-[calc(var(--border-width)*-1)]",
                    "after:[border:var(--border-width)_solid_transparent]",
                    "after:[background:padding-box_padding-box,border-box_border-box]",
                    "after:[background-image:radial-gradient(calc(var(--spread)*1px)_calc(var(--spread)*1px)_at_var(--mouse-x)_var(--mouse-y),var(--glow-color)_0%,transparent_100%),radial-gradient(calc(var(--spread)*0.4*1px)_calc(var(--spread)*0.4*1px)_at_var(--mouse-x)_var(--mouse-y),var(--glow-color)_0%,transparent_100%)]",
                    "after:[mask-clip:padding-box,border-box]",
                    "after:[mask-composite:intersect]",
                    "after:[mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",
                    variant === "white" && "after:[--glow-color:white]",
                    variant === "default" &&
                    "after:[--glow-color:color-mix(in_oklch_longer_hue,oklch(0.8_0.2_0)_calc((var(--mouse-x,0)/var(--width,1))*100%),oklch(0.8_0.2_330))]"
                )}
                style={
                    {
                        "--width": containerRef.current?.offsetWidth,
                    } as React.CSSProperties
                }
            />
        </div>
    );
};
