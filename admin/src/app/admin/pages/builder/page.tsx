"use client";

import React, { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Row,
    Col,
    Card,
    Button,
    Space,
    Input,
    Divider,
    message,
    Drawer,
    Tabs,
    Spin,
    Tooltip,
    Collapse,
    Modal,
} from "antd";
import {
    DragOutlined,
    EyeOutlined,
    SaveOutlined,
    DeleteOutlined,
    SettingOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    AppstoreOutlined,
    EditOutlined,
    ToolOutlined,
    LayoutOutlined,
    StarOutlined,
    DownloadOutlined,
    UploadOutlined,
    CloudUploadOutlined,
    LeftOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { DnDProvider, DraggableLibraryBlock, SortableBlock, CanvasDropZone } from "@/components/dnd/DragDropComponents";
import pageService from "@/lib/pageService";
import { FloatingPanel, DockPosition } from "@/components/builder/FloatingPanel";

// Import types and upgraded components
import { PageBlock, BlockProps, blockDefaults } from "./types";
import { BlockRenderer } from "./BlockRenderer";
import { PropertyEditor } from "./PropertyEditor";
import { ElementTree, PageStructure } from "./ElementTree";
import { BlockThumbnail } from "./BlockThumbnail";

// Block categories with nested subcategories
const blockCategories = [
    {
        key: "favorites",
        label: "Favorites",
        icon: <StarOutlined />,
        subcategories: [
            { name: "My Favorites", blocks: [] }
        ],
    },
    {
        key: "layout",
        label: "Layout",
        icon: <LayoutOutlined />,
        subcategories: [
            {
                name: "Grid Layouts",
                blocks: [
                    { type: "gridContainer", name: "2 Columns", icon: "⬜", layoutPreset: { rows: [{ columns: [{ span: 12, block: null }, { span: 12, block: null }] }] } },
                    { type: "gridContainer", name: "3 Columns", icon: "⬜", layoutPreset: { rows: [{ columns: [{ span: 8, block: null }, { span: 8, block: null }, { span: 8, block: null }] }] } },
                    { type: "gridContainer", name: "4 Columns", icon: "⬜", layoutPreset: { rows: [{ columns: [{ span: 6, block: null }, { span: 6, block: null }, { span: 6, block: null }, { span: 6, block: null }] }] } },
                ],
            },
            {
                name: "Sidebar Layouts",
                blocks: [
                    { type: "gridContainer", name: "Sidebar Left", icon: "◧", layoutPreset: { rows: [{ columns: [{ span: 6, block: null }, { span: 18, block: null }] }] } },
                    { type: "gridContainer", name: "Sidebar Right", icon: "◨", layoutPreset: { rows: [{ columns: [{ span: 18, block: null }, { span: 6, block: null }] }] } },
                ],
            },
            {
                name: "Complex Layouts",
                blocks: [
                    { type: "gridContainer", name: "Hero + Cards", icon: "🃏", layoutPreset: { rows: [{ columns: [{ span: 24, block: null }] }, { columns: [{ span: 8, block: null }, { span: 8, block: null }, { span: 8, block: null }] }] } },
                    { type: "gridContainer", name: "2x2 Grid", icon: "⊞", layoutPreset: { rows: [{ columns: [{ span: 12, block: null }, { span: 12, block: null }] }, { columns: [{ span: 12, block: null }, { span: 12, block: null }] }] } },
                ],
            },
        ],
    },
    {
        key: "content",
        label: "Content",
        icon: <EditOutlined />,
        subcategories: [
            {
                name: "Text & Media",
                blocks: [
                    { type: "text", name: "Text Block", icon: "📝" },
                    { type: "gallery", name: "Gallery", icon: "🖼️" },
                ],
            },
            {
                name: "Sections",
                blocks: [
                    { type: "hero", name: "Hero Banner", icon: "🎨" },
                    { type: "features", name: "Features", icon: "📦" },
                    { type: "testimonials", name: "Testimonials", icon: "💬" },
                    { type: "pricing", name: "Pricing", icon: "💰" },
                    { type: "contact", name: "Contact", icon: "📧" },
                ],
            },
        ],
    },
    {
        key: "widget",
        label: "Widgets",
        icon: <ToolOutlined />,
        subcategories: [
            {
                name: "Interactive",
                blocks: [
                    { type: "dock", name: "Floating Dock", icon: "🚀" },
                    { type: "chat", name: "Chat Widget", icon: "💬" },
                    { type: "counter", name: "Counter", icon: "📊" },
                ],
            },
            {
                name: "Navigation",
                blocks: [
                    { type: "navigation", name: "Navbar", icon: "🧭" },
                    { type: "footer", name: "Footer", icon: "📋" },
                ],
            },
        ],
    },
];

// Pre-built templates with preview
const pageTemplates = [
    {
        id: "hero-cta",
        name: "Hero + CTA",
        preview: "🎯",
        description: "Hero banner with call-to-action button",
        blocks: [
            { type: "hero", name: "Hero", icon: "🎨", props: {} },
        ],
    },
    {
        id: "features-grid",
        name: "Features Grid",
        preview: "📦",
        description: "3-column feature cards layout",
        blocks: [
            { type: "gridContainer", name: "3 Columns", icon: "⬜", layoutPreset: { rows: [{ columns: [{ span: 8, block: null }, { span: 8, block: null }, { span: 8, block: null }] }] } },
        ],
    },
    {
        id: "testimonials",
        name: "Testimonials",
        preview: "💬",
        description: "Customer testimonial section",
        blocks: [
            { type: "testimonials", name: "Testimonials", icon: "💬", props: {} },
        ],
    },
    {
        id: "pricing",
        name: "Pricing Cards",
        preview: "💰",
        description: "Pricing comparison cards",
        blocks: [
            { type: "pricing", name: "Pricing", icon: "💰", props: {} },
        ],
    },
    {
        id: "contact",
        name: "Contact Form",
        preview: "📧",
        description: "Contact form with info",
        blocks: [
            { type: "contact", name: "Contact", icon: "📧", props: {} },
        ],
    },
    {
        id: "landing-full",
        name: "Full Landing Page",
        preview: "🌐",
        description: "Complete landing page template",
        blocks: [
            { type: "navigation", name: "Navbar", icon: "🧭", props: {} },
            { type: "hero", name: "Hero", icon: "🎨", props: {} },
            { type: "features", name: "Features", icon: "📦", props: {} },
            { type: "testimonials", name: "Testimonials", icon: "💬", props: {} },
            { type: "pricing", name: "Pricing", icon: "💰", props: {} },
            { type: "contact", name: "Contact", icon: "📧", props: {} },
            { type: "footer", name: "Footer", icon: "📋", props: {} },
        ],
    },
];



function PageBuilderContent() {
    const searchParams = useSearchParams();
    const pageId = searchParams.get("id");

    const [blocks, setBlocks] = useState<PageBlock[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pageTitle, setPageTitle] = useState("Untitled Page");
    const [hasChanges, setHasChanges] = useState(false);
    const [sidebarView, setSidebarView] = useState<'library' | 'properties'>('library');

    // Panel states
    const [libraryDock, setLibraryDock] = useState<DockPosition>('left');
    const [structureDock, setStructureDock] = useState<DockPosition>('float');
    const [libraryMinimized, setLibraryMinimized] = useState(false);
    const [structureMinimized, setStructureMinimized] = useState(false);
    const [templatePreview, setTemplatePreview] = useState<typeof pageTemplates[0] | null>(null);

    const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

    // Auto-switch sidebar when block selected
    useEffect(() => {
        if (selectedBlockId) {
            setSidebarView('properties');
        }
    }, [selectedBlockId]);

    // Reset selected element when block changes
    const handleBlockSelect = (blockId: string) => {
        if (blockId !== selectedBlockId) {
            setSelectedElement(null);
        }
        setSelectedBlockId(blockId);
    };

    // Load page if editing existing
    useEffect(() => {
        if (pageId) {
            loadPage(pageId);
        }
    }, [pageId]);

    const loadPage = async (id: string) => {
        const page = await pageService.getPage(id);
        if (page) {
            setPageTitle(page.title);
            // Convert content to PageBlock format
            const loadedBlocks: PageBlock[] = (page.content as any[]).map((block: any) => ({
                id: block.id || `block-${Date.now()}-${Math.random()}`,
                type: block.type,
                name: block.type.charAt(0).toUpperCase() + block.type.slice(1),
                icon: getBlockIcon(block.type),
                props: block.props || blockDefaults[block.type] || {},
            }));
            setBlocks(loadedBlocks);
        }
    };

    const getBlockIcon = (type: string): string => {
        const allBlocks = blockCategories.flatMap(c => c.subcategories.flatMap(s => s.blocks));
        return allBlocks.find(b => b.type === type)?.icon || "📦";
    };

    const addBlock = (type: string, name: string, icon: string, layoutPreset?: any) => {
        const baseProps = blockDefaults[type] ? { ...blockDefaults[type] } : {};
        // If layoutPreset provided (for grid layouts), merge it with baseProps
        const props = layoutPreset ? { ...baseProps, ...layoutPreset } : baseProps;
        const newBlock: PageBlock = {
            id: `block-${Date.now()}`,
            type,
            name,
            icon,
            props,
        };
        setBlocks([...blocks, newBlock]);
        setSelectedBlockId(newBlock.id);
        setHasChanges(true);
        message.success(`Added ${name}`);
    };

    const removeBlock = (id: string) => {
        setBlocks(blocks.filter((b) => b.id !== id));
        if (selectedBlockId === id) {
            setSelectedBlockId(null);
        }
        setHasChanges(true);
        message.info("Block removed");
    };

    const moveBlock = useCallback((dragIndex: number, hoverIndex: number) => {
        const newBlocks = [...blocks];
        const draggedBlock = newBlocks[dragIndex];
        newBlocks.splice(dragIndex, 1);
        newBlocks.splice(hoverIndex, 0, draggedBlock);
        setBlocks(newBlocks);
        setHasChanges(true);
    }, [blocks]);

    const updateBlockProps = (props: BlockProps) => {
        if (!selectedBlockId) return;
        setBlocks(blocks.map(b =>
            b.id === selectedBlockId ? { ...b, props } : b
        ));
        setHasChanges(true);
    };

    // Add a block to a specific grid cell (row/column)
    const addBlockToGridCell = useCallback((
        parentBlockId: string,
        rowIndex: number,
        colIndex: number,
        blockType: string,
        blockName: string,
        blockIcon: string
    ) => {
        setBlocks(prevBlocks => prevBlocks.map(block => {
            if (block.id === parentBlockId && block.type === "gridContainer") {
                const rows = [...((block.props.rows as any[]) || [])];
                if (rows[rowIndex]) {
                    const columns = [...rows[rowIndex].columns];
                    const newBlock: PageBlock = {
                        id: `block-${Date.now()}-${rowIndex}-${colIndex}`,
                        type: blockType,
                        name: blockName,
                        icon: blockIcon,
                        props: blockDefaults[blockType] ? { ...blockDefaults[blockType] } : {},
                    };
                    columns[colIndex] = { ...columns[colIndex], block: newBlock };
                    rows[rowIndex] = { ...rows[rowIndex], columns };
                    return { ...block, props: { ...block.props, rows } };
                }
            }
            return block;
        }));
        setHasChanges(true);
        message.success(`Added ${blockName} to row ${rowIndex + 1}, column ${colIndex + 1}`);
    }, []);

    const handleDropFromLibrary = (item: { type: string; name: string; icon: string }) => {
        addBlock(item.type, item.name, item.icon);
    };

    const savePage = async () => {
        setSaving(true);
        try {
            // Convert blocks to storage format
            const content = blocks.map(b => ({
                id: b.id,
                type: b.type,
                props: b.props,
            }));

            if (pageId) {
                // Update existing page
                await pageService.savePageContent(pageId, content as any);
            } else {
                // Create new page
                const newPage = await pageService.createPage({
                    title: pageTitle,
                    content: content as any,
                });
                if (newPage) {
                    // Update URL with new page ID
                    window.history.replaceState({}, "", `/admin/pages/builder?id=${newPage.id}`);
                }
            }
            setHasChanges(false);
            message.success("Page saved successfully!");
        } catch (error) {
            message.error("Failed to save page");
        }
        setSaving(false);
    };

    // Export page as JSON file
    const exportPage = () => {
        const pageData = {
            title: pageTitle,
            version: "1.0",
            exportedAt: new Date().toISOString(),
            blocks: blocks.map(b => ({
                id: b.id,
                type: b.type,
                name: b.name,
                icon: b.icon,
                props: b.props,
            })),
        };
        const blob = new Blob([JSON.stringify(pageData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${pageTitle.replace(/\s+/g, "_").toLowerCase()}_page.json`;
        a.click();
        URL.revokeObjectURL(url);
        message.success("Page exported successfully!");
    };

    // Import page from JSON file
    const importPage = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    if (data.blocks && Array.isArray(data.blocks)) {
                        setBlocks(data.blocks);
                        if (data.title) setPageTitle(data.title);
                        setHasChanges(true);
                        message.success("Page imported successfully!");
                    } else {
                        message.error("Invalid page file format");
                    }
                } catch {
                    message.error("Failed to parse page file");
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    // Publish page (save as published)
    const publishPage = async () => {
        setSaving(true);
        try {
            const content = blocks.map(b => ({
                id: b.id,
                type: b.type,
                props: b.props,
            }));

            if (pageId) {
                await pageService.savePageContent(pageId, content as any);
                // Mark as published (update status if pageService supports it)
                message.success("Page published successfully!");
            } else {
                // Create and publish
                const newPage = await pageService.createPage({
                    title: pageTitle,
                    content: content as any,
                });
                if (newPage) {
                    window.history.replaceState({}, "", `/admin/pages/builder?id=${newPage.id}`);
                    message.success("Page created and published!");
                }
            }
            setHasChanges(false);
        } catch (error) {
            message.error("Failed to publish page");
        }
        setSaving(false);
    };

    // Add template to canvas with preview first
    const handleTemplateClick = (template: typeof pageTemplates[0]) => {
        setTemplatePreview(template);
    };

    const applyTemplate = () => {
        if (!templatePreview) return;
        const newBlocks: PageBlock[] = templatePreview.blocks.map((b, idx) => ({
            id: `block-${Date.now()}-${idx}`,
            type: b.type,
            name: b.name,
            icon: b.icon,
            props: (b as any).props || blockDefaults[b.type] || {},
        }));
        setBlocks([...blocks, ...newBlocks]);
        setHasChanges(true);
        setTemplatePreview(null);
        message.success(`Added ${templatePreview.name} template`);
    };

    // Build library items with nested Collapse
    const blockLibraryItems = [
        ...blockCategories.map(cat => ({
            key: cat.key,
            label: <Tooltip title={cat.label} placement="right">{cat.icon}</Tooltip>,
            children: (
                <Collapse
                    ghost
                    size="small"
                    defaultActiveKey={cat.subcategories.map((_, i) => i.toString())}
                    items={cat.subcategories.map((subcat, i) => ({
                        key: i.toString(),
                        label: <span style={{ fontSize: 12, fontWeight: 500 }}>{subcat.name}</span>,
                        children: subcat.blocks.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {subcat.blocks.map((block, idx) => (
                                    <DraggableLibraryBlock
                                        key={`${block.type}-${idx}`}
                                        item={block}
                                    >
                                        <BlockThumbnail
                                            type={block.type}
                                            name={block.name}
                                            icon={block.icon}
                                            onClick={() => addBlock(block.type, block.name, block.icon, (block as any).layoutPreset)}
                                        />
                                    </DraggableLibraryBlock>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: "center", padding: 12, color: "#999", fontSize: 11 }}>
                                No blocks in this category
                            </div>
                        ),
                    }))}
                />
            ),
        })),
        // Templates tab
        {
            key: "templates",
            label: <Tooltip title="Templates" placement="right"><AppstoreOutlined /></Tooltip>,
            children: (
                <div style={{ padding: 8 }}>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>
                        Pre-built page sections. Click to preview.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {pageTemplates.map(template => (
                            <div
                                key={template.id}
                                onClick={() => handleTemplateClick(template)}
                                style={{
                                    padding: 12,
                                    border: '1px solid #e8e8e8',
                                    borderRadius: 8,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: '#fafafa',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#667eea';
                                    e.currentTarget.style.background = '#f0f2ff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e8e8e8';
                                    e.currentTarget.style.background = '#fafafa';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 20 }}>{template.preview}</span>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 12 }}>{template.name}</div>
                                        <div style={{ fontSize: 10, color: '#999' }}>{template.description}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
    ];

    return (
        <CMSLayout
            title={
                <Input
                    value={pageTitle}
                    onChange={(e) => {
                        setPageTitle(e.target.value);
                        setHasChanges(true);
                    }}
                    variant="borderless"
                    style={{ fontSize: 20, fontWeight: 600, width: 300 }}
                />
            }
            subTitle="Drag blocks to build your page"
            extra={[
                <Tooltip key="import-tip" title="Import Page">
                    <Button
                        key="import"
                        icon={<UploadOutlined />}
                        onClick={importPage}
                    />
                </Tooltip>,
                <Tooltip key="export-tip" title="Export Page">
                    <Button
                        key="export"
                        icon={<DownloadOutlined />}
                        onClick={exportPage}
                        disabled={blocks.length === 0}
                    />
                </Tooltip>,
                <Button
                    key="preview"
                    icon={<EyeOutlined />}
                    onClick={() => setPreviewMode(!previewMode)}
                    type={previewMode ? "primary" : "default"}
                >
                    {previewMode ? "Edit" : "Preview"}
                </Button>,
                <Button
                    key="save"
                    icon={saving ? <Spin size="small" /> : <SaveOutlined />}
                    onClick={savePage}
                    disabled={saving}
                >
                    {hasChanges ? "Save" : "Saved"}
                </Button>,
                <Button
                    key="publish"
                    type="primary"
                    icon={<CloudUploadOutlined />}
                    onClick={publishPage}
                    disabled={saving || blocks.length === 0}
                >
                    Publish
                </Button>,
            ]}
        >
            {/* Canvas - Full width with dynamic margins based on docked panels */}
            <div
                style={{
                    marginLeft: libraryDock === 'left' && !libraryMinimized ? 320 : 0,
                    marginRight: (libraryDock === 'right' && !libraryMinimized) || (structureDock === 'right' && !structureMinimized) ? 320 : 0,
                    transition: 'margin 0.2s ease',
                    height: 'calc(100vh - 120px)',
                    padding: 16,
                }}
            >
                <Card
                    title={previewMode ? "Preview" : "Canvas"}
                    size="small"
                    style={{ height: '100%', overflow: 'hidden' }}
                    extra={!previewMode && <DragOutlined />}
                    bodyStyle={{ height: 'calc(100% - 40px)', padding: 24, background: '#f5f5f5', overflowY: 'auto' }}
                >
                    <CanvasDropZone
                        onDrop={handleDropFromLibrary}
                        isEmpty={blocks.length === 0}
                    >
                        {blocks.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: previewMode ? 0 : 8 }}>
                                {blocks.map((block, index) => (
                                    <SortableBlock
                                        key={block.id}
                                        id={block.id}
                                        index={index}
                                        moveBlock={moveBlock}
                                    >
                                        <div
                                            style={{
                                                border: previewMode ? "none" : (selectedBlockId === block.id
                                                    ? "2px solid #1677ff"
                                                    : "1px solid #d9d9d9"),
                                                borderRadius: previewMode ? 0 : 4,
                                                overflow: "hidden",
                                                cursor: previewMode ? "default" : "pointer",
                                                position: "relative",
                                                background: '#fff'
                                            }}
                                            onClick={() => !previewMode && handleBlockSelect(block.id)}
                                        >
                                            <BlockRenderer
                                                block={block}
                                                selectedElement={selectedBlockId === block.id ? selectedElement : null}
                                                onSelectElement={setSelectedElement}
                                                editMode={!previewMode && selectedBlockId === block.id}
                                                onDropToCell={addBlockToGridCell}
                                            />

                                            {!previewMode && selectedBlockId === block.id && (
                                                <div style={{
                                                    position: "absolute",
                                                    top: 4,
                                                    right: 4,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    zIndex: 20,
                                                    background: "rgba(255,255,255,0.9)",
                                                    padding: "2px 4px",
                                                    borderRadius: 4,
                                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                                }}>
                                                    <span style={{ fontSize: 11, fontWeight: 600, marginRight: 4, color: "#1677ff" }}>{block.name}</span>
                                                    <Button
                                                        size="small"
                                                        icon={<ArrowUpOutlined />}
                                                        disabled={index === 0}
                                                        onClick={(e) => { e.stopPropagation(); moveBlock(index, index - 1); }}
                                                    />
                                                    <Button
                                                        size="small"
                                                        icon={<ArrowDownOutlined />}
                                                        disabled={index === blocks.length - 1}
                                                        onClick={(e) => { e.stopPropagation(); moveBlock(index, index + 1); }}
                                                    />
                                                    <Button
                                                        size="small"
                                                        icon={<SettingOutlined />}
                                                        onClick={(e) => { e.stopPropagation(); setSidebarView('properties'); }}
                                                    />
                                                    <Button
                                                        size="small"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </SortableBlock>
                                ))}
                            </div>
                        )}
                    </CanvasDropZone>
                </Card>
            </div>

            {/* Floating Block Library Panel */}
            {!previewMode && (
                <FloatingPanel
                    id="library"
                    title={sidebarView === 'properties' ? 'Properties' : 'Block Library'}
                    icon={sidebarView === 'properties' ? <SettingOutlined /> : <DragOutlined />}
                    dockPosition={libraryDock}
                    onDockChange={setLibraryDock}
                    minimized={libraryMinimized}
                    onMinimizedChange={setLibraryMinimized}
                >
                    {/* Inner Card - headless for content */}
                    <Card
                        bordered={false}
                        bodyStyle={{ padding: 0, height: '100%' }}
                        style={{ background: 'transparent', height: '100%' }}
                    >
                        {sidebarView === 'library' ? (
                            <Tabs
                                items={blockLibraryItems}
                                size="small"
                                tabPosition="left"
                                style={{ height: '100%' }}
                                tabBarStyle={{
                                    width: 48,
                                    borderRight: 'none',
                                    background: 'transparent',
                                }}
                            />
                        ) : (
                            <div style={{ padding: 12 }}>
                                <Button
                                    type="text"
                                    icon={<LeftOutlined />}
                                    size="small"
                                    onClick={() => setSidebarView('library')}
                                    style={{ marginBottom: 12 }}
                                >
                                    Back to Library
                                </Button>
                                {selectedBlock ? (
                                    <PropertyEditor
                                        block={selectedBlock}
                                        selectedElement={selectedElement}
                                        onUpdate={updateBlockProps}
                                    />
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
                                        Select a block to edit
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </FloatingPanel>
            )}

            {/* Floating Page Structure Panel */}
            {!previewMode && (
                <FloatingPanel
                    id="structure"
                    title="Page Structure"
                    icon={<AppstoreOutlined />}
                    dockPosition={structureDock}
                    onDockChange={setStructureDock}
                    minimized={structureMinimized}
                    onMinimizedChange={setStructureMinimized}
                    defaultWidth={280}
                >
                    {/* Content directly - no extra title needed */}
                    <PageStructure
                        blocks={blocks}
                        selectedBlockId={selectedBlockId}
                        selectedElement={selectedElement}
                        selectedMediaId={null}
                        onSelectBlock={handleBlockSelect}
                        onSelectElement={setSelectedElement}
                    />
                </FloatingPanel>
            )}

            {/* Template Preview Modal */}
            <Modal
                title={templatePreview ? `Template: ${templatePreview.name}` : 'Template Preview'}
                open={!!templatePreview}
                onCancel={() => setTemplatePreview(null)}
                onOk={applyTemplate}
                okText="Add to Page"
                width={480}
            >
                {templatePreview && (
                    <div>
                        <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                            {templatePreview.description}
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Blocks included:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {templatePreview.blocks.map((block, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        padding: 8,
                                        background: '#f5f5f5',
                                        borderRadius: 4,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8
                                    }}
                                >
                                    <span>{block.icon}</span>
                                    <span>{block.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Mobile Properties Drawer */}
            <Drawer
                title="Block Properties"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                placement="right"
                size="default"
            >
                <PropertyEditor
                    block={selectedBlock}
                    selectedElement={selectedElement}
                    onUpdate={updateBlockProps}
                />
            </Drawer>
        </CMSLayout >
    );
}

// Wrap with DnD Provider and Suspense for useSearchParams
export default function PageBuilderPage() {
    return (
        <DnDProvider>
            <Suspense fallback={<div style={{ padding: 48, textAlign: 'center' }}>Loading page builder...</div>}>
                <PageBuilderContent />
            </Suspense>
        </DnDProvider>
    );
}
