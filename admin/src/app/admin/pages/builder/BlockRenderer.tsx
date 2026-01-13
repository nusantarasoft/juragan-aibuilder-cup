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

            case "footer":
                return (
                    <div className="bg-slate-100 dark:bg-slate-900 p-8 text-center">
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
