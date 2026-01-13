// @ts-nocheck
"use client";
import { cn } from "@/lib/utils";
import { motion, stagger, useAnimate, useInView } from "motion/react";
import { useEffect } from "react";

export const GeminiEffect = ({
    pathLengths,
    title,
    description,
    className,
}: {
    pathLengths: number[];
    title?: string;
    description?: string;
    className?: string;
}) => {
    return (
        <div className={cn("sticky top-80", className)}>
            <p className="text-lg md:text-7xl font-normal pb-4 text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-300">
                {title || "Build with Aceternity"}
            </p>
            <p className="text-xs md:text-xl font-normal text-center text-neutral-400 mt-4 max-w-lg mx-auto">
                {description ||
                    "Scroll this component to see the animated SVG paths"}
            </p>
            <div className="w-full h-[890px] -top-60 md:-top-40 flex items-center justify-center bg-red-transparent absolute ">
                <svg
                    width="1440"
                    height="890"
                    viewBox="0 0 1440 890"
                    xmlns="http://www.w3.org/2000/svg"
                    className=" absolute left-1/2 -translate-x-1/2"
                >
                    {pathLengths.map((length, idx) => (
                        <motion.path
                            key={idx}
                            d={paths[idx % paths.length]}
                            stroke={colors[idx % colors.length]}
                            strokeWidth="2"
                            fill="none"
                            initial={{
                                pathLength: 0,
                            }}
                            style={{
                                pathLength: length,
                            }}
                            transition={{
                                duration: 10,
                            }}
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
};

const paths = [
    "M0 663C145.5 663 191 666.265 269 647C326.5 630.084 378.5 578.086 405.5 530.5C425.5 484.5 439 433 498.5 385.5C573.5 323.5 605.5 303.5 718 301.5C792.5 296.5 856.5 290.5 900.5 300C1007.5 339.5 1024.5 361.5 1068.5 512.5C1099.93 650.5 1174.5 663 1243.5 663C1312.5 663 1440 663 1440 663",
    "M0 663C145.5 663 191 666.265 269 647C326.5 630.084 378.5 578.086 405.5 530.5C425.5 484.5 439 433 498.5 385.5C573.5 323.5 605.5 303.5 718 301.5C792.5 296.5 856.5 290.5 900.5 300C1007.5 339.5 1024.5 361.5 1068.5 512.5C1099.93 650.5 1174.5 663 1243.5 663C1312.5 663 1440 663 1440 663",
    "M0 663C145.5 663 191 666.265 269 647C326.5 630.084 378.5 578.086 405.5 530.5C425.5 484.5 439 433 498.5 385.5C573.5 323.5 605.5 303.5 718 301.5C792.5 296.5 856.5 290.5 900.5 300C1007.5 339.5 1024.5 361.5 1068.5 512.5C1099.93 650.5 1174.5 663 1243.5 663C1312.5 663 1440 663 1440 663",
];

const colors = [
    "#FFB7C5",
    "#FFDDB7",
    "#B1C5FF",
    "#4FABFF",
    "#FF9B9B",
];
