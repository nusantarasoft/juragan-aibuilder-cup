"use client";

import React from "react";
import { useDrag, useDrop } from "react-dnd";

interface DraggableElementProps {
    elementKey: string;
    index: number;
    children: React.ReactNode;
    isSelected: boolean;
    editMode: boolean;
    onSelect: (key: string) => void;
    onMove: (dragIndex: number, hoverIndex: number) => void;
}

export const DraggableElement: React.FC<DraggableElementProps> = ({
    elementKey,
    index,
    children,
    isSelected,
    editMode,
    onSelect,
    onMove,
}) => {
    const ref = React.useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag({
        type: "BLOCK_ELEMENT",
        item: { elementKey, index },
        canDrag: editMode,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const [{ isOver }, drop] = useDrop({
        accept: "BLOCK_ELEMENT",
        canDrop: () => editMode,
        hover: (item: { elementKey: string; index: number }) => {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            onMove(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    });

    drag(drop(ref));

    const handleClick = (e: React.MouseEvent) => {
        if (editMode) {
            e.stopPropagation();
            onSelect(elementKey);
        }
    };

    return (
        <div
            ref={ref}
            onClick={handleClick}
            style={{
                opacity: isDragging ? 0.5 : 1,
                cursor: editMode ? "grab" : "default",
                border: isSelected ? "2px solid #1677ff" : isOver ? "2px dashed #1677ff" : "2px solid transparent",
                borderRadius: 4,
                transition: "border 0.15s ease",
                position: "relative",
            }}
        >
            {editMode && isSelected && (
                <div
                    style={{
                        position: "absolute",
                        top: -10,
                        left: 4,
                        background: "#1677ff",
                        color: "white",
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 3,
                        zIndex: 10,
                    }}
                >
                    {elementKey}
                </div>
            )}
            {children}
        </div>
    );
};
