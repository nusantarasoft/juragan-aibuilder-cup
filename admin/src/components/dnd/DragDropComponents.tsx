"use client";

import React, { useRef } from "react";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Item type for drag and drop
export const ItemTypes = {
    BLOCK: "block",
    LIBRARY_BLOCK: "library_block",
};

// Wrapper type for library items
interface LibraryItem {
    type: string;
    name: string;
    icon: string;
}

// Draggable block from library
interface DraggableLibraryBlockProps {
    item: LibraryItem;
    children: React.ReactNode;
}

export const DraggableLibraryBlock: React.FC<DraggableLibraryBlockProps> = ({ item, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.LIBRARY_BLOCK,
        item: { type: item.type, name: item.name, icon: item.icon },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    drag(ref);

    return (
        <div
            ref={ref}
            style={{
                opacity: isDragging ? 0.5 : 1,
                cursor: "grab",
            }}
        >
            {children}
        </div>
    );
};

// Sortable block in canvas
interface SortableBlockProps {
    id: string;
    index: number;
    moveBlock: (dragIndex: number, hoverIndex: number) => void;
    children: React.ReactNode;
}

interface DragItem {
    index: number;
    id: string;
    type: string;
}

export const SortableBlock: React.FC<SortableBlockProps> = ({ id, index, moveBlock, children }) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: string | symbol | null }>({
        accept: ItemTypes.BLOCK,
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        hover(item: DragItem, monitor) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }

            // Determine rectangle on screen
            const hoverBoundingRect = ref.current?.getBoundingClientRect();

            // Get vertical middle
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

            // Determine mouse position
            const clientOffset = monitor.getClientOffset();

            // Get pixels to the top
            const hoverClientY = (clientOffset?.y || 0) - hoverBoundingRect.top;

            // Only perform the move when the mouse has crossed half of the items height
            // When dragging downwards, only move when the cursor is below 50%
            // When dragging upwards, only move when the cursor is above 50%
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }

            // Time to actually perform the action
            moveBlock(dragIndex, hoverIndex);

            // Note: we're mutating the monitor item here!
            // Generally it's better to avoid mutations,
            // but it's good here for the sake of performance
            // to avoid expensive index searches.
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.BLOCK,
        item: () => {
            return { id, index };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(drop(ref));

    return (
        <div
            ref={ref}
            data-handler-id={handlerId}
            style={{
                opacity: isDragging ? 0.4 : 1,
                cursor: "move",
            }}
        >
            {children}
        </div>
    );
};

// Drop zone for canvas
interface CanvasDropZoneProps {
    onDrop: (item: LibraryItem) => void;
    children: React.ReactNode;
    isEmpty: boolean;
}

export const CanvasDropZone: React.FC<CanvasDropZoneProps> = ({ onDrop, children, isEmpty }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isOver, canDrop, isDirectlyOver }, drop] = useDrop(() => ({
        accept: ItemTypes.LIBRARY_BLOCK,
        drop: (item: LibraryItem, monitor) => {
            // Only handle drop if dropping directly on canvas, not on nested drop zones
            if (monitor.didDrop()) {
                // A nested drop zone already handled this drop
                return;
            }
            onDrop(item);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
            isDirectlyOver: monitor.isOver({ shallow: true }),
        }),
    }));

    drop(ref);

    const isActive = isDirectlyOver && canDrop;

    return (
        <div
            ref={ref}
            style={{
                minHeight: isEmpty ? 300 : "auto",
                background: isActive ? "rgba(22, 119, 255, 0.1)" : isEmpty ? "#fafafa" : "transparent",
                border: isActive ? "2px dashed #1677ff" : isEmpty ? "2px dashed #d9d9d9" : "none",
                borderRadius: 8,
                transition: "all 0.2s",
            }}
        >
            {isEmpty && !isActive && (
                <div style={{
                    textAlign: "center",
                    padding: 60,
                    color: "#999"
                }}>
                    Drag blocks here to start building
                </div>
            )}
            {isActive && isEmpty && (
                <div style={{
                    textAlign: "center",
                    padding: 60,
                    color: "#1677ff"
                }}>
                    Drop to add block
                </div>
            )}
            {!isEmpty && children}
        </div>
    );
};

// DnD Provider wrapper
export const DnDProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <DndProvider backend={HTML5Backend}>
            {children}
        </DndProvider>
    );
};

export default DnDProvider;
