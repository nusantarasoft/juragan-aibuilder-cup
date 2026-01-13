'use client';
import { Globe } from '@/components/magicui/globe';
import { COBEOptions } from 'cobe';

interface EarthProps {
    className?: string;
    config?: COBEOptions;
    baseColor?: [number, number, number];
    markerColor?: [number, number, number];
    glowColor?: [number, number, number];
    scale?: number;
}

export function Earth({
    className,
    config,
    baseColor,
    markerColor,
    glowColor,
    scale
}: EarthProps) {
    const mergedConfig = {
        ...config,
        ...(baseColor && { baseColor }),
        ...(markerColor && { markerColor }),
        ...(glowColor && { glowColor }),
    } as COBEOptions | undefined;

    return <Globe className={className} config={mergedConfig} />;
}

// Re-export both
export { Globe };
export default Earth;
