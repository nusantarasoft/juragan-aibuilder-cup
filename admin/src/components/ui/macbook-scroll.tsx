// @ts-nocheck
"use client";
import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const MacbookScroll = ({
    src,
    showGradient,
    title,
    badge,
}: {
    src?: string;
    showGradient?: boolean;
    title?: string | React.ReactNode;
    badge?: React.ReactNode;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const scaleX = useTransform(scrollYProgress, [0, 0.3], [1.2, 0.8]);
    const scaleY = useTransform(scrollYProgress, [0, 0.3], [0.6, 1]);
    const translate = useTransform(scrollYProgress, [0, 1], [0, 1500]);
    const rotate = useTransform(scrollYProgress, [0.1, 0.12, 0.3], [-28, -28, 0]);
    const textOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    return (
        <div
            ref={ref}
            className="min-h-[200vh] flex flex-col items-center py-0 md:py-80 justify-start flex-shrink-0 [perspective:800px] transform md:scale-100 scale-[0.35] sm:scale-50"
        >
            <motion.h2
                style={{
                    translateY: translate,
                    opacity: textOpacity,
                }}
                className="dark:text-white text-neutral-800 text-3xl font-bold mb-20 text-center"
            >
                {title || (
                    <span>
                        This Macbook is built with Tailwind CSS. <br /> No kidding.
                    </span>
                )}
            </motion.h2>
            {/* Macbook Lid */}
            <Lid
                src={src}
                scaleX={scaleX}
                scaleY={scaleY}
                rotate={rotate}
                translate={translate}
            />
            {/* Base */}
            <div className="h-[22rem] w-[32rem] bg-gray-200 dark:bg-[#272729] rounded-2xl overflow-hidden relative -z-10">
                {/* above keyboard bar */}
                <div className="h-10 w-full relative">
                    <div className="absolute inset-x-0 mx-auto w-[80%] h-4 bg-[#050505]" />
                </div>
                <div className="flex relative">
                    <div className="mx-auto w-[10%] overflow-hidden h-full">
                        <SpeakerGrid />
                    </div>
                    <div className="mx-auto w-[80%] h-full">
                        <Keypad />
                    </div>
                    <div className="mx-auto w-[10%] overflow-hidden h-full">
                        <SpeakerGrid />
                    </div>
                </div>
                <Trackpad />
                <div className="h-2 w-20 mx-auto inset-x-0 absolute bottom-0 bg-gradient-to-t from-[#272729] to-[#050505] rounded-tr-3xl rounded-tl-3xl" />
                {showGradient && (
                    <div className="h-40 w-full absolute bottom-0 inset-x-0 bg-gradient-to-t dark:from-black from-white via-white dark:via-black to-transparent z-50"></div>
                )}
                {badge && <div className="absolute bottom-4 left-4">{badge}</div>}
            </div>
        </div>
    );
};

export const Lid = ({
    scaleX,
    scaleY,
    rotate,
    translate,
    src,
}: {
    scaleX: any;
    scaleY: any;
    rotate: any;
    translate: any;
    src?: string;
}) => {
    return (
        <div className="relative [perspective:800px]">
            <div
                style={{
                    transform: "perspective(800px) rotateX(-25deg) translateZ(0px)",
                    transformOrigin: "bottom",
                    transformStyle: "preserve-3d",
                }}
                className="h-[12rem] w-[32rem] bg-[#010101] rounded-2xl p-2 relative"
            >
                <div
                    style={{
                        boxShadow: "0px 2px 0px 2px var(--neutral-900) inset",
                    }}
                    className="absolute inset-0 bg-[#010101] rounded-lg flex items-center justify-center"
                >
                    <span className="text-white">
                        {src ? (
                            <Image
                                src={src}
                                alt="macbook content"
                                fill
                                className="object-cover object-left-top absolute rounded-lg inset-0 h-full w-full"
                            />
                        ) : (
                            <span className="text-neutral-600">
                                <AcesLogo />
                            </span>
                        )}
                    </span>
                </div>
            </div>
            <motion.div
                style={{
                    scaleX: scaleX,
                    scaleY: scaleY,
                    rotateX: rotate,
                    translateY: translate,
                    transformStyle: "preserve-3d",
                    transformOrigin: "top",
                }}
                className="h-96 w-[32rem] absolute inset-0 bg-[#010101] rounded-2xl p-2"
            >
                <div className="absolute inset-0 bg-[#272729] rounded-lg" />
                {src && (
                    <Image
                        src={src}
                        alt="macbook content"
                        fill
                        className="object-cover object-left-top absolute rounded-lg inset-0 h-full w-full"
                    />
                )}
            </motion.div>
        </div>
    );
};

export const Trackpad = () => {
    return (
        <div
            className="w-[40%] mx-auto h-32 rounded-xl my-1"
            style={{
                boxShadow: "0px 0px 1px 1px #00000020 inset",
            }}
        ></div>
    );
};

export const Keypad = () => {
    return (
        <div className="h-full rounded-md bg-[#050505] mx-1 p-1">
            {[...Array(5)].map((_, rowIndex) => (
                <Row key={rowIndex}>
                    {[...Array(12)].map((_, keyIndex) => (
                        <KBtn key={keyIndex} />
                    ))}
                </Row>
            ))}
            <Row>
                <KBtn className="w-8" />
                <KBtn className="w-8" />
                <KBtn className="w-8" />
                <KBtn className="w-[8.2rem]" />
                <KBtn className="w-8" />
                <KBtn className="w-8" />
                <KBtn className="w-8" />
            </Row>
        </div>
    );
};

export const Row = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex gap-[2px] mb-[2px] w-full flex-shrink-0">
            {children}
        </div>
    );
};

export const KBtn = ({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "p-[0.5px] rounded-[4px]",
                "bg-gradient-to-b from-neutral-700 to-neutral-950",
                className
            )}
        >
            <div
                className="w-full h-6 rounded-[3.5px] flex items-center justify-center"
                style={{
                    background:
                        "linear-gradient(180deg, #2d2d2d 0%, #1c1c1c 60%, #131313 100%)",
                    boxShadow:
                        "0px -0.5px 2px 0 #0d0d0d inset, -0.5px 0px 2px 0 #0d0d0d inset",
                }}
            >
                <span className="text-[5px] text-neutral-200">{children}</span>
            </div>
        </div>
    );
};

export const SpeakerGrid = () => {
    return (
        <div
            className="flex px-[0.5px] gap-[2px] mt-2 h-40"
            style={{
                backgroundImage:
                    "radial-gradient(circle, #08080A 0.5px, transparent 0.5px)",
                backgroundSize: "3px 3px",
            }}
        ></div>
    );
};

const AceTabsLogo = () => {
    return (
        <svg
            width="66"
            height="65"
            viewBox="0 0 66 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 text-white"
        >
            <path
                d="M8 8.05571C8 8.05571 54.9009 18.1782 57.8687 30.062C60.8365 41.9458 9.05432 57.4696 9.05432 57.4696"
                stroke="currentColor"
                strokeWidth="15"
                strokeMiterlimit="3.86874"
                strokeLinecap="round"
            />
        </svg>
    );
};

const AceAcesLogo = () => {
    return (
        <svg
            width="65"
            height="65"
            viewBox="0 0 65 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 text-white"
        >
            <path
                d="M32.5 1L40.0819 24.9181L64 32.5L40.0819 40.0819L32.5 64L24.9181 40.0819L1 32.5L24.9181 24.9181L32.5 1Z"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

const AcesLogo = () => <AceAcesLogo />;
