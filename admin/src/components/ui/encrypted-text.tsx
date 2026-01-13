// @ts-nocheck
"use client";
import React, { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export const EncryptedText = ({
    text,
    className,
    interval = 50,
    characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*",
}: {
    text: string;
    className?: string;
    interval?: number;
    characters?: string;
}) => {
    const [displayText, setDisplayText] = useState(text);
    const [isAnimating, setIsAnimating] = useState(false);

    const scramble = useCallback(() => {
        let iteration = 0;
        setIsAnimating(true);

        const intervalId = setInterval(() => {
            setDisplayText(
                text
                    .split("")
                    .map((letter, index) => {
                        if (index < iteration) {
                            return text[index];
                        }
                        return characters[Math.floor(Math.random() * characters.length)];
                    })
                    .join("")
            );

            if (iteration >= text.length) {
                clearInterval(intervalId);
                setIsAnimating(false);
            }

            iteration += 1 / 3;
        }, interval);

        return () => clearInterval(intervalId);
    }, [text, interval, characters]);

    return (
        <motion.span
            className={cn("font-mono cursor-pointer", className)}
            onMouseEnter={scramble}
            whileHover={{ scale: 1.02 }}
        >
            {displayText}
        </motion.span>
    );
};

// Auto-scrambling version
export const AutoEncryptedText = ({
    text,
    className,
    interval = 50,
    delay = 0,
    characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*",
}: {
    text: string;
    className?: string;
    interval?: number;
    delay?: number;
    characters?: string;
}) => {
    const [displayText, setDisplayText] = useState(
        text.split("").map(() => characters[Math.floor(Math.random() * characters.length)]).join("")
    );

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            let iteration = 0;

            const intervalId = setInterval(() => {
                setDisplayText(
                    text
                        .split("")
                        .map((letter, index) => {
                            if (index < iteration) {
                                return text[index];
                            }
                            return characters[Math.floor(Math.random() * characters.length)];
                        })
                        .join("")
                );

                if (iteration >= text.length) {
                    clearInterval(intervalId);
                }

                iteration += 1 / 3;
            }, interval);

            return () => clearInterval(intervalId);
        }, delay);

        return () => clearTimeout(timeoutId);
    }, [text, interval, delay, characters]);

    return <span className={cn("font-mono", className)}>{displayText}</span>;
};
