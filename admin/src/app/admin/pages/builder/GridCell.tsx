"use client";

import React from "react";
import { useDrop } from "react-dnd";
import { PageBlock } from "./types";

interface GridCellProps {
    cellIndex: number;
    parentBlockId: string;
    children?: React.ReactNode;
    onDropBlock?: (blockType: string, cellIndex: number) => void;
    editMode?: boolean;
    style?: React.CSSProperties;
}

export const GridCell: React.FC<GridCellProps> = ({
    cellIndex,
    parentBlockId,
    children,
    onDropBlock,
    editMode = false,
    style,
}) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: "library_block",
        drop: (item: { type: string; name: string; icon: string }) => {
            if (onDropBlock) {
                onDropBlock(item.type, cellIndex);
            }
        },
        canDrop: () => editMode,
        collect: (monitor) => ({
            isOver: !!monitor.isOver(),
            canDrop: !!monitor.canDrop(),
        }),
    }), [cellIndex, onDropBlock, editMode]);

    const hasContent = React.Children.count(children) > 0;
    const isEmpty = !hasContent;

    return (
        <div
            ref={drop as any}
            className={`min-h-[80px] rounded transition-all ${isEmpty
                ? "border border-dashed border-gray-300"
                : "border border-solid border-gray-200"
                } ${isOver && canDrop ? "bg-blue-100 border-blue-400" : ""}`}
            style={{
                ...style,
                display: "flex",
                flexDirection: "column",
            }}
        >
            {isEmpty ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm py-4">
                    {isOver && canDrop ? (
                        <span className="text-blue-600 font-medium">Drop here!</span>
                    ) : (
                        <span>+ Drop block here</span>
                    )}
                </div>
            ) : (
                children
            )}
        </div>
    );
};

export default GridCell;
