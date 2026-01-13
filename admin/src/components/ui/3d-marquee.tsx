// @ts-nocheck
"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

export const Marquee3D = ({
    images,
    className,
}: {
    images: string[];
    className?: string;
}) => {
    const chunkSize = Math.ceil(images.length / 4);
    const chunks = [];
    for (let i = 0; i < images.length; i += chunkSize) {
        chunks.push(images.slice(i, i + chunkSize));
    }

    return (
        <div
            className={cn(
                "mx-auto flex h-[600px] w-full max-w-7xl flex-col items-center justify-center gap-8 overflow-hidden rounded-2xl",
                className
            )}
        >
            <div
                className="flex shrink-0 flex-col items-center justify-center gap-8 [perspective:300px]"
                style={{
                    transform: "translateX(-100px) translateY(-50px) translateZ(-50px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)",
                }}
            >
                {chunks.map((chunk, index) => (
                    <motion.div
                        key={index}
                        className="flex shrink-0 flex-row flex-nowrap items-center justify-center gap-8"
                        animate={{
                            x: index % 2 === 0 ? [0, -1920] : [-1920, 0],
                        }}
                        transition={{
                            duration: 50,
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    >
                        {[...chunk, ...chunk].map((image, imageIndex) => (
                            <div
                                key={imageIndex}
                                className="relative flex h-32 w-48 shrink-0 items-center justify-center rounded-xl bg-[#222] shadow-lg"
                            >
                                <img
                                    src={image}
                                    alt={`Image ${imageIndex}`}
                                    className="h-full w-full rounded-xl object-cover"
                                />
                            </div>
                        ))}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
