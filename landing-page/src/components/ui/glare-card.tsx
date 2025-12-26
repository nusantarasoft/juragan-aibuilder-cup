"use client";
import { cn } from "@/lib/utils";
import React from "react";

export const GlareCard = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    const isPointerInside = React.useRef(false);
    const refElement = React.useRef<HTMLDivElement>(null);
    const state = React.useRef({
        glare: { x: 50, y: 50 },
        background: { x: 50, y: 50 },
        rotate: { x: 0, y: 0 },
    });

    const containerStyle: React.CSSProperties = {
        "--m-x": "50%",
        "--m-y": "50%",
        "--r-x": "0deg",
        "--r-y": "0deg",
        "--bg-x": "50%",
        "--bg-y": "50%",
        "--duration": "300ms",
        "--foil-size": "100%",
        "--opacity": "0",
        "--radius": "48px",
        "--easing": "ease",
        "--transition": "var(--duration) var(--easing)",
    } as React.CSSProperties;

    const updateStyles = () => {
        if (refElement.current) {
            const { background, rotate, glare } = state.current;
            refElement.current.style.setProperty("--m-x", `${glare.x}%`);
            refElement.current.style.setProperty("--m-y", `${glare.y}%`);
            refElement.current.style.setProperty("--r-x", `${rotate.x}deg`);
            refElement.current.style.setProperty("--r-y", `${rotate.y}deg`);
            refElement.current.style.setProperty("--bg-x", `${background.x}%`);
            refElement.current.style.setProperty("--bg-y", `${background.y}%`);
        }
    };

    return (
        <div
            style={containerStyle}
            className="relative isolate [contain:layout_style] [perspective:600px] transition-transform duration-[var(--duration)] ease-[var(--easing)] will-change-transform w-[320px] [aspect-ratio:17/21]"
            ref={refElement}
            onPointerMove={(event) => {
                const rotateFactor = 0.4;
                const rect = event.currentTarget.getBoundingClientRect();
                const position = {
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                };
                const percentage = {
                    x: (100 / rect.width) * position.x,
                    y: (100 / rect.height) * position.y,
                };
                const delta = {
                    x: percentage.x - 50,
                    y: percentage.y - 50,
                };

                state.current = {
                    glare: {
                        x: percentage.x,
                        y: percentage.y,
                    },
                    background: {
                        x: 50 + percentage.x / 4 - 12.5,
                        y: 50 + percentage.y / 3 - 16.67,
                    },
                    rotate: {
                        x: -(delta.x * rotateFactor),
                        y: delta.y * rotateFactor,
                    },
                };

                updateStyles();
            }}
            onPointerEnter={() => {
                isPointerInside.current = true;
                if (refElement.current) {
                    setTimeout(() => {
                        if (isPointerInside.current) {
                            refElement.current?.style.setProperty("--duration", "0s");
                        }
                    }, 300);
                }
            }}
            onPointerLeave={() => {
                isPointerInside.current = false;
                if (refElement.current) {
                    refElement.current.style.removeProperty("--duration");
                    refElement.current.style.setProperty("--r-x", `0deg`);
                    refElement.current.style.setProperty("--r-y", `0deg`);
                }
            }}
        >
            <div className="h-full grid will-change-transform origin-center transition-transform duration-[var(--duration)] ease-[var(--easing)] [transform:rotateY(var(--r-x))_rotateX(var(--r-y))]">
                <div className="w-full h-full grid [grid-area:1/1] mix-blend-soft-light [clip-path:inset(0_0_0_0_round_var(--radius))]">
                    <div className="w-full h-full grid [grid-area:1/1] mix-blend-soft-light opacity-[var(--opacity)] transition-opacity transition-background duration-[var(--duration)] ease-[var(--easing)] [clip-path:inset(0_0_1px_0_round_var(--radius))] [background:radial-gradient(farthest-corner_circle_at_var(--m-x)_var(--m-y),_rgba(255,255,255,0.8)_10%,_rgba(255,255,255,0.65)_20%,_rgba(255,255,255,0)_90%)]" />
                </div>
                <div
                    className={cn(
                        "w-full h-full grid [grid-area:1/1] overflow-hidden relative [border-radius:var(--radius)] [background:radial-gradient(ellipse_80%_50%_at_var(--bg-x)_var(--bg-y),_hsl(240,15%,25%),transparent)]",
                        className
                    )}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};
