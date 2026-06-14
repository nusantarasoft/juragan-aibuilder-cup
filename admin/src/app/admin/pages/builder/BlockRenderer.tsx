import React from "react";
import { PageBlock, BlockProps, GridRow, GridColumn } from "./types";
import { Button, Row, Col } from "antd";
import { useDrop } from "react-dnd";

// Map Aceternity/MagicUI components
import { AuroraBackground } from "@/components/ui/aurora-background";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { BentoGrid, BentoGridItem } from "@/components/magicui/bento-grid";
import { FloatingDock } from "@/components/ui/floating-dock";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Marquee } from "@/components/magicui/marquee";
import { Globe } from "@/components/magicui/globe";
import { cn } from "@/lib/utils";
import { IconLayoutGrid, IconSignature, IconTableColumn } from "@tabler/icons-react";

interface BlockRendererProps {
    block: PageBlock;
    selectedElement?: string | null;
    onSelectElement?: (key: string) => void;
    editMode?: boolean;
    onDropToCell?: (parentBlockId: string, rowIndex: number, colIndex: number, blockType: string, blockName: string, blockIcon: string) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
    block,
    selectedElement,
    onSelectElement,
    editMode = false,
    onDropToCell,
}) => {
    const { type, props } = block;

    // Wrapper for clickable/selectable elements in edit mode
    const SelectableElement: React.FC<{
        elementKey: string;
        children: React.ReactNode;
        style?: React.CSSProperties;
        className?: string;
    }> = ({ elementKey, children, style, className }) => {
        const isSelected = selectedElement === elementKey;

        const handleClick = (e: React.MouseEvent) => {
            if (editMode && onSelectElement) {
                e.stopPropagation();
                onSelectElement(elementKey);
            }
        };

        return (
            <div
                onClick={handleClick}
                className={className}
                style={{
                    ...style,
                    cursor: editMode ? "pointer" : "default",
                    outline: isSelected ? "2px solid #1677ff" : "none",
                    outlineOffset: 2,
                    borderRadius: 4,
                    transition: "outline 0.15s ease",
                }}
            >
                {children}
                {editMode && isSelected && (
                    <span style={{
                        position: "absolute",
                        top: -8,
                        left: 4,
                        background: "#1677ff",
                        color: "white",
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 3,
                        zIndex: 10,
                    }}>
                        {elementKey}
                    </span>
                )}
            </div>
        );
    };

    const renderBlock = () => {
        // Extract granular styles
        const styles = (props.styles as Record<string, React.CSSProperties>) || {};

        switch (type) {
            case "navigation":
                return (
                    <div className="flex justify-between items-center p-4 bg-white/10 backdrop-blur-md border-b border-white/10" style={styles.container}>
                        <div className="font-bold text-xl">{String(props.logo)}</div>
                        <div className="flex gap-4">
                            {(props.links as string[])?.map((link, i) => (
                                <a key={i} href="#" className="hover:text-blue-500">{link}</a>
                            ))}
                        </div>
                    </div>
                );
            case "hero":
                const HeroContent = (
                    <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4" style={styles.content}>
                        <SelectableElement elementKey="title" style={{ position: "relative", ...styles.titleWrapper }}>
                            <TextGenerateEffect
                                words={String(props.title || "Hero Title")}
                                className="text-4xl md:text-6xl font-bold dark:text-white text-black"
                                styles={{ word: styles.title }}
                            />
                        </SelectableElement>
                        <SelectableElement elementKey="subtitle" style={{ position: "relative" }}>
                            <div className="font-extralight text-base md:text-2xl dark:text-neutral-200 py-4" style={styles.subtitle}>
                                {String(props.subtitle || "Subtitle here")}
                            </div>
                        </SelectableElement>
                        {props.ctaText && (
                            <SelectableElement elementKey="button" style={{ position: "relative" }}>
                                <button className="bg-black dark:bg-white rounded-full w-fit text-white dark:text-black px-4 py-2" style={styles.button}>
                                    {String(props.ctaText || "Click Me")}
                                </button>
                            </SelectableElement>
                        )}
                    </div>
                );

                if (props.showRadialGradient !== false) {
                    return (
                        <AuroraBackground showRadialGradient={true} className="h-[500px]">
                            {HeroContent}
                        </AuroraBackground>
                    );
                }
                return <div className="h-[40rem] w-full dark:bg-black bg-white  dark:bg-grid-white/[0.2] bg-grid-black/[0.2] relative flex items-center justify-center">{HeroContent}</div>;

            case "testimonials":
                const speed = (props.speed as "fast" | "normal" | "slow") || "normal";
                const direction = (props.direction as "left" | "right") || "left";
                // Map props items to InfiniteMovingCards format
                const testimonialItems = (props.items as any[])?.map(item => ({
                    quote: item.text || item.quote,
                    name: item.name,
                    title: item.role || item.title,
                })) || [];

                return (
                    <div className="h-[25rem] rounded-md flex flex-col antialiased bg-white dark:bg-black dark:bg-grid-white/[0.05] items-center justify-center relative overflow-hidden" style={styles.container}>
                        {props.title && <h2 className="text-3xl font-bold mb-8 z-10" style={styles.title}>{String(props.title)}</h2>}
                        <InfiniteMovingCards
                            items={testimonialItems}
                            direction={direction}
                            speed={speed}
                            pauseOnHover={props.autoPlay !== false}
                            styles={styles}
                        />
                    </div>
                );

            case "hero3d":
                const themeClass = props.theme === 'dark' ? 'bg-black text-white' : props.theme === 'light' ? 'bg-white text-black' : 'bg-gradient-to-br from-purple-900 to-indigo-900 text-white';
                return (
                    <div className={`relative w-full h-[500px] flex items-center justify-center overflow-hidden rounded-xl ${themeClass}`} style={styles.container}>
                        <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                        <div className="relative z-10 flex flex-col items-center text-center p-8 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-2xl">
                            <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400" style={styles.title}>
                                {String(props.title || "3D Interactive Hero")}
                            </h1>
                            <p className="text-xl font-light max-w-2xl opacity-80" style={styles.subtitle}>
                                {String(props.subtitle || "A premium glassmorphism 3D hero block.")}
                            </p>
                        </div>
                    </div>
                );

            case "bento":
                const bentoItems = (props.items as any[]) || [];
                const bentoThemeClass = props.theme?.toString().includes('dark') ? 'dark' : '';
                return (
                    <div className={`p-8 w-full bg-slate-50 dark:bg-slate-900 ${bentoThemeClass}`} style={styles.container}>
                        {props.title && <h2 className="text-3xl font-bold mb-8 text-center" style={styles.title}>{String(props.title)}</h2>}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
                            {bentoItems.map((item, i) => (
                                <div key={i} className={`p-6 rounded-3xl backdrop-blur-xl bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-lg flex flex-col items-start col-span-1 md:col-span-${item.colSpan || 1} transition-transform hover:scale-[1.02]`} style={styles.card}>
                                    <div className="text-4xl mb-4 p-3 bg-white/50 dark:bg-white/10 rounded-2xl">{item.icon || '✨'}</div>
                                    <h3 className="text-xl font-bold mb-2">{item.title || 'Feature'}</h3>
                                    <p className="text-sm opacity-70">{item.description || 'Description goes here'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case "glassPricing":
                const plans = (props.plans as any[]) || [];
                const colorMap: Record<string, string> = {
                    amethyst: 'from-purple-500/20 to-fuchsia-500/20',
                    sapphire: 'from-blue-500/20 to-cyan-500/20',
                    emerald: 'from-emerald-500/20 to-teal-500/20'
                };
                const bgGradient = colorMap[String(props.theme)] || colorMap['amethyst'];

                return (
                    <div className="w-full py-20 px-8 bg-slate-950 text-white relative overflow-hidden" style={styles.container}>
                        <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} blur-3xl opacity-50`}></div>
                        <div className="relative z-10 max-w-7xl mx-auto">
                            {props.title && <h2 className="text-4xl font-bold mb-12 text-center" style={styles.title}>{String(props.title)}</h2>}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {plans.map((plan, i) => (
                                    <div key={i} className={`relative p-8 rounded-3xl backdrop-blur-md bg-white/5 border ${plan.isPopular ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]' : 'border-white/10'} flex flex-col`} style={styles.card}>
                                        {plan.isPopular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</div>}
                                        <h3 className="text-2xl font-semibold mb-2">{plan.name || 'Plan'}</h3>
                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-5xl font-extrabold">${plan.price || '0'}</span>
                                            <span className="text-sm opacity-60">/mo</span>
                                        </div>
                                        <ul className="flex-1 space-y-4 mb-8">
                                            {(plan.features as any[])?.map((feat, j) => (
                                                <li key={j} className="flex items-center gap-3 text-sm opacity-80">
                                                    <span className="text-emerald-400">✓</span> {feat.value || feat}
                                                </li>
                                            ))}
                                        </ul>
                                        <button className={`w-full py-3 rounded-xl font-semibold transition-all ${plan.isPopular ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/10 hover:bg-white/20'}`}>
                                            Get Started
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case "products":
                const productLayout = props.layout === '4' ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3';
                const mockProducts = [
                    { id: 1, name: 'Premium Wireless Headphones', price: '$299', image: '🎧', tag: 'Bestseller' },
                    { id: 2, name: 'Ergonomic Office Chair', price: '$499', image: '🪑', tag: 'New' },
                    { id: 3, name: 'Smart Fitness Watch', price: '$199', image: '⌚', tag: 'Sale' },
                    { id: 4, name: 'Mechanical Keyboard', price: '$149', image: '⌨️', tag: 'Trending' }
                ].slice(0, props.layout === '4' ? 4 : 3);
                
                const cardStyle = props.theme === 'minimal' 
                    ? 'bg-white text-black border border-gray-100 shadow-sm' 
                    : props.theme === 'neu' 
                        ? 'bg-gray-100 text-gray-800 shadow-[inset_2px_2px_5px_#b8b9be,inset_-3px_-3px_7px_#ffffff]'
                        : 'backdrop-blur-xl bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 shadow-lg';

                return (
                    <div className="w-full py-16 px-8 bg-slate-50 dark:bg-slate-900" style={styles.container}>
                        <div className="max-w-7xl mx-auto">
                            {props.title && <h2 className="text-3xl font-bold mb-10 text-center text-slate-800 dark:text-slate-100" style={styles.title}>{String(props.title)}</h2>}
                            <div className={`grid ${productLayout} gap-8`}>
                                {mockProducts.map((prod) => (
                                    <div key={prod.id} className={`rounded-3xl p-6 flex flex-col items-center transition-transform hover:-translate-y-2 cursor-pointer ${cardStyle}`} style={styles.card}>
                                        <div className="absolute top-4 right-4 bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">{prod.tag}</div>
                                        <div className="text-8xl mb-6 py-8">{prod.image}</div>
                                        <h3 className="text-lg font-semibold mb-2 text-center">{prod.name}</h3>
                                        <span className="text-xl font-extrabold text-purple-500">{prod.price}</span>
                                        <button className="mt-6 w-full py-2 bg-slate-800 dark:bg-white dark:text-black text-white rounded-xl font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            Add to Cart
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case "leadForm":
                const formThemeClass = props.theme === 'clean' 
                    ? 'bg-white border-gray-200 text-gray-800 shadow-xl' 
                    : props.theme === 'dark' 
                        ? 'bg-slate-900 border-slate-700 text-white shadow-2xl'
                        : 'backdrop-blur-2xl bg-white/10 border-white/20 text-white shadow-[0_8px_32px_0_rgba(31,38,135,0.3)]';

                return (
                    <div className="w-full py-20 px-8 flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" style={styles.container}>
                        <div className={`w-full max-w-lg p-10 rounded-[2rem] border ${formThemeClass}`} style={styles.card}>
                            <h2 className="text-3xl font-extrabold mb-2" style={styles.title}>{String(props.title || "Get in Touch")}</h2>
                            <p className="opacity-80 mb-8" style={styles.subtitle}>{String(props.subtitle || "Fill out the form below and we'll get back to you.")}</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 opacity-80">Full Name</label>
                                    <input type="text" className="w-full px-4 py-3 rounded-xl bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 opacity-80">Email Address</label>
                                    <input type="email" className="w-full px-4 py-3 rounded-xl bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all" placeholder="john@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 opacity-80">Message</label>
                                    <textarea rows={4} className="w-full px-4 py-3 rounded-xl bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all" placeholder="How can we help you?"></textarea>
                                </div>
                                <button className="w-full py-4 mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95">
                                    {String(props.buttonText || "Submit")}
                                </button>
                            </div>
                            
                            <div className="mt-6 text-center text-xs opacity-60">
                                This form is securely connected to your {String(props.crmPipeline || "General")} CRM pipeline.
                            </div>
                        </div>
                    </div>
                );

            case "features":
                const gridItems = (props.items as any[]) || [];
                const cols = Number(props.columns) || 3;
                return (
                    <div className="p-8" style={styles.container}>
                        {props.title && <h2 className="text-3xl font-bold mb-8 text-center" style={styles.title}>{String(props.title)}</h2>}
                        <BentoGrid className={`grid-cols-1 md:grid-cols-${cols}`}>
                            {gridItems.map((item, i) => (
                                <BentoGridItem
                                    key={i}
                                    title={item.title}
                                    description={item.description}
                                    header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100" />}
                                    icon={<div className="text-2xl">{item.icon}</div>}
                                    className={i === 3 || i === 6 ? "md:col-span-2" : ""}
                                    styles={styles}
                                />
                            ))}
                        </BentoGrid>
                    </div>
                );

            case "dock":
                // Floating Dock expects { title, icon, href }
                // Current props might just be ["Icon1", "Icon2"] strings?
                // Or mapped from types.ts defaults. types.ts default was keys.
                // We need to construct valid items for FloatingDock.
                // For demo, we'll map simple strings to Icons.
                const dockItems = (props.items as string[])?.map(label => ({
                    title: label,
                    icon: (
                        <div className="h-full w-full flex items-center justify-center bg-gray-200 dark:bg-neutral-800 rounded-full">
                            {getDockIcon(label)}
                        </div>
                    ),
                    href: "#",
                })) || [];

                return (
                    <div className="relative h-[10rem] w-full flex items-center justify-center bg-gray-100 dark:bg-neutral-900 overflow-hidden" style={styles.container}>
                        <div className="absolute inset-0 pointer-events-none" />
                        <FloatingDock
                            items={dockItems}
                            // Only use desktop for simplicity in preview
                            desktopClassName="translate-y-0"
                            styles={styles}
                        />
                    </div>
                );

            case "navigation":
                return (
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                        <div className="font-bold text-xl">{String(props.logo)}</div>
                        <div className="flex gap-4">
                            {(props.links as string[])?.map((link, i) => (
                                <span key={i} className="cursor-pointer hover:text-blue-400">{link}</span>
                            ))}
                        </div>
                    </div>
                );

            case "marquee":
                const marqueeItems = (props.items as any[]) || [];
                return (
                    <div className="relative flex h-[300px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white dark:bg-black dark:border-white/10 md:shadow-xl" style={styles.container}>
                        <Marquee 
                            pauseOnHover={props.pauseOnHover !== false} 
                            reverse={props.reverse === true}
                            vertical={props.vertical === true}
                            className="[--duration:20s]"
                        >
                            {marqueeItems.map((item, i) => (
                                <div key={i} className={cn(
                                    "relative flex w-64 cursor-pointer flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border p-6",
                                    "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
                                    "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]"
                                )}>
                                    <span className="text-5xl">{item.icon}</span>
                                    <span className="text-xl font-bold">{item.text}</span>
                                </div>
                            ))}
                        </Marquee>
                        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white dark:from-black"></div>
                        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white dark:from-black"></div>
                    </div>
                );

            case "globe":
                return (
                    <div className="relative flex size-full max-w-lg items-center justify-center overflow-hidden rounded-lg border bg-background px-40 pb-40 pt-8 md:pb-60 md:shadow-xl mx-auto min-h-[400px]" style={styles.container}>
                        <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-6xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10">
                            {String(props.title || "Global Reach")}
                        </span>
                        <Globe className="top-28" />
                        <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
                    </div>
                );

            case "footer":
                return (
                    <div className="bg-slate-100 dark:bg-slate-900 p-8 text-center" style={styles.container}>
                        <p className="text-slate-600 dark:text-slate-400">{String(props.copyright)}</p>
                    </div>
                );

            case "gridContainer":
                const gutter = (props.gutter as [number, number]) || [16, 16];
                const gridRows = (props.rows as GridRow[]) || [];

                // Droppable cell component for each column
                const DroppableGridCell: React.FC<{
                    rowIndex: number;
                    colIndex: number;
                    cellBlock?: PageBlock | null;
                }> = ({ rowIndex, colIndex, cellBlock }) => {
                    const [{ isOver, canDrop }, drop] = useDrop(() => ({
                        accept: "library_block",
                        drop: (item: { type: string; name: string; icon: string }) => {
                            if (onDropToCell && editMode) {
                                onDropToCell(block.id, rowIndex, colIndex, item.type, item.name, item.icon);
                            }
                        },
                        canDrop: () => editMode && !cellBlock,
                        collect: (monitor) => ({
                            isOver: !!monitor.isOver(),
                            canDrop: !!monitor.canDrop(),
                        }),
                    }), [rowIndex, colIndex, cellBlock, onDropToCell, editMode, block.id]);

                    return (
                        <div
                            ref={drop as any}
                            className={`min-h-[80px] border rounded flex flex-col transition-all ${cellBlock
                                ? "p-2 bg-white dark:bg-gray-800 border-solid border-gray-200"
                                : "items-center justify-center border-dashed border-gray-300"
                                } ${isOver && canDrop ? "bg-blue-100 border-blue-400 border-2" : ""}`}
                            data-row-index={rowIndex}
                            data-col-index={colIndex}
                            data-parent-id={block.id}
                        >
                            {cellBlock ? (
                                <div className="w-full">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                        <span>{cellBlock.icon}</span>
                                        <span>{cellBlock.name}</span>
                                    </div>
                                    <BlockRenderer
                                        block={cellBlock}
                                        selectedElement={selectedElement}
                                        onSelectElement={onSelectElement}
                                        editMode={editMode}
                                        onDropToCell={onDropToCell}
                                    />
                                </div>
                            ) : (
                                <span className={`text-sm ${isOver && canDrop ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                                    {isOver && canDrop ? "Drop here!" : "+ Drop block"}
                                </span>
                            )}
                        </div>
                    );
                };

                return (
                    <div className="p-4 min-h-[100px] border-2 border-dashed border-gray-400 rounded-lg bg-gray-50 dark:bg-gray-900">
                        {gridRows.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                                No rows configured. Add rows in the settings panel.
                            </div>
                        ) : (
                            gridRows.map((row, rowIndex) => (
                                <Row key={rowIndex} gutter={gutter} style={{ marginBottom: rowIndex < gridRows.length - 1 ? gutter[1] : 0 }}>
                                    {row.columns.map((col, colIndex) => (
                                        <Col key={colIndex} span={col.span}>
                                            <DroppableGridCell
                                                rowIndex={rowIndex}
                                                colIndex={colIndex}
                                                cellBlock={col.block}
                                            />
                                        </Col>
                                    ))}
                                </Row>
                            ))
                        )}
                    </div>
                );

            default:
                return (
                    <div className="p-8 border-2 border-dashed border-gray-300 rounded text-center">
                        <span className="text-2xl mr-2">{block.icon}</span>
                        <h3 className="text-lg font-semibold">{block.name}</h3>
                        <p className="text-gray-500">Preview not available for this block type.</p>
                        <pre className="text-xs text-left mt-4 bg-gray-100 p-2 overflow-auto max-h-40">
                            {JSON.stringify(props, null, 2)}
                        </pre>
                    </div>
                );
        }
    };

    return <div className="w-full relative" style={props.style as React.CSSProperties}>{renderBlock()}</div>;
};

// Helper for dock icons
function getDockIcon(label: string) {
    // Return dummy icon based on label first char or generic
    return <span className="text-xl">{label[0]}</span>;
}
