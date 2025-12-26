"use client";

import React, { useState } from "react";

// Import Ant Design style content components
import { AntdStyleContent } from "./AntdStyleContent";
import { proComponentsDataMap } from "./demos";
import { antdComponentsDataMap } from "./demos/antd";
// Import all components for demos
import { SparklesCore } from "@/components/ui/sparkles";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Meteors } from "@/components/ui/meteors";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import { FlipWords } from "@/components/ui/flip-words";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { CardStack } from "@/components/ui/card-stack";
import { WobbleCard } from "@/components/ui/wobble-card";
import { GlareCard } from "@/components/ui/glare-card";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { Tabs } from "@/components/ui/tabs";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";
import { LampContainer } from "@/components/ui/lamp";
import { Spotlight } from "@/components/ui/spotlight";
import { GlowingStarsBackgroundCard, GlowingStarsTitle, GlowingStarsDescription } from "@/components/ui/glowing-stars";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { GridBackground, DotBackground } from "@/components/ui/grid-background";
import { Timeline } from "@/components/ui/timeline";
import { Compare } from "@/components/ui/compare";
import { WavyBackground } from "@/components/ui/wavy-background";
import { WorldMap } from "@/components/ui/world-map";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { ShootingStars, StarsBackground } from "@/components/ui/shooting-stars";
import { TextHoverEffect } from "@/components/ui/text-hover-effect";
import { TextRevealCard, TextRevealCardTitle, TextRevealCardDescription } from "@/components/ui/text-reveal-card";
import { MaskContainer } from "@/components/ui/svg-mask-effect";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { GradientText, AnimatedGradientText } from "@/components/ui/gradient-text";
import { EncryptedText, AutoEncryptedText } from "@/components/ui/encrypted-text";
import { ContainerTextFlip } from "@/components/ui/container-text-flip";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { ImagesSlider } from "@/components/ui/images-slider";
import { Lens } from "@/components/ui/lens";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { FloatingDock } from "@/components/ui/floating-dock";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import { BackgroundBoxes } from "@/components/ui/background-boxes";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { BackgroundLines } from "@/components/ui/background-lines";
import { SidebarProvider, Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { CardSpotlight } from "@/components/ui/card-spotlight";
import { EvervaultCard } from "@/components/ui/evervault-card";
import { DirectionAwareHover } from "@/components/ui/direction-aware-hover";
import { LinkPreview } from "@/components/ui/link-preview";
import { FileUpload } from "@/components/ui/file-upload";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { ColourfulText } from "@/components/ui/colourful-text";
import { ExpandableCardDemo } from "@/components/ui/expandable-card";
import { FocusCards } from "@/components/ui/focus-cards";
import { GitHubGlobe } from "@/components/ui/github-globe";
import { PinContainer } from "@/components/ui/3d-pin";
import { FollowingPointerCard } from "@/components/ui/following-pointer";
import { Vortex } from "@/components/ui/vortex";
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";
import { Marquee3D } from "@/components/ui/3d-marquee";
import { Carousel, AppleCard } from "@/components/ui/apple-cards-carousel";

// ReactBits imports
import SplitText from "@/components/SplitText";
import BlurText from "@/components/BlurText";
import TiltedCard from "@/components/TiltedCard";
import Aurora from "@/components/Aurora";
import AnimatedContent from "@/components/AnimatedContent";

// Ant Design imports
import {
    Button,
    Space,
    Card,
    Input,
    Select,
    Checkbox,
    Radio,
    Switch,
    Slider,
    DatePicker,
    TimePicker,
    Rate,
    Progress,
    Spin,
    Alert,
    Tag,
    Badge,
    Avatar,
    Tooltip,
    Tabs as AntTabs,
    Menu,
    Breadcrumb,
    Pagination,
    Steps,
    Table,
    List,
    Descriptions,
    Collapse,
    Carousel as AntCarousel,
    Timeline as AntTimeline,
    Tree,
    Divider,
    Result,
    Skeleton,
    Empty,
    Modal,
    Drawer,
    Popconfirm,
    message,
    notification,
    Form,
    Upload,
    Typography,
    Statistic,
    Segmented,
    QRCode,
    Watermark,
    Flex,
    FloatButton,
    ConfigProvider,
    Affix,
    Anchor,
    Dropdown,
    Transfer,
    Mentions,
    Cascader,
    TreeSelect,
    ColorPicker,
    InputNumber,
    Tour,
    Image,
    Popover,
    Calendar,
    Splitter,
    App,
    AutoComplete,
    Layout,
    Grid,
} from "antd";

// ProComponents imports (with fallback)
import { ProTable, ProForm, ProCard, ProList, ProDescriptions, ProLayout, PageContainer, ProFormText, ProFormSelect, ProSkeleton, ProField } from "@ant-design/pro-components";


// Component Meta Interface with props, deps, CSS, source
interface PropDefinition {
    name: string;
    type: string;
    description: string;
    required?: boolean;
    default?: string;
}

interface ComponentMeta {
    dependencies: string;
    cssV4?: string;
    cssV3?: string;
    sourceCode?: string;
    props: PropDefinition[];
}

// Component metadata for installation and props
const componentMeta: Record<string, ComponentMeta> = {
    "meteors": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        cssV4: `@keyframes meteor {
  0% {
    transform: rotate(215deg) translateX(0);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: rotate(215deg) translateX(-500px);
    opacity: 0;
  }
}

.animate-meteor-effect {
  animation: meteor 5s linear infinite;
}`,
        cssV3: `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        "meteor-effect": "meteor 5s linear infinite",
      },
      keyframes: {
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "rotate(215deg) translateX(-500px)", opacity: "0" },
        },
      },
    },
  },
};`,
        props: [
            { name: "number", type: "number", description: "Number of meteors to render", default: "20" },
            { name: "className", type: "string", description: "Additional CSS classes to apply to each meteor" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";

export const Meteors = ({
    number,
    className,
}: {
    number?: number;
    className?: string;
}) => {
    const meteors = new Array(number || 20).fill(true);
    return (
        <>
            {meteors.map((_, idx) => (
                <span
                    key={"meteor" + idx}
                    className={cn(
                        "animate-meteor-effect absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-[9999px] bg-slate-500 shadow-[0_0_0_1px_#ffffff10] rotate-[215deg]",
                        "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-[50%] before:w-[50px] before:h-[1px] before:bg-gradient-to-r before:from-[#64748b] before:to-transparent",
                        className
                    )}
                    style={{
                        top: 0,
                        left: Math.floor(Math.random() * (400 - -400) + -400) + "px",
                        animationDelay: Math.random() * (0.8 - 0.2) + 0.2 + "s",
                        animationDuration: Math.floor(Math.random() * (10 - 2) + 2) + "s",
                    }}
                ></span>
            ))}
        </>
    );
};`,
    },
    "sparkles": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "id", type: "string", description: "Unique ID for the sparkles container" },
            { name: "background", type: "string", description: "Background color of the canvas", default: "transparent" },
            { name: "minSize", type: "number", description: "Minimum size of each particle", default: "0.5" },
            { name: "maxSize", type: "number", description: "Maximum size of each particle", default: "2" },
            { name: "particleDensity", type: "number", description: "Number of particles", default: "100" },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "particleColor", type: "string", description: "Color of particles", default: "#FFF" },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const SparklesCore = ({
    id,
    background,
    minSize,
    maxSize,
    particleDensity,
    className,
    particleColor,
}: {
    id?: string;
    background?: string;
    minSize?: number;
    maxSize?: number;
    particleDensity?: number;
    className?: string;
    particleColor?: string;
}) => {
    const particles = React.useMemo(() => {
        const density = particleDensity || 100;
        return Array.from({ length: density }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * ((maxSize || 2) - (minSize || 0.5)) + (minSize || 0.5),
            duration: Math.random() * 2 + 1,
            delay: Math.random() * 2,
        }));
    }, [particleDensity, minSize, maxSize]);

    return (
        <div
            id={id}
            className={cn("absolute inset-0 overflow-hidden", className)}
            style={{ background: background || "transparent" }}
        >
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full"
                    style={{
                        left: \`\${particle.x}%\`,
                        top: \`\${particle.y}%\`,
                        width: particle.size,
                        height: particle.size,
                        backgroundColor: particleColor || "#FFF",
                    }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
                    transition={{
                        duration: particle.duration,
                        repeat: Infinity,
                        delay: particle.delay,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    );
};`,
    },
    "background-beams": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "className", type: "string", description: "Additional CSS classes for the container" },
        ],
        sourceCode: `"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div className={cn("absolute inset-0 overflow-hidden", className)}>
            <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(99, 102, 241, 0.5)" />
                        <stop offset="50%" stopColor="rgba(139, 92, 246, 0.5)" />
                        <stop offset="100%" stopColor="rgba(217, 70, 239, 0.5)" />
                    </linearGradient>
                </defs>
                {[...Array(20)].map((_, i) => (
                    <motion.line
                        key={i}
                        x1={\`\${Math.random() * 100}%\`}
                        y1="0%"
                        x2={\`\${Math.random() * 100}%\`}
                        y2="100%"
                        stroke="url(#beam-gradient)"
                        strokeWidth="0.5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.5, 0], pathLength: [0, 1, 0] }}
                        transition={{
                            duration: 3 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: "easeInOut",
                        }}
                    />
                ))}
            </svg>
        </div>
    );
};`,
    },
    "spotlight": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "fill", type: "string", description: "Color of the spotlight", default: "#7c3aed" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

type SpotlightProps = {
    className?: string;
    fill?: string;
};

export const Spotlight = ({ className, fill }: SpotlightProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn(
                "pointer-events-none absolute inset-0 z-30 flex items-center justify-center",
                className
            )}
        >
            <svg viewBox="0 0 1024 1024" className="absolute h-[800px] w-[800px] animate-pulse" aria-hidden="true">
                <circle cx="512" cy="512" r="512" fill="url(#spotlight-gradient)" fillOpacity="0.7" />
                <defs>
                    <radialGradient id="spotlight-gradient">
                        <stop stopColor={fill || "#7c3aed"} />
                        <stop offset="1" stopColor="transparent" />
                    </radialGradient>
                </defs>
            </svg>
        </motion.div>
    );
};`,
    },
    "lamp": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to display inside the lamp container", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const LampContainer = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    return (
        <div
            className={cn(
                "relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 w-full rounded-md z-0",
                className
            )}
        >
            <div className="relative flex w-full flex-1 scale-y-125 items-center justify-center isolate z-0">
                <motion.div
                    initial={{ opacity: 0.5, width: "15rem" }}
                    whileInView={{ opacity: 1, width: "30rem" }}
                    transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
                    style={{ backgroundImage: \`conic-gradient(var(--conic-position), var(--tw-gradient-stops))\` }}
                    className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] bg-gradient-conic from-cyan-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]"
                >
                    <div className="absolute w-[100%] left-0 bg-slate-950 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
                    <div className="absolute w-40 h-[100%] left-0 bg-slate-950 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
                </motion.div>
                {/* ... more lamp effects ... */}
            </div>
            <div className="relative z-50 flex -translate-y-80 flex-col items-center px-5">
                {children}
            </div>
        </div>
    );
};`,
    },
    "3d-card": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content inside the card" },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "containerClassName", type: "string", description: "CSS classes for outer container" },
            { name: "translateX", type: "number | string", description: "X translation on hover" },
            { name: "translateY", type: "number | string", description: "Y translation on hover" },
            { name: "translateZ", type: "number | string", description: "Z translation on hover" },
            { name: "rotateX", type: "number | string", description: "X rotation on hover" },
            { name: "rotateY", type: "number | string", description: "Y rotation on hover" },
            { name: "rotateZ", type: "number | string", description: "Z rotation on hover" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React, { createContext, useState, useContext, useRef, useEffect } from "react";

const MouseEnterContext = createContext<
    [boolean, React.Dispatch<React.SetStateAction<boolean>>] | undefined
>(undefined);

export const CardContainer = ({
    children,
    className,
    containerClassName,
}: {
    children?: React.ReactNode;
    className?: string;
    containerClassName?: string;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMouseEntered, setIsMouseEntered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const { left, top, width, height } = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - left - width / 2) / 25;
        const y = (e.clientY - top - height / 2) / 25;
        containerRef.current.style.transform = \`rotateY(\${x}deg) rotateX(\${y}deg)\`;
    };

    const handleMouseEnter = () => setIsMouseEntered(true);
    const handleMouseLeave = () => {
        if (!containerRef.current) return;
        setIsMouseEntered(false);
        containerRef.current.style.transform = \`rotateY(0deg) rotateX(0deg)\`;
    };

    return (
        <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
            <div className={cn("py-20 flex items-center justify-center", containerClassName)} style={{ perspective: "1000px" }}>
                <div
                    ref={containerRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className={cn("flex items-center justify-center relative transition-all duration-200 ease-linear", className)}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    {children}
                </div>
            </div>
        </MouseEnterContext.Provider>
    );
};

export const CardBody = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn("h-96 w-96 [transform-style:preserve-3d] [&>*]:[transform-style:preserve-3d]", className)}>
            {children}
        </div>
    );
};

export const CardItem = ({
    as: Tag = "div",
    children,
    className,
    translateX = 0,
    translateY = 0,
    translateZ = 0,
    rotateX = 0,
    rotateY = 0,
    rotateZ = 0,
    ...rest
}: {
    as?: React.ElementType;
    children: React.ReactNode;
    className?: string;
    translateX?: number | string;
    translateY?: number | string;
    translateZ?: number | string;
    rotateX?: number | string;
    rotateY?: number | string;
    rotateZ?: number | string;
    [key: string]: unknown;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isMouseEntered] = useMouseEnter();

    useEffect(() => {
        if (!ref.current) return;
        if (isMouseEntered) {
            ref.current.style.transform = \`translateX(\${translateX}px) translateY(\${translateY}px) translateZ(\${translateZ}px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) rotateZ(\${rotateZ}deg)\`;
        } else {
            ref.current.style.transform = \`translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)\`;
        }
    }, [isMouseEntered]);

    return (
        <Tag ref={ref} className={cn("w-fit transition duration-200 ease-linear", className)} {...rest}>
            {children}
        </Tag>
    );
};

export const useMouseEnter = () => {
    const context = useContext(MouseEnterContext);
    if (context === undefined) {
        throw new Error("useMouseEnter must be used within a MouseEnterProvider");
    }
    return context;
};`,
    },
    "wobble-card": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content inside the card", required: true },
            { name: "containerClassName", type: "string", description: "CSS classes for the container" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

export const WobbleCard = ({
    children,
    containerClassName,
    className,
}: {
    children: React.ReactNode;
    containerClassName?: string;
    className?: string;
}) => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
        const { clientX, clientY, currentTarget } = event;
        const rect = currentTarget.getBoundingClientRect();
        const x = (clientX - rect.left - rect.width / 2) / 20;
        const y = (clientY - rect.top - rect.height / 2) / 20;
        setMousePosition({ x, y });
    };

    return (
        <motion.section
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => {
                setIsHovering(false);
                setMousePosition({ x: 0, y: 0 });
            }}
            style={{
                transform: isHovering
                    ? \`translate3d(\${mousePosition.x}px, \${mousePosition.y}px, 0) scale3d(1, 1, 1)\`
                    : "translate3d(0px, 0px, 0) scale3d(1, 1, 1)",
                transition: "transform 0.1s ease-out",
            }}
            className={cn("mx-auto w-full bg-indigo-800 relative rounded-2xl overflow-hidden", containerClassName)}
        >
            <div className="relative h-full [background-image:radial-gradient(88%_100%_at_top,rgba(255,255,255,0.5),rgba(255,255,255,0))] sm:mx-0 sm:rounded-2xl overflow-hidden">
                <motion.div
                    style={{
                        transform: isHovering
                            ? \`translate3d(\${-mousePosition.x}px, \${-mousePosition.y}px, 0) scale3d(1.03, 1.03, 1)\`
                            : "translate3d(0px, 0px, 0) scale3d(1, 1, 1)",
                        transition: "transform 0.1s ease-out",
                    }}
                    className={cn("h-full px-4 py-20 sm:px-10", className)}
                >
                    <Noise />
                    {children}
                </motion.div>
            </div>
        </motion.section>
    );
};`,
    },
    "glare-card": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content inside the card", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
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

    // ... pointer event handlers ...

    return (
        <div style={containerStyle} className="relative isolate [contain:layout_style] [perspective:600px] w-[320px] [aspect-ratio:17/21]" ref={refElement}>
            <div className="h-full grid will-change-transform origin-center transition-transform duration-[var(--duration)] [transform:rotateY(var(--r-x))_rotateX(var(--r-y))]">
                <div className={cn("w-full h-full grid [grid-area:1/1] overflow-hidden relative [border-radius:var(--radius)]", className)}>
                    {children}
                </div>
            </div>
        </div>
    );
};`,
    },
    "flip-words": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "words", type: "string[]", description: "Array of words to flip through", required: true },
            { name: "duration", type: "number", description: "Duration between word changes in ms", default: "3000" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";

export const FlipWords = ({
    words,
    duration = 3000,
    className,
}: {
    words: string[];
    duration?: number;
    className?: string;
}) => {
    const [currentWord, setCurrentWord] = useState(words[0]);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);

    const startAnimation = useCallback(() => {
        const word = words[words.indexOf(currentWord) + 1] || words[0];
        setCurrentWord(word);
        setIsAnimating(true);
    }, [currentWord, words]);

    useEffect(() => {
        if (!isAnimating) {
            const timer = setTimeout(() => startAnimation(), duration);
            return () => clearTimeout(timer);
        }
    }, [isAnimating, duration, startAnimation]);

    return (
        <AnimatePresence onExitComplete={() => setIsAnimating(false)}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40, x: 40, filter: "blur(8px)", scale: 2, position: "absolute" }}
                transition={{ duration: 0.4, ease: "easeInOut", type: "spring", stiffness: 100, damping: 10 }}
                className={cn("z-10 inline-block relative text-left text-neutral-900 dark:text-neutral-100 px-2", className)}
                key={currentWord}
            >
                {currentWord.split("").map((letter, index) => (
                    <motion.span
                        key={currentWord + index}
                        initial={{ opacity: 0, y: 10, filter: "blur(8px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ delay: index * 0.08, duration: 0.4 }}
                        className="inline-block"
                    >
                        {letter}
                    </motion.span>
                ))}
            </motion.div>
        </AnimatePresence>
    );
};`,
    },
    "text-generate-effect": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "words", type: "string", description: "Text to generate", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "filter", type: "boolean", description: "Enable blur filter effect", default: "true" },
            { name: "duration", type: "number", description: "Animation duration", default: "0.5" },
        ],
        sourceCode: `"use client";
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
    words,
    className,
    filter = true,
    duration = 0.5,
}: {
    words: string;
    className?: string;
    filter?: boolean;
    duration?: number;
}) => {
    const [scope, animate] = useAnimate();
    const wordsArray = words.split(" ");

    useEffect(() => {
        animate("span", {
            opacity: 1,
            filter: filter ? "blur(0px)" : "none",
        }, {
            duration: duration || 1,
            delay: stagger(0.2),
        });
    }, [scope.current, animate, filter, duration]);

    const renderWords = () => (
        <motion.div ref={scope}>
            {wordsArray.map((word, idx) => (
                <motion.span
                    key={word + idx}
                    className="dark:text-white text-black opacity-0"
                    style={{ filter: filter ? "blur(10px)" : "none" }}
                >
                    {word}{" "}
                </motion.span>
            ))}
        </motion.div>
    );

    return (
        <div className={cn("font-bold", className)}>
            <div className="mt-4">
                <div className="dark:text-white text-black text-2xl leading-snug tracking-wide">
                    {renderWords()}
                </div>
            </div>
        </div>
    );
};`,
    },
    "moving-border": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Button content", required: true },
            { name: "borderRadius", type: "string", description: "Border radius of the button", default: "1.75rem" },
            { name: "as", type: "React.ElementType", description: "Component to render as", default: "button" },
            { name: "containerClassName", type: "string", description: "CSS classes for container" },
            { name: "borderClassName", type: "string", description: "CSS classes for border effect" },
            { name: "duration", type: "number", description: "Animation duration in ms", default: "2000" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Button = ({
    borderRadius = "1.75rem",
    children,
    as: Component = "button",
    containerClassName,
    borderClassName,
    duration,
    className,
    ...otherProps
}: {
    borderRadius?: string;
    children: React.ReactNode;
    as?: React.ElementType;
    containerClassName?: string;
    borderClassName?: string;
    duration?: number;
    className?: string;
    [key: string]: unknown;
}) => {
    return (
        <Component
            className={cn("bg-transparent relative text-xl h-16 w-40 p-[1px] overflow-hidden", containerClassName)}
            style={{ borderRadius: borderRadius }}
            {...otherProps}
        >
            <div className="absolute inset-0" style={{ borderRadius: \`calc(\${borderRadius} * 0.96)\` }}>
                <MovingBorder duration={duration} rx={borderRadius} ry={borderRadius}>
                    <div className={cn("h-20 w-20 opacity-[0.8] bg-[radial-gradient(var(--sky-500)_40%,transparent_60%)]", borderClassName)} />
                </MovingBorder>
            </div>
            <div
                className={cn("relative bg-slate-900/[0.8] border border-slate-800 backdrop-blur-xl text-white flex items-center justify-center w-full h-full text-sm antialiased", className)}
                style={{ borderRadius: \`calc(\${borderRadius} * 0.96)\` }}
            >
                {children}
            </div>
        </Component>
    );
};`,
    },
    "tabs": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "tabs", type: "Tab[]", description: "Array of tab objects { title, value, content }", required: true },
            { name: "containerClassName", type: "string", description: "CSS classes for container" },
            { name: "activeTabClassName", type: "string", description: "CSS classes for active tab" },
            { name: "tabClassName", type: "string", description: "CSS classes for each tab" },
            { name: "contentClassName", type: "string", description: "CSS classes for content area" },
        ],
        sourceCode: `"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = {
    title: string;
    value: string;
    content?: string | React.ReactNode;
};

export const Tabs = ({
    tabs: propTabs,
    containerClassName,
    activeTabClassName,
    tabClassName,
    contentClassName,
}: {
    tabs: Tab[];
    containerClassName?: string;
    activeTabClassName?: string;
    tabClassName?: string;
    contentClassName?: string;
}) => {
    const [active, setActive] = useState<Tab>(propTabs[0]);
    const [tabs, setTabs] = useState<Tab[]>(propTabs);

    const moveSelectedTabToTop = (idx: number) => {
        const newTabs = [...propTabs];
        const selectedTab = newTabs.splice(idx, 1);
        newTabs.unshift(selectedTab[0]);
        setTabs(newTabs);
        setActive(newTabs[0]);
    };

    return (
        <>
            <div className={cn("flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible max-w-full w-full", containerClassName)}>
                {propTabs.map((tab, idx) => (
                    <button
                        key={tab.title}
                        onClick={() => moveSelectedTabToTop(idx)}
                        className={cn("relative px-4 py-2 rounded-full", tabClassName)}
                        style={{ transformStyle: "preserve-3d" }}
                    >
                        {active.value === tab.value && (
                            <motion.div
                                layoutId="clickedbutton"
                                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                                className={cn("absolute inset-0 bg-gray-200 dark:bg-zinc-800 rounded-full", activeTabClassName)}
                            />
                        )}
                        <span className="relative block text-black dark:text-white">{tab.title}</span>
                    </button>
                ))}
            </div>
            <FadeInDiv tabs={tabs} active={active} key={active.value} className={cn("mt-32", contentClassName)} />
        </>
    );
};`,
    },
    "infinite-moving-cards": {
        dependencies: "npm i clsx tailwind-merge",
        cssV4: `@keyframes scroll {
  to {
    transform: translate(calc(-50% - 0.5rem));
  }
}
.animate-scroll {
  animation: scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite;
}`,
        props: [
            { name: "items", type: "{ quote: string; name: string; title: string }[]", description: "Array of testimonial items", required: true },
            { name: "direction", type: "'left' | 'right'", description: "Direction of movement", default: "'left'" },
            { name: "speed", type: "'fast' | 'normal' | 'slow'", description: "Speed of animation", default: "'fast'" },
            { name: "pauseOnHover", type: "boolean", description: "Pause animation on hover", default: "true" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

export const InfiniteMovingCards = ({
    items,
    direction = "left",
    speed = "fast",
    pauseOnHover = true,
    className,
}: {
    items: { quote: string; name: string; title: string }[];
    direction?: "left" | "right";
    speed?: "fast" | "normal" | "slow";
    pauseOnHover?: boolean;
    className?: string;
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const scrollerRef = React.useRef<HTMLUListElement>(null);
    const [start, setStart] = useState(false);

    useEffect(() => { addAnimation(); }, []);

    function addAnimation() {
        if (containerRef.current && scrollerRef.current) {
            const scrollerContent = Array.from(scrollerRef.current.children);
            scrollerContent.forEach((item) => {
                const duplicatedItem = item.cloneNode(true);
                scrollerRef.current?.appendChild(duplicatedItem);
            });
            getDirection();
            getSpeed();
            setStart(true);
        }
    }

    const getDirection = () => {
        containerRef.current?.style.setProperty("--animation-direction", direction === "left" ? "forwards" : "reverse");
    };

    const getSpeed = () => {
        const duration = speed === "fast" ? "20s" : speed === "normal" ? "40s" : "80s";
        containerRef.current?.style.setProperty("--animation-duration", duration);
    };

    return (
        <div ref={containerRef} className={cn("scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]", className)}>
            <ul ref={scrollerRef} className={cn("flex min-w-full shrink-0 gap-4 py-4 w-max flex-nowrap", start && "animate-scroll", pauseOnHover && "hover:[animation-play-state:paused]")}>
                {items.map((item, idx) => (
                    <li key={item.name + idx} className="w-[350px] max-w-full relative rounded-2xl border border-b-0 flex-shrink-0 border-slate-700 px-8 py-6 md:w-[450px]">
                        <blockquote>
                            <span className="text-sm leading-[1.6] text-gray-100 font-normal">{item.quote}</span>
                            <div className="mt-6 flex flex-row items-center">
                                <span className="flex flex-col gap-1">
                                    <span className="text-sm text-gray-400">{item.name}</span>
                                    <span className="text-sm text-gray-400">{item.title}</span>
                                </span>
                            </div>
                        </blockquote>
                    </li>
                ))}
            </ul>
        </div>
    );
};`,
    },
    "animated-tooltip": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "items", type: "{ id: number; name: string; designation: string; image: string }[]", description: "Array of people with tooltips", required: true },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useState } from "react";

export const AnimatedTooltip = ({
    items,
}: {
    items: { id: number; name: string; designation: string; image: string }[];
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const springConfig = { stiffness: 100, damping: 5 };
    const x = useMotionValue(0);
    const rotate = useSpring(useTransform(x, [-100, 100], [-45, 45]), springConfig);
    const translateX = useSpring(useTransform(x, [-100, 100], [-50, 50]), springConfig);

    const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
        const halfWidth = event.currentTarget.offsetWidth / 2;
        x.set(event.nativeEvent.offsetX - halfWidth);
    };

    return (
        <>
            {items.map((item) => (
                <div key={item.name} className="-mr-4 relative group" onMouseEnter={() => setHoveredIndex(item.id)} onMouseLeave={() => setHoveredIndex(null)}>
                    <AnimatePresence mode="popLayout">
                        {hoveredIndex === item.id && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                                animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 10 } }}
                                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                                style={{ translateX, rotate, whiteSpace: "nowrap" }}
                                className="absolute -top-16 -left-1/2 translate-x-1/2 flex text-xs flex-col items-center justify-center rounded-md bg-black z-50 shadow-xl px-4 py-2"
                            >
                                <div className="font-bold text-white relative z-30 text-base">{item.name}</div>
                                <div className="text-white text-xs">{item.designation}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <img onMouseMove={handleMouseMove} height={100} width={100} src={item.image} alt={item.name} className="object-cover rounded-full h-14 w-14 border-2 group-hover:scale-105 group-hover:z-30 border-white relative transition duration-500" />
                </div>
            ))}
        </>
    );
};`,
    },
    "glowing-stars": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content inside the card" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useRef } from "react";

export const GlowingStarsBackgroundCard = ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const [mouseEnter, setMouseEnter] = useState(false);
    return (
        <div
            onMouseEnter={() => setMouseEnter(true)}
            onMouseLeave={() => setMouseEnter(false)}
            className={cn("bg-[linear-gradient(110deg,#333_0.6%,#222)] p-4 max-w-md max-h-[20rem] h-full w-full rounded-xl border border-[#eaeaea] dark:border-neutral-600", className)}
        >
            <div className="flex justify-center items-center">
                <Illustration mouseEnter={mouseEnter} />
            </div>
            <div className="px-2 pb-6">{children}</div>
        </div>
    );
};

export const GlowingStarsTitle = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <h2 className={cn("font-bold text-2xl text-[#eaeaea]", className)}>{children}</h2>
);

export const GlowingStarsDescription = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <p className={cn("text-base text-white max-w-[16rem]", className)}>{children}</p>
);`,
    },
    "tracing-beam": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to wrap with tracing beam", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, useTransform, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export const TracingBeam = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const contentRef = useRef<HTMLDivElement>(null);
    const [svgHeight, setSvgHeight] = useState(0);

    useEffect(() => {
        if (contentRef.current) setSvgHeight(contentRef.current.offsetHeight);
    }, []);

    const y1 = useSpring(useTransform(scrollYProgress, [0, 0.8], [50, svgHeight]), { stiffness: 500, damping: 90 });
    const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [50, svgHeight - 200]), { stiffness: 500, damping: 90 });

    return (
        <motion.div ref={ref} className={cn("relative w-full max-w-4xl mx-auto h-full", className)}>
            <div className="absolute -left-4 md:-left-20 top-3">
                {/* SVG beam indicator */}
                <svg viewBox={\`0 0 20 \${svgHeight}\`} width="20" height={svgHeight} className="ml-4 block">
                    <motion.path d={\`M 1 0V -36 l 18 24 V \${svgHeight * 0.8} l -18 24V \${svgHeight}\`} fill="none" stroke="url(#gradient)" strokeWidth="1.25" />
                    <defs>
                        <motion.linearGradient id="gradient" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1={y1} y2={y2}>
                            <stop stopColor="#18CCFC" stopOpacity="0" />
                            <stop stopColor="#18CCFC" />
                            <stop offset="0.325" stopColor="#6344F5" />
                            <stop offset="1" stopColor="#AE48FF" stopOpacity="0" />
                        </motion.linearGradient>
                    </defs>
                </svg>
            </div>
            <div ref={contentRef}>{children}</div>
        </motion.div>
    );
};`,
    },
    "timeline": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "data", type: "{ title: string; content: ReactNode }[]", description: "Array of timeline entries", required: true },
        ],
        sourceCode: `"use client";
import { useScroll, useTransform, motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

interface TimelineEntry { title: string; content: React.ReactNode; }

export const Timeline = ({ data }: { data: TimelineEntry[] }) => {
    const ref = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState(0);

    useEffect(() => {
        if (ref.current) setHeight(ref.current.getBoundingClientRect().height);
    }, [ref]);

    const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start 10%", "end 50%"] });
    const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
    const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

    return (
        <div className="w-full bg-white dark:bg-neutral-950" ref={containerRef}>
            <div ref={ref} className="relative max-w-7xl mx-auto pb-20">
                {data.map((item, index) => (
                    <div key={index} className="flex justify-start pt-10 md:pt-40 md:gap-10">
                        <div className="sticky flex flex-col md:flex-row z-40 items-center top-40 self-start max-w-xs lg:max-w-sm md:w-full">
                            <div className="h-10 absolute left-3 w-10 rounded-full bg-white dark:bg-black flex items-center justify-center">
                                <div className="h-4 w-4 rounded-full bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700" />
                            </div>
                            <h3 className="hidden md:block text-xl md:pl-20 md:text-5xl font-bold text-neutral-500">{item.title}</h3>
                        </div>
                        <div className="relative pl-20 pr-4 md:pl-4 w-full">{item.content}</div>
                    </div>
                ))}
                <div style={{ height: height + "px" }} className="absolute md:left-8 left-8 top-0 overflow-hidden w-[2px] bg-[linear-gradient(to_bottom,var(--tw-gradient-stops))] from-transparent via-neutral-200 dark:via-neutral-700 to-transparent">
                    <motion.div style={{ height: heightTransform, opacity: opacityTransform }} className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-t from-purple-500 via-blue-500 to-transparent rounded-full" />
                </div>
            </div>
        </div>
    );
};`,
    },
    "compare": {
        dependencies: "npm i framer-motion clsx tailwind-merge @tabler/icons-react",
        props: [
            { name: "firstImage", type: "string", description: "URL of the first image" },
            { name: "secondImage", type: "string", description: "URL of the second image" },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "initialSliderPercentage", type: "number", description: "Initial slider position", default: "50" },
            { name: "slideMode", type: "'hover' | 'drag'", description: "Interaction mode", default: "'hover'" },
            { name: "showHandlebar", type: "boolean", description: "Show drag handle", default: "true" },
            { name: "autoplay", type: "boolean", description: "Auto-animate the slider", default: "false" },
            { name: "autoplayDuration", type: "number", description: "Duration for autoplay cycle", default: "5000" },
        ],
        sourceCode: `"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Compare = ({
    firstImage = "",
    secondImage = "",
    className,
    initialSliderPercentage = 50,
    slideMode = "hover",
    showHandlebar = true,
    autoplay = false,
    autoplayDuration = 5000,
}: CompareProps) => {
    const [sliderXPercent, setSliderXPercent] = useState(initialSliderPercentage);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);
    
    // ... event handlers for mouse/touch interactions and autoplay ...
    
    return (
        <div ref={sliderRef} className={cn("w-[400px] h-[400px] overflow-hidden", className)} style={{ position: "relative", cursor: slideMode === "drag" ? "grab" : "col-resize" }}>
            <AnimatePresence initial={false}>
                <motion.div className="h-full w-px absolute top-0 m-auto z-30 bg-gradient-to-b from-transparent via-indigo-500 to-transparent" style={{ left: \`\${sliderXPercent}%\` }}>
                    {showHandlebar && <div className="h-5 w-5 rounded-md top-1/2 -translate-y-1/2 bg-white z-30 -right-2.5 absolute flex items-center justify-center" />}
                </motion.div>
            </AnimatePresence>
            <div className="overflow-hidden w-full h-full relative z-20 pointer-events-none">
                {firstImage && <motion.div className="absolute inset-0 z-20 rounded-2xl flex-shrink-0 w-full h-full" style={{ clipPath: \`inset(0 \${100 - sliderXPercent}% 0 0)\` }}>
                    <img alt="first" src={firstImage} className="absolute inset-0 z-20 rounded-2xl w-full h-full" draggable={false} />
                </motion.div>}
            </div>
            {secondImage && <motion.img className="absolute top-0 left-0 z-[19] rounded-2xl w-full h-full" alt="second" src={secondImage} draggable={false} />}
        </div>
    );
};`,
    },
    "grid-background": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to display" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React from "react";

export function GridBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
    return (
        <div className={cn("h-[50rem] w-full dark:bg-black bg-white dark:bg-grid-white/[0.2] bg-grid-black/[0.2] relative flex items-center justify-center", className)}>
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
            {children}
        </div>
    );
}

export function DotBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
    return (
        <div className={cn("h-[50rem] w-full dark:bg-black bg-white dark:bg-dot-white/[0.2] bg-dot-black/[0.2] relative flex items-center justify-center", className)}>
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
            {children}
        </div>
    );
}`,
    },
    "typewriter-effect": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "words", type: "{ text: string; className?: string }[]", description: "Array of words to type", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "cursorClassName", type: "string", description: "CSS classes for the cursor" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { motion, stagger, useAnimate, useInView } from "framer-motion";
import { useEffect } from "react";

export const TypewriterEffect = ({
    words,
    className,
    cursorClassName,
}: {
    words: { text: string; className?: string }[];
    className?: string;
    cursorClassName?: string;
}) => {
    const wordsArray = words.map((word) => ({ ...word, text: word.text.split("") }));
    const [scope, animate] = useAnimate();
    const isInView = useInView(scope);

    useEffect(() => {
        if (isInView) {
            animate("span", { display: "inline-block", opacity: 1, width: "fit-content" }, { duration: 0.3, delay: stagger(0.1), ease: "easeInOut" });
        }
    }, [isInView, animate]);

    return (
        <div className={cn("text-base sm:text-xl md:text-3xl lg:text-5xl font-bold text-center", className)}>
            <motion.div ref={scope} className="inline">
                {wordsArray.map((word, idx) => (
                    <div key={\`word-\${idx}\`} className="inline-block">
                        {word.text.map((char, index) => (<motion.span key={\`char-\${index}\`} className={cn("dark:text-white text-black opacity-0 hidden", word.className)}>{char}</motion.span>))}
                        &nbsp;
                    </div>
                ))}
            </motion.div>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }} className={cn("inline-block rounded-sm w-[4px] h-4 md:h-6 lg:h-10 bg-blue-500", cursorClassName)} />
        </div>
    );
};`,
    },
    "card-hover-effect": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "items", type: "{ title: string; description: string; link: string }[]", description: "Array of card items", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export const HoverEffect = ({
    items,
    className,
}: {
    items: { title: string; description: string; link: string }[];
    className?: string;
}) => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 py-10", className)}>
            {items.map((item, idx) => (
                <a key={item.link} href={item.link} className="relative group block p-2 h-full w-full" onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                    <AnimatePresence>
                        {hoveredIndex === idx && (
                            <motion.span className="absolute inset-0 h-full w-full bg-neutral-200 dark:bg-slate-800/[0.8] block rounded-3xl" layoutId="hoverBackground" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.15 } }} exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }} />
                        )}
                    </AnimatePresence>
                    <Card><CardTitle>{item.title}</CardTitle><CardDescription>{item.description}</CardDescription></Card>
                </a>
            ))}
        </div>
    );
};`,
    },
    "card-stack": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "items", type: "{ id: number; name: string; designation: string; content: ReactNode }[]", description: "Array of cards", required: true },
            { name: "offset", type: "number", description: "Vertical offset between cards", default: "10" },
            { name: "scaleFactor", type: "number", description: "Scale reduction per card", default: "0.06" },
        ],
        sourceCode: `"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Card = { id: number; name: string; designation: string; content: React.ReactNode };

export const CardStack = ({ items, offset, scaleFactor }: { items: Card[]; offset?: number; scaleFactor?: number }) => {
    const CARD_OFFSET = offset || 10;
    const SCALE_FACTOR = scaleFactor || 0.06;
    const [cards, setCards] = useState<Card[]>(items);

    useEffect(() => {
        const interval = setInterval(() => {
            setCards((prevCards) => {
                const newArray = [...prevCards];
                newArray.unshift(newArray.pop()!);
                return newArray;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative h-60 w-60 md:h-60 md:w-96">
            {cards.map((card, index) => (
                <motion.div
                    key={card.id}
                    className="absolute dark:bg-black bg-white h-60 w-60 md:h-60 md:w-96 rounded-3xl p-4 shadow-xl border border-neutral-200 dark:border-white/[0.1] flex flex-col justify-between"
                    style={{ transformOrigin: "top center" }}
                    animate={{ top: index * -CARD_OFFSET, scale: 1 - index * SCALE_FACTOR, zIndex: cards.length - index }}
                >
                    <div className="font-normal text-neutral-700 dark:text-neutral-200">{card.content}</div>
                    <div>
                        <p className="text-neutral-500 font-medium dark:text-white">{card.name}</p>
                        <p className="text-neutral-400 font-normal dark:text-neutral-200">{card.designation}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};`,
    },
    "aurora-background": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        cssV4: `@keyframes aurora {
  from { background-position: 50% 50%, 50% 50%; }
  to { background-position: 350% 50%, 350% 50%; }
}
.animate-aurora { animation: aurora 60s linear infinite; }`,
        props: [
            { name: "children", type: "ReactNode", description: "Content to display", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "showRadialGradient", type: "boolean", description: "Show radial gradient overlay", default: "true" },
        ],
        sourceCode: `"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const AuroraBackground = ({
    children,
    className,
    showRadialGradient = true,
}: {
    children: React.ReactNode;
    className?: string;
    showRadialGradient?: boolean;
}) => {
    return (
        <main>
            <div className={cn("relative flex flex-col h-[100vh] items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-slate-950 transition-bg", className)}>
                <div className="absolute inset-0 overflow-hidden">
                    <div className={cn(
                        "[--aurora:repeating-linear-gradient(100deg,var(--blue-500)_10%,var(--indigo-300)_15%,var(--blue-300)_20%,var(--violet-200)_25%,var(--blue-400)_30%)] [background-size:300%,_200%] filter blur-[10px] after:animate-aurora pointer-events-none absolute -inset-[10px] opacity-50",
                        showRadialGradient && "[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]"
                    )} />
                </div>
                {children}
            </div>
        </main>
    );
};`,
    },
    "background-boxes": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

export const BackgroundBoxes = ({ className }: { className?: string }) => {
    const rows = new Array(150).fill(1);
    const cols = new Array(100).fill(1);
    const colors = ["--sky-300", "--pink-300", "--green-300", "--yellow-300", "--red-300", "--purple-300", "--blue-300", "--indigo-300", "--violet-300"];
    const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

    return (
        <div style={{ transform: "translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675)" }} className={cn("absolute left-1/4 p-4 -top-1/4 flex -translate-x-1/2 -translate-y-1/2 w-full h-full z-0", className)}>
            {rows.map((_, i) => (
                <motion.div key={\`row\${i}\`} className="w-16 h-8 border-l border-slate-700 relative">
                    {cols.map((_, j) => (
                        <motion.div
                            whileHover={{ backgroundColor: \`var(\${getRandomColor()})\`, transition: { duration: 0 } }}
                            key={\`col\${j}\`}
                            className="w-16 h-8 border-r border-t border-slate-700 relative"
                        />
                    ))}
                </motion.div>
            ))}
        </div>
    );
};`,
    },
    "bento-grid": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Grid items" },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "title", type: "string | ReactNode", description: "Title for grid item" },
            { name: "description", type: "string | ReactNode", description: "Description for grid item" },
            { name: "header", type: "ReactNode", description: "Header content for grid item" },
            { name: "icon", type: "ReactNode", description: "Icon for grid item" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React from "react";

export const BentoGrid = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
    <div className={cn("grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto", className)}>
        {children}
    </div>
);

export const BentoGridItem = ({
    className, title, description, header, icon
}: {
    className?: string;
    title?: string | React.ReactNode;
    description?: string | React.ReactNode;
    header?: React.ReactNode;
    icon?: React.ReactNode;
}) => (
    <div className={cn("row-span-1 rounded-xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4", className)}>
        {header}
        <div className="group-hover/bento:translate-x-2 transition duration-200">
            {icon}
            <div className="font-sans font-bold text-neutral-600 dark:text-neutral-200 mb-2 mt-2">{title}</div>
            <div className="font-sans font-normal text-neutral-600 text-xs dark:text-neutral-300">{description}</div>
        </div>
    </div>
);`,
    },
    "floating-dock": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "items", type: "{ title: string; icon: ReactNode; href: string }[]", description: "Array of dock items", required: true },
            { name: "desktopClassName", type: "string", description: "CSS classes for desktop dock" },
            { name: "mobileClassName", type: "string", description: "CSS classes for mobile dock" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";

export const FloatingDock = ({
    items,
    desktopClassName,
    mobileClassName,
}: {
    items: { title: string; icon: React.ReactNode; href: string }[];
    desktopClassName?: string;
    mobileClassName?: string;
}) => (
    <>
        <FloatingDockDesktop items={items} className={desktopClassName} />
        <FloatingDockMobile items={items} className={mobileClassName} />
    </>
);

// Desktop and Mobile dock components with spring animations...`,
    },
    "floating-navbar": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "navItems", type: "{ name: string; link: string; icon?: ReactNode }[]", description: "Navigation items", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

export const FloatingNav = ({
    navItems,
    className,
}: {
    navItems: { name: string; link: string; icon?: React.ReactNode }[];
    className?: string;
}) => {
    const { scrollYProgress } = useScroll();
    const [visible, setVisible] = React.useState(true);

    useMotionValueEvent(scrollYProgress, "change", (current) => {
        if (typeof current === "number") {
            const direction = current - (scrollYProgress.getPrevious() || 0);
            if (scrollYProgress.get() < 0.05) setVisible(true);
            else setVisible(direction < 0);
        }
    });

    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 1, y: -100 }}
                animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                className={cn("flex max-w-fit fixed top-10 inset-x-0 mx-auto border border-transparent dark:border-white/[0.2] rounded-full dark:bg-black bg-white shadow-lg z-[5000] pr-2 pl-8 py-2 items-center justify-center space-x-4", className)}
            >
                {navItems.map((navItem, idx) => (
                    <Link key={\`link=\${idx}\`} href={navItem.link} className="relative dark:text-neutral-50 items-center flex space-x-1 text-neutral-600">
                        <span className="block sm:hidden">{navItem.icon}</span>
                        <span className="hidden sm:block text-sm">{navItem.name}</span>
                    </Link>
                ))}
            </motion.div>
        </AnimatePresence>
    );
};`,
    },
    "hero-parallax": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "products", type: "{ title: string; link: string; thumbnail: string }[]", description: "Array of product cards", required: true },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion, useScroll, useTransform, useSpring, MotionValue } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export const HeroParallax = ({ products }: { products: { title: string; link: string; thumbnail: string }[] }) => {
    const firstRow = products.slice(0, 5);
    const secondRow = products.slice(5, 10);
    const thirdRow = products.slice(10, 15);
    const ref = React.useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

    const translateX = useSpring(useTransform(scrollYProgress, [0, 1], [0, 1000]), springConfig);
    const translateXReverse = useSpring(useTransform(scrollYProgress, [0, 1], [0, -1000]), springConfig);
    const rotateX = useSpring(useTransform(scrollYProgress, [0, 0.2], [15, 0]), springConfig);
    const rotateZ = useSpring(useTransform(scrollYProgress, [0, 0.2], [20, 0]), springConfig);
    const translateY = useSpring(useTransform(scrollYProgress, [0, 0.2], [-700, 500]), springConfig);
    const opacity = useSpring(useTransform(scrollYProgress, [0, 0.2], [0.2, 1]), springConfig);

    return (
        <div ref={ref} className="h-[300vh] py-40 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px]">
            <motion.div style={{ rotateX, rotateZ, translateY, opacity }}>
                {/* Product rows with parallax effect */}
            </motion.div>
        </div>
    );
};`,
    },
    "parallax-scroll": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "images", type: "string[]", description: "Array of image URLs", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { useScroll, useTransform, motion } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const ParallaxScroll = ({ images, className }: { images: string[]; className?: string }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ container: gridRef, offset: ["start start", "end start"] });

    const translateFirst = useTransform(scrollYProgress, [0, 1], [0, -200]);
    const translateSecond = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const translateThird = useTransform(scrollYProgress, [0, 1], [0, -200]);

    const third = Math.ceil(images.length / 3);
    const firstPart = images.slice(0, third);
    const secondPart = images.slice(third, 2 * third);
    const thirdPart = images.slice(2 * third);

    return (
        <div className={cn("h-[40rem] items-start overflow-y-auto w-full", className)} ref={gridRef}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start max-w-5xl mx-auto gap-10 py-40 px-10">
                {/* Three columns with different parallax speeds */}
            </div>
        </div>
    );
};`,
    },
    "sidebar": {
        dependencies: "npm i framer-motion clsx tailwind-merge @tabler/icons-react",
        props: [
            { name: "children", type: "ReactNode", description: "Sidebar content", required: true },
            { name: "open", type: "boolean", description: "Whether sidebar is open" },
            { name: "setOpen", type: "function", description: "Function to toggle sidebar state" },
            { name: "animate", type: "boolean", description: "Enable animations", default: "true" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconMenu2, IconX } from "@tabler/icons-react";

const SidebarContext = createContext<{ open: boolean; setOpen: React.Dispatch<React.SetStateAction<boolean>>; animate: boolean } | undefined>(undefined);

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
    return context;
};

export const Sidebar = ({ children, open, setOpen, animate }: { children: React.ReactNode; open?: boolean; setOpen?: React.Dispatch<React.SetStateAction<boolean>>; animate?: boolean }) => (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>{children}</SidebarProvider>
);

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => (
    <>
        <DesktopSidebar {...props} />
        <MobileSidebar {...props} />
    </>
);`,
    },
    "sticky-scroll-reveal": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "content", type: "{ title: string; description: string; content?: ReactNode }[]", description: "Array of content sections", required: true },
            { name: "contentClassName", type: "string", description: "CSS classes for content area" },
        ],
        sourceCode: `"use client";
import React, { useRef } from "react";
import { useScroll, useMotionValueEvent, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const StickyScroll = ({
    content,
    contentClassName,
}: {
    content: { title: string; description: string; content?: React.ReactNode }[];
    contentClassName?: string;
}) => {
    const [activeCard, setActiveCard] = React.useState(0);
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ container: ref, offset: ["start start", "end start"] });

    useMotionValueEvent(scrollYProgress, "change", (latest) => {
        const cardsBreakpoints = content.map((_, index) => index / content.length);
        const closestBreakpointIndex = cardsBreakpoints.reduce((acc, breakpoint, index) => {
            const distance = Math.abs(latest - breakpoint);
            if (distance < Math.abs(latest - cardsBreakpoints[acc])) return index;
            return acc;
        }, 0);
        setActiveCard(closestBreakpointIndex);
    });

    return (
        <motion.div className="h-[30rem] overflow-y-auto flex justify-center relative space-x-10 rounded-md p-10" ref={ref}>
            {/* Content sections with sticky reveal effect */}
        </motion.div>
    );
};`,
    },
    "vortex": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to display over vortex" },
            { name: "className", type: "string", description: "CSS classes for content wrapper" },
            { name: "containerClassName", type: "string", description: "CSS classes for container" },
            { name: "particleCount", type: "number", description: "Number of particles", default: "700" },
            { name: "baseHue", type: "number", description: "Base hue for particles", default: "220" },
            { name: "backgroundColor", type: "string", description: "Background color", default: "#000000" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export const Vortex = (props: {
    children?: React.ReactNode;
    className?: string;
    containerClassName?: string;
    particleCount?: number;
    baseHue?: number;
    backgroundColor?: string;
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const particleCount = props.particleCount || 700;
    const baseHue = props.baseHue || 220;
    const backgroundColor = props.backgroundColor || "#000000";

    useEffect(() => {
        // Canvas rendering logic for particle vortex animation
    }, []);

    return (
        <div className={cn("relative h-full w-full", props.containerClassName)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} ref={containerRef} className="absolute h-full w-full inset-0 z-0 bg-transparent flex items-center justify-center">
                <canvas ref={canvasRef} />
            </motion.div>
            <div className={cn("relative z-10", props.className)}>{props.children}</div>
        </div>
    );
};`,
    },
    "3d-marquee": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "images", type: "string[]", description: "Array of image URLs to display", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const Marquee3D = ({ images, className }: { images: string[]; className?: string }) => {
    const chunkSize = Math.ceil(images.length / 4);
    const chunks = [];
    for (let i = 0; i < images.length; i += chunkSize) {
        chunks.push(images.slice(i, i + chunkSize));
    }

    return (
        <div className={cn("mx-auto flex h-[600px] w-full max-w-7xl flex-col items-center justify-center gap-8 overflow-hidden rounded-2xl", className)}>
            <div className="flex shrink-0 flex-col items-center justify-center gap-8 [perspective:300px]" style={{ transform: "translateX(-100px) translateY(-50px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)" }}>
                {chunks.map((chunk, index) => (
                    <motion.div key={index} className="flex shrink-0 flex-row flex-nowrap items-center justify-center gap-8" animate={{ x: index % 2 === 0 ? [0, -1920] : [-1920, 0] }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }}>
                        {[...chunk, ...chunk].map((image, i) => (
                            <div key={i} className="relative flex h-32 w-48 shrink-0 items-center justify-center rounded-xl bg-[#222] shadow-lg">
                                <img src={image} alt={\`Image \${i}\`} className="h-full w-full rounded-xl object-cover" />
                            </div>
                        ))}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};`,
    },
    "3d-pin": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to display in the pin", required: true },
            { name: "title", type: "string", description: "Title shown on hover" },
            { name: "href", type: "string", description: "Link URL" },
            { name: "className", type: "string", description: "CSS classes for content" },
            { name: "containerClassName", type: "string", description: "CSS classes for container" },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const PinContainer = ({ children, title, href, className, containerClassName }: { children: React.ReactNode; title?: string; href?: string; className?: string; containerClassName?: string }) => {
    const [transform, setTransform] = React.useState("translate(-50%,-50%) rotateX(0deg)");

    const onMouseEnter = () => setTransform("translate(-50%,-50%) rotateX(40deg) scale(0.8)");
    const onMouseLeave = () => setTransform("translate(-50%,-50%) rotateX(0deg) scale(1)");

    return (
        <div className={cn("relative group/pin z-50 cursor-pointer", containerClassName)} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <div style={{ perspective: "1000px", transform: "rotateX(70deg) translateZ(0deg)" }} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div style={{ transform }} className="absolute left-1/2 p-4 top-1/2 flex justify-start items-start rounded-2xl shadow-lg bg-black border border-white/[0.1] transition duration-700 overflow-hidden">
                    <div className={cn("relative z-50", className)}>{children}</div>
                </div>
            </div>
            <PinPerspective title={title} href={href} />
        </div>
    );
};`,
    },
    "animated-modal": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Modal content", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React, { createContext, useContext, useState } from "react";

const ModalContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | undefined>(undefined);
export const useModal = () => { const ctx = useContext(ModalContext); if (!ctx) throw new Error("useModal must be within ModalProvider"); return ctx; };

export function Modal({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    return <ModalContext.Provider value={{ open, setOpen }}>{children}</ModalContext.Provider>;
}

export const ModalTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const { setOpen } = useModal();
    return <button className={cn("px-4 py-2 rounded-md", className)} onClick={() => setOpen(true)}>{children}</button>;
};

export const ModalBody = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    const { open } = useModal();
    return (
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, backdropFilter: "blur(10px)" }} exit={{ opacity: 0 }} className="fixed inset-0 h-full w-full flex items-center justify-center z-50">
                    <motion.div className={cn("min-h-[50%] max-h-[90%] md:max-w-[40%] bg-white dark:bg-neutral-950 rounded-2xl p-4", className)} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};`,
    },
    "animated-testimonials": {
        dependencies: "npm i framer-motion clsx tailwind-merge @tabler/icons-react",
        props: [
            { name: "testimonials", type: "{ quote: string; name: string; designation: string; src: string }[]", description: "Array of testimonials", required: true },
            { name: "autoplay", type: "boolean", description: "Auto-rotate testimonials", default: "false" },
        ],
        sourceCode: `"use client";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

type Testimonial = { quote: string; name: string; designation: string; src: string };

export const AnimatedTestimonials = ({ testimonials, autoplay = false }: { testimonials: Testimonial[]; autoplay?: boolean }) => {
    const [active, setActive] = useState(0);
    const handleNext = () => setActive((prev) => (prev + 1) % testimonials.length);
    const handlePrev = () => setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);

    useEffect(() => {
        if (autoplay) { const interval = setInterval(handleNext, 5000); return () => clearInterval(interval); }
    }, [autoplay]);

    return (
        <div className="max-w-4xl mx-auto px-4 py-20">
            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-20">
                <AnimatePresence>
                    {/* Image carousel and quote display */}
                </AnimatePresence>
            </div>
        </div>
    );
};`,
    },
    "apple-cards-carousel": {
        dependencies: "npm i framer-motion clsx tailwind-merge @tabler/icons-react",
        props: [
            { name: "items", type: "ReactNode[]", description: "Array of card items", required: true },
            { name: "initialScroll", type: "number", description: "Initial scroll position", default: "0" },
        ],
        sourceCode: `"use client";
import React, { useEffect, useState, createContext, useContext } from "react";
import { IconArrowNarrowLeft, IconArrowNarrowRight, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";

export const CarouselContext = createContext<{ onCardClose: (idx: number) => void; currentIndex: number }>({ onCardClose: () => {}, currentIndex: 0 });

export const Carousel = ({ items, initialScroll = 0 }: { items: React.ReactNode[]; initialScroll?: number }) => {
    const carouselRef = React.useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    
    // Scroll logic and card handling
    return (
        <CarouselContext.Provider value={{ onCardClose: () => {}, currentIndex }}>
            <div className="relative w-full">
                <div className="flex w-full overflow-x-scroll py-10 scroll-smooth [scrollbar-width:none]" ref={carouselRef}>
                    {items.map((item, index) => <motion.div key={index}>{item}</motion.div>)}
                </div>
            </div>
        </CarouselContext.Provider>
    );
};`,
    },
    "background-beams-with-collision": {
        dependencies: "npm i clsx tailwind-merge",
        cssV4: `@keyframes beam { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
.animate-beam { animation: beam linear infinite; }`,
        props: [
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const BackgroundBeamsWithCollision = ({ className }: { className?: string }) => {
    const [beams, setBeams] = useState<{ id: number; x: number; delay: number; duration: number }[]>([]);

    useEffect(() => {
        const newBeams = Array.from({ length: 10 }, (_, i) => ({ id: i, x: Math.random() * 100, delay: Math.random() * 2, duration: 2 + Math.random() * 3 }));
        setBeams(newBeams);
    }, []);

    return (
        <div className={cn("relative h-full w-full overflow-hidden bg-neutral-950", className)}>
            {beams.map((beam) => (
                <div key={beam.id} className="absolute h-full w-0.5 bg-gradient-to-b from-transparent via-purple-500 to-transparent animate-beam" style={{ left: \`\${beam.x}%\`, animationDelay: \`\${beam.delay}s\`, animationDuration: \`\${beam.duration}s\` }} />
            ))}
        </div>
    );
};`,
    },
    "background-gradient-animation": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to display" },
            { name: "className", type: "string", description: "CSS classes for content" },
            { name: "containerClassName", type: "string", description: "CSS classes for container" },
            { name: "interactive", type: "boolean", description: "Enable mouse interaction", default: "true" },
            { name: "gradientBackgroundStart", type: "string", description: "Start gradient color" },
            { name: "gradientBackgroundEnd", type: "string", description: "End gradient color" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

export const BackgroundGradientAnimation = ({ children, className, containerClassName, interactive = true }: { children?: React.ReactNode; className?: string; containerClassName?: string; interactive?: boolean }) => {
    return (
        <div className={cn("h-screen w-screen relative overflow-hidden", containerClassName)}>
            <div className={cn("", className)}>{children}</div>
            <div className="gradients-container h-full w-full blur-lg">
                {/* Animated gradient blobs */}
            </div>
        </div>
    );
};`,
    },
    "background-gradient": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to wrap" },
            { name: "className", type: "string", description: "CSS classes for content" },
            { name: "containerClassName", type: "string", description: "CSS classes for container" },
            { name: "animate", type: "boolean", description: "Enable animation", default: "true" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const BackgroundGradient = ({ children, className, containerClassName, animate = true }: { children?: React.ReactNode; className?: string; containerClassName?: string; animate?: boolean }) => {
    const variants = { initial: { backgroundPosition: "0 50%" }, animate: { backgroundPosition: ["0, 50%", "100% 50%", "0 50%"] } };
    return (
        <div className={cn("relative p-[4px] group", containerClassName)}>
            <motion.div variants={animate ? variants : undefined} initial={animate ? "initial" : undefined} animate={animate ? "animate" : undefined} transition={animate ? { duration: 5, repeat: Infinity, repeatType: "reverse" } : undefined} className="absolute inset-0 rounded-3xl z-[1] opacity-60 group-hover:opacity-100 blur-xl bg-gradient-radial" />
            <div className={cn("relative z-10", className)}>{children}</div>
        </div>
    );
};`,
    },
    "background-lines": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to display", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "svgOptions", type: "{ duration?: number }", description: "SVG animation options" },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundLines = ({ children, className, svgOptions }: { children: React.ReactNode; className?: string; svgOptions?: { duration?: number } }) => {
    const paths = ["M-380 -189C-380 -189 -312 216 152 343C616 470 684 875 684 875", /* more paths */];
    return (
        <div className={cn("h-[40rem] w-full bg-white dark:bg-black flex items-center justify-center relative overflow-hidden", className)}>
            <motion.svg viewBox="0 0 1440 900" className="absolute inset-0 w-full h-full pointer-events-none">
                {paths.map((d, i) => <motion.path key={i} d={d} stroke={\`url(#gradient-\${i})\`} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: svgOptions?.duration || 10, repeat: Infinity, repeatType: "reverse" }} />)}
            </motion.svg>
            {children}
        </div>
    );
};`,
    },
    "background-ripple-effect": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "gridSize", type: "number", description: "Grid size", default: "20" },
            { name: "rippleColor", type: "string", description: "Ripple color", default: "#6366f1" },
        ],
        sourceCode: `"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundRippleEffect = ({ className, gridSize = 20, rippleColor = "#6366f1" }: { className?: string; gridSize?: number; rippleColor?: string }) => {
    const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const id = Date.now();
        setRipples((prev) => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
        setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 1000);
    };

    return (
        <div className={cn("relative w-full h-full overflow-hidden", className)} onClick={handleClick}>
            {ripples.map((ripple) => <motion.div key={ripple.id} className="absolute rounded-full" style={{ left: ripple.x, top: ripple.y, backgroundColor: rippleColor }} initial={{ width: 0, height: 0, opacity: 0.5 }} animate={{ width: 400, height: 400, opacity: 0, x: -200, y: -200 }} transition={{ duration: 1 }} />)}
        </div>
    );
};`,
    },
    "canvas-reveal-effect": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "animationSpeed", type: "number", description: "Animation speed", default: "0.4" },
            { name: "colors", type: "number[][]", description: "RGB color arrays" },
            { name: "containerClassName", type: "string", description: "Container CSS classes" },
            { name: "dotSize", type: "number", description: "Dot size", default: "3" },
            { name: "showGradient", type: "boolean", description: "Show gradient overlay", default: "true" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useRef } from "react";

export const CanvasRevealEffect = ({ animationSpeed = 0.4, colors = [[0, 255, 255]], containerClassName, dotSize = 3, showGradient = true }: { animationSpeed?: number; colors?: number[][]; containerClassName?: string; dotSize?: number; showGradient?: boolean }) => {
    return (
        <div className={cn("h-full relative bg-white w-full", containerClassName)}>
            <div className="h-full w-full"><DotMatrix colors={colors} dotSize={dotSize} /></div>
            {showGradient && <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-[84%]" />}
        </div>
    );
};`,
    },
    "card-spotlight": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Card content", required: true },
            { name: "radius", type: "number", description: "Spotlight radius", default: "350" },
            { name: "color", type: "string", description: "Spotlight color", default: "#262626" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import React, { MouseEvent as ReactMouseEvent } from "react";
import { cn } from "@/lib/utils";

export const CardSpotlight = ({ children, radius = 350, color = "#262626", className, ...props }: { radius?: number; color?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    
    function handleMouseMove({ currentTarget, clientX, clientY }: ReactMouseEvent<HTMLDivElement>) {
        let { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <div className={cn("group/spotlight p-10 rounded-md relative border border-neutral-800 bg-black", className)} onMouseMove={handleMouseMove} {...props}>
            <motion.div className="pointer-events-none absolute z-0 -inset-px rounded-md opacity-0 group-hover/spotlight:opacity-100" style={{ backgroundColor: color, maskImage: useMotionTemplate\`radial-gradient(\${radius}px circle at \${mouseX}px \${mouseY}px, white, transparent 80%)\` }} />
            <div className="relative z-10">{children}</div>
        </div>
    );
};`,
    },
    "carousel": {
        dependencies: "npm i framer-motion clsx tailwind-merge @tabler/icons-react",
        props: [
            { name: "items", type: "{ src: string; alt: string; title?: string; description?: string }[]", description: "Carousel items", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "autoPlay", type: "boolean", description: "Enable auto-play", default: "false" },
            { name: "autoPlayInterval", type: "number", description: "Auto-play interval", default: "5000" },
        ],
        sourceCode: `"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export const ImageCarousel = ({ items, className, autoPlay = false, autoPlayInterval = 5000 }: { items: { src: string; alt: string; title?: string; description?: string }[]; className?: string; autoPlay?: boolean; autoPlayInterval?: number }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    
    useEffect(() => {
        if (!autoPlay) return;
        const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % items.length), autoPlayInterval);
        return () => clearInterval(interval);
    }, [autoPlay, autoPlayInterval, items.length]);

    return (
        <div className={cn("relative overflow-hidden rounded-xl", className)}>
            <AnimatePresence mode="wait">
                <motion.div key={currentIndex} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="relative aspect-video">
                    <Image src={items[currentIndex].src} alt={items[currentIndex].alt} fill className="object-cover" />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};`,
    },
    "colourful-text": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "text", type: "string", description: "Text to colorize", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ColourfulText({ text, className }: { text: string; className?: string }) {
    const colors = ["rgb(131, 179, 32)", "rgb(47, 195, 106)", "rgb(42, 169, 210)", "rgb(4, 112, 202)", "rgb(107, 10, 255)"];
    const [currentColors, setCurrentColors] = useState(colors);
    const [count, setCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentColors([...colors].sort(() => Math.random() - 0.5));
            setCount((prev) => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return text.split("").map((char, index) => (
        <motion.span key={\`\${char}-\${count}-\${index}\`} animate={{ color: currentColors[index % currentColors.length], y: [0, -3, 0] }} transition={{ duration: 0.5, delay: index * 0.05 }} className={cn("inline-block", className)}>{char}</motion.span>
    ));
}`,
    },
    "container-cover": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to display", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const ContainerCover = ({ children, className }: { children: React.ReactNode; className?: string }) => {
    return (
        <div className={cn("relative w-full overflow-hidden bg-neutral-950 py-20", className)}>
            <div className="absolute inset-0 overflow-hidden">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute inset-0">
                    {[...Array(12)].map((_, i) => <div key={i} className="absolute top-1/2 left-1/2 h-0.5 w-1/2 origin-left bg-gradient-to-r from-purple-500/50 to-transparent" style={{ transform: \`rotate(\${i * 30}deg)\` }} />)}
                </motion.div>
            </div>
            <div className="relative z-10">{children}</div>
        </div>
    );
};`,
    },
    "container-scroll-animation": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "titleComponent", type: "string | ReactNode", description: "Title content", required: true },
            { name: "children", type: "ReactNode", description: "Container content", required: true },
        ],
        sourceCode: `"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const ContainerScroll = ({ titleComponent, children }: { titleComponent: string | React.ReactNode; children: React.ReactNode }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    
    const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1]);
    const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

    return (
        <div className="h-[60rem] md:h-[80rem] flex items-center justify-center relative p-2 md:p-20" ref={containerRef}>
            <motion.div style={{ rotateX: rotate, scale }} className="max-w-5xl mx-auto h-[30rem] md:h-[40rem] w-full bg-[#222222] rounded-[30px]">
                {children}
            </motion.div>
        </div>
    );
};`,
    },
    "direction-aware-hover": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "imageUrl", type: "string", description: "Image URL", required: true },
            { name: "children", type: "ReactNode | string", description: "Overlay content", required: true },
            { name: "className", type: "string", description: "Container CSS classes" },
            { name: "imageClassName", type: "string", description: "Image CSS classes" },
            { name: "childrenClassName", type: "string", description: "Children CSS classes" },
        ],
        sourceCode: `"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const DirectionAwareHover = ({ imageUrl, children, childrenClassName, imageClassName, className }: { imageUrl: string; children: React.ReactNode | string; childrenClassName?: string; imageClassName?: string; className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [direction, setDirection] = useState<"top" | "bottom" | "left" | "right">("left");

    const handleMouseEnter = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const { width, height, left, top } = ref.current.getBoundingClientRect();
        const x = event.clientX - left - (width / 2);
        const y = event.clientY - top - (height / 2);
        const d = Math.round(Math.atan2(y, x) / 1.57079633 + 5) % 4;
        setDirection(["top", "right", "bottom", "left"][d] as any);
    };

    return (
        <motion.div onMouseEnter={handleMouseEnter} ref={ref} className={cn("md:h-96 w-60 h-60 md:w-96 rounded-lg overflow-hidden group/card relative", className)}>
            <Image alt="image" className={cn("h-full w-full object-cover", imageClassName)} width="1000" height="1000" src={imageUrl} />
            <motion.div className={cn("text-white absolute bottom-4 left-4 z-40", childrenClassName)}>{children}</motion.div>
        </motion.div>
    );
};`,
    },
    "evervault-card": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "text", type: "string", description: "Text to display in center" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { useMotionValue, motion, useMotionTemplate } from "framer-motion";
import React, { MouseEvent as ReactMouseEvent, useState } from "react";
import { cn } from "@/lib/utils";

export const EvervaultCard = ({ text, className }: { text?: string; className?: string }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const [randomString, setRandomString] = useState("");

    React.useEffect(() => { setRandomString(generateRandomString(1500)); }, []);

    function onMouseMove({ currentTarget, clientX, clientY }: ReactMouseEvent) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
        setRandomString(generateRandomString(1500));
    }

    return (
        <div className={cn("p-0.5 bg-transparent aspect-square flex items-center justify-center w-full h-full relative", className)}>
            <div onMouseMove={onMouseMove} className="group/card rounded-3xl w-full relative overflow-hidden flex items-center justify-center h-full">
                <div className="relative z-10 flex items-center justify-center">
                    <span className="dark:text-white text-black z-20">{text}</span>
                </div>
            </div>
        </div>
    );
};

const generateRandomString = (length: number) => { const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; let result = ""; for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length)); return result; };`,
    },
    "focus-cards": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "cards", type: "{ title: string; src: string }[]", description: "Array of card items", required: true },
        ],
        sourceCode: `"use client";
import Image from "next/image";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

export const FocusCards = ({ cards }: { cards: { title: string; src: string }[] }) => {
    const [hovered, setHovered] = useState<number | null>(null);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-5xl mx-auto md:px-8 w-full">
            {cards.map((card, index) => (
                <div key={card.title} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} className={cn("rounded-lg relative bg-gray-100 dark:bg-neutral-900 overflow-hidden h-60 md:h-96 w-full transition-all duration-300", hovered !== null && hovered !== index && "blur-sm scale-[0.98]")}>
                    <Image src={card.src} alt={card.title} fill className="object-cover absolute inset-0" />
                    <div className={cn("absolute inset-0 bg-black/50 flex items-end py-8 px-4 transition-opacity duration-300", hovered === index ? "opacity-100" : "opacity-0")}>
                        <div className="text-xl font-medium text-white">{card.title}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};`,
    },
    "following-pointer": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to wrap", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "title", type: "string | ReactNode", description: "Pointer tooltip text" },
        ],
        sourceCode: `"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { cn } from "@/lib/utils";

export const FollowingPointerCard = ({ children, className, title }: { children: React.ReactNode; className?: string; title?: string | React.ReactNode }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const ref = React.useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [isInside, setIsInside] = useState(false);

    useEffect(() => { if (ref.current) setRect(ref.current.getBoundingClientRect()); }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (rect) { x.set(e.clientX - rect.left); y.set(e.clientY - rect.top); }
    };

    return (
        <div onMouseLeave={() => setIsInside(false)} onMouseEnter={() => setIsInside(true)} onMouseMove={handleMouseMove} style={{ cursor: "none" }} ref={ref} className={cn("relative", className)}>
            <AnimatePresence>{isInside && <FollowPointer x={x} y={y} title={title} />}</AnimatePresence>
            {children}
        </div>
    );
};`,
    },
    "code-block": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "code", type: "string", description: "Code content to display", required: true },
            { name: "language", type: "string", description: "Programming language", default: "javascript" },
            { name: "filename", type: "string", description: "Optional filename header" },
            { name: "showLineNumbers", type: "boolean", description: "Show line numbers", default: "true" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const CodeBlock = ({ code, language = "javascript", filename, showLineNumbers = true, className }: { code: string; language?: string; filename?: string; showLineNumbers?: boolean; className?: string }) => {
    const lines = code.split("\\n");
    return (
        <div className={cn("rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950", className)}>
            {filename && (
                <div className="flex items-center justify-between px-4 py-2 bg-neutral-900 border-b border-neutral-800">
                    <span className="text-sm text-neutral-400">{filename}</span>
                </div>
            )}
            <pre className="p-4 overflow-x-auto">
                <code className={\`language-\${language}\`}>
                    {lines.map((line, idx) => (
                        <div key={idx} className="flex">
                            {showLineNumbers && <span className="inline-block w-8 text-neutral-600 text-right mr-4 select-none">{idx + 1}</span>}
                            <span className="text-neutral-300">{line || " "}</span>
                        </div>
                    ))}
                </code>
            </pre>
        </div>
    );
};`,
    },
    "comet-card": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Card content", required: true },
            { name: "className", type: "string", description: "Content CSS classes" },
            { name: "containerClassName", type: "string", description: "Container CSS classes" },
        ],
        sourceCode: `"use client";
import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export const CometCard = ({ children, className, containerClassName }: { children: React.ReactNode; className?: string; containerClassName?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(useSpring(y), [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(useSpring(x), [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    return (
        <motion.div ref={ref} onMouseMove={handleMouseMove} onMouseLeave={() => { x.set(0); y.set(0); }} style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className={cn("relative rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-800 p-px", containerClassName)}>
            <div className={cn("relative rounded-xl bg-neutral-950 p-6", className)}>{children}</div>
        </motion.div>
    );
};`,
    },
    "container-text-flip": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "words", type: "string[]", description: "Array of words to flip through", required: true },
            { name: "className", type: "string", description: "Container CSS classes" },
            { name: "textClassName", type: "string", description: "Text CSS classes" },
        ],
        sourceCode: `"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export const ContainerTextFlip = ({ words, className, textClassName }: { words: string[]; className?: string; textClassName?: string }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % words.length), 3000);
        return () => clearInterval(interval);
    }, [words.length]);

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <AnimatePresence mode="wait">
                <motion.span key={currentIndex} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.3 }} className={cn("inline-block", textClassName)}>{words[currentIndex]}</motion.span>
            </AnimatePresence>
        </div>
    );
};`,
    },
    "dither-shader": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "src", type: "string", description: "Image source URL", required: true },
            { name: "alt", type: "string", description: "Alt text", default: "Dithered image" },
            { name: "pattern", type: "string", description: "Dither pattern type", default: "bayer4x4" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React, { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const DitherShader = ({ src, alt = "Dithered image", pattern = "bayer4x4", className }: { src: string; alt?: string; pattern?: string; className?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isProcessed, setIsProcessed] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            // Apply dithering effect
            setIsProcessed(true);
        };
        img.src = src;
    }, [src, pattern]);

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <canvas ref={canvasRef} className="w-full h-full object-cover" style={{ imageRendering: "pixelated", opacity: isProcessed ? 1 : 0 }} />
        </div>
    );
};`,
    },
    "draggable-card": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Card content", required: true },
            { name: "className", type: "string", description: "Content CSS classes" },
            { name: "containerClassName", type: "string", description: "Container CSS classes" },
        ],
        sourceCode: `"use client";
import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export const DraggableCard = ({ children, className, containerClassName }: { children: React.ReactNode; className?: string; containerClassName?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(useSpring(y), [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
    const rotateY = useTransform(useSpring(x), [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    };

    return (
        <motion.div ref={ref} onMouseMove={handleMouseMove} onMouseLeave={() => { x.set(0); y.set(0); }} style={{ rotateY, rotateX, transformStyle: "preserve-3d" }} className={cn("relative h-96 w-72 rounded-xl bg-gradient-to-br from-indigo-300 to-violet-300", containerClassName)}>
            <div style={{ transform: "translateZ(75px)" }} className={cn("absolute inset-4 grid place-content-center rounded-xl bg-white shadow-lg", className)}>{children}</div>
        </motion.div>
    );
};`,
    },
    "encrypted-text": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "text", type: "string", description: "Text to display", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "interval", type: "number", description: "Animation interval", default: "50" },
            { name: "characters", type: "string", description: "Characters for scramble effect" },
        ],
        sourceCode: `"use client";
import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const EncryptedText = ({ text, className, interval = 50, characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*" }: { text: string; className?: string; interval?: number; characters?: string }) => {
    const [displayText, setDisplayText] = useState(text);

    const scramble = useCallback(() => {
        let iteration = 0;
        const intervalId = setInterval(() => {
            setDisplayText(text.split("").map((letter, index) => index < iteration ? text[index] : characters[Math.floor(Math.random() * characters.length)]).join(""));
            if (iteration >= text.length) clearInterval(intervalId);
            iteration += 1 / 3;
        }, interval);
    }, [text, interval, characters]);

    return <motion.span className={cn("font-mono cursor-pointer", className)} onMouseEnter={scramble}>{displayText}</motion.span>;
};`,
    },
    "expandable-card": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "cards", type: "Card[]", description: "Array of card objects with title, description, src, content", required: true },
        ],
        sourceCode: `"use client";
import Image from "next/image";
import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function ExpandableCardDemo() {
    const [active, setActive] = useState<any>(null);
    const id = useId();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setActive(false); }
        if (active && typeof active === "object") document.body.style.overflow = "hidden";
        else document.body.style.overflow = "auto";
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [active]);

    return (
        <>
            <AnimatePresence>
                {/* Modal overlay and expanded card content */}
            </AnimatePresence>
        </>
    );
}`,
    },
    "file-upload": {
        dependencies: "npm i framer-motion clsx tailwind-merge react-dropzone @tabler/icons-react",
        props: [
            { name: "onChange", type: "(files: File[]) => void", description: "Callback when files are uploaded" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

export const FileUpload = ({ onChange }: { onChange?: (files: File[]) => void }) => {
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (newFiles: File[]) => {
        setFiles((prev) => [...prev, ...newFiles]);
        onChange && onChange(newFiles);
    };

    const { getRootProps, isDragActive } = useDropzone({ multiple: false, noClick: true, onDrop: handleFileChange });

    return (
        <div className="w-full" {...getRootProps()}>
            <motion.div onClick={() => fileInputRef.current?.click()} whileHover="animate" className="p-10 group/file block rounded-lg cursor-pointer w-full relative overflow-hidden">
                <input ref={fileInputRef} type="file" onChange={(e) => handleFileChange(Array.from(e.target.files || []))} className="hidden" />
                <p className="font-bold text-neutral-700 dark:text-neutral-300">Upload file</p>
            </motion.div>
        </div>
    );
};`,
    },
    "github-globe": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "arcsData", type: "ArcData[]", description: "Array of arc connection data" },
        ],
        sourceCode: `"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const GitHubGlobe = ({ className, arcsData = [] }: { className?: string; arcsData?: { startLat: number; startLng: number; endLat: number; endLng: number; color: string }[] }) => {
    return (
        <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
            <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96">
                <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ animationDuration: "30s", background: "radial-gradient(circle at 30% 30%, #1a1a2e 0%, #050510 100%)" }}>
                    {/* Grid lines and dots */}
                </div>
            </div>
        </div>
    );
};`,
    },
    "glowing-effect": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "blur", type: "number", description: "Blur amount", default: "0" },
            { name: "spread", type: "number", description: "Glow spread", default: "20" },
            { name: "variant", type: "string", description: "Color variant", default: "default" },
            { name: "glow", type: "boolean", description: "Enable glow", default: "true" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export const GlowingEffect = ({ blur = 0, spread = 20, variant = "default", glow = true, className }: { blur?: number; spread?: number; variant?: "default" | "white"; glow?: boolean; className?: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            container.style.setProperty("--mouse-x", \`\${e.clientX - rect.left}px\`);
            container.style.setProperty("--mouse-y", \`\${e.clientY - rect.top}px\`);
        };
        container.addEventListener("mousemove", handleMouseMove);
        return () => container.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return <div ref={containerRef} className={cn("pointer-events-none absolute inset-0 rounded-[inherit]", glow && "opacity-100", className)} />;
};`,
    },
    "google-gemini-effect": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "pathLengths", type: "number[]", description: "Array of path length values", required: true },
            { name: "title", type: "string", description: "Title text" },
            { name: "description", type: "string", description: "Description text" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const GeminiEffect = ({ pathLengths, title, description, className }: { pathLengths: number[]; title?: string; description?: string; className?: string }) => {
    const paths = ["M0 663C145.5 663 191 666.265 269 647..."];
    const colors = ["#FFB7C5", "#FFDDB7", "#B1C5FF", "#4FABFF"];

    return (
        <div className={cn("sticky top-80", className)}>
            <p className="text-lg md:text-7xl font-normal pb-4 text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-100 to-neutral-300">{title || "Build with Aceternity"}</p>
            <svg width="1440" height="890" viewBox="0 0 1440 890" className="absolute left-1/2 -translate-x-1/2">
                {pathLengths.map((length, idx) => <motion.path key={idx} d={paths[idx % paths.length]} stroke={colors[idx % colors.length]} strokeWidth="2" fill="none" style={{ pathLength: length }} />)}
            </svg>
        </div>
    );
};`,
    },
    "gradient-text": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Text content", required: true },
            { name: "className", type: "string", description: "Additional CSS classes" },
            { name: "colors", type: "string[]", description: "Gradient colors array" },
            { name: "animationSpeed", type: "number", description: "Animation speed in seconds", default: "3" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React from "react";

export const GradientText = ({ children, className, colors = ["#40c9ff", "#e81cff", "#40c9ff"], animationSpeed = 3 }: { children: React.ReactNode; className?: string; colors?: string[]; animationSpeed?: number }) => {
    return (
        <span className={cn("bg-clip-text text-transparent", className)} style={{ backgroundImage: \`linear-gradient(90deg, \${colors.join(", ")})\`, backgroundSize: "200% 100%", animation: \`gradient \${animationSpeed}s linear infinite\` }}>
            {children}
        </span>
    );
};`,
    },
    "hero-highlight": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to display", required: true },
            { name: "className", type: "string", description: "Content CSS classes" },
            { name: "containerClassName", type: "string", description: "Container CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import React from "react";

export const HeroHighlight = ({ children, className, containerClassName }: { children: React.ReactNode; className?: string; containerClassName?: string }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent<HTMLDivElement>) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <div className={cn("relative h-[40rem] flex items-center bg-white dark:bg-black justify-center w-full group", containerClassName)} onMouseMove={handleMouseMove}>
            <motion.div className="pointer-events-none bg-dot-thick-indigo-500 absolute inset-0 opacity-0 group-hover:opacity-100" style={{ maskImage: useMotionTemplate\`radial-gradient(200px circle at \${mouseX}px \${mouseY}px, black 0%, transparent 100%)\` }} />
            <div className={cn("relative z-20", className)}>{children}</div>
        </div>
    );
};`,
    },
    "hover-border-gradient": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Button content", required: true },
            { name: "containerClassName", type: "string", description: "Container CSS classes" },
            { name: "className", type: "string", description: "Content CSS classes" },
            { name: "as", type: "ElementType", description: "Element type", default: "button" },
            { name: "duration", type: "number", description: "Animation duration", default: "1" },
            { name: "clockwise", type: "boolean", description: "Rotation direction", default: "true" },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HoverBorderGradient({ children, containerClassName, className, as: Tag = "button", duration = 1, clockwise = true, ...props }: React.PropsWithChildren<{ as?: React.ElementType; containerClassName?: string; className?: string; duration?: number; clockwise?: boolean } & React.HTMLAttributes<HTMLElement>>) {
    const [hovered, setHovered] = React.useState(false);
    const [direction, setDirection] = React.useState<"TOP" | "LEFT" | "BOTTOM" | "RIGHT">("TOP");

    return (
        <Tag onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} className={cn("relative flex rounded-full border content-center bg-black/20 items-center p-px w-fit", containerClassName)} {...props}>
            <div className={cn("w-auto text-white z-10 bg-black px-4 py-2 rounded-[inherit]", className)}>{children}</div>
        </Tag>
    );
}`,
    },
    "images-slider": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "images", type: "string[]", description: "Array of image URLs", required: true },
            { name: "children", type: "ReactNode", description: "Overlay content", required: true },
            { name: "overlay", type: "boolean", description: "Show overlay", default: "true" },
            { name: "autoplay", type: "boolean", description: "Enable autoplay", default: "true" },
            { name: "direction", type: "string", description: "Slide direction", default: "up" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from "react";

export const ImagesSlider = ({ images, children, overlay = true, overlayClassName, className, autoplay = true, direction = "up" }: { images: string[]; children: React.ReactNode; overlay?: boolean; overlayClassName?: string; className?: string; autoplay?: boolean; direction?: "up" | "down" }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (autoplay) { const interval = setInterval(() => setCurrentIndex((prev) => (prev + 1) % images.length), 5000); return () => clearInterval(interval); }
    }, [autoplay, images.length]);

    return (
        <div className={cn("overflow-hidden h-full w-full relative flex items-center justify-center", className)}>
            {children}
            {overlay && <div className={cn("absolute inset-0 bg-black/60 z-40", overlayClassName)} />}
            <AnimatePresence>
                <motion.img key={currentIndex} src={images[currentIndex]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 h-full w-full object-cover" />
            </AnimatePresence>
        </div>
    );
};`,
    },
    "link-preview": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Link content", required: true },
            { name: "url", type: "string", description: "Link URL", required: true },
            { name: "className", type: "string", description: "Link CSS classes" },
            { name: "width", type: "number", description: "Preview width", default: "200" },
            { name: "height", type: "number", description: "Preview height", default: "125" },
            { name: "imageSrc", type: "string", description: "Preview image URL" },
        ],
        sourceCode: `"use client";
import Image from "next/image";
import React from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const LinkPreview = ({ children, url, className, width = 200, height = 125, imageSrc }: { children: React.ReactNode; url: string; className?: string; width?: number; height?: number; imageSrc?: string }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const x = useMotionValue(0);
    const translateX = useSpring(x, { stiffness: 100, damping: 15 });

    return (
        <div className="relative inline-block">
            <Link href={url} onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)} className={cn("text-blue-500 hover:text-blue-600 underline", className)}>{children}</Link>
            <AnimatePresence>
                {isOpen && imageSrc && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"><Image src={imageSrc} width={width} height={height} className="rounded-lg" alt="preview" /></motion.div>}
            </AnimatePresence>
        </div>
    );
};`,
    },
    "layout-grid": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "cards", type: "{ id: number; content: ReactNode; className: string; thumbnail: string }[]", description: "Grid card items", required: true },
        ],
        sourceCode: `"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

export const LayoutGrid = ({ cards }: { cards: { id: number; content: React.ReactNode; className: string; thumbnail: string }[] }) => {
    const [selected, setSelected] = useState<any>(null);

    return (
        <div className="w-full h-full p-10 grid grid-cols-1 md:grid-cols-3 max-w-7xl mx-auto gap-4 relative">
            {cards.map((card, i) => (
                <div key={i} className={cn(card.className)}>
                    <motion.div onClick={() => setSelected(card)} className={cn("relative overflow-hidden bg-white rounded-xl h-full w-full")} layoutId={\`card-\${card.id}\`}>
                        <Image src={card.thumbnail} height="500" width="500" className="object-cover absolute inset-0 h-full w-full" alt="thumbnail" />
                    </motion.div>
                </div>
            ))}
        </div>
    );
};`,
    },
    "lens": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to magnify", required: true },
            { name: "zoomFactor", type: "number", description: "Magnification level", default: "2" },
            { name: "lensSize", type: "number", description: "Lens diameter", default: "150" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const Lens = ({ children, zoomFactor = 2, lensSize = 150, className }: { children: React.ReactNode; zoomFactor?: number; lensSize?: number; className?: string }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <div ref={containerRef} className={cn("relative overflow-hidden cursor-none", className)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} onMouseMove={handleMouseMove}>
            {children}
            {isHovered && <motion.div className="absolute pointer-events-none rounded-full border-2 border-white/50 overflow-hidden" style={{ width: lensSize, height: lensSize, left: position.x - lensSize / 2, top: position.y - lensSize / 2 }} />}
        </div>
    );
};`,
    },
    "macbook-scroll": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "src", type: "string", description: "Screen content image URL" },
            { name: "showGradient", type: "boolean", description: "Show gradient overlay" },
            { name: "title", type: "string | ReactNode", description: "Title content" },
            { name: "badge", type: "ReactNode", description: "Badge content" },
        ],
        sourceCode: `"use client";
import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

export const MacbookScroll = ({ src, showGradient, title, badge }: { src?: string; showGradient?: boolean; title?: string | React.ReactNode; badge?: React.ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
    const scaleX = useTransform(scrollYProgress, [0, 0.3], [1.2, 0.8]);
    const rotate = useTransform(scrollYProgress, [0.1, 0.12, 0.3], [-28, -28, 0]);

    return (
        <div ref={ref} className="min-h-[200vh] flex flex-col items-center py-0 md:py-80 justify-start [perspective:800px]">
            <motion.h2 style={{ opacity: useTransform(scrollYProgress, [0, 0.2], [1, 0]) }} className="dark:text-white text-neutral-800 text-3xl font-bold mb-20">{title}</motion.h2>
            {/* Macbook components */}
        </div>
    );
};`,
    },
    "multi-step-loader": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "loadingStates", type: "{ text: string }[]", description: "Array of loading states", required: true },
            { name: "loading", type: "boolean", description: "Loading state" },
            { name: "duration", type: "number", description: "Duration per step", default: "2000" },
            { name: "loop", type: "boolean", description: "Loop through states", default: "true" },
        ],
        sourceCode: `"use client";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const MultiStepLoader = ({ loadingStates, loading, duration = 2000, loop = true }: { loadingStates: { text: string }[]; loading?: boolean; duration?: number; loop?: boolean }) => {
    const [currentState, setCurrentState] = useState(0);

    useEffect(() => {
        if (!loading) { setCurrentState(0); return; }
        const timeout = setTimeout(() => {
            setCurrentState((prev) => loop ? (prev === loadingStates.length - 1 ? 0 : prev + 1) : Math.min(prev + 1, loadingStates.length - 1));
        }, duration);
        return () => clearTimeout(timeout);
    }, [currentState, loading, loop, loadingStates.length, duration]);

    return (
        <AnimatePresence mode="wait">
            {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-2xl">
                    {/* Loader content */}
                </motion.div>
            )}
        </AnimatePresence>
    );
};`,
    },
    "navbar-menu": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "setActive", type: "(item: string | null) => void", description: "Callback to set active item", required: true },
            { name: "children", type: "ReactNode", description: "Menu items", required: true },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion, Transition } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export const Menu = ({ setActive, children }: { setActive: (item: string | null) => void; children: React.ReactNode }) => {
    return (
        <nav onMouseLeave={() => setActive(null)} className="relative rounded-full border dark:bg-black bg-white shadow-input flex justify-center space-x-4 px-8 py-6">
            {children}
        </nav>
    );
};

export const MenuItem = ({ setActive, active, item, children }: { setActive: (item: string) => void; active: string | null; item: string; children?: React.ReactNode }) => {
    return (
        <div onMouseEnter={() => setActive(item)} className="relative">
            <motion.p className="cursor-pointer text-black dark:text-white">{item}</motion.p>
            {active === item && <div className="absolute top-[calc(100%_+_1.2rem)] left-1/2 -translate-x-1/2">{children}</div>}
        </div>
    );
};`,
    },
    "placeholders-and-vanish-input": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "placeholders", type: "string[]", description: "Array of placeholder texts", required: true },
            { name: "onChange", type: "(e: ChangeEvent) => void", description: "Input change handler", required: true },
            { name: "onSubmit", type: "(e: FormEvent) => void", description: "Form submit handler", required: true },
        ],
        sourceCode: `"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function PlaceholdersAndVanishInput({ placeholders, onChange, onSubmit }: { placeholders: string[]; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
    const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
    const [value, setValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const interval = setInterval(() => setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length), 3000);
        return () => clearInterval(interval);
    }, [placeholders]);

    return (
        <form className={cn("w-full relative max-w-xl mx-auto bg-white dark:bg-zinc-800 h-12 rounded-full overflow-hidden")} onSubmit={onSubmit}>
            <input ref={inputRef} value={value} onChange={(e) => { setValue(e.target.value); onChange(e); }} type="text" className="w-full h-full rounded-full pl-4 pr-20" />
            <AnimatePresence mode="wait">
                {!value && <motion.p key={currentPlaceholder} initial={{ y: 5, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -15, opacity: 0 }} className="absolute left-12 top-1/2 -translate-y-1/2 text-neutral-500">{placeholders[currentPlaceholder]}</motion.p>}
            </AnimatePresence>
        </form>
    );
}`,
    },
    "shooting-stars": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "minSpeed", type: "number", description: "Minimum star speed", default: "10" },
            { name: "maxSpeed", type: "number", description: "Maximum star speed", default: "30" },
            { name: "starColor", type: "string", description: "Star color", default: "#9E00FF" },
            { name: "trailColor", type: "string", description: "Trail color", default: "#2EB9DF" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import React, { useEffect, useState, useRef } from "react";

export const ShootingStars: React.FC<{ minSpeed?: number; maxSpeed?: number; starColor?: string; trailColor?: string; className?: string }> = ({ minSpeed = 10, maxSpeed = 30, starColor = "#9E00FF", trailColor = "#2EB9DF", className }) => {
    const [star, setStar] = useState<{ x: number; y: number; angle: number; scale: number; speed: number } | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const createStar = () => {
            setStar({ x: Math.random() * window.innerWidth, y: 0, angle: 215, scale: 1, speed: Math.random() * (maxSpeed - minSpeed) + minSpeed });
        };
        const interval = setInterval(() => { if (!star) createStar(); }, 16);
        return () => clearInterval(interval);
    }, [star, maxSpeed, minSpeed]);

    return (
        <svg ref={svgRef} className={cn("w-full h-full absolute inset-0", className)}>
            {star && <rect x={star.x} y={star.y} width={10 * star.scale} height={1} fill="url(#gradient)" transform={\`rotate(\${star.angle})\`} />}
            <defs><linearGradient id="gradient"><stop offset="0%" style={{ stopColor: trailColor, stopOpacity: 0 }} /><stop offset="100%" style={{ stopColor: starColor }} /></linearGradient></defs>
        </svg>
    );
};`,
    },
    "svg-mask-effect": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Masked content" },
            { name: "revealText", type: "ReactNode", description: "Text revealed on hover" },
            { name: "size", type: "number", description: "Initial mask size", default: "10" },
            { name: "revealSize", type: "number", description: "Mask size on hover", default: "600" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const MaskContainer = ({ children, revealText, size = 10, revealSize = 600, className }: { children?: React.ReactNode; revealText?: React.ReactNode; size?: number; revealSize?: number; className?: string }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [mousePosition, setMousePosition] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
    const containerRef = useRef<HTMLDivElement>(null);

    const updateMousePosition = (e: MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <motion.div ref={containerRef} className={cn("h-screen relative", className)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <motion.div className="w-full h-full flex items-center justify-center absolute" animate={{ maskSize: \`\${isHovered ? revealSize : size}px\` }}>{children}</motion.div>
            <div className="w-full h-full flex items-center justify-center">{revealText}</div>
        </motion.div>
    );
};`,
    },
    "text-hover-effect": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "text", type: "string", description: "Text to display", required: true },
            { name: "duration", type: "number", description: "Animation duration" },
            { name: "automatic", type: "boolean", description: "Start animation automatically", default: "false" },
        ],
        sourceCode: `"use client";
import React from "react";
import { motion } from "framer-motion";

export const TextHoverEffect = ({ text, duration, automatic = false }: { text: string; duration?: number; automatic?: boolean }) => {
    const svgRef = React.useRef<SVGSVGElement>(null);
    const [cursor, setCursor] = React.useState({ x: 0, y: 0 });
    const [hovered, setHovered] = React.useState(false);
    const [maskPosition, setMaskPosition] = React.useState({ cx: "50%", cy: "50%" });

    React.useEffect(() => {
        if (svgRef.current && cursor.x !== null) {
            const svgRect = svgRef.current.getBoundingClientRect();
            setMaskPosition({ cx: \`\${((cursor.x - svgRect.left) / svgRect.width) * 100}%\`, cy: \`\${((cursor.y - svgRect.top) / svgRect.height) * 100}%\` });
        }
    }, [cursor]);

    return (
        <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 300 100" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })} className="select-none">
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="font-bold text-7xl fill-transparent stroke-neutral-200">{text}</text>
        </svg>
    );
};`,
    },
    "text-reveal-card": {
        dependencies: "npm i clsx tailwind-merge",
        props: [
            { name: "text", type: "string", description: "Main text", required: true },
            { name: "revealText", type: "string", description: "Text revealed on hover", required: true },
            { name: "children", type: "ReactNode", description: "Additional content" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import React from "react";
import { cn } from "@/lib/utils";

export const TextRevealCard = ({ text, revealText, children, className }: { text: string; revealText: string; children?: React.ReactNode; className?: string }) => {
    const [widthPercentage, setWidthPercentage] = React.useState(0);
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [left, setLeft] = React.useState(0);
    const [localWidth, setLocalWidth] = React.useState(0);

    React.useEffect(() => {
        if (cardRef.current) {
            const { left, width } = cardRef.current.getBoundingClientRect();
            setLeft(left);
            setLocalWidth(width);
        }
    }, []);

    const mouseMoveHandler = (e: React.MouseEvent<HTMLDivElement>) => {
        const relativeX = e.clientX - left;
        setWidthPercentage((relativeX / localWidth) * 100);
    };

    return (
        <div ref={cardRef} onMouseMove={mouseMoveHandler} onMouseLeave={() => setWidthPercentage(0)} className={cn("bg-[#1d1c20] border border-white/[0.08] w-[40rem] rounded-lg p-8 relative overflow-hidden", className)}>
            {children}
            <div className="h-40 relative flex items-center overflow-hidden">
                <p className="text-[3rem] font-bold text-white">{text}</p>
                <div style={{ clipPath: \`inset(0 \${100 - widthPercentage}% 0 0)\` }} className="absolute"><p className="text-[3rem] font-bold text-white">{revealText}</p></div>
            </div>
        </div>
    );
};`,
    },
    "wavy-background": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "children", type: "ReactNode", description: "Content to display" },
            { name: "className", type: "string", description: "Content CSS classes" },
            { name: "containerClassName", type: "string", description: "Container CSS classes" },
            { name: "colors", type: "string[]", description: "Wave colors array" },
            { name: "blur", type: "number", description: "Blur amount", default: "10" },
            { name: "speed", type: "string", description: "Animation speed", default: "fast" },
            { name: "waveOpacity", type: "number", description: "Wave opacity", default: "0.5" },
        ],
        sourceCode: `"use client";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import React from "react";

export const WavyBackground = ({ children, className, containerClassName, colors, blur = 10, speed = "fast", waveOpacity = 0.5 }: { children?: React.ReactNode; className?: string; containerClassName?: string; colors?: string[]; blur?: number; speed?: "slow" | "fast"; waveOpacity?: number }) => {
    const waveColors = colors ?? ["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"];
    const getSpeed = () => speed === "slow" ? 10 : 5;

    return (
        <div className={cn("h-screen flex flex-col items-center justify-center", containerClassName)}>
            <svg className="absolute inset-0 z-0" style={{ filter: \`blur(\${blur}px)\` }} viewBox="0 0 1440 600" preserveAspectRatio="none">
                {waveColors.map((color, i) => (
                    <motion.path key={i} d={\`M0,\${100 + i * 50} C360,\${150 + i * 30} 720,\${50 + i * 20} 1440,\${100 + i * 40} V600 H0 Z\`} fill={color} fillOpacity={waveOpacity} animate={{ y: [0, -20, 0] }} transition={{ duration: getSpeed() + i, repeat: Infinity, ease: "easeInOut" }} />
                ))}
            </svg>
            <div className={cn("relative z-10", className)}>{children}</div>
        </div>
    );
};`,
    },
    "world-map": {
        dependencies: "npm i framer-motion clsx tailwind-merge",
        props: [
            { name: "dots", type: "{ start: { lat: number; lng: number }; end: { lat: number; lng: number } }[]", description: "Connection points" },
            { name: "lineColor", type: "string", description: "Connection line color", default: "#0ea5e9" },
            { name: "className", type: "string", description: "Additional CSS classes" },
        ],
        sourceCode: `"use client";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const WorldMap = ({ dots = [], lineColor = "#0ea5e9", className }: { dots?: { start: { lat: number; lng: number }; end: { lat: number; lng: number } }[]; lineColor?: string; className?: string }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

    const projectPoint = (lat: number, lng: number) => {
        const x = ((lng + 180) * (dimensions.width / 360));
        const y = dimensions.height / 2 - (dimensions.width * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2))) / (2 * Math.PI);
        return { x, y };
    };

    return (
        <div className={cn("w-full aspect-[2/1] relative", className)}>
            <svg ref={svgRef} viewBox="0 0 800 400" className="w-full h-full bg-neutral-950">
                {dots.map((connection, idx) => {
                    const start = projectPoint(connection.start.lat, connection.start.lng);
                    const end = projectPoint(connection.end.lat, connection.end.lng);
                    return <motion.path key={idx} d={\`M \${start.x} \${start.y} Q \${(start.x + end.x) / 2} \${Math.min(start.y, end.y) - 50} \${end.x} \${end.y}\`} fill="none" stroke={lineColor} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, delay: idx * 0.2 }} />;
                })}
            </svg>
        </div>
    );
};`,
    },
};

// Installation Section Component with CLI/Manual tabs
function InstallationSection({
    componentId,
    aceternityUrl,
    meta
}: {
    componentId: string;
    aceternityUrl?: string;
    meta?: ComponentMeta;
}) {
    const [activeTab, setActiveTab] = useState<'cli' | 'manual'>('cli');
    const [cssTab, setCssTab] = useState<'v4' | 'v3'>('v4');
    const [showFullCode, setShowFullCode] = useState(false);

    const dependencies = meta?.dependencies || "npm i framer-motion clsx tailwind-merge";

    return (
        <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                Installation
            </h3>

            {/* CLI / Manual Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setActiveTab('cli')}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === 'cli'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                >
                    CLI
                </button>
                <button
                    onClick={() => setActiveTab('manual')}
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${activeTab === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                        }`}
                >
                    Manual
                </button>
            </div>

            {/* CLI Content */}
            {activeTab === 'cli' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <pre className="overflow-x-auto">
                        <code className="text-sm text-green-400">npx aceternity-ui@latest add {aceternityUrl || componentId}</code>
                    </pre>
                </div>
            )}

            {/* Manual Content */}
            {activeTab === 'manual' && (
                <div className="space-y-4">
                    {/* Step 1: Install dependencies */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                        <p className="text-sm text-neutral-400 mb-2">Install dependencies</p>
                        <pre className="overflow-x-auto">
                            <code className="text-sm text-orange-400">{dependencies}</code>
                        </pre>
                    </div>

                    {/* Step 2: Add util file */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                        <p className="text-sm text-neutral-400 mb-2">Add util file</p>
                        <p className="text-xs text-neutral-500 mb-2">lib/utils.ts</p>
                        <pre className="overflow-x-auto text-sm text-neutral-300">
                            {`import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}`}
                        </pre>
                    </div>

                    {/* Step 3: Add CSS animation (if applicable) */}
                    {(meta?.cssV4 || meta?.cssV3) && (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                            <p className="text-sm text-neutral-400 mb-2">Add the animation to your CSS</p>

                            {/* Tailwind v4 / v3 tabs */}
                            <div className="flex gap-2 mb-3">
                                <button
                                    onClick={() => setCssTab('v4')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${cssTab === 'v4'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                        }`}
                                >
                                    Tailwind CSS v4
                                </button>
                                <button
                                    onClick={() => setCssTab('v3')}
                                    className={`px-3 py-1 text-xs rounded transition-colors ${cssTab === 'v3'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                        }`}
                                >
                                    Tailwind CSS v3
                                </button>
                            </div>

                            <pre className="overflow-x-auto text-sm text-neutral-300 max-h-48 overflow-y-auto">
                                {cssTab === 'v4' ? meta?.cssV4 : meta?.cssV3}
                            </pre>
                        </div>
                    )}

                    {/* Step 4: Copy source code */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-neutral-400">Copy the source code</p>
                            <button
                                onClick={() => setShowFullCode(!showFullCode)}
                                className="px-3 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 transition-colors"
                            >
                                {showFullCode ? "Collapse" : "Expand"}
                            </button>
                        </div>
                        <p className="text-xs text-neutral-500 mb-2">components/ui/{componentId}.tsx</p>
                        <div className={`overflow-hidden transition-all duration-300 ${showFullCode ? 'max-h-[600px] overflow-y-auto' : 'max-h-24'}`}>
                            <pre className="overflow-x-auto text-sm text-neutral-300">
                                <code>{meta?.sourceCode || `"use client";
import { cn } from "@/lib/utils";

// Full source code available on Aceternity UI website
// https://ui.aceternity.com/components/${componentId}`}</code>
                            </pre>
                        </div>
                        {!showFullCode && (
                            <div className="text-center py-2 border-t border-neutral-800 mt-2">
                                <span className="text-xs text-neutral-500">Click Expand to see full source code...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Component Demo Definitions
interface ComponentDemo {
    id: string;
    name: string;
    description: string;
    usage: string;
    demo: React.ReactNode;
}

const componentDemos: Record<string, ComponentDemo> = {
    "sparkles": {
        id: "sparkles",
        name: "Sparkles",
        description: "A configurable sparkles component that can be used as a background or as a standalone component. Creates beautiful floating particle effects.",
        usage: `import { SparklesCore } from "@/components/ui/sparkles";

<SparklesCore
  background="transparent"
  minSize={0.4}
  maxSize={1}
  particleDensity={1200}
  className="w-full h-full"
  particleColor="#FFFFFF"
/>`,
        demo: (
            <div className="h-40 w-full bg-black flex flex-col items-center justify-center overflow-hidden rounded-md relative">
                <h1 className="md:text-2xl text-xl font-bold text-center text-white relative z-20">
                    Sparkles Effect
                </h1>
                <div className="w-full h-20 relative">
                    <SparklesCore
                        background="transparent"
                        minSize={0.4}
                        maxSize={1}
                        particleDensity={1200}
                        className="w-full h-full"
                        particleColor="#FFFFFF"
                    />
                </div>
            </div>
        ),
    },
    "background-beams": {
        id: "background-beams",
        name: "Background Beams",
        description: "Creates animated beam effects that move across the background. Great for hero sections and CTAs.",
        usage: `import { BackgroundBeams } from "@/components/ui/background-beams";

<div className="relative">
  <BackgroundBeams />
  {/* Your content */}
</div>`,
        demo: (
            <div className="h-40 w-full rounded-md bg-neutral-950 relative flex flex-col items-center justify-center antialiased overflow-hidden">
                <div className="max-w-2xl mx-auto p-4 relative z-10">
                    <h1 className="text-lg md:text-xl text-center font-sans font-bold text-white">
                        Background Beams
                    </h1>
                    <p className="text-neutral-500 max-w-lg mx-auto text-sm text-center">
                        Animated beams in the background
                    </p>
                </div>
                <BackgroundBeams />
            </div>
        ),
    },
    "meteors": {
        id: "meteors",
        name: "Meteors",
        description: "A group of animated meteors that fall across the container. Perfect for adding dynamic visual interest to cards and sections.",
        usage: `import { Meteors } from "@/components/ui/meteors";

<div className="relative">
  <Meteors number={20} />
</div>`,
        demo: (
            <div className="w-full relative h-40">
                <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-500 to-teal-500 transform scale-[0.80] bg-red-500 rounded-full blur-3xl" />
                <div className="relative shadow-xl bg-gray-900 border border-gray-800 px-4 py-8 h-full overflow-hidden rounded-2xl flex flex-col justify-end items-start">
                    <h1 className="font-bold text-xl text-white mb-4 relative z-50">
                        Meteors Effect
                    </h1>
                    <p className="font-normal text-base text-slate-500 mb-4 relative z-50">
                        Watch the meteors fall!
                    </p>
                    <Meteors number={20} />
                </div>
            </div>
        ),
    },
    "text-generate-effect": {
        id: "text-generate-effect",
        name: "Text Generate Effect",
        description: "A cool text effect that fades in text on page load, one word at a time. Perfect for headlines and hero sections.",
        usage: `import { TextGenerateEffect } from "@/components/ui/text-generate-effect";

<TextGenerateEffect words="Your text here" />`,
        demo: (
            <div className="h-40 flex items-center justify-center bg-black rounded-md">
                <TextGenerateEffect words="This text generates word by word with a beautiful fade effect" />
            </div>
        ),
    },
    "flip-words": {
        id: "flip-words",
        name: "Flip Words",
        description: "Animated text that flips through different words. Great for showcasing multiple features or values.",
        usage: `import { FlipWords } from "@/components/ui/flip-words";

<FlipWords words={["word1", "word2", "word3"]} />`,
        demo: (
            <div className="h-40 flex justify-center items-center px-4 bg-black rounded-md">
                <div className="text-xl mx-auto font-normal text-neutral-400">
                    Build
                    <FlipWords words={["better", "faster", "smarter", "beautiful"]} />
                    websites with Aceternity UI
                </div>
            </div>
        ),
    },
    "3d-card": {
        id: "3d-card",
        name: "3D Card Effect",
        description: "Interactive 3D card that responds to mouse movement with tilt and perspective effects.",
        usage: `import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";

<CardContainer>
  <CardBody>
    <CardItem translateZ="50">Content</CardItem>
  </CardBody>
</CardContainer>`,
        demo: (
            <div className="flex items-center justify-center bg-black rounded-md py-4">
                <CardContainer className="inter-var">
                    <CardBody className="bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[20rem] h-auto rounded-xl p-4 border">
                        <CardItem translateZ="50" className="text-lg font-bold text-neutral-600 dark:text-white">
                            3D Card Effect
                        </CardItem>
                        <CardItem as="p" translateZ="60" className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300">
                            Hover over this card to see the 3D effect
                        </CardItem>
                    </CardBody>
                </CardContainer>
            </div>
        ),
    },
    "card-hover-effect": {
        id: "card-hover-effect",
        name: "Card Hover Effect",
        description: "Hover over the cards and a spotlight effect slides to the currently hovered card.",
        usage: `import { HoverEffect } from "@/components/ui/card-hover-effect";

<HoverEffect items={[
  { title: "Title", description: "Description", link: "/link" }
]} />`,
        demo: (
            <div className="max-w-5xl mx-auto px-4">
                <HoverEffect items={[
                    { title: "Card 1", description: "Description for card 1", link: "#" },
                    { title: "Card 2", description: "Description for card 2", link: "#" },
                    { title: "Card 3", description: "Description for card 3", link: "#" },
                ]} />
            </div>
        ),
    },
    "wobble-card": {
        id: "wobble-card",
        name: "Wobble Card",
        description: "A card effect that translates and scales on mousemove, perfect for feature cards.",
        usage: `import { WobbleCard } from "@/components/ui/wobble-card";

<WobbleCard>
  <h2>Title</h2>
  <p>Content</p>
</WobbleCard>`,
        demo: (
            <div className="grid grid-cols-1 gap-4 max-w-xl mx-auto w-full">
                <WobbleCard containerClassName="col-span-1 min-h-[200px]">
                    <h2 className="text-left text-balance text-base md:text-xl lg:text-2xl font-semibold tracking-[-0.015em] text-white">
                        Wobble Card Effect
                    </h2>
                    <p className="mt-4 text-left text-base/6 text-neutral-200">
                        Move your mouse over this card to see the wobble effect
                    </p>
                </WobbleCard>
            </div>
        ),
    },
    "glare-card": {
        id: "glare-card",
        name: "Glare Card",
        description: "A card with a beautiful glare effect that follows mouse movement.",
        usage: `import { GlareCard } from "@/components/ui/glare-card";

<GlareCard>
  <p>Card content</p>
</GlareCard>`,
        demo: (
            <div className="flex items-center justify-center py-4">
                <GlareCard className="flex flex-col items-center justify-center p-6">
                    <p className="text-white font-bold text-xl">Glare Card</p>
                    <p className="text-neutral-400 text-sm mt-2">Hover to see the glare effect</p>
                </GlareCard>
            </div>
        ),
    },
    "moving-border": {
        id: "moving-border",
        name: "Moving Border",
        description: "A border that moves around the container. Perfect for making your buttons stand out.",
        usage: `import { Button } from "@/components/ui/moving-border";

<Button borderRadius="1.75rem">
  Button Text
</Button>`,
        demo: (
            <div className="flex items-center justify-center gap-4 py-8 bg-slate-950 rounded-md">
                <MovingBorderButton
                    borderRadius="1.75rem"
                    className="bg-white dark:bg-slate-900 text-black dark:text-white border-neutral-200 dark:border-slate-800"
                >
                    Moving Border Button
                </MovingBorderButton>
            </div>
        ),
    },
    "tabs": {
        id: "tabs",
        name: "Animated Tabs",
        description: "Tabs to switch content, with a sliding background animation.",
        usage: `import { Tabs, Tab } from "@/components/ui/tabs";

<Tabs tabs={[
  { title: "Tab 1", value: "tab1", content: <div>Content 1</div> }
]} />`,
        demo: (
            <div className="h-48 [perspective:1000px] relative flex flex-col max-w-2xl mx-auto w-full items-start justify-start">
                <Tabs tabs={[
                    { title: "Product", value: "product", content: <div className="p-4 text-white bg-gradient-to-br from-purple-700 to-violet-900 rounded-xl">Product Content</div> },
                    { title: "Services", value: "services", content: <div className="p-4 text-white bg-gradient-to-br from-purple-700 to-violet-900 rounded-xl">Services Content</div> },
                    { title: "Playground", value: "playground", content: <div className="p-4 text-white bg-gradient-to-br from-purple-700 to-violet-900 rounded-xl">Playground Content</div> },
                ]} />
            </div>
        ),
    },
    "infinite-moving-cards": {
        id: "infinite-moving-cards",
        name: "Infinite Moving Cards",
        description: "A customizable group of cards that move infinitely in a loop.",
        usage: `import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";

<InfiniteMovingCards
  items={testimonials}
  direction="right"
  speed="slow"
/>`,
        demo: (
            <div className="h-40 rounded-md flex flex-col antialiased bg-neutral-950 items-center justify-center relative overflow-hidden">
                <InfiniteMovingCards
                    items={[
                        { quote: "Amazing component!", name: "John Doe", title: "Developer" },
                        { quote: "Love this library!", name: "Jane Smith", title: "Designer" },
                        { quote: "So easy to use!", name: "Bob Wilson", title: "Engineer" },
                    ]}
                    direction="right"
                    speed="slow"
                />
            </div>
        ),
    },
    "animated-tooltip": {
        id: "animated-tooltip",
        name: "Animated Tooltip",
        description: "Hover over avatars to see animated tooltip with user info.",
        usage: `import { AnimatedTooltip } from "@/components/ui/animated-tooltip";

<AnimatedTooltip items={people} />`,
        demo: (
            <div className="flex flex-row items-center justify-center w-full py-8 bg-black rounded-md">
                <AnimatedTooltip
                    items={[
                        { id: 1, name: "John Doe", designation: "Developer", image: "https://images.unsplash.com/photo-1599566150163-29194dcabd3c?w=100" },
                        { id: 2, name: "Jane Smith", designation: "Designer", image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" },
                        { id: 3, name: "Bob Wilson", designation: "Manager", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100" },
                    ]}
                />
            </div>
        ),
    },
    "lamp": {
        id: "lamp",
        name: "Lamp Effect",
        description: "A lamp effect as seen on linear, great for section headers.",
        usage: `import { LampContainer } from "@/components/ui/lamp";

<LampContainer>
  <h1>Your Title</h1>
</LampContainer>`,
        demo: (
            <div className="h-64 overflow-hidden rounded-md">
                <LampContainer>
                    <h1 className="text-2xl font-bold text-white text-center">
                        Lamp Effect
                    </h1>
                </LampContainer>
            </div>
        ),
    },
    "spotlight": {
        id: "spotlight",
        name: "Spotlight",
        description: "A spotlight effect with Tailwind CSS, good for drawing attention to a particular element.",
        usage: `import { Spotlight } from "@/components/ui/spotlight";

<Spotlight className="-top-40 left-0" fill="white" />`,
        demo: (
            <div className="h-40 w-full rounded-md flex items-center justify-center bg-black/[0.96] antialiased bg-grid-white/[0.02] relative overflow-hidden">
                <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
                <div className="p-4 max-w-7xl mx-auto relative z-10 w-full text-center">
                    <h1 className="text-2xl font-bold text-white">
                        Spotlight Effect
                    </h1>
                    <p className="mt-2 text-neutral-300 text-sm">
                        A spotlight illuminates this area
                    </p>
                </div>
            </div>
        ),
    },
    "glowing-stars": {
        id: "glowing-stars",
        name: "Glowing Stars",
        description: "A card with glowing stars background animation.",
        usage: `import { GlowingStarsBackgroundCard } from "@/components/ui/glowing-stars";

<GlowingStarsBackgroundCard>
  <GlowingStarsTitle>Title</GlowingStarsTitle>
  <GlowingStarsDescription>Description</GlowingStarsDescription>
</GlowingStarsBackgroundCard>`,
        demo: (
            <div className="flex py-4 items-center justify-center antialiased">
                <GlowingStarsBackgroundCard>
                    <GlowingStarsTitle>Glowing Stars</GlowingStarsTitle>
                    <div className="flex justify-between items-end">
                        <GlowingStarsDescription>
                            Hover to see the effect
                        </GlowingStarsDescription>
                    </div>
                </GlowingStarsBackgroundCard>
            </div>
        ),
    },
    "tracing-beam": {
        id: "tracing-beam",
        name: "Tracing Beam",
        description: "A beam that follows an SVG path as you scroll through the content.",
        usage: `import { TracingBeam } from "@/components/ui/tracing-beam";

<TracingBeam>
  <div>Your scrollable content</div>
</TracingBeam>`,
        demo: (
            <div className="h-48 overflow-auto bg-neutral-950 rounded-md">
                <TracingBeam className="px-6">
                    <div className="max-w-2xl mx-auto antialiased pt-4 relative">
                        <div className="mb-10">
                            <h2 className="bg-black text-white rounded-full text-sm w-fit px-4 py-1 mb-4">
                                Step 1
                            </h2>
                            <p className="text-sm text-neutral-400">
                                This is the first step with the tracing beam following along as you scroll.
                            </p>
                        </div>
                        <div className="mb-10">
                            <h2 className="bg-black text-white rounded-full text-sm w-fit px-4 py-1 mb-4">
                                Step 2
                            </h2>
                            <p className="text-sm text-neutral-400">
                                Continue scrolling to see the beam trace through the content.
                            </p>
                        </div>
                    </div>
                </TracingBeam>
            </div>
        ),
    },
    "grid-background": {
        id: "grid-background",
        name: "Grid Background",
        description: "Simple grid and dot background patterns with a radial fade effect.",
        usage: `import { GridBackground, DotBackground } from "@/components/ui/grid-background";

<GridBackground>
  <p>Content on grid</p>
</GridBackground>`,
        demo: (
            <div className="h-40 w-full rounded-md overflow-hidden">
                <div className="h-full w-full dark:bg-black bg-white dark:bg-grid-white/[0.2] bg-grid-black/[0.2] relative flex items-center justify-center">
                    <div className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-black bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
                    <p className="text-2xl sm:text-4xl font-bold relative z-20 bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-500">
                        Grid Background
                    </p>
                </div>
            </div>
        ),
    },
    "timeline": {
        id: "timeline",
        name: "Timeline",
        description: "A timeline component with sticky header and scroll beam follow.",
        usage: `import { Timeline } from "@/components/ui/timeline";

<Timeline data={[
  { title: "2024", content: <p>Content</p> }
]} />`,
        demo: (
            <div className="h-48 overflow-auto bg-neutral-950 rounded-md">
                <Timeline data={[
                    { title: "2024", content: <p className="text-neutral-400 text-sm">Latest updates and features</p> },
                    { title: "2023", content: <p className="text-neutral-400 text-sm">Major milestones achieved</p> },
                ]} />
            </div>
        ),
    },
    "compare": {
        id: "compare",
        name: "Compare",
        description: "A before/after image comparison slider.",
        usage: `import { Compare } from "@/components/ui/compare";

<Compare
  firstImage="/before.jpg"
  secondImage="/after.jpg"
/>`,
        demo: (
            <div className="flex items-center justify-center py-4 bg-neutral-950 rounded-md">
                <Compare
                    firstImage="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"
                    secondImage="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&sat=-100"
                    className="h-32 w-48"
                />
            </div>
        ),
    },
    "wavy-background": {
        id: "wavy-background",
        name: "Wavy Background",
        description: "A beautiful animated wavy background with customizable colors and speed.",
        usage: `import { WavyBackground } from "@/components/ui/wavy-background";

<WavyBackground>
  <h1>Your Content</h1>
</WavyBackground>`,
        demo: (
            <div className="h-40 w-full rounded-md overflow-hidden">
                <WavyBackground className="max-w-4xl mx-auto pb-40">
                    <p className="text-xl text-white font-bold text-center">
                        Wavy Background
                    </p>
                    <p className="text-sm text-neutral-200 text-center mt-2">
                        Beautiful animated waves
                    </p>
                </WavyBackground>
            </div>
        ),
    },
    "world-map": {
        id: "world-map",
        name: "World Map",
        description: "An animated world map with connection lines between locations.",
        usage: `import { WorldMap } from "@/components/ui/world-map";

<WorldMap dots={connections} lineColor="#0ea5e9" />`,
        demo: (
            <div className="h-48 w-full rounded-md overflow-hidden bg-neutral-950">
                <WorldMap
                    dots={[
                        { start: { lat: 40.7128, lng: -74.006 }, end: { lat: 51.5074, lng: -0.1278 } },
                        { start: { lat: 51.5074, lng: -0.1278 }, end: { lat: 35.6762, lng: 139.6503 } },
                    ]}
                    lineColor="#0ea5e9"
                />
            </div>
        ),
    },
    "aurora-background": {
        id: "aurora-background",
        name: "Aurora Background",
        description: "A mesmerizing aurora borealis effect background.",
        usage: `import { AuroraBackground } from "@/components/ui/aurora-background";

<AuroraBackground>
  <h1>Your Content</h1>
</AuroraBackground>`,
        demo: (
            <div className="h-40 w-full rounded-md overflow-hidden">
                <AuroraBackground className="h-full">
                    <div className="text-center">
                        <p className="text-xl text-white font-bold">Aurora Effect</p>
                        <p className="text-sm text-neutral-300 mt-2">Beautiful northern lights</p>
                    </div>
                </AuroraBackground>
            </div>
        ),
    },
    "shooting-stars": {
        id: "shooting-stars",
        name: "Shooting Stars",
        description: "Animated shooting stars with customizable colors and speeds.",
        usage: `import { ShootingStars, StarsBackground } from "@/components/ui/shooting-stars";

<div className="relative">
  <StarsBackground />
  <ShootingStars />
</div>`,
        demo: (
            <div className="h-40 w-full rounded-md overflow-hidden bg-neutral-950 relative">
                <StarsBackground />
                <ShootingStars />
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <p className="text-white font-bold">Shooting Stars</p>
                </div>
            </div>
        ),
    },
    "text-hover-effect": {
        id: "text-hover-effect",
        name: "Text Hover Effect",
        description: "SVG text that reveals gradient colors on mouse hover.",
        usage: `import { TextHoverEffect } from "@/components/ui/text-hover-effect";

<TextHoverEffect text="HOVER" />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-black rounded-md">
                <TextHoverEffect text="HOVER" />
            </div>
        ),
    },
    "text-reveal-card": {
        id: "text-reveal-card",
        name: "Text Reveal Card",
        description: "A card that reveals hidden text on mouse hover.",
        usage: `import { TextRevealCard } from "@/components/ui/text-reveal-card";

<TextRevealCard text="Hidden" revealText="Revealed!" />`,
        demo: (
            <div className="flex items-center justify-center py-4">
                <TextRevealCard
                    text="Hover to reveal"
                    revealText="Secret message!"
                    className="max-w-[300px]"
                >
                    <TextRevealCardTitle>Text Reveal</TextRevealCardTitle>
                    <TextRevealCardDescription>Move your mouse</TextRevealCardDescription>
                </TextRevealCard>
            </div>
        ),
    },
    "gradient-text": {
        id: "gradient-text",
        name: "Gradient Text",
        description: "Text with beautiful animated gradient effects.",
        usage: `import { GradientText } from "@/components/ui/gradient-text";

<GradientText>Your Text</GradientText>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-black rounded-md">
                <AnimatedGradientText className="text-4xl font-bold">
                    Gradient Text
                </AnimatedGradientText>
            </div>
        ),
    },
    "encrypted-text": {
        id: "encrypted-text",
        name: "Encrypted Text",
        description: "Text that scrambles and reveals with an encryption effect.",
        usage: `import { EncryptedText } from "@/components/ui/encrypted-text";

<EncryptedText text="Secret" />`,
        demo: (
            <div className="h-32 flex flex-col items-center justify-center bg-black rounded-md gap-4">
                <AutoEncryptedText
                    text="ENCRYPTED"
                    className="text-2xl font-bold text-white"
                />
                <p className="text-neutral-400 text-sm">Watch the text decrypt</p>
            </div>
        ),
    },
    "hero-highlight": {
        id: "hero-highlight",
        name: "Hero Highlight",
        description: "A spotlight effect that follows mouse movement.",
        usage: `import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";

<HeroHighlight>
  <h1>Text with <Highlight>highlighted</Highlight> words</h1>
</HeroHighlight>`,
        demo: (
            <div className="h-40 w-full rounded-md overflow-hidden">
                <HeroHighlight>
                    <h1 className="text-xl font-bold text-neutral-200 text-center">
                        Move cursor to see <Highlight>highlight effect</Highlight>
                    </h1>
                </HeroHighlight>
            </div>
        ),
    },
    "bento-grid": {
        id: "bento-grid",
        name: "Bento Grid",
        description: "A responsive grid layout for showcasing features.",
        usage: `import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";

<BentoGrid>
  <BentoGridItem title="Title" description="Description" />
</BentoGrid>`,
        demo: (
            <div className="py-4">
                <BentoGrid className="max-w-4xl mx-auto">
                    <BentoGridItem
                        title="Feature One"
                        description="Description of the first feature"
                        className="md:col-span-2"
                    />
                    <BentoGridItem
                        title="Feature Two"
                        description="Another great feature"
                    />
                </BentoGrid>
            </div>
        ),
    },
    "hover-border-gradient": {
        id: "hover-border-gradient",
        name: "Hover Border Gradient",
        description: "A button with animated gradient border on hover.",
        usage: `import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

<HoverBorderGradient>Button</HoverBorderGradient>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-black rounded-md">
                <HoverBorderGradient
                    containerClassName="rounded-full"
                    className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2"
                >
                    <span>Hover Me</span>
                </HoverBorderGradient>
            </div>
        ),
    },
    "container-text-flip": {
        id: "container-text-flip",
        name: "Container Text Flip",
        description: "Text that flips through different words with smooth animations.",
        usage: `import { ContainerTextFlip } from "@/components/ui/container-text-flip";

<ContainerTextFlip words={["word1", "word2"]} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-black rounded-md">
                <div className="text-xl text-white">
                    Build <ContainerTextFlip words={["amazing", "beautiful", "modern"]} /> apps
                </div>
            </div>
        ),
    },
    "background-beams-with-collision": {
        id: "background-beams-with-collision",
        name: "Background Beams With Collision",
        description: "Animated beams that collide and create particle effects.",
        usage: `import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";

<BackgroundBeamsWithCollision>
  <h1>Your Content</h1>
</BackgroundBeamsWithCollision>`,
        demo: (
            <div className="h-40 w-full rounded-md overflow-hidden relative bg-neutral-950">
                <BackgroundBeamsWithCollision className="absolute inset-0" />
                <h2 className="text-xl font-bold text-center text-white relative z-20 pt-12">
                    Beams with Collision
                </h2>
            </div>
        ),
    },
    "background-boxes": {
        id: "background-boxes",
        name: "Background Boxes",
        description: "Interactive 3D boxes that light up on hover.",
        usage: `import { BackgroundBoxes } from "@/components/ui/background-boxes";

<div className="relative overflow-hidden">
  <BackgroundBoxes />
  <h1>Your Content</h1>
</div>`,
        demo: (
            <div className="h-48 relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center rounded-md">
                <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
                <BackgroundBoxes />
                <p className="text-xl font-bold text-white relative z-20">
                    Hover over boxes
                </p>
            </div>
        ),
    },
    "background-gradient": {
        id: "background-gradient",
        name: "Background Gradient",
        description: "A beautiful animated gradient background for cards.",
        usage: `import { BackgroundGradient } from "@/components/ui/background-gradient";

<BackgroundGradient className="p-4">
  <div>Card content</div>
</BackgroundGradient>`,
        demo: (
            <div className="flex items-center justify-center py-4 bg-neutral-950 rounded-md">
                <BackgroundGradient className="rounded-[22px] max-w-sm p-4 sm:p-10 bg-white dark:bg-zinc-900">
                    <p className="text-base sm:text-xl text-black dark:text-neutral-200">
                        Gradient Card
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Beautiful animated gradient border
                    </p>
                </BackgroundGradient>
            </div>
        ),
    },
    "background-gradient-animation": {
        id: "background-gradient-animation",
        name: "Background Gradient Animation",
        description: "Mesmerizing animated gradient background.",
        usage: `import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

<BackgroundGradientAnimation>
  <h1>Your Content</h1>
</BackgroundGradientAnimation>`,
        demo: (
            <div className="h-40 w-full rounded-md overflow-hidden">
                <BackgroundGradientAnimation>
                    <div className="absolute z-50 inset-0 flex items-center justify-center text-white font-bold px-4 text-center">
                        <p className="text-xl">Gradient Animation</p>
                    </div>
                </BackgroundGradientAnimation>
            </div>
        ),
    },
    "background-lines": {
        id: "background-lines",
        name: "Background Lines",
        description: "Animated lines moving across the background.",
        usage: `import { BackgroundLines } from "@/components/ui/background-lines";

<BackgroundLines>
  <h1>Your Content</h1>
</BackgroundLines>`,
        demo: (
            <div className="h-40 w-full rounded-md overflow-hidden">
                <BackgroundLines className="flex items-center justify-center w-full flex-col px-4">
                    <h2 className="text-xl font-bold text-center text-white relative z-20">
                        Background Lines
                    </h2>
                    <p className="text-neutral-400 text-sm">Animated lines effect</p>
                </BackgroundLines>
            </div>
        ),
    },
    "typewriter-effect": {
        id: "typewriter-effect",
        name: "Typewriter Effect",
        description: "Text that types out character by character.",
        usage: `import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";

<TypewriterEffectSmooth words={words} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-black rounded-md">
                <TypewriterEffectSmooth
                    words={[
                        { text: "Build" },
                        { text: "awesome" },
                        { text: "apps", className: "text-blue-500" },
                    ]}
                />
            </div>
        ),
    },
    "card-spotlight": {
        id: "card-spotlight",
        name: "Card Spotlight",
        description: "A card with a spotlight effect that follows mouse movement.",
        usage: `import { CardSpotlight } from "@/components/ui/card-spotlight";

<CardSpotlight>
  <div>Card content</div>
</CardSpotlight>`,
        demo: (
            <div className="flex items-center justify-center py-4 bg-neutral-950 rounded-md">
                <CardSpotlight className="h-48 w-60">
                    <p className="text-xl font-bold relative z-20 mt-2 text-white">
                        Spotlight Card
                    </p>
                    <p className="text-neutral-300 mt-4 text-sm">
                        Hover to see spotlight
                    </p>
                </CardSpotlight>
            </div>
        ),
    },
    "evervault-card": {
        id: "evervault-card",
        name: "Evervault Card",
        description: "A card with an encrypted animation effect on hover.",
        usage: `import { EvervaultCard } from "@/components/ui/evervault-card";

<EvervaultCard text="Encrypted" />`,
        demo: (
            <div className="flex items-center justify-center py-4 bg-black rounded-md">
                <div className="border border-white/[0.2] flex flex-col items-start max-w-sm p-4 relative h-[20rem] w-[20rem]">
                    <EvervaultCard text="Evervault" />
                </div>
            </div>
        ),
    },
    "direction-aware-hover": {
        id: "direction-aware-hover",
        name: "Direction Aware Hover",
        description: "An image that reveals content from the direction of hover.",
        usage: `import { DirectionAwareHover } from "@/components/ui/direction-aware-hover";

<DirectionAwareHover imageUrl="/image.jpg">
  <p>Content revealed on hover</p>
</DirectionAwareHover>`,
        demo: (
            <div className="h-48 flex items-center justify-center bg-black rounded-md">
                <DirectionAwareHover imageUrl="https://images.unsplash.com/photo-1663765970236-f2acef89654e?auto=format&fit=crop&w=400&q=80">
                    <p className="font-bold text-xl">Direction Aware</p>
                    <p className="font-normal text-sm">Hover to reveal</p>
                </DirectionAwareHover>
            </div>
        ),
    },
    "floating-navbar": {
        id: "floating-navbar",
        name: "Floating Navbar",
        description: "A navbar that appears/disappears based on scroll direction.",
        usage: `import { FloatingNav } from "@/components/ui/floating-navbar";

<FloatingNav navItems={items} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md relative">
                <p className="text-neutral-400 text-sm">Floating navbar appears on scroll</p>
            </div>
        ),
    },
    "card-stack": {
        id: "card-stack",
        name: "Card Stack",
        description: "Stack of cards that cycle through on hover or automatically.",
        usage: `import { CardStack } from "@/components/ui/card-stack";

<CardStack items={cards} />`,
        demo: (
            <div className="h-48 flex items-center justify-center bg-neutral-950 rounded-md">
                <CardStack
                    items={[
                        { id: 1, name: "Alice", designation: "Developer", content: "Great experience!" },
                        { id: 2, name: "Bob", designation: "Designer", content: "Amazing product!" },
                        { id: 3, name: "Charlie", designation: "Manager", content: "Highly recommend!" },
                    ]}
                />
            </div>
        ),
    },
    "images-slider": {
        id: "images-slider",
        name: "Images Slider",
        description: "Full-screen image slider with smooth transitions.",
        usage: `import { ImagesSlider } from "@/components/ui/images-slider";

<ImagesSlider images={images}>
  <div>Overlay content</div>
</ImagesSlider>`,
        demo: (
            <div className="h-48 w-full rounded-md overflow-hidden">
                <ImagesSlider
                    className="h-full"
                    images={[
                        "https://images.unsplash.com/photo-1485433592409-9018e83a1f0d?w=800",
                        "https://images.unsplash.com/photo-1483982258113-b72862e6cff6?w=800",
                    ]}
                >
                    <div className="z-50 flex flex-col justify-center items-center">
                        <p className="font-bold text-xl text-white">Image Slider</p>
                    </div>
                </ImagesSlider>
            </div>
        ),
    },
    "link-preview": {
        id: "link-preview",
        name: "Link Preview",
        description: "Links that show a preview image on hover.",
        usage: `import { LinkPreview } from "@/components/ui/link-preview";

<LinkPreview url="https://example.com" imageSrc="/preview.jpg">
  Hover me
</LinkPreview>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400">
                    Check out{" "}
                    <LinkPreview
                        url="https://ui.aceternity.com"
                        imageSrc="https://aceternity.com/images/products/thumbnails/new/aceternity.png"
                        className="font-bold text-blue-500"
                    >
                        Aceternity UI
                    </LinkPreview>{" "}
                    for more components
                </p>
            </div>
        ),
    },
    "file-upload": {
        id: "file-upload",
        name: "File Upload",
        description: "Drag and drop file upload with visual feedback.",
        usage: `import { FileUpload } from "@/components/ui/file-upload";

<FileUpload onChange={handleFiles} />`,
        demo: (
            <div className="w-full max-w-md mx-auto bg-neutral-950 rounded-md p-4">
                <FileUpload onChange={(files) => console.log(files)} />
            </div>
        ),
    },
    "svg-mask-effect": {
        id: "svg-mask-effect",
        name: "SVG Mask Effect",
        description: "Text reveal effect using SVG mask that follows cursor.",
        usage: `import { MaskContainer } from "@/components/ui/svg-mask-effect";

<MaskContainer revealText="Revealed" className="text-3xl">
  <span>Hover to reveal</span>
</MaskContainer>`,
        demo: (
            <div className="h-40 flex items-center justify-center bg-black rounded-md">
                <MaskContainer
                    revealText={<p className="text-white text-2xl font-bold">Revealed!</p>}
                    className="h-full w-full"
                >
                    <span className="text-neutral-500 text-2xl font-bold">Hover to reveal</span>
                </MaskContainer>
            </div>
        ),
    },
    "floating-dock": {
        id: "floating-dock",
        name: "Floating Dock",
        description: "MacOS-style floating dock with hover animations.",
        usage: `import { FloatingDock } from "@/components/ui/floating-dock";

<FloatingDock items={dockItems} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <FloatingDock
                    items={[
                        { title: "Home", icon: <span>🏠</span>, href: "#" },
                        { title: "Products", icon: <span>📦</span>, href: "#" },
                        { title: "Settings", icon: <span>⚙️</span>, href: "#" },
                    ]}
                />
            </div>
        ),
    },
    "lens": {
        id: "lens",
        name: "Lens",
        description: "Magnifying glass effect on hover over images.",
        usage: `import { Lens } from "@/components/ui/lens";

<Lens>
  <img src="/image.jpg" alt="Image" />
</Lens>`,
        demo: (
            <div className="h-48 flex items-center justify-center bg-neutral-950 rounded-md">
                <Lens>
                    <img
                        src="https://images.unsplash.com/photo-1713869820987-519844949a8a?w=400"
                        alt="Lens demo"
                        className="rounded-lg h-40 object-cover"
                    />
                </Lens>
            </div>
        ),
    },
    "animated-testimonials": {
        id: "animated-testimonials",
        name: "Animated Testimonials",
        description: "Testimonials carousel with smooth animations.",
        usage: `import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";

<AnimatedTestimonials testimonials={testimonials} />`,
        demo: (
            <div className="py-4 bg-neutral-950 rounded-md">
                <AnimatedTestimonials
                    testimonials={[
                        { quote: "Amazing product!", name: "John", designation: "CEO", src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100" },
                        { quote: "Highly recommend!", name: "Jane", designation: "CTO", src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100" },
                    ]}
                />
            </div>
        ),
    },
    "multi-step-loader": {
        id: "multi-step-loader",
        name: "Multi Step Loader",
        description: "Multi-step loading animation with progress indicators.",
        usage: `import { MultiStepLoader } from "@/components/ui/multi-step-loader";

<MultiStepLoader loadingStates={steps} loading={true} />`,
        demo: (
            <div className="h-48 flex items-center justify-center bg-neutral-950 rounded-md relative">
                <MultiStepLoader
                    loadingStates={[
                        { text: "Connecting..." },
                        { text: "Loading data..." },
                        { text: "Almost done..." },
                    ]}
                    loading={true}
                    duration={2000}
                />
            </div>
        ),
    },
    "colourful-text": {
        id: "colourful-text",
        name: "Colourful Text",
        description: "Text with animated colorful gradient effects.",
        usage: `import { ColourfulText } from "@/components/ui/colourful-text";

<ColourfulText text="Colourful" />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-black rounded-md">
                <h1 className="text-2xl font-bold">
                    Make things <ColourfulText text="Colourful" />
                </h1>
            </div>
        ),
    },
    "expandable-card": {
        id: "expandable-card",
        name: "Expandable Card",
        description: "Cards that expand into a larger view with more details.",
        usage: `import { ExpandableCard } from "@/components/ui/expandable-card";

<ExpandableCard title="Title" description="Description" />`,
        demo: (
            <div className="h-48 flex items-center justify-center bg-neutral-950 rounded-md p-4">
                <ExpandableCardDemo />
            </div>
        ),
    },
    "focus-cards": {
        id: "focus-cards",
        name: "Focus Cards",
        description: "Cards that focus and blur on hover.",
        usage: `import { FocusCards } from "@/components/ui/focus-cards";

<FocusCards cards={cards} />`,
        demo: (
            <div className="py-4 bg-neutral-950 rounded-md">
                <FocusCards
                    cards={[
                        { title: "Card 1", src: "https://images.unsplash.com/photo-1518710843675-2540dd79065c?w=300" },
                        { title: "Card 2", src: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300" },
                        { title: "Card 3", src: "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=300" },
                    ]}
                />
            </div>
        ),
    },
    "sidebar": {
        id: "sidebar",
        name: "Sidebar",
        description: "Animated collapsible sidebar navigation.",
        usage: `import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";

<Sidebar>
  <SidebarBody>
    <SidebarLink link={{ label: "Home", href: "/" }}>
  </SidebarBody>
</Sidebar>`,
        demo: (
            <div className="h-48 flex items-center justify-center bg-neutral-950 rounded-md">
                <SidebarProvider>
                    <Sidebar>
                        <SidebarBody>
                            <SidebarLink link={{ label: "Home", href: "#", icon: <span>🏠</span> }} />
                            <SidebarLink link={{ label: "Products", href: "#", icon: <span>📦</span> }} />
                            <SidebarLink link={{ label: "Settings", href: "#", icon: <span>⚙️</span> }} />
                        </SidebarBody>
                    </Sidebar>
                </SidebarProvider>
            </div>
        ),
    },
    "github-globe": {
        id: "github-globe",
        name: "GitHub Globe",
        description: "3D animated globe like GitHub's homepage.",
        usage: `import { GitHubGlobe } from "@/components/ui/github-globe";

<GitHubGlobe />`,
        demo: (
            <div className="h-48 flex items-center justify-center bg-neutral-950 rounded-md">
                <GitHubGlobe className="w-48 h-48" />
            </div>
        ),
    },
    "3d-pin": {
        id: "3d-pin",
        name: "3D Pin",
        description: "A 3D pin effect for highlighting content.",
        usage: `import { PinContainer } from "@/components/ui/3d-pin";

<PinContainer title="Link">
  <div>Card content</div>
</PinContainer>`,
        demo: (
            <div className="h-64 flex items-center justify-center bg-neutral-950 rounded-md">
                <PinContainer title="Aceternity UI">
                    <div className="flex basis-full flex-col p-4 bg-gradient-to-br from-violet-500 via-purple-500 to-blue-500 text-white rounded-lg w-40 h-40">
                        <span className="font-bold">3D Pin Effect</span>
                        <span className="text-sm">Hover to see effect</span>
                    </div>
                </PinContainer>
            </div>
        ),
    },
    "following-pointer": {
        id: "following-pointer",
        name: "Following Pointer",
        description: "A card where elements follow the mouse cursor.",
        usage: `import { FollowingPointerCard } from "@/components/ui/following-pointer";

<FollowingPointerCard title="Follow me">
  <div>Card content</div>
</FollowingPointerCard>`,
        demo: (
            <div className="h-48 flex items-center justify-center bg-neutral-950 rounded-md p-4">
                <FollowingPointerCard
                    title={<span className="font-bold">John Doe</span>}
                >
                    <div className="bg-gradient-to-br from-violet-500 to-blue-500 p-6 rounded-lg text-white">
                        <h3 className="font-bold">Following Pointer</h3>
                        <p className="text-sm">Move cursor around</p>
                    </div>
                </FollowingPointerCard>
            </div>
        ),
    },
    "vortex": {
        id: "vortex",
        name: "Vortex",
        description: "A swirling vortex particle animation background.",
        usage: `import { Vortex } from "@/components/ui/vortex";

<Vortex>
  <h1>Your Content</h1>
</Vortex>`,
        demo: (
            <div className="h-48 w-full rounded-md overflow-hidden">
                <Vortex
                    backgroundColor="black"
                    rangeY={800}
                    particleCount={500}
                    baseHue={120}
                    className="flex items-center flex-col justify-center px-2 md:px-10 py-4 w-full h-full"
                >
                    <h2 className="text-white text-xl font-bold text-center">
                        Vortex Effect
                    </h2>
                </Vortex>
            </div>
        ),
    },
    "canvas-reveal-effect": {
        id: "canvas-reveal-effect",
        name: "Canvas Reveal Effect",
        description: "Animated dot matrix reveal effect for cards.",
        usage: `import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";

<CanvasRevealEffect animationSpeed={3} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md relative">
                <CanvasRevealEffect
                    animationSpeed={3}
                    containerClassName="bg-emerald-900"
                />
                <p className="text-white text-xl font-bold absolute z-20">Canvas Reveal</p>
            </div>
        ),
    },
    "placeholders-and-vanish-input": {
        id: "placeholders-and-vanish-input",
        name: "Placeholders And Vanish Input",
        description: "Input with cycling placeholders and vanish animation.",
        usage: `import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

<PlaceholdersAndVanishInput
  placeholders={["Search...", "Type here..."]}
  onChange={handleChange}
/>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md p-4">
                <PlaceholdersAndVanishInput
                    placeholders={["Search components...", "Try 'buttons'...", "Or 'cards'..."]}
                    onChange={() => { }}
                    onSubmit={() => { }}
                />
            </div>
        ),
    },
    "code-block": {
        id: "code-block",
        name: "Code Block",
        description: "Styled code block with syntax highlighting.",
        usage: `import { CodeBlock } from "@/components/ui/code-block";

<CodeBlock language="javascript" code={code} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-900 rounded-md p-4">
                <pre className="text-sm text-green-400 font-mono">
                    <code>{`const hello = "world";
console.log(hello);`}</code>
                </pre>
            </div>
        ),
    },
    "3d-marquee": {
        id: "3d-marquee",
        name: "3D Marquee",
        description: "A 3D marquee/carousel effect with skewed perspective.",
        usage: `import { Marquee3D } from "@/components/ui/3d-marquee";

<Marquee3D images={images} />`,
        demo: (
            <div className="h-48 w-full rounded-md overflow-hidden bg-neutral-950">
                <Marquee3D
                    images={[
                        "https://images.unsplash.com/photo-1518710843675-2540dd79065c?w=200",
                        "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=200",
                        "https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=200",
                        "https://images.unsplash.com/photo-1554080353-321e452ccf19?w=200",
                    ]}
                    className="h-48"
                />
            </div>
        ),
    },
    "apple-cards-carousel": {
        id: "apple-cards-carousel",
        name: "Apple Cards Carousel",
        description: "Expandable cards carousel inspired by Apple.",
        usage: `import { Carousel, AppleCard } from "@/components/ui/apple-cards-carousel";

<Carousel items={cards} />`,
        demo: (
            <div className="py-4 bg-neutral-950 rounded-md">
                <Carousel
                    items={[
                        <AppleCard
                            key="1"
                            card={{ src: "https://images.unsplash.com/photo-1518710843675-2540dd79065c?w=400", title: "Card 1", category: "Design", content: <div>Content</div> }}
                            index={0}
                        />,
                        <AppleCard
                            key="2"
                            card={{ src: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400", title: "Card 2", category: "Product", content: <div>Content</div> }}
                            index={1}
                        />,
                    ]}
                />
            </div>
        ),
    },
    "loader": {
        id: "loader",
        name: "Loader",
        description: "Various loading spinner animations.",
        usage: `import { Loader } from "@/components/ui/loader";

<Loader />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                <div className="animate-pulse text-neutral-400 text-sm">Loading...</div>
            </div>
        ),
    },
    "animated-modal": {
        id: "animated-modal",
        name: "Animated Modal",
        description: "Modal with smooth enter/exit animations.",
        usage: `import { Modal, ModalTrigger, ModalBody } from "@/components/ui/animated-modal";

<Modal>
  <ModalTrigger>Open Modal</ModalTrigger>
  <ModalBody>Modal content</ModalBody>
</Modal>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <button className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity">
                    Click to Open Modal
                </button>
            </div>
        ),
    },
    "carousel": {
        id: "carousel",
        name: "Carousel",
        description: "Smooth image carousel with navigation.",
        usage: `import { Carousel } from "@/components/ui/carousel";

<Carousel images={images} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Image carousel component</p>
            </div>
        ),
    },
    "tooltip-card": {
        id: "tooltip-card",
        name: "Tooltip Card",
        description: "Card with hover tooltip animations.",
        usage: `import { TooltipCard } from "@/components/ui/tooltip-card";

<TooltipCard items={items} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Hover cards with tooltip effects</p>
            </div>
        ),
    },
    "parallax-scroll": {
        id: "parallax-scroll",
        name: "Parallax Scroll",
        description: "Images that scroll with parallax effect.",
        usage: `import { ParallaxScroll } from "@/components/ui/parallax-scroll";

<ParallaxScroll images={images} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Images scroll with parallax effect</p>
            </div>
        ),
    },
    "signup-form": {
        id: "signup-form",
        name: "Signup Form",
        description: "Beautiful signup form with animated inputs.",
        usage: `import { SignupForm } from "@/components/ui/signup-form";

<SignupForm />`,
        demo: (
            <div className="h-48 flex items-center justify-center bg-neutral-950 rounded-md p-4">
                <div className="w-full max-w-xs space-y-3">
                    <input className="w-full p-2 rounded bg-neutral-800 text-white" placeholder="Name" />
                    <input className="w-full p-2 rounded bg-neutral-800 text-white" placeholder="Email" />
                    <button className="w-full py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded">Sign Up</button>
                </div>
            </div>
        ),
    },
    "container-scroll-animation": {
        id: "container-scroll-animation",
        name: "Container Scroll Animation",
        description: "Container that animates on scroll with 3D perspective.",
        usage: `import { ContainerScroll } from "@/components/ui/container-scroll-animation";

<ContainerScroll titleComponent={<Title />}>
  <Image />
</ContainerScroll>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">3D scroll animation effect</p>
            </div>
        ),
    },
    "layout-grid": {
        id: "layout-grid",
        name: "Layout Grid",
        description: "Animated layout grid with expanding cards.",
        usage: `import { LayoutGrid } from "@/components/ui/layout-grid";

<LayoutGrid cards={cards} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Grid layout with expandable cards</p>
            </div>
        ),
    },
    "sticky-scroll-reveal": {
        id: "sticky-scroll-reveal",
        name: "Sticky Scroll Reveal",
        description: "Content sections that stick and reveal on scroll.",
        usage: `import { StickyScroll } from "@/components/ui/sticky-scroll-reveal";

<StickyScroll content={content} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Sticky scroll reveal effect</p>
            </div>
        ),
    },
    "hero-parallax": {
        id: "hero-parallax",
        name: "Hero Parallax",
        description: "Hero section with scrolling parallax images.",
        usage: `import { HeroParallax } from "@/components/ui/hero-parallax";

<HeroParallax products={products} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Parallax hero with scrolling images</p>
            </div>
        ),
    },
    "macbook-scroll": {
        id: "macbook-scroll",
        name: "Macbook Scroll",
        description: "MacBook lid animation on scroll.",
        usage: `import { MacbookScroll } from "@/components/ui/macbook-scroll";

<MacbookScroll src="/image.png" />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">MacBook opening animation on scroll</p>
            </div>
        ),
    },
    "google-gemini-effect": {
        id: "google-gemini-effect",
        name: "Google Gemini Effect",
        description: "Animated SVG paths similar to Google Gemini.",
        usage: `import { GoogleGeminiEffect } from "@/components/ui/google-gemini-effect";

<GoogleGeminiEffect />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Animated path effect</p>
            </div>
        ),
    },
    "background-ripple-effect": {
        id: "background-ripple-effect",
        name: "Background Ripple Effect",
        description: "Water ripple effect emanating from the center.",
        usage: `import { BackgroundRipple } from "@/components/ui/background-ripple-effect";

<BackgroundRipple />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Ripple animation effect</p>
            </div>
        ),
    },
    "comet-card": {
        id: "comet-card",
        name: "Comet Card",
        description: "Card with animated comet tail effect.",
        usage: `import { CometCard } from "@/components/ui/comet-card";

<CometCard>Card content</CometCard>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Card with comet trail animation</p>
            </div>
        ),
    },
    "container-cover": {
        id: "container-cover",
        name: "Container Cover",
        description: "Full-screen cover with parallax effect.",
        usage: `import { ContainerCover } from "@/components/ui/container-cover";

<ContainerCover>Content</ContainerCover>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Container cover effect</p>
            </div>
        ),
    },
    "dither-shader": {
        id: "dither-shader",
        name: "Dither Shader",
        description: "Retro dithered gradient shader effect.",
        usage: `import { DitherShader } from "@/components/ui/dither-shader";

<DitherShader />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Dithered gradient shader</p>
            </div>
        ),
    },
    "draggable-card": {
        id: "draggable-card",
        name: "Draggable Card",
        description: "Card that can be dragged around the screen.",
        usage: `import { DraggableCard } from "@/components/ui/draggable-card";

<DraggableCard>Drag me!</DraggableCard>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <div className="cursor-grab active:cursor-grabbing bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg text-white">
                    Drag me!
                </div>
            </div>
        ),
    },
    "glowing-effect": {
        id: "glowing-effect",
        name: "Glowing Effect",
        description: "Pulsating glow effect for elements.",
        usage: `import { GlowingEffect } from "@/components/ui/glowing-effect";

<GlowingEffect>Content</GlowingEffect>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <div className="animate-pulse px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500 text-blue-400">
                    Glowing Effect
                </div>
            </div>
        ),
    },
    "navbar-menu": {
        id: "navbar-menu",
        name: "Navbar Menu",
        description: "Animated dropdown navbar menu.",
        usage: `import { NavbarMenu } from "@/components/ui/navbar-menu";

<NavbarMenu items={menuItems} />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <nav className="flex gap-6 text-neutral-300">
                    <span className="hover:text-white cursor-pointer">Products</span>
                    <span className="hover:text-white cursor-pointer">Services</span>
                    <span className="hover:text-white cursor-pointer">About</span>
                </nav>
            </div>
        ),
    },
    "noise-background": {
        id: "noise-background",
        name: "Noise Background",
        description: "Subtle animated noise texture background.",
        usage: `import { NoiseBackground } from "@/components/ui/noise-background";

<NoiseBackground>Content</NoiseBackground>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-900 rounded-md">
                <p className="text-neutral-400 text-sm">Noise texture overlay</p>
            </div>
        ),
    },
    "pixelated-canvas": {
        id: "pixelated-canvas",
        name: "Pixelated Canvas",
        description: "Pixelated effect on hover.",
        usage: `import { PixelatedCanvas } from "@/components/ui/pixelated-canvas";

<PixelatedCanvas src="/image.jpg" />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Pixelated image effect</p>
            </div>
        ),
    },
    "resizable-navbar": {
        id: "resizable-navbar",
        name: "Resizable Navbar",
        description: "Navbar that resizes on scroll.",
        usage: `import { ResizableNavbar } from "@/components/ui/resizable-navbar";

<ResizableNavbar>Logo</ResizableNavbar>`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md">
                <p className="text-neutral-400 text-sm">Navbar shrinks on scroll</p>
            </div>
        ),
    },
    "spotlight-new": {
        id: "spotlight-new",
        name: "Spotlight New",
        description: "Updated spotlight effect with more options.",
        usage: `import { SpotlightNew } from "@/components/ui/spotlight-new";

<SpotlightNew />`,
        demo: (
            <div className="h-32 flex items-center justify-center bg-neutral-950 rounded-md relative overflow-hidden">
                <div className="absolute w-40 h-40 bg-gradient-radial from-white/20 to-transparent rounded-full blur-xl"></div>
                <p className="text-neutral-300 text-sm relative z-10">New Spotlight Effect</p>
            </div>
        ),
    },
    "sticky-banner": {
        id: "sticky-banner",
        name: "Sticky Banner",
        description: "Banner that sticks to the top on scroll.",
        usage: `import { StickyBanner } from "@/components/ui/sticky-banner";

<StickyBanner>Announcement text</StickyBanner>`,
        demo: (
            <div className="h-32 flex flex-col items-center justify-start bg-neutral-950 rounded-md">
                <div className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center text-sm">
                    📢 Announcement: New features available!
                </div>
            </div>
        ),
    },
    "tailwind-buttons": {
        id: "tailwind-buttons",
        name: "Tailwind Buttons",
        description: "Collection of beautiful button styles.",
        usage: `import { TailwindButton } from "@/components/ui/tailwind-buttons";

<TailwindButton variant="shimmer">Click me</TailwindButton>`,
        demo: (
            <div className="h-32 flex items-center justify-center gap-3 bg-neutral-950 rounded-md">
                <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:opacity-90">
                    Gradient
                </button>
                <button className="px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10">
                    Outline
                </button>
            </div>
        ),
    },

    // ============================================
    // ANT DESIGN COMPONENTS
    // ============================================

    "antd-button": {
        id: "antd-button",
        name: "Button",
        description: "Ant Design Button with multiple variants and states.",
        usage: `import { Button, Space } from "antd";

<Space>
  <Button type="primary">Primary</Button>
  <Button>Default</Button>
  <Button type="dashed">Dashed</Button>
  <Button type="link">Link</Button>
</Space>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space wrap>
                    <Button type="primary">Primary</Button>
                    <Button>Default</Button>
                    <Button type="dashed">Dashed</Button>
                    <Button type="link">Link</Button>
                    <Button type="primary" danger>Danger</Button>
                </Space>
            </div>
        ),
    },
    "antd-float-button": {
        id: "antd-float-button",
        name: "Float Button",
        description: "Floating action button with multiple actions.",
        usage: `import { FloatButton } from "antd";

<FloatButton tooltip="Help" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg h-32 relative">
                <p className="text-gray-500">Float button appears in the corner →</p>
                <FloatButton tooltip="Help" style={{ right: 24 }} />
            </div>
        ),
    },
    "antd-icon": {
        id: "antd-icon",
        name: "Icon",
        description: "Rich set of icons for various use cases.",
        usage: `import { HomeOutlined, SettingOutlined } from "@ant-design/icons";

<HomeOutlined />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space size="large">
                    <span className="text-2xl">🏠</span>
                    <span className="text-2xl">⚙️</span>
                    <span className="text-2xl">👤</span>
                    <span className="text-2xl">🔔</span>
                </Space>
            </div>
        ),
    },
    "antd-typography": {
        id: "antd-typography",
        name: "Typography",
        description: "Text and title components with formatting.",
        usage: `import { Typography } from "antd";
const { Title, Text, Paragraph } = Typography;

<Title level={2}>Title</Title>
<Text>Text content</Text>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Typography.Title level={3}>Typography Title</Typography.Title>
                <Typography.Text>Regular text content.</Typography.Text>
                <br />
                <Typography.Text type="secondary">Secondary text.</Typography.Text>
            </div>
        ),
    },
    "antd-divider": {
        id: "antd-divider",
        name: "Divider",
        description: "Horizontal or vertical divider line.",
        usage: `import { Divider } from "antd";

<Divider>Text</Divider>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <p>Content above</p>
                <Divider>Divider with text</Divider>
                <p>Content below</p>
            </div>
        ),
    },
    "antd-flex": {
        id: "antd-flex",
        name: "Flex",
        description: "Flexbox layout component.",
        usage: `import { Flex, Button } from "antd";

<Flex gap="small" wrap>
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</Flex>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Flex gap="small" wrap>
                    <Button type="primary">Button 1</Button>
                    <Button>Button 2</Button>
                    <Button type="dashed">Button 3</Button>
                </Flex>
            </div>
        ),
    },
    "antd-grid": {
        id: "antd-grid",
        name: "Grid",
        description: "24-column grid system for layout.",
        usage: `import { Row, Col } from "antd";

<Row>
  <Col span={12}>col-12</Col>
  <Col span={12}>col-12</Col>
</Row>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <div className="flex gap-4">
                    <div className="flex-1 bg-blue-100 p-2 text-center rounded">Col 8</div>
                    <div className="flex-1 bg-blue-200 p-2 text-center rounded">Col 8</div>
                    <div className="flex-1 bg-blue-100 p-2 text-center rounded">Col 8</div>
                </div>
            </div>
        ),
    },
    "antd-layout": {
        id: "antd-layout",
        name: "Layout",
        description: "High-level page layout components.",
        usage: `import { Layout } from "antd";
const { Header, Footer, Sider, Content } = Layout;

<Layout>
  <Header>Header</Header>
  <Content>Content</Content>
  <Footer>Footer</Footer>
</Layout>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Layout className="h-40">
                    <Layout.Header className="bg-blue-600 text-white flex items-center justify-center">Header</Layout.Header>
                    <Layout.Content className="bg-blue-100 flex items-center justify-center">Content</Layout.Content>
                    <Layout.Footer className="bg-blue-200 text-center">Footer</Layout.Footer>
                </Layout>
            </div>
        ),
    },
    "antd-space": {
        id: "antd-space",
        name: "Space",
        description: "Set components spacing.",
        usage: `import { Space, Button } from "antd";

<Space>
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</Space>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space size="middle">
                    <Button type="primary">Primary</Button>
                    <Button>Default</Button>
                    <Button type="dashed">Dashed</Button>
                </Space>
            </div>
        ),
    },
    "antd-splitter": {
        id: "antd-splitter",
        name: "Splitter",
        description: "Resizable split pane layout.",
        usage: `import { Splitter } from "antd";

<Splitter>
  <Splitter.Panel>Panel 1</Splitter.Panel>
  <Splitter.Panel>Panel 2</Splitter.Panel>
</Splitter>`,
        demo: (
            <div className="p-6 bg-white rounded-lg h-32">
                <Splitter style={{ height: "100%" }}>
                    <Splitter.Panel defaultSize="50%"><div className="bg-blue-50 h-full flex items-center justify-center">Panel 1</div></Splitter.Panel>
                    <Splitter.Panel><div className="bg-blue-100 h-full flex items-center justify-center">Panel 2</div></Splitter.Panel>
                </Splitter>
            </div>
        ),
    },
    "antd-anchor": {
        id: "antd-anchor",
        name: "Anchor",
        description: "Hyperlinks to scroll on one page.",
        usage: `import { Anchor } from "antd";

<Anchor items={[{ key: '1', href: '#section', title: 'Section' }]} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Anchor items={[
                    { key: '1', href: '#section1', title: 'Section 1' },
                    { key: '2', href: '#section2', title: 'Section 2' },
                ]} />
            </div>
        ),
    },
    "antd-breadcrumb": {
        id: "antd-breadcrumb",
        name: "Breadcrumb",
        description: "Navigation breadcrumb trail.",
        usage: `import { Breadcrumb } from "antd";

<Breadcrumb items={[{ title: 'Home' }, { title: 'List' }]} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Breadcrumb items={[
                    { title: 'Home' },
                    { title: 'Application' },
                    { title: 'List' },
                ]} />
            </div>
        ),
    },
    "antd-dropdown": {
        id: "antd-dropdown",
        name: "Dropdown",
        description: "Dropdown menu for actions.",
        usage: `import { Dropdown, Button } from "antd";

<Dropdown menu={{ items }}>
  <Button>Hover me</Button>
</Dropdown>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Dropdown menu={{ items: [{ key: '1', label: 'Action 1' }, { key: '2', label: 'Action 2' }] }}>
                    <Button>Hover me for dropdown</Button>
                </Dropdown>
            </div>
        ),
    },
    "antd-menu": {
        id: "antd-menu",
        name: "Menu",
        description: "Navigation menu with multiple modes.",
        usage: `import { Menu } from "antd";

<Menu mode="horizontal" items={items} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Menu mode="horizontal" items={[
                    { key: 'home', label: 'Home' },
                    { key: 'products', label: 'Products' },
                    { key: 'about', label: 'About' },
                ]} />
            </div>
        ),
    },
    "antd-pagination": {
        id: "antd-pagination",
        name: "Pagination",
        description: "Page navigation component.",
        usage: `import { Pagination } from "antd";

<Pagination defaultCurrent={1} total={50} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Pagination defaultCurrent={1} total={50} />
            </div>
        ),
    },
    "antd-steps": {
        id: "antd-steps",
        name: "Steps",
        description: "Progress steps indicator.",
        usage: `import { Steps } from "antd";

<Steps current={1} items={[{ title: 'Step 1' }, { title: 'Step 2' }]} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Steps current={1} items={[
                    { title: 'Finished', description: 'Step 1' },
                    { title: 'In Progress', description: 'Step 2' },
                    { title: 'Waiting', description: 'Step 3' },
                ]} />
            </div>
        ),
    },
    "antd-autocomplete": {
        id: "antd-autocomplete",
        name: "AutoComplete",
        description: "Input with auto-complete suggestions.",
        usage: `import { AutoComplete } from "antd";

<AutoComplete options={options} style={{ width: 200 }} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <AutoComplete
                    options={[{ value: 'Option 1' }, { value: 'Option 2' }]}
                    placeholder="Type to search..."
                    style={{ width: 200 }}
                />
            </div>
        ),
    },
    "antd-cascader": {
        id: "antd-cascader",
        name: "Cascader",
        description: "Cascade selection menu.",
        usage: `import { Cascader } from "antd";

<Cascader options={options} placeholder="Select" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Cascader
                    options={[
                        { value: 'usa', label: 'USA', children: [{ value: 'ny', label: 'New York' }] },
                        { value: 'china', label: 'China', children: [{ value: 'bj', label: 'Beijing' }] },
                    ]}
                    placeholder="Select location"
                />
            </div>
        ),
    },
    "antd-checkbox": {
        id: "antd-checkbox",
        name: "Checkbox",
        description: "Checkbox for multiple selections.",
        usage: `import { Checkbox } from "antd";

<Checkbox>Remember me</Checkbox>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space orientation="vertical">
                    <Checkbox>Option A</Checkbox>
                    <Checkbox defaultChecked>Option B (checked)</Checkbox>
                    <Checkbox disabled>Option C (disabled)</Checkbox>
                </Space>
            </div>
        ),
    },
    "antd-color-picker": {
        id: "antd-color-picker",
        name: "ColorPicker",
        description: "Color selection component.",
        usage: `import { ColorPicker } from "antd";

<ColorPicker defaultValue="#1677ff" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <ColorPicker defaultValue="#1677ff" />
            </div>
        ),
    },
    "antd-date-picker": {
        id: "antd-date-picker",
        name: "DatePicker",
        description: "Date selection component.",
        usage: `import { DatePicker } from "antd";

<DatePicker />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space>
                    <DatePicker placeholder="Select date" />
                    <DatePicker picker="month" placeholder="Select month" />
                </Space>
            </div>
        ),
    },
    "antd-form": {
        id: "antd-form",
        name: "Form",
        description: "Form with validation and layout.",
        usage: `import { Form, Input, Button } from "antd";

<Form>
  <Form.Item label="Username" name="username">
    <Input />
  </Form.Item>
</Form>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Form layout="inline">
                    <Form.Item label="Username">
                        <Input placeholder="Enter username" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary">Submit</Button>
                    </Form.Item>
                </Form>
            </div>
        ),
    },
    "antd-input": {
        id: "antd-input",
        name: "Input",
        description: "Text input field.",
        usage: `import { Input } from "antd";

<Input placeholder="Enter text" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Input placeholder="Basic input" />
                    <Input.Password placeholder="Password" />
                    <Input.TextArea rows={2} placeholder="Textarea" />
                </Space>
            </div>
        ),
    },
    "antd-input-number": {
        id: "antd-input-number",
        name: "InputNumber",
        description: "Numeric input field.",
        usage: `import { InputNumber } from "antd";

<InputNumber min={1} max={10} defaultValue={3} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space>
                    <InputNumber min={1} max={100} defaultValue={10} />
                    <InputNumber min={0} max={100} defaultValue={50} addonAfter="%" />
                </Space>
            </div>
        ),
    },
    "antd-mentions": {
        id: "antd-mentions",
        name: "Mentions",
        description: "Input with @mention functionality.",
        usage: `import { Mentions } from "antd";

<Mentions options={[{ value: 'user1', label: 'User 1' }]} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Mentions
                    placeholder="Type @ to mention"
                    options={[
                        { value: 'john', label: 'John' },
                        { value: 'jane', label: 'Jane' },
                    ]}
                    style={{ width: '100%' }}
                />
            </div>
        ),
    },
    "antd-radio": {
        id: "antd-radio",
        name: "Radio",
        description: "Radio button for single selection.",
        usage: `import { Radio } from "antd";

<Radio.Group>
  <Radio value={1}>Option A</Radio>
  <Radio value={2}>Option B</Radio>
</Radio.Group>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Radio.Group defaultValue={1}>
                    <Radio value={1}>Option A</Radio>
                    <Radio value={2}>Option B</Radio>
                    <Radio value={3}>Option C</Radio>
                </Radio.Group>
            </div>
        ),
    },
    "antd-rate": {
        id: "antd-rate",
        name: "Rate",
        description: "Star rating component.",
        usage: `import { Rate } from "antd";

<Rate />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space orientation="vertical">
                    <Rate defaultValue={3} />
                    <Rate allowHalf defaultValue={2.5} />
                </Space>
            </div>
        ),
    },
    "antd-select": {
        id: "antd-select",
        name: "Select",
        description: "Dropdown selection component.",
        usage: `import { Select } from "antd";

<Select options={[{ value: '1', label: 'Option 1' }]} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space>
                    <Select
                        defaultValue="lucy"
                        style={{ width: 120 }}
                        options={[
                            { value: 'jack', label: 'Jack' },
                            { value: 'lucy', label: 'Lucy' },
                            { value: 'tom', label: 'Tom' },
                        ]}
                    />
                    <Select
                        mode="multiple"
                        style={{ width: 200 }}
                        placeholder="Select multiple"
                        options={[
                            { value: 'a', label: 'Option A' },
                            { value: 'b', label: 'Option B' },
                        ]}
                    />
                </Space>
            </div>
        ),
    },
    "antd-slider": {
        id: "antd-slider",
        name: "Slider",
        description: "Slider input for ranges.",
        usage: `import { Slider } from "antd";

<Slider defaultValue={30} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Slider defaultValue={30} />
                <Slider range defaultValue={[20, 50]} />
            </div>
        ),
    },
    "antd-switch": {
        id: "antd-switch",
        name: "Switch",
        description: "Toggle switch component.",
        usage: `import { Switch } from "antd";

<Switch defaultChecked />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space>
                    <Switch defaultChecked />
                    <Switch checkedChildren="ON" unCheckedChildren="OFF" />
                </Space>
            </div>
        ),
    },
    "antd-time-picker": {
        id: "antd-time-picker",
        name: "TimePicker",
        description: "Time selection component.",
        usage: `import { TimePicker } from "antd";

<TimePicker />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <TimePicker />
            </div>
        ),
    },
    "antd-transfer": {
        id: "antd-transfer",
        name: "Transfer",
        description: "Transfer items between lists.",
        usage: `import { Transfer } from "antd";

<Transfer dataSource={data} targetKeys={[]} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Transfer
                    dataSource={[
                        { key: '1', title: 'Item 1' },
                        { key: '2', title: 'Item 2' },
                        { key: '3', title: 'Item 3' },
                    ]}
                    targetKeys={['2']}
                    render={item => item.title || ''}
                />
            </div>
        ),
    },
    "antd-tree-select": {
        id: "antd-tree-select",
        name: "TreeSelect",
        description: "Tree structure selection.",
        usage: `import { TreeSelect } from "antd";

<TreeSelect treeData={treeData} style={{ width: '100%' }} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <TreeSelect
                    style={{ width: 200 }}
                    placeholder="Select"
                    treeData={[
                        { title: 'Parent 1', value: 'p1', children: [{ title: 'Child 1', value: 'c1' }] },
                        { title: 'Parent 2', value: 'p2' },
                    ]}
                />
            </div>
        ),
    },
    "antd-upload": {
        id: "antd-upload",
        name: "Upload",
        description: "File upload component.",
        usage: `import { Upload, Button } from "antd";

<Upload>
  <Button>Click to Upload</Button>
</Upload>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Upload>
                    <Button>Click to Upload</Button>
                </Upload>
            </div>
        ),
    },
    "antd-avatar": {
        id: "antd-avatar",
        name: "Avatar",
        description: "User avatar image or icon.",
        usage: `import { Avatar } from "antd";

<Avatar>U</Avatar>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space>
                    <Avatar style={{ backgroundColor: '#1677ff' }}>U</Avatar>
                    <Avatar style={{ backgroundColor: '#87d068' }}>A</Avatar>
                    <Avatar.Group>
                        <Avatar style={{ backgroundColor: '#f56a00' }}>K</Avatar>
                        <Avatar style={{ backgroundColor: '#7265e6' }}>L</Avatar>
                    </Avatar.Group>
                </Space>
            </div>
        ),
    },
    "antd-badge": {
        id: "antd-badge",
        name: "Badge",
        description: "Badge for notifications.",
        usage: `import { Badge, Avatar } from "antd";

<Badge count={5}>
  <Avatar shape="square" size="large" />
</Badge>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space size="large">
                    <Badge count={5}>
                        <Avatar shape="square" size="large" />
                    </Badge>
                    <Badge dot>
                        <Avatar shape="square" size="large" />
                    </Badge>
                    <Badge count={0} showZero>
                        <Avatar shape="square" size="large" />
                    </Badge>
                </Space>
            </div>
        ),
    },
    "antd-calendar": {
        id: "antd-calendar",
        name: "Calendar",
        description: "Full calendar display.",
        usage: `import { Calendar } from "antd";

<Calendar fullscreen={false} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Calendar fullscreen={false} style={{ width: 300 }} />
            </div>
        ),
    },
    "antd-card": {
        id: "antd-card",
        name: "Card",
        description: "Container card component.",
        usage: `import { Card } from "antd";

<Card title="Card Title">Card content</Card>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Card title="Card Title" extra={<a href="#">More</a>} style={{ width: 300 }}>
                    <p>Card content goes here.</p>
                    <p>More content...</p>
                </Card>
            </div>
        ),
    },
    "antd-carousel": {
        id: "antd-carousel",
        name: "Carousel",
        description: "Image/content carousel slider.",
        usage: `import { Carousel } from "antd";

<Carousel>
  <div>Slide 1</div>
  <div>Slide 2</div>
</Carousel>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <AntCarousel autoplay style={{ width: 300 }}>
                    <div><div className="bg-blue-500 h-32 flex items-center justify-center text-white">Slide 1</div></div>
                    <div><div className="bg-green-500 h-32 flex items-center justify-center text-white">Slide 2</div></div>
                    <div><div className="bg-purple-500 h-32 flex items-center justify-center text-white">Slide 3</div></div>
                </AntCarousel>
            </div>
        ),
    },
    "antd-collapse": {
        id: "antd-collapse",
        name: "Collapse",
        description: "Collapsible content panels.",
        usage: `import { Collapse } from "antd";

<Collapse items={[{ key: '1', label: 'Panel 1', children: 'Content' }]} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Collapse items={[
                    { key: '1', label: 'Panel 1', children: 'This is the content of panel 1' },
                    { key: '2', label: 'Panel 2', children: 'This is the content of panel 2' },
                ]} defaultActiveKey={['1']} />
            </div>
        ),
    },
    "antd-descriptions": {
        id: "antd-descriptions",
        name: "Descriptions",
        description: "Display multiple key-value pairs.",
        usage: `import { Descriptions } from "antd";

<Descriptions title="Info">
  <Descriptions.Item label="Name">John</Descriptions.Item>
</Descriptions>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Descriptions title="User Info" bordered size="small">
                    <Descriptions.Item label="Name">John Doe</Descriptions.Item>
                    <Descriptions.Item label="Phone">1234567890</Descriptions.Item>
                    <Descriptions.Item label="Email">john@example.com</Descriptions.Item>
                </Descriptions>
            </div>
        ),
    },
    "antd-empty": {
        id: "antd-empty",
        name: "Empty",
        description: "Empty state placeholder.",
        usage: `import { Empty } from "antd";

<Empty />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Empty description="No Data" />
            </div>
        ),
    },
    "antd-image": {
        id: "antd-image",
        name: "Image",
        description: "Image component with preview.",
        usage: `import { Image } from "antd";

<Image src="url" width={200} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Image
                    width={100}
                    src="https://images.unsplash.com/photo-1518710843675-2540dd79065c?w=200"
                    alt="Sample"
                />
            </div>
        ),
    },
    "antd-list": {
        id: "antd-list",
        name: "List",
        description: "Basic list display.",
        usage: `import { List } from "antd";

<List dataSource={data} renderItem={item => <List.Item>{item}</List.Item>} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <List
                    size="small"
                    bordered
                    dataSource={['Item 1', 'Item 2', 'Item 3']}
                    renderItem={item => <List.Item>{item}</List.Item>}
                />
            </div>
        ),
    },
    "antd-popover": {
        id: "antd-popover",
        name: "Popover",
        description: "Floating content on click/hover.",
        usage: `import { Popover, Button } from "antd";

<Popover content="Content" title="Title">
  <Button>Hover me</Button>
</Popover>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Popover content="Popover content here" title="Popover Title">
                    <Button type="primary">Hover for Popover</Button>
                </Popover>
            </div>
        ),
    },
    "antd-qrcode": {
        id: "antd-qrcode",
        name: "QRCode",
        description: "QR code generator.",
        usage: `import { QRCode } from "antd";

<QRCode value="https://example.com" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <QRCode value="https://ant.design" size={100} />
            </div>
        ),
    },
    "antd-segmented": {
        id: "antd-segmented",
        name: "Segmented",
        description: "Segmented control for selections.",
        usage: `import { Segmented } from "antd";

<Segmented options={['Daily', 'Weekly', 'Monthly']} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Segmented options={['Daily', 'Weekly', 'Monthly', 'Yearly']} />
            </div>
        ),
    },
    "antd-statistic": {
        id: "antd-statistic",
        name: "Statistic",
        description: "Display statistic numbers.",
        usage: `import { Statistic } from "antd";

<Statistic title="Active Users" value={112893} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space>
                    <Statistic title="Active Users" value={112893} />
                    <Statistic title="Account Balance" value={112893} precision={2} prefix="$" />
                </Space>
            </div>
        ),
    },
    "antd-table": {
        id: "antd-table",
        name: "Table",
        description: "Data table component.",
        usage: `import { Table } from "antd";

<Table dataSource={data} columns={columns} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg overflow-x-auto">
                <Table
                    size="small"
                    dataSource={[
                        { key: '1', name: 'John', age: 32 },
                        { key: '2', name: 'Jane', age: 28 },
                    ]}
                    columns={[
                        { title: 'Name', dataIndex: 'name', key: 'name' },
                        { title: 'Age', dataIndex: 'age', key: 'age' },
                    ]}
                    pagination={false}
                />
            </div>
        ),
    },
    "antd-tabs": {
        id: "antd-tabs",
        name: "Tabs",
        description: "Tab navigation component.",
        usage: `import { Tabs } from "antd";

<Tabs items={[{ key: '1', label: 'Tab 1', children: 'Content 1' }]} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <AntTabs items={[
                    { key: '1', label: 'Tab 1', children: 'Content of Tab 1' },
                    { key: '2', label: 'Tab 2', children: 'Content of Tab 2' },
                    { key: '3', label: 'Tab 3', children: 'Content of Tab 3' },
                ]} />
            </div>
        ),
    },
    "antd-tag": {
        id: "antd-tag",
        name: "Tag",
        description: "Tag for categorization.",
        usage: `import { Tag } from "antd";

<Tag color="blue">Blue</Tag>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space>
                    <Tag>Default</Tag>
                    <Tag color="success">Success</Tag>
                    <Tag color="processing">Processing</Tag>
                    <Tag color="error">Error</Tag>
                    <Tag color="warning">Warning</Tag>
                </Space>
            </div>
        ),
    },
    "antd-timeline": {
        id: "antd-timeline",
        name: "Timeline",
        description: "Vertical timeline display.",
        usage: `import { Timeline } from "antd";

<Timeline items={[{ children: 'Event 1' }]} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <AntTimeline items={[
                    { children: 'Create project 2023-01-01' },
                    { children: 'Solve initial issues 2023-01-15' },
                    { color: 'green', children: 'Project launched 2023-02-01' },
                ]} />
            </div>
        ),
    },
    "antd-tooltip": {
        id: "antd-tooltip",
        name: "Tooltip",
        description: "Hover tooltip for hints.",
        usage: `import { Tooltip, Button } from "antd";

<Tooltip title="Tooltip text">
  <Button>Hover me</Button>
</Tooltip>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Tooltip title="This is a tooltip!">
                    <Button>Hover for tooltip</Button>
                </Tooltip>
            </div>
        ),
    },
    "antd-tour": {
        id: "antd-tour",
        name: "Tour",
        description: "Product tour/guide component.",
        usage: `import { Tour, Button } from "antd";

<Tour steps={steps} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Button type="primary">Start Tour (Demo)</Button>
                <p className="text-gray-500 mt-2 text-sm">Tour guides users through features</p>
            </div>
        ),
    },
    "antd-tree": {
        id: "antd-tree",
        name: "Tree",
        description: "Hierarchical tree structure.",
        usage: `import { Tree } from "antd";

<Tree treeData={treeData} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Tree
                    defaultExpandAll
                    treeData={[
                        {
                            title: 'Parent 1', key: '0-0', children: [
                                { title: 'Child 1', key: '0-0-0' },
                                { title: 'Child 2', key: '0-0-1' },
                            ]
                        },
                        { title: 'Parent 2', key: '0-1' },
                    ]}
                />
            </div>
        ),
    },
    "antd-alert": {
        id: "antd-alert",
        name: "Alert",
        description: "Alert messages for feedback.",
        usage: `import { Alert } from "antd";

<Alert message="Success" type="success" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Alert message="Success" type="success" showIcon />
                    <Alert message="Info" type="info" showIcon />
                    <Alert message="Warning" type="warning" showIcon />
                    <Alert message="Error" type="error" showIcon />
                </Space>
            </div>
        ),
    },
    "antd-drawer": {
        id: "antd-drawer",
        name: "Drawer",
        description: "Side panel drawer.",
        usage: `import { Drawer, Button } from "antd";

<Button onClick={() => setOpen(true)}>Open</Button>
<Drawer title="Title" open={open}>Content</Drawer>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Button type="primary">Open Drawer (Demo)</Button>
                <p className="text-gray-500 mt-2 text-sm">Drawer slides from the side</p>
            </div>
        ),
    },
    "antd-message": {
        id: "antd-message",
        name: "Message",
        description: "Global message notifications.",
        usage: `import { message, Button } from "antd";

<Button onClick={() => message.success('Success!')}>Show Message</Button>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Button onClick={() => message.success('This is a success message!')}>
                    Show Message
                </Button>
            </div>
        ),
    },
    "antd-modal": {
        id: "antd-modal",
        name: "Modal",
        description: "Modal dialog component.",
        usage: `import { Modal, Button } from "antd";

<Button onClick={() => setOpen(true)}>Open Modal</Button>
<Modal title="Title" open={open}>Content</Modal>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Button type="primary" onClick={() => Modal.info({ title: 'Modal Title', content: 'Modal content here' })}>
                    Open Modal
                </Button>
            </div>
        ),
    },
    "antd-notification": {
        id: "antd-notification",
        name: "Notification",
        description: "Global notification messages.",
        usage: `import { notification, Button } from "antd";

<Button onClick={() => notification.open({ message: 'Title' })}>Notify</Button>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Button onClick={() => notification.open({ message: 'Notification Title', description: 'This is the notification content.' })}>
                    Show Notification
                </Button>
            </div>
        ),
    },
    "antd-popconfirm": {
        id: "antd-popconfirm",
        name: "Popconfirm",
        description: "Confirmation popup.",
        usage: `import { Popconfirm, Button } from "antd";

<Popconfirm title="Are you sure?">
  <Button>Delete</Button>
</Popconfirm>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Popconfirm title="Are you sure you want to delete this?">
                    <Button danger>Delete</Button>
                </Popconfirm>
            </div>
        ),
    },
    "antd-progress": {
        id: "antd-progress",
        name: "Progress",
        description: "Progress indicator bar.",
        usage: `import { Progress } from "antd";

<Progress percent={30} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space orientation="vertical" style={{ width: '100%' }}>
                    <Progress percent={30} />
                    <Progress percent={70} status="active" />
                    <Progress percent={100} />
                </Space>
            </div>
        ),
    },
    "antd-result": {
        id: "antd-result",
        name: "Result",
        description: "Result feedback pages.",
        usage: `import { Result, Button } from "antd";

<Result status="success" title="Success!" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Result
                    status="success"
                    title="Successfully Completed!"
                    subTitle="Order number: 2017182818828"
                    extra={<Button type="primary">Go Back</Button>}
                />
            </div>
        ),
    },
    "antd-skeleton": {
        id: "antd-skeleton",
        name: "Skeleton",
        description: "Loading placeholder.",
        usage: `import { Skeleton } from "antd";

<Skeleton active />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Skeleton active />
            </div>
        ),
    },
    "antd-spin": {
        id: "antd-spin",
        name: "Spin",
        description: "Loading spinner.",
        usage: `import { Spin } from "antd";

<Spin />`,
        demo: (
            <div className="p-6 bg-white rounded-lg flex items-center justify-center">
                <Space size="large">
                    <Spin size="small" />
                    <Spin />
                    <Spin size="large" />
                </Space>
            </div>
        ),
    },
    "antd-watermark": {
        id: "antd-watermark",
        name: "Watermark",
        description: "Add watermark to page.",
        usage: `import { Watermark } from "antd";

<Watermark content="Ant Design">
  <div>Content</div>
</Watermark>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Watermark content="Ant Design">
                    <div className="h-32" />
                </Watermark>
            </div>
        ),
    },
    "antd-affix": {
        id: "antd-affix",
        name: "Affix",
        description: "Sticky positioned element.",
        usage: `import { Affix, Button } from "antd";

<Affix offsetTop={10}>
  <Button type="primary">Affix Button</Button>
</Affix>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Button type="primary">Affix Demo (sticks on scroll)</Button>
            </div>
        ),
    },
    "antd-app": {
        id: "antd-app",
        name: "App",
        description: "App wrapper for static methods.",
        usage: `import { App } from "antd";

<App>
  <MyApp />
</App>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <p className="text-gray-600">App component provides context for message, notification, modal</p>
            </div>
        ),
    },
    "antd-config-provider": {
        id: "antd-config-provider",
        name: "ConfigProvider",
        description: "Global configuration provider.",
        usage: `import { ConfigProvider, Button } from "antd";

<ConfigProvider theme={{ token: { colorPrimary: '#00b96b' } }}>
  <Button type="primary">Green Button</Button>
</ConfigProvider>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <ConfigProvider theme={{ token: { colorPrimary: '#00b96b' } }}>
                    <Button type="primary">Custom Theme Button</Button>
                </ConfigProvider>
            </div>
        ),
    },

    // ============================================
    // PROCOMPONENTS
    // ============================================

    "pro-layout": {
        id: "pro-layout",
        name: "ProLayout",
        description: "Enterprise-level layout component.",
        usage: `import { ProLayout } from "@ant-design/pro-components";

<ProLayout>
  <PageContainer>Content</PageContainer>
</ProLayout>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <p className="text-gray-600">ProLayout provides enterprise-level page layouts with sidebar navigation</p>
            </div>
        ),
    },
    "pro-page-container": {
        id: "pro-page-container",
        name: "PageContainer",
        description: "Page container with breadcrumbs and title.",
        usage: `import { PageContainer } from "@ant-design/pro-components";

<PageContainer title="Page Title">
  Content
</PageContainer>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <PageContainer title="Page Title" subTitle="Subtitle" extra={<Button type="primary">Action</Button>}>
                    <Card>Page content goes here</Card>
                </PageContainer>
            </div>
        ),
    },
    "pro-table": {
        id: "pro-table",
        name: "ProTable",
        description: "Advanced table with search and actions.",
        usage: `import { ProTable } from "@ant-design/pro-components";

<ProTable columns={columns} request={fetchData} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg overflow-x-auto">
                <ProTable
                    columns={[
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Status', dataIndex: 'status', valueType: 'select', valueEnum: { 0: 'Draft', 1: 'Published' } },
                    ]}
                    dataSource={[{ name: 'John', status: 1 }, { name: 'Jane', status: 0 }]}
                    rowKey="name"
                    search={false}
                    pagination={false}
                />
            </div>
        ),
    },
    "pro-list": {
        id: "pro-list",
        name: "ProList",
        description: "Advanced list component.",
        usage: `import { ProList } from "@ant-design/pro-components";

<ProList dataSource={data} metas={{ title: {}, description: {} }} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <ProList
                    dataSource={[
                        { title: 'Item 1', desc: 'Description 1' },
                        { title: 'Item 2', desc: 'Description 2' },
                    ]}
                    metas={{
                        title: { dataIndex: 'title' },
                        description: { dataIndex: 'desc' },
                    }}
                />
            </div>
        ),
    },
    "pro-descriptions": {
        id: "pro-descriptions",
        name: "ProDescriptions",
        description: "Advanced descriptions component.",
        usage: `import { ProDescriptions } from "@ant-design/pro-components";

<ProDescriptions dataSource={data} columns={columns} />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <ProDescriptions
                    title="User Info"
                    dataSource={{ name: 'John Doe', email: 'john@example.com' }}
                    columns={[
                        { title: 'Name', dataIndex: 'name' },
                        { title: 'Email', dataIndex: 'email' },
                    ]}
                />
            </div>
        ),
    },
    "pro-card": {
        id: "pro-card",
        name: "ProCard",
        description: "Enhanced card component.",
        usage: `import { ProCard } from "@ant-design/pro-components";

<ProCard title="Title" bordered>Content</ProCard>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <ProCard title="ProCard Title" bordered extra={<a href="#">More</a>}>
                    ProCard content with enhanced features
                </ProCard>
            </div>
        ),
    },
    "pro-form": {
        id: "pro-form",
        name: "ProForm",
        description: "Advanced form component.",
        usage: `import { ProForm, ProFormText } from "@ant-design/pro-components";

<ProForm>
  <ProFormText name="name" label="Name" />
</ProForm>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <ProForm layout="inline" submitter={false}>
                    <ProFormText name="name" label="Name" placeholder="Enter name" />
                    <ProFormSelect
                        name="type"
                        label="Type"
                        options={[
                            { value: '1', label: 'Type A' },
                            { value: '2', label: 'Type B' },
                        ]}
                    />
                </ProForm>
            </div>
        ),
    },
    "pro-form-fields": {
        id: "pro-form-fields",
        name: "ProForm Fields",
        description: "Various ProForm field components.",
        usage: `import { ProFormText, ProFormSelect, ProFormDatePicker } from "@ant-design/pro-components";

<ProFormText name="text" label="Text" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space orientation="vertical">
                    <ProFormText name="text" placeholder="ProFormText" />
                    <ProFormSelect
                        name="select"
                        placeholder="ProFormSelect"
                        options={[{ value: 'a', label: 'Option A' }]}
                    />
                </Space>
            </div>
        ),
    },
    "pro-form-list": {
        id: "pro-form-list",
        name: "ProFormList",
        description: "Dynamic form list component.",
        usage: `import { ProFormList, ProFormText } from "@ant-design/pro-components";

<ProFormList name="list">
  <ProFormText name="item" />
</ProFormList>`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <p className="text-gray-600">ProFormList allows dynamic adding/removing of form items</p>
            </div>
        ),
    },
    "pro-skeleton": {
        id: "pro-skeleton",
        name: "ProSkeleton",
        description: "Pro-level skeleton loading.",
        usage: `import { ProSkeleton } from "@ant-design/pro-components";

<ProSkeleton type="list" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <ProSkeleton type="list" />
            </div>
        ),
    },
    "pro-field": {
        id: "pro-field",
        name: "ProField",
        description: "Field display component.",
        usage: `import { ProField } from "@ant-design/pro-components";

<ProField text="value" mode="read" valueType="text" />`,
        demo: (
            <div className="p-6 bg-white rounded-lg">
                <Space orientation="vertical">
                    <div>
                        <span className="text-gray-500 text-sm">Text:</span>
                        <span className="ml-2">Text Value</span>
                    </div>
                    <div>
                        <span className="text-gray-500 text-sm">Date:</span>
                        <span className="ml-2">2023-12-25</span>
                    </div>
                </Space>
            </div>
        ),
    },
    // ReactBits Components
    "rb-split-text": {
        id: "rb-split-text",
        name: "Split Text",
        description: "A text animation component that splits text into characters, words, or lines and animates them individually with GSAP. Supports scroll-triggered animations.",
        usage: `import SplitText from "@/components/SplitText";

<SplitText
  text="Hello World!"
  className="text-4xl font-bold"
  delay={50}
  duration={0.5}
/>`,
        demo: (
            <div className="h-40 w-full bg-neutral-900 flex items-center justify-center overflow-hidden rounded-md relative">
                <SplitText
                    text="Split Text Animation"
                    className="text-3xl font-bold text-white"
                    delay={50}
                    duration={0.5}
                />
            </div>
        ),
    },
    "rb-blur-text": {
        id: "rb-blur-text",
        name: "Blur Text",
        description: "A text animation that reveals text with a blur effect. Characters or words animate from blurred to clear state.",
        usage: `import BlurText from "@/components/BlurText";

<BlurText
  text="Blur Animation"
  className="text-4xl font-bold"
  delay={100}
/>`,
        demo: (
            <div className="h-40 w-full bg-neutral-900 flex items-center justify-center overflow-hidden rounded-md relative">
                <BlurText
                    text="Blur Text Animation"
                    className="text-3xl font-bold text-white"
                    delay={100}
                />
            </div>
        ),
    },
    "rb-tilted-card": {
        id: "rb-tilted-card",
        name: "Tilted Card",
        description: "A 3D card component with tilt effect on hover. The card rotates based on mouse position for an interactive experience.",
        usage: `import TiltedCard from "@/components/TiltedCard";

<TiltedCard
  imageSrc="/image.jpg"
  altText="Card Image"
/>`,
        demo: (
            <div className="h-64 w-full bg-neutral-900 flex items-center justify-center overflow-hidden rounded-md relative p-4">
                <TiltedCard
                    imageSrc="https://picsum.photos/400/300"
                    altText="Sample Image"
                    captionText="Hover to tilt"
                    containerHeight="200px"
                    containerWidth="280px"
                    imageHeight="200px"
                    imageWidth="280px"
                    scaleOnHover={1.1}
                    rotateAmplitude={12}
                />
            </div>
        ),
    },
    "rb-aurora": {
        id: "rb-aurora",
        name: "Aurora",
        description: "A beautiful aurora borealis background effect created with WebGL shaders. Creates flowing, colorful gradients.",
        usage: `import Aurora from "@/components/Aurora";

<Aurora
  colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
  blend={0.5}
  amplitude={1.0}
  speed={0.5}
/>`,
        demo: (
            <div className="h-64 w-full overflow-hidden rounded-md relative">
                <Aurora
                    colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
                    blend={0.5}
                    amplitude={1.0}
                    speed={0.5}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold z-10">Aurora Background</span>
                </div>
            </div>
        ),
    },
    "rb-animated-content": {
        id: "rb-animated-content",
        name: "Animated Content",
        description: "A wrapper component that animates content into view when it enters the viewport. Supports various animation directions and effects.",
        usage: `import AnimatedContent from "@/components/AnimatedContent";

<AnimatedContent
  distance={100}
  direction="vertical"
  reverse={false}
>
  <YourContent />
</AnimatedContent>`,
        demo: (
            <div className="h-40 w-full bg-neutral-900 flex items-center justify-center overflow-hidden rounded-md relative">
                <AnimatedContent
                    distance={50}
                    direction="vertical"
                    reverse={false}
                >
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-lg">
                        <p className="text-white font-semibold">Animated Content</p>
                    </div>
                </AnimatedContent>
            </div>
        ),
    },
};

// Mapping of component IDs to their Aceternity UI URLs
const aceternityUrls: Record<string, string> = {
    "aurora-background": "aurora-background",
    "background-beams": "background-beams",
    "background-beams-with-collision": "background-beams-with-collision",
    "background-boxes": "background-boxes",
    "background-gradient": "background-gradient",
    "background-gradient-animation": "background-gradient-animation",
    "background-lines": "background-lines",
    "background-ripple-effect": "background-ripple-effect",
    "canvas-reveal-effect": "canvas-reveal-effect",
    "dither-shader": "dither-shader",
    "glowing-effect": "glowing-effect",
    "grid-background": "grid-and-dot-backgrounds",
    "hero-highlight": "hero-highlight",
    "lamp": "lamp-effect",
    "meteors": "meteors",
    "noise-background": "noise-background",
    "shooting-stars": "shooting-stars-and-stars-background",
    "sparkles": "sparkles",
    "spotlight": "spotlight",
    "spotlight-new": "spotlight-new",
    "svg-mask-effect": "svg-mask-effect",
    "tracing-beam": "tracing-beam",
    "vortex": "vortex",
    "wavy-background": "wavy-background",
    "3d-card": "3d-card-effect",
    "bento-grid": "bento-grid",
    "card-hover-effect": "card-hover-effect",
    "card-spotlight": "card-spotlight",
    "card-stack": "card-stack",
    "comet-card": "comet-card",
    "direction-aware-hover": "direction-aware-hover",
    "draggable-card": "draggable-card",
    "evervault-card": "evervault-card",
    "expandable-card": "expandable-card",
    "focus-cards": "focus-cards",
    "glare-card": "glare-card",
    "glowing-stars": "glowing-stars-effect",
    "pixelated-canvas": "pixelated-canvas",
    "tooltip-card": "tooltip-card",
    "wobble-card": "wobble-card",
    "colourful-text": "colourful-text",
    "container-text-flip": "container-text-flip",
    "encrypted-text": "encrypted-text",
    "flip-words": "flip-words",
    "gradient-text": "gradient-text",
    "text-generate-effect": "text-generate-effect",
    "text-hover-effect": "text-hover-effect",
    "text-reveal-card": "text-reveal-card",
    "typewriter-effect": "typewriter-effect",
    "floating-dock": "floating-dock",
    "floating-navbar": "floating-navbar",
    "navbar-menu": "navbar-menu",
    "resizable-navbar": "resizable-navbar",
    "sidebar": "sidebar",
    "sticky-banner": "sticky-banner",
    "tabs": "tabs",
    "container-scroll-animation": "container-scroll-animation",
    "google-gemini-effect": "google-gemini-effect",
    "hero-parallax": "hero-parallax",
    "macbook-scroll": "macbook-scroll",
    "parallax-scroll": "parallax-scroll",
    "sticky-scroll-reveal": "sticky-scroll-reveal",
    "apple-cards-carousel": "apple-cards-carousel",
    "carousel": "carousel",
    "images-slider": "images-slider",
    "infinite-moving-cards": "infinite-moving-cards",
    "container-cover": "container-cover",
    "layout-grid": "layout-grid",
    "animated-modal": "animated-modal",
    "animated-tooltip": "animated-tooltip",
    "link-preview": "link-preview",
    "file-upload": "file-upload",
    "placeholders-and-vanish-input": "placeholders-and-vanish-input",
    "signup-form": "signup-form",
    "loader": "loader",
    "multi-step-loader": "multi-step-loader",
    "hover-border-gradient": "hover-border-gradient",
    "moving-border": "moving-border",
    "tailwind-buttons": "tailwindcss-buttons",
    "code-block": "code-block",
    "compare": "compare",
    "github-globe": "github-globe",
    "timeline": "timeline",
    "world-map": "world-map",
    "3d-marquee": "3d-marquee",
    "3d-pin": "3d-pin",
    "following-pointer": "following-pointer",
    "lens": "lens",
    "animated-testimonials": "animated-testimonials",
};

// Mapping of Ant Design component IDs to their documentation URLs
const antdUrls: Record<string, string> = {
    "antd-button": "button",
    "antd-float-button": "float-button",
    "antd-icon": "icon",
    "antd-typography": "typography",
    "antd-divider": "divider",
    "antd-flex": "flex",
    "antd-grid": "grid",
    "antd-layout": "layout",
    "antd-space": "space",
    "antd-splitter": "splitter",
    "antd-anchor": "anchor",
    "antd-breadcrumb": "breadcrumb",
    "antd-dropdown": "dropdown",
    "antd-menu": "menu",
    "antd-pagination": "pagination",
    "antd-steps": "steps",
    "antd-autocomplete": "auto-complete",
    "antd-cascader": "cascader",
    "antd-checkbox": "checkbox",
    "antd-color-picker": "color-picker",
    "antd-date-picker": "date-picker",
    "antd-form": "form",
    "antd-input": "input",
    "antd-input-number": "input-number",
    "antd-mentions": "mentions",
    "antd-radio": "radio",
    "antd-rate": "rate",
    "antd-select": "select",
    "antd-slider": "slider",
    "antd-switch": "switch",
    "antd-time-picker": "time-picker",
    "antd-transfer": "transfer",
    "antd-tree-select": "tree-select",
    "antd-upload": "upload",
    "antd-avatar": "avatar",
    "antd-badge": "badge",
    "antd-calendar": "calendar",
    "antd-card": "card",
    "antd-carousel": "carousel",
    "antd-collapse": "collapse",
    "antd-descriptions": "descriptions",
    "antd-empty": "empty",
    "antd-image": "image",
    "antd-list": "list",
    "antd-popover": "popover",
    "antd-qrcode": "qrcode",
    "antd-segmented": "segmented",
    "antd-statistic": "statistic",
    "antd-table": "table",
    "antd-tabs": "tabs",
    "antd-tag": "tag",
    "antd-timeline": "timeline",
    "antd-tooltip": "tooltip",
    "antd-tour": "tour",
    "antd-tree": "tree",
    "antd-alert": "alert",
    "antd-drawer": "drawer",
    "antd-message": "message",
    "antd-modal": "modal",
    "antd-notification": "notification",
    "antd-popconfirm": "popconfirm",
    "antd-progress": "progress",
    "antd-result": "result",
    "antd-skeleton": "skeleton",
    "antd-spin": "spin",
    "antd-watermark": "watermark",
    "antd-affix": "affix",
    "antd-app": "app",
    "antd-config-provider": "config-provider",
};

// Mapping of ProComponents IDs to their documentation URLs
const proComponentUrls: Record<string, string> = {
    "pro-layout": "layout",
    "pro-page-container": "page-container",
    "pro-table": "table",
    "pro-list": "list",
    "pro-descriptions": "descriptions",
    "pro-card": "card",
    "pro-form": "form",
    "pro-form-fields": "form",
    "pro-form-list": "form",
    "pro-skeleton": "skeleton",
    "pro-field": "field",
};

// Helper function to determine component library type
const getLibraryType = (componentId: string): "aceternity" | "antd" | "procomponents" => {
    if (componentId.startsWith("antd-")) return "antd";
    if (componentId.startsWith("pro-")) return "procomponents";
    return "aceternity";
};

interface ComponentContentProps {
    componentId: string | null;
}

export function ComponentContent({ componentId }: ComponentContentProps) {
    const [showIframe, setShowIframe] = React.useState(true);

    if (!componentId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="text-6xl mb-4">🎨</div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to Component Showcase</h2>
                <p className="text-neutral-400 max-w-md">
                    Select a component from the sidebar to view its description, usage example, and live demo.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4 text-sm text-neutral-500">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">89</div>
                        <div>Components</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">15</div>
                        <div>Categories</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-500">100%</div>
                        <div>TypeScript</div>
                    </div>
                </div>
            </div>
        );
    }

    // Check if this is a ProComponent - use new Ant Design style layout
    const proComponentData = proComponentsDataMap[componentId];
    if (proComponentData) {
        return <AntdStyleContent componentData={proComponentData} />;
    }

    // Check if this is an Ant Design component with new demo layout
    const antdComponentData = antdComponentsDataMap[componentId];
    if (antdComponentData) {
        return <AntdStyleContent componentData={antdComponentData} />;
    }

    const demo = componentDemos[componentId];
    const libraryType = getLibraryType(componentId);

    // Get documentation URL based on library type
    const getDocUrl = () => {
        switch (libraryType) {
            case "antd":
                const antdPath = antdUrls[componentId];
                return antdPath ? `https://ant.design/components/${antdPath}` : null;
            case "procomponents":
                const proPath = proComponentUrls[componentId];
                return proPath ? `https://procomponents.ant.design/components/${proPath}` : null;
            default:
                const aceternityPath = aceternityUrls[componentId];
                return aceternityPath ? `https://ui.aceternity.com/components/${aceternityPath}` : null;
        }
    };

    const fullDocUrl = getDocUrl();
    const libraryLabel = libraryType === "antd" ? "Ant Design" : libraryType === "procomponents" ? "ProComponents" : "Aceternity UI";
    const libraryColor = libraryType === "antd" ? "bg-blue-500" : libraryType === "procomponents" ? "bg-orange-500" : "bg-purple-500";

    // Component without demo - show iframe with installation and props
    if (!demo) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-bold text-white">{componentId}</h1>
                    {fullDocUrl && (
                        <a
                            href={fullDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-400 hover:text-blue-300"
                        >
                            Open in new tab ↗
                        </a>
                    )}
                </div>
                <p className="text-neutral-400 mb-2">
                    The component is installed and ready to use.
                </p>
                <p className="text-sm text-neutral-500 mb-6">
                    Import: <code className="bg-neutral-800 px-2 py-1 rounded">@/components/ui/{componentId}</code>
                </p>

                {/* Side by Side Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Local Installation Preview */}
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Local Installation
                        </h3>
                        <div className="border border-neutral-800 rounded-xl overflow-hidden h-[300px] bg-gradient-to-br from-neutral-900 to-neutral-950 flex flex-col items-center justify-center">
                            <div className="text-center p-6">
                                <div className="text-4xl mb-4">✅</div>
                                <p className="text-white font-medium mb-2">Component Installed</p>
                                <p className="text-neutral-400 text-sm mb-4">
                                    Ready to use in your project
                                </p>
                                <code className="bg-neutral-800 text-green-400 px-3 py-2 rounded-lg text-sm">
                                    import {"{"} ... {"}"} from &quot;@/components/ui/{componentId}&quot;
                                </code>
                            </div>
                        </div>
                    </div>

                    {/* Aceternity UI iframe */}
                    {fullDocUrl && (
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className={`w-2 h-2 ${libraryColor} rounded-full`}></span>
                                Official {libraryLabel}
                            </h3>
                            <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900 h-[300px]">
                                <iframe
                                    src={fullDocUrl}
                                    className="w-full h-full"
                                    title={`Aceternity UI - ${componentId}`}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Installation Section with CLI/Manual Tabs */}
                <InstallationSection
                    componentId={componentId}
                    aceternityUrl={fullDocUrl || undefined}
                    meta={componentMeta[componentId]}
                />

                {/* Props Table */}
                {componentMeta[componentId]?.props && componentMeta[componentId].props.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                            Props
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full border border-neutral-800 rounded-xl overflow-hidden">
                                <thead className="bg-neutral-900">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-neutral-300 border-b border-neutral-800">Prop</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-neutral-300 border-b border-neutral-800">Type</th>
                                        <th className="text-left px-4 py-3 text-sm font-medium text-neutral-300 border-b border-neutral-800">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {componentMeta[componentId].props.map((prop, idx) => (
                                        <tr key={prop.name} className={idx % 2 === 0 ? "bg-neutral-950" : "bg-neutral-900/50"}>
                                            <td className="px-4 py-3 text-sm">
                                                <code className="text-purple-400 bg-neutral-800 px-2 py-0.5 rounded">{prop.name}</code>
                                                {prop.required && <span className="ml-2 text-xs text-red-400">*required</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <code className="text-blue-400 bg-neutral-800 px-2 py-0.5 rounded">{prop.type}</code>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-neutral-400">
                                                {prop.description}
                                                {prop.default && (
                                                    <span className="ml-2 text-neutral-500">
                                                        (default: <code className="text-green-400">{prop.default}</code>)
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold text-white">{demo.name}</h1>
                {fullDocUrl && (
                    <a
                        href={fullDocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:text-blue-300"
                    >
                        Open in new tab ↗
                    </a>
                )}
            </div>
            <p className="text-neutral-400 mb-8">{demo.description}</p>

            {/* Side by Side Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Local Demo */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Local Installation
                    </h3>
                    <div className="border border-neutral-800 rounded-xl overflow-hidden h-[300px]">
                        {demo.demo}
                    </div>
                </div>

                {/* Aceternity UI iframe */}
                {fullDocUrl && (
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <span className={`w-2 h-2 ${libraryColor} rounded-full`}></span>
                            Official {libraryLabel}
                            <button
                                onClick={() => setShowIframe(!showIframe)}
                                className="ml-auto text-xs px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400"
                            >
                                {showIframe ? "Hide" : "Show"}
                            </button>
                        </h3>
                        <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-900 h-[300px]">
                            {showIframe ? (
                                <iframe
                                    src={fullDocUrl}
                                    className="w-full h-full"
                                    title={`Aceternity UI - ${componentId}`}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-neutral-500">
                                    <a href={fullDocUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400">
                                        {fullDocUrl}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Usage Section */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Usage
                </h3>
                <pre className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 overflow-x-auto">
                    <code className="text-sm text-neutral-300">{demo.usage}</code>
                </pre>
            </div>

            {/* Installation Section with CLI/Manual Tabs */}
            <InstallationSection
                componentId={componentId}
                aceternityUrl={fullDocUrl || undefined}
                meta={componentMeta[componentId]}
            />

            {/* Props Table */}
            {componentMeta[componentId]?.props && componentMeta[componentId].props.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                        Props
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full border border-neutral-800 rounded-xl overflow-hidden">
                            <thead className="bg-neutral-900">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-300 border-b border-neutral-800">Prop</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-300 border-b border-neutral-800">Type</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-neutral-300 border-b border-neutral-800">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {componentMeta[componentId].props.map((prop, idx) => (
                                    <tr key={prop.name} className={idx % 2 === 0 ? "bg-neutral-950" : "bg-neutral-900/50"}>
                                        <td className="px-4 py-3 text-sm">
                                            <code className="text-purple-400 bg-neutral-800 px-2 py-0.5 rounded">{prop.name}</code>
                                            {prop.required && <span className="ml-2 text-xs text-red-400">*required</span>}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <code className="text-blue-400 bg-neutral-800 px-2 py-0.5 rounded">{prop.type}</code>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-400">
                                            {prop.description}
                                            {prop.default && (
                                                <span className="ml-2 text-neutral-500">
                                                    (default: <code className="text-green-400">{prop.default}</code>)
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export { componentDemos, aceternityUrls };

