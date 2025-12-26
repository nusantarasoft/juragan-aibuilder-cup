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
    Empty,
    Input,
    Form,
    Divider,
    Switch,
    message,
    Drawer,
    Tabs,
    Modal,
    Spin,
} from "antd";
import {
    PlusOutlined,
    DragOutlined,
    EyeOutlined,
    SaveOutlined,
    DeleteOutlined,
    SettingOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    CloudUploadOutlined,
} from "@ant-design/icons";
import { DnDProvider, DraggableLibraryBlock, SortableBlock, CanvasDropZone } from "@/components/dnd/DragDropComponents";
import pageService from "@/lib/pageService";

// Block type definitions
interface BlockProps {
    [key: string]: string | number | boolean | string[] | object;
}

interface PageBlock {
    id: string;
    type: string;
    name: string;
    icon: string;
    props: BlockProps;
}

// Default props for each block type
const blockDefaults: Record<string, BlockProps> = {
    navigation: {
        logo: "Nusantarasoft",
        links: ["Home", "About", "Services", "Contact"],
        sticky: true,
        transparent: false,
    },
    hero: {
        title: "Welcome to Our Website",
        subtitle: "Build amazing experiences with our platform",
        ctaText: "Get Started",
        ctaLink: "#",
        backgroundUrl: "",
        overlay: true,
    },
    footer: {
        copyright: "© 2024 Nusantarasoft. All rights reserved.",
        showSocials: true,
        facebook: "",
        twitter: "",
        instagram: "",
    },
    text: {
        content: "Enter your text here...",
        align: "left",
    },
    features: {
        title: "Our Features",
        columns: 3,
        items: [
            { title: "Feature 1", description: "Description here", icon: "🚀" },
            { title: "Feature 2", description: "Description here", icon: "⚡" },
            { title: "Feature 3", description: "Description here", icon: "🎯" },
        ],
    },
    testimonials: {
        title: "What Our Clients Say",
        autoPlay: true,
        items: [
            { name: "John Doe", role: "CEO", text: "Amazing service!", avatar: "" },
        ],
    },
    pricing: {
        title: "Pricing Plans",
        plans: [
            { name: "Basic", price: "$9", features: ["Feature 1", "Feature 2"] },
            { name: "Pro", price: "$29", features: ["All Basic", "Feature 3", "Feature 4"] },
        ],
    },
    gallery: {
        title: "Gallery",
        layout: "grid",
        columns: 3,
        images: [],
    },
    contact: {
        title: "Contact Us",
        email: "contact@example.com",
        showMap: false,
    },
    dock: {
        items: ["🏠", "📧", "🔍", "⚙️"],
        position: "bottom",
        size: "medium",
    },
    games: {
        game: "snake",
        enabled: true,
    },
    chat: {
        enabled: true,
        title: "Chat with us",
        position: "bottom-right",
    },
    counter: {
        items: [
            { label: "Users", value: 1000, suffix: "+" },
            { label: "Projects", value: 500, suffix: "+" },
        ],
    },
};

// Available block types
const blockCategories = [
    {
        key: "template",
        label: "Template",
        blocks: [
            { type: "navigation", name: "Navigation", icon: "🧭" },
            { type: "hero", name: "Hero Banner", icon: "🎨" },
            { type: "footer", name: "Footer", icon: "📋" },
        ],
    },
    {
        key: "content",
        label: "Content",
        blocks: [
            { type: "text", name: "Text Block", icon: "📝" },
            { type: "features", name: "Features", icon: "📦" },
            { type: "testimonials", name: "Testimonials", icon: "💬" },
            { type: "pricing", name: "Pricing", icon: "💰" },
            { type: "gallery", name: "Gallery", icon: "🖼️" },
            { type: "contact", name: "Contact", icon: "📧" },
        ],
    },
    {
        key: "widget",
        label: "Widgets",
        blocks: [
            { type: "dock", name: "Floating Dock", icon: "🚀" },
            { type: "games", name: "Mini Games", icon: "🎮" },
            { type: "chat", name: "Chat", icon: "💬" },
            { type: "counter", name: "Counter", icon: "📊" },
        ],
    },
];

// Block Preview Component
const BlockPreview = ({ block }: { block: PageBlock }) => {
    const previewStyles: Record<string, React.CSSProperties> = {
        navigation: {
            background: "#001529",
            color: "white",
            padding: "12px 24px",
            display: "flex",
            justifyContent: "space-between",
        },
        hero: {
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            padding: "48px 24px",
            textAlign: "center",
        },
        footer: {
            background: "#f5f5f5",
            padding: "24px",
            textAlign: "center",
        },
        text: {
            padding: "16px",
            background: "white",
        },
        features: {
            padding: "24px",
            background: "#fafafa",
        },
        testimonials: {
            padding: "24px",
            background: "#f0f2f5",
            fontStyle: "italic",
        },
        pricing: {
            padding: "24px",
            background: "white",
        },
        gallery: {
            padding: "16px",
            background: "#fafafa",
        },
        contact: {
            padding: "24px",
            background: "#e6f7ff",
        },
        dock: {
            padding: "12px",
            background: "rgba(0,0,0,0.1)",
            borderRadius: "16px",
            display: "flex",
            gap: "8px",
            justifyContent: "center",
        },
        games: {
            padding: "24px",
            background: "#f6ffed",
            textAlign: "center",
        },
        chat: {
            padding: "12px",
            background: "#1890ff",
            color: "white",
            borderRadius: "8px",
        },
        counter: {
            padding: "24px",
            background: "#fff7e6",
            display: "flex",
            justifyContent: "space-around",
        },
    };

    const renderPreview = () => {
        switch (block.type) {
            case "navigation":
                return (
                    <div style={previewStyles.navigation}>
                        <strong>{String(block.props.logo || "Logo")}</strong>
                        <span>Menu Links</span>
                    </div>
                );
            case "hero":
                return (
                    <div style={previewStyles.hero}>
                        <h2 style={{ margin: 0 }}>{String(block.props.title)}</h2>
                        <p>{String(block.props.subtitle)}</p>
                        <Button type="primary">{String(block.props.ctaText)}</Button>
                    </div>
                );
            case "footer":
                return (
                    <div style={previewStyles.footer}>
                        <p>{String(block.props.copyright)}</p>
                    </div>
                );
            case "text":
                return (
                    <div style={previewStyles.text}>
                        <p>{String(block.props.content)}</p>
                    </div>
                );
            case "features":
                return (
                    <div style={previewStyles.features}>
                        <h3>{String(block.props.title)}</h3>
                        <div style={{ display: "flex", gap: 16 }}>
                            {(block.props.items as Array<{ title: string; icon: string }>)?.slice(0, 3).map((item, i) => (
                                <div key={i} style={{ flex: 1 }}>
                                    <span style={{ fontSize: 24 }}>{item.icon}</span>
                                    <div>{item.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case "dock":
                return (
                    <div style={previewStyles.dock}>
                        {(block.props.items as string[])?.map((icon, i) => (
                            <span key={i} style={{ fontSize: 24, padding: "8px" }}>{icon}</span>
                        ))}
                    </div>
                );
            default:
                return (
                    <div style={{ padding: 16, background: "#f5f5f5" }}>
                        <span style={{ fontSize: 24, marginRight: 8 }}>{block.icon}</span>
                        {block.name}
                    </div>
                );
        }
    };

    return <div>{renderPreview()}</div>;
};

// Property Editor Component
const PropertyEditor = ({
    block,
    onUpdate
}: {
    block: PageBlock | null;
    onUpdate: (props: BlockProps) => void;
}) => {
    if (!block) {
        return <Empty description="Select a block to edit" />;
    }

    const renderEditor = () => {
        switch (block.type) {
            case "navigation":
                return (
                    <Form layout="vertical" initialValues={block.props}>
                        <Form.Item label="Logo Text">
                            <Input
                                value={String(block.props.logo)}
                                onChange={(e) => onUpdate({ ...block.props, logo: e.target.value })}
                            />
                        </Form.Item>
                        <Form.Item label="Sticky Header">
                            <Switch
                                checked={Boolean(block.props.sticky)}
                                onChange={(val) => onUpdate({ ...block.props, sticky: val })}
                            />
                        </Form.Item>
                        <Form.Item label="Transparent">
                            <Switch
                                checked={Boolean(block.props.transparent)}
                                onChange={(val) => onUpdate({ ...block.props, transparent: val })}
                            />
                        </Form.Item>
                    </Form>
                );
            case "hero":
                return (
                    <Form layout="vertical">
                        <Form.Item label="Title">
                            <Input
                                value={String(block.props.title)}
                                onChange={(e) => onUpdate({ ...block.props, title: e.target.value })}
                            />
                        </Form.Item>
                        <Form.Item label="Subtitle">
                            <Input.TextArea
                                value={String(block.props.subtitle)}
                                onChange={(e) => onUpdate({ ...block.props, subtitle: e.target.value })}
                                rows={2}
                            />
                        </Form.Item>
                        <Form.Item label="CTA Button Text">
                            <Input
                                value={String(block.props.ctaText)}
                                onChange={(e) => onUpdate({ ...block.props, ctaText: e.target.value })}
                            />
                        </Form.Item>
                        <Form.Item label="CTA Link">
                            <Input
                                value={String(block.props.ctaLink)}
                                onChange={(e) => onUpdate({ ...block.props, ctaLink: e.target.value })}
                            />
                        </Form.Item>
                        <Form.Item label="Show Overlay">
                            <Switch
                                checked={Boolean(block.props.overlay)}
                                onChange={(val) => onUpdate({ ...block.props, overlay: val })}
                            />
                        </Form.Item>
                    </Form>
                );
            case "footer":
                return (
                    <Form layout="vertical">
                        <Form.Item label="Copyright Text">
                            <Input
                                value={String(block.props.copyright)}
                                onChange={(e) => onUpdate({ ...block.props, copyright: e.target.value })}
                            />
                        </Form.Item>
                        <Form.Item label="Show Social Links">
                            <Switch
                                checked={Boolean(block.props.showSocials)}
                                onChange={(val) => onUpdate({ ...block.props, showSocials: val })}
                            />
                        </Form.Item>
                    </Form>
                );
            case "text":
                return (
                    <Form layout="vertical">
                        <Form.Item label="Content">
                            <Input.TextArea
                                value={String(block.props.content)}
                                onChange={(e) => onUpdate({ ...block.props, content: e.target.value })}
                                rows={6}
                            />
                        </Form.Item>
                    </Form>
                );
            case "features":
                return (
                    <Form layout="vertical">
                        <Form.Item label="Section Title">
                            <Input
                                value={String(block.props.title)}
                                onChange={(e) => onUpdate({ ...block.props, title: e.target.value })}
                            />
                        </Form.Item>
                        <Form.Item label="Columns">
                            <Input
                                type="number"
                                min={2}
                                max={4}
                                value={Number(block.props.columns)}
                                onChange={(e) => onUpdate({ ...block.props, columns: parseInt(e.target.value) })}
                            />
                        </Form.Item>
                    </Form>
                );
            case "dock":
                return (
                    <Form layout="vertical">
                        <Form.Item label="Position">
                            <Input
                                value={String(block.props.position)}
                                onChange={(e) => onUpdate({ ...block.props, position: e.target.value })}
                            />
                        </Form.Item>
                        <Form.Item label="Size">
                            <Input
                                value={String(block.props.size)}
                                onChange={(e) => onUpdate({ ...block.props, size: e.target.value })}
                            />
                        </Form.Item>
                    </Form>
                );
            default:
                return (
                    <div>
                        <p>Properties for {block.name}</p>
                        <pre style={{ fontSize: 11, overflow: "auto" }}>
                            {JSON.stringify(block.props, null, 2)}
                        </pre>
                    </div>
                );
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>{block.icon}</span>
                <strong>{block.name}</strong>
            </div>
            <Divider />
            {renderEditor()}
        </div>
    );
};

// Main Page Builder Component
function PageBuilderContent() {
    const searchParams = useSearchParams();
    const pageId = searchParams.get("id");

    const [blocks, setBlocks] = useState<PageBlock[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [pageTitle, setPageTitle] = useState("Untitled Page");
    const [hasChanges, setHasChanges] = useState(false);

    const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

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
        const allBlocks = blockCategories.flatMap(c => c.blocks);
        return allBlocks.find(b => b.type === type)?.icon || "📦";
    };

    const addBlock = (type: string, name: string, icon: string) => {
        const newBlock: PageBlock = {
            id: `block-${Date.now()}`,
            type,
            name,
            icon,
            props: blockDefaults[type] || {},
        };
        setBlocks([...blocks, newBlock]);
        setSelectedBlockId(newBlock.id);
        setHasChanges(true);
        message.success(`Added ${name} block`);
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

    const blockLibraryItems = blockCategories.map(cat => ({
        key: cat.key,
        label: cat.label,
        children: (
            <Space wrap size="small">
                {cat.blocks.map((block) => (
                    <DraggableLibraryBlock
                        key={block.type}
                        item={block}
                    >
                        <Button
                            size="small"
                            onClick={() => addBlock(block.type, block.name, block.icon)}
                        >
                            {block.icon} {block.name}
                        </Button>
                    </DraggableLibraryBlock>
                ))}
            </Space>
        ),
    }));

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
                <Button
                    key="preview"
                    icon={<EyeOutlined />}
                    onClick={() => setPreviewMode(!previewMode)}
                    type={previewMode ? "primary" : "default"}
                >
                    {previewMode ? "Edit Mode" : "Preview"}
                </Button>,
                <Button
                    key="save"
                    type="primary"
                    icon={saving ? <Spin size="small" /> : <SaveOutlined />}
                    onClick={savePage}
                    disabled={saving}
                >
                    {hasChanges ? "Save Changes" : "Saved"}
                </Button>,
            ]}
        >
            <Row gutter={16}>
                {/* Block Library */}
                <Col xs={24} md={5}>
                    <Card
                        title={<><DragOutlined /> Block Library</>}
                        size="small"
                        style={{ marginBottom: 16 }}
                    >
                        <Tabs items={blockLibraryItems} size="small" />
                        <Divider style={{ margin: "12px 0" }} />
                        <div style={{ fontSize: 12, color: "#999" }}>
                            💡 Drag blocks to the canvas or click to add
                        </div>
                    </Card>
                </Col>

                {/* Canvas */}
                <Col xs={24} md={previewMode ? 19 : 13}>
                    <Card
                        title={previewMode ? "Preview" : "Canvas"}
                        size="small"
                        style={{ minHeight: 600 }}
                        extra={!previewMode && <DragOutlined />}
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
                                                }}
                                                onClick={() => !previewMode && setSelectedBlockId(block.id)}
                                            >
                                                <BlockPreview block={block} />

                                                {!previewMode && selectedBlockId === block.id && (
                                                    <div style={{
                                                        position: "absolute",
                                                        top: 4,
                                                        right: 4,
                                                        display: "flex",
                                                        gap: 4,
                                                    }}>
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
                                                            onClick={(e) => { e.stopPropagation(); setDrawerOpen(true); }}
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
                </Col>

                {/* Properties Panel - only in edit mode */}
                {!previewMode && (
                    <Col xs={24} md={6}>
                        <Card title="Properties" size="small" extra={<SettingOutlined />}>
                            <PropertyEditor
                                block={selectedBlock}
                                onUpdate={updateBlockProps}
                            />
                        </Card>
                    </Col>
                )}
            </Row>

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
                    onUpdate={updateBlockProps}
                />
            </Drawer>
        </CMSLayout>
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
