// @ts-nocheck
"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useState, useRef } from "react";

interface StarProps {
    x: number;
    y: number;
    radius: number;
    opacity: number;
    twinkleSpeed: number | null;
}

interface StarBackgroundProps {
    starDensity?: number;
    allStarsTwinkle?: boolean;
    twinkleProbability?: number;
    minTwinkleSpeed?: number;
    maxTwinkleSpeed?: number;
    className?: string;
}

export const StarsBackground: React.FC<StarBackgroundProps> = ({
    starDensity = 0.00015,
    allStarsTwinkle = true,
    twinkleProbability = 0.7,
    minTwinkleSpeed = 0.5,
    maxTwinkleSpeed = 1,
    className,
}) => {
    const [stars, setStars] = useState<StarProps[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const generateStars = (width: number, height: number): StarProps[] => {
        const area = width * height;
        const numStars = Math.floor(area * starDensity);
        return Array.from({ length: numStars }, () => {
            const shouldTwinkle =
                allStarsTwinkle || Math.random() < twinkleProbability;
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 0.05 + 0.5,
                opacity: Math.random() * 0.5 + 0.5,
                twinkleSpeed: shouldTwinkle
                    ? minTwinkleSpeed +
                    Math.random() * (maxTwinkleSpeed - minTwinkleSpeed)
                    : null,
            };
        });
    };

    useEffect(() => {
        const updateStars = () => {
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                const { width, height } = canvas.getBoundingClientRect();
                canvas.width = width;
                canvas.height = height;
                setStars(generateStars(width, height));
            }
        };

        updateStars();

        const resizeObserver = new ResizeObserver(updateStars);
        if (canvasRef.current) {
            resizeObserver.observe(canvasRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [
        starDensity,
        allStarsTwinkle,
        twinkleProbability,
        minTwinkleSpeed,
        maxTwinkleSpeed,
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach((star) => {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
                ctx.fill();

                if (star.twinkleSpeed !== null) {
                    star.opacity =
                        0.5 +
                        Math.abs(Math.sin((Date.now() * 0.001) / star.twinkleSpeed) * 0.5);
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [stars]);

    return (
        <canvas
            ref={canvasRef}
            className={cn("h-full w-full absolute inset-0", className)}
        />
    );
};

interface ShootingStarsProps {
    minSpeed?: number;
    maxSpeed?: number;
    minDelay?: number;
    maxDelay?: number;
    starColor?: string;
    trailColor?: string;
    starWidth?: number;
    starHeight?: number;
    className?: string;
}

export const ShootingStars: React.FC<ShootingStarsProps> = ({
    minSpeed = 10,
    maxSpeed = 30,
    minDelay = 1200,
    maxDelay = 4200,
    starColor = "#9E00FF",
    trailColor = "#2EB9DF",
    starWidth = 10,
    starHeight = 1,
    className,
}) => {
    const [star, setStar] = useState<{
        x: number;
        y: number;
        angle: number;
        scale: number;
        speed: number;
        distance: number;
    } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const createStar = () => {
            const x = Math.random() * window.innerWidth;
            const y = 0;
            const angle = 215;
            const scale = 1;
            const speed = Math.random() * (maxSpeed - minSpeed) + minSpeed;
            const distance = 0;
            setStar({ x, y, angle, scale, speed, distance });
        };

        const moveStar = () => {
            if (star) {
                const newX =
                    star.x +
                    star.speed * Math.cos((star.angle * Math.PI) / 180) * 0.1;
                const newY =
                    star.y +
                    star.speed * Math.sin((star.angle * Math.PI) / 180) * 0.1;
                const newDistance = star.distance + star.speed * 0.1;
                const newScale = 1 + newDistance / 100;

                if (
                    newX < -20 ||
                    newX > window.innerWidth + 20 ||
                    newY < -20 ||
                    newY > window.innerHeight + 20
                ) {
                    setStar(null);
                } else {
                    setStar({
                        ...star,
                        x: newX,
                        y: newY,
                        distance: newDistance,
                        scale: newScale,
                    });
                }
            }
        };

        const interval = setInterval(() => {
            if (!star) {
                createStar();
            } else {
                moveStar();
            }
        }, 16);

        return () => clearInterval(interval);
    }, [star, maxSpeed, minSpeed]);

    useEffect(() => {
        const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        const timeout = setTimeout(() => {
            setStar(null);
        }, delay);

        return () => clearTimeout(timeout);
    }, [maxDelay, minDelay]);

    return (
        <svg ref={svgRef} className={cn("w-full h-full absolute inset-0", className)}>
            {star && (
                <rect
                    x={star.x}
                    y={star.y}
                    width={starWidth * star.scale}
                    height={starHeight}
                    fill="url(#gradient)"
                    transform={`rotate(${star.angle}, ${star.x + (starWidth * star.scale) / 2
                        }, ${star.y + starHeight / 2})`}
                />
            )}
            <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: trailColor, stopOpacity: 0 }} />
                    <stop
                        offset="100%"
                        style={{ stopColor: starColor, stopOpacity: 1 }}
                    />
                </linearGradient>
            </defs>
        </svg>
    );
};
