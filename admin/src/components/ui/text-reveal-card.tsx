// @ts-nocheck
"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const TextRevealCard = ({
    text,
    revealText,
    children,
    className,
}: {
    text: string;
    revealText: string;
    children?: React.ReactNode;
    className?: string;
}) => {
    const [widthPercentage, setWidthPercentage] = React.useState(0);
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [left, setLeft] = React.useState(0);
    const [localWidth, setLocalWidth] = React.useState(0);
    const [isMouseOver, setIsMouseOver] = React.useState(false);

    React.useEffect(() => {
        if (cardRef.current) {
            const { left, width: localWidth } =
                cardRef.current.getBoundingClientRect();
            setLeft(left);
            setLocalWidth(localWidth);
        }
    }, []);

    function mouseMoveHandler(event: React.MouseEvent<HTMLDivElement>) {
        event.preventDefault();

        const { clientX } = event;
        if (cardRef.current) {
            const relativeX = clientX - left;
            setWidthPercentage((relativeX / localWidth) * 100);
        }
    }

    function mouseLeaveHandler() {
        setIsMouseOver(false);
        setWidthPercentage(0);
    }
    function mouseEnterHandler() {
        setIsMouseOver(true);
    }
    function touchMoveHandler(event: React.TouchEvent<HTMLDivElement>) {
        event.preventDefault();
        const clientX = event.touches[0].clientX;
        if (cardRef.current) {
            const relativeX = clientX - left;
            setWidthPercentage((relativeX / localWidth) * 100);
        }
    }

    const rotateDeg = (widthPercentage - 50) * 0.1;
    return (
        <div
            onMouseEnter={mouseEnterHandler}
            onMouseLeave={mouseLeaveHandler}
            onMouseMove={mouseMoveHandler}
            onTouchStart={mouseEnterHandler}
            onTouchEnd={mouseLeaveHandler}
            onTouchMove={touchMoveHandler}
            ref={cardRef}
            className={cn(
                "bg-[#1d1c20] border border-white/[0.08] w-[40rem] rounded-lg p-8 relative overflow-hidden",
                className
            )}
        >
            {children}

            <div className="h-40 relative flex items-center overflow-hidden">
                <div
                    style={{
                        width: "100%",
                    }}
                    className="absolute bg-[#1d1c20] z-20 will-change-transform"
                >
                    <p
                        style={{
                            textShadow: "4px 4px 15px rgba(0,0,0,0.5)",
                        }}
                        className="text-base sm:text-[3rem] py-10 font-bold text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-300"
                    >
                        {text}
                    </p>
                </div>
                <div
                    style={{
                        clipPath: `inset(0 ${100 - widthPercentage}% 0 0)`,
                    }}
                    className="absolute bg-[#1d1c20] z-20 will-change-transform"
                >
                    <p
                        style={{
                            textShadow: "4px 4px 15px rgba(0,0,0,0.5)",
                        }}
                        className="text-base sm:text-[3rem] py-10 font-bold text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-neutral-300"
                    >
                        {revealText}
                    </p>
                </div>
            </div>
        </div>
    );
};

export const TextRevealCardTitle = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <h2 className={cn("text-white text-lg mb-2", className)}>{children}</h2>
    );
};

export const TextRevealCardDescription = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <p className={cn("text-[#a9a9a9] text-sm", className)}>{children}</p>
    );
};
