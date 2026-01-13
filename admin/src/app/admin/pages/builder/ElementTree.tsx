"use client";

import React, { useEffect, useState } from "react";
import { Tree } from "antd";
import type { DataNode } from "antd/es/tree";
import { PageBlock, GridRow, getElementTree } from "./types";
import mediaService, { MediaFile } from "@/lib/mediaService";

interface PageStructureProps {
    blocks: PageBlock[];
    selectedBlockId: string | null;
    selectedElement: string | null;
    selectedMediaId: string | null;
    onSelectBlock: (blockId: string) => void;
    onSelectElement: (elementKey: string) => void;
    onSelectMedia?: (mediaId: string) => void;
}

export const PageStructure: React.FC<PageStructureProps> = ({
    blocks,
    selectedBlockId,
    selectedElement,
    selectedMediaId,
    onSelectBlock,
    onSelectElement,
    onSelectMedia,
}) => {
    // State for media files fetched via GraphQL
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);

    // Load media on component mount
    useEffect(() => {
        const fetchMedia = async () => {
            try {
                const data = await mediaService.getMedia();
                setMediaFiles(data);
            } catch (err) {
                console.error("Failed to load media", err);
            }
        };
        fetchMedia();
    }, []);

    // Helper to build tree for a block's sub-elements
    const buildElementChildren = (block: PageBlock): DataNode[] => {
        const elements = getElementTree(block);
        return elements.map((el) => ({
            key: `${block.id}:${el.key}`,
            title: <span style={{ fontSize: 12 }}>{el.icon} {el.label}</span>,
            isLeaf: !el.children?.length,
        }));
    };

    // Helper to build tree for grid container rows/columns
    const buildGridTree = (block: PageBlock): DataNode[] => {
        const rows = (block.props.rows as GridRow[]) || [];
        if (rows.length === 0) return [];

        return rows.map((row, rowIndex) => ({
            key: `${block.id}:row-${rowIndex}`,
            title: <span style={{ fontSize: 12 }}>📊 Row {rowIndex + 1}</span>,
            children: row.columns.map((col, colIndex) => {
                const colNode: DataNode = {
                    key: `${block.id}:row-${rowIndex}:col-${colIndex}`,
                    title: (
                        <span style={{ fontSize: 12 }}>
                            📐 Col {colIndex + 1} <span style={{ color: '#888', fontSize: 10 }}>(span: {col.span})</span>
                        </span>
                    ),
                    children: col.block ? [{
                        key: `${block.id}:row-${rowIndex}:col-${colIndex}:block`,
                        title: <span style={{ fontSize: 12 }}>{col.block.icon} {col.block.name}</span>,
                        children: buildElementChildren(col.block),
                    }] : [],
                };
                return colNode;
            }),
        }));
    };

    // Build tree for a single block (container level)
    const buildBlockTree = (block: PageBlock): DataNode => {
        const isGridContainer = block.type === "gridContainer";

        return {
            key: block.id,
            title: (
                <span style={{ fontWeight: selectedBlockId === block.id ? 600 : 400 }}>
                    {block.icon} {block.name}
                </span>
            ),
            children: isGridContainer
                ? buildGridTree(block)
                : buildElementChildren(block),
        };
    };

    // Build the full page tree
    const treeData: DataNode[] = [
        {
            key: "page-root",
            title: <span style={{ fontWeight: 600 }}>📄 Page</span>,
            children: blocks.length > 0
                ? blocks.map(block => buildBlockTree(block))
                : [{ key: "empty", title: <span style={{ color: '#999' }}>No blocks added</span>, isLeaf: true }],
        },
        {
            key: "media-root",
            title: <span style={{ fontWeight: 600 }}>🖼️ Media Library</span>,
            children: mediaFiles.map(file => ({
                key: `media:${file.id}`,
                title: <span style={{ fontSize: 12 }}>{file.filename}</span>,
                isLeaf: true,
            })),
        },
    ];

    const handleSelect = (selectedKeys: React.Key[]) => {
        if (selectedKeys.length === 0) return;

        const key = String(selectedKeys[0]);

        // Media node selection
        if (key.startsWith('media:')) {
            const mediaId = key.split(':')[1];
            if (onSelectMedia) onSelectMedia(mediaId);
            return;
        }

        // Parse the key to determine what was selected
        if (key === "page-root" || key === "empty") return;

        // Check if it's a block ID (no colon)
        if (!key.includes(":")) {
            onSelectBlock(key);
            onSelectElement("container");
            return;
        }

        // It's a sub-element like "blockId:elementKey" or "blockId:row-0:col-0"
        const parts = key.split(":");
        const blockId = parts[0];
        onSelectBlock(blockId);

        // Determine element key
        if (parts.length >= 2) {
            const elementKey = parts.slice(1).join(":");
            onSelectElement(elementKey);
        }
    };

    // Build selected keys based on current selection
    const buildSelectedKeys = (): string[] => {
        if (!selectedBlockId && !selectedMediaId) return [];
        // Media selection takes precedence
        if (selectedMediaId) {
            return [`media:${selectedMediaId}`];
        }
        if (!selectedElement || selectedElement === "container") {
            return [selectedBlockId!];
        }
        return [`${selectedBlockId!}:${selectedElement}`];
    };

    return (
        <div style={{ padding: 8, maxHeight: 400, overflow: "auto" }}>
            <Tree
                treeData={treeData}
                defaultExpandAll
                selectedKeys={buildSelectedKeys()}
                onSelect={handleSelect}
                style={{ fontSize: 12 }}
                showLine={{ showLeafIcon: false }}
            />
        </div>
    );
};

// Legacy alias for backward compatibility
export const ElementTree = PageStructure;
