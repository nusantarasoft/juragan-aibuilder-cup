"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence
import { useTheme } from "next-themes";
import CMSLayout from "@/components/layout/CMSLayout";
import {
    Tabs,
    Breadcrumb,
    Tooltip,
    Button,
    Space,
    Tag,
    Segmented,
    message,
    Modal,
    Input,
    Form,
    Statistic,
    Empty,
    Spin,
    Typography,
    Card
} from "antd";
import {
    DatabaseOutlined,
    CloudServerOutlined,
    TableOutlined,
    EyeOutlined,
    PlusOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ReloadOutlined,
    AppstoreOutlined,
    FolderAddOutlined,
    HomeOutlined,
    SearchOutlined,
    ThunderboltOutlined,
    UnorderedListOutlined,
    FolderOpenOutlined
} from "@ant-design/icons";
import Hyperspeed from "@/components/react-bits/Hyperspeed";
import { hyperspeedPresets } from "@/components/react-bits/HyperSpeedPresets";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";
import { MagicButton } from "@/components/custom/MagicButton"; // Added
import { TooltipWrapper as AnimatedTooltip } from '@/components/mvpblocks/AnimatedTooltip';
import CatalogTree from "./CatalogTreeStyled";
import CatalogBrowser from "./CatalogBrowser";
import DataPreview from "./DataPreview";
import AddSourceModal from "./AddSourceModal";
import CreateVDSModal from "./CreateVDSModal";
import { dremioService } from "@/lib/dremioService";

const { Title, Text } = Typography;

export default function DatasetsPage() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";

    const currentPreset = useMemo(() => {
        if (!mounted) return hyperspeedPresets.akira;
        return isDark ? hyperspeedPresets.akira : hyperspeedPresets.cyberpunk;
    }, [isDark, mounted]);

    const [themeKey, setThemeKey] = useState(0);
    useEffect(() => { if (mounted) setThemeKey(prev => prev + 1); }, [resolvedTheme, mounted]);

    // State
    const [showExplorer, setShowExplorer] = useState(true);
    const [selectedPath, setSelectedPath] = useState<string[]>([]);
    const [selectedType, setSelectedType] = useState("");
    const [selectedId, setSelectedId] = useState("");
    const [vdsModalOpen, setVdsModalOpen] = useState(false);
    const [addSourceOpen, setAddSourceOpen] = useState(false);
    const [spaceModalOpen, setSpaceModalOpen] = useState(false);
    const [spaceName, setSpaceName] = useState("");
    const [connectionStatus, setConnectionStatus] = useState<null | { success: boolean; message: string }>(null);
    const [testingConnection, setTestingConnection] = useState(false);

    // Header State
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [sourcesCount, setSourcesCount] = useState(0);

    useEffect(() => {
        dremioService.getSources().then(res => setSourcesCount(res.length)).catch(console.error);
    }, []);

    const isDataset = selectedType === "VIRTUAL" || selectedType === "PROMOTED" || selectedType === "DIRECT"
        || selectedType === "DATASET_TABLE" || selectedType === "DATASET_VIRTUAL";

    const handleSelectDataset = useCallback((path: string[], type: string, id: string) => {
        console.log("handleSelectDataset called:", { path, type, id });
        setSelectedPath(path);
        setSelectedType(type);
        setSelectedId(id);
    }, []);

    const handleTestConnection = async () => {
        setTestingConnection(true);
        try {
            const result = await dremioService.testConnection();
            setConnectionStatus(result);
            if (result.success) message.success(result.message);
            else message.error(result.message);
        } catch (err: any) {
            setConnectionStatus({ success: false, message: err.message });
            message.error(err.message);
        } finally {
            setTestingConnection(false);
        }
    };

    const handleCreateSpace = async () => {
        if (!spaceName.trim()) return;
        try {
            await dremioService.createSpace(spaceName.trim());
            message.success(`Space "${spaceName}" created`);
            setSpaceModalOpen(false);
            setSpaceName("");
        } catch (err: any) {
            message.error("Failed: " + err.message);
        }
    };

    return (
        <CMSLayout
            title={
                <div className="flex items-center gap-3">
                    <span style={{
                        background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 700
                    }}>
                        Datasets
                    </span>
                </div>
            }
            subTitle="Manage your data sources and datasets"
            extra={[
                <Space key="actions" size={16} align="center">
                    {/* Stats */}
                    <Tag icon={<CloudServerOutlined />} color="purple" bordered={false} className="px-3 py-1 text-sm bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-md">
                        {sourcesCount} Sources
                    </Tag>

                    {/* Search */}
                    <div className="relative group hidden md:block">
                        <Input
                            prefix={<SearchOutlined className="text-gray-400 group-focus-within:text-violet-500 transition-colors" />}
                            placeholder="Search catalog..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-48 focus:w-64 transition-all duration-300 rounded-lg border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 focus:bg-white dark:focus:bg-gray-800 !shadow-none"
                            allowClear
                        />
                    </div>

                    {/* View Toggle */}
                    <Segmented
                        options={[
                            { value: 'grid', icon: <AppstoreOutlined /> },
                            { value: 'list', icon: <UnorderedListOutlined /> },
                        ]}
                        value={viewMode}
                        onChange={(val: any) => setViewMode(val)}
                        className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg custom-segmented hidden sm:block"
                    />

                    {/* Add Source Button */}
                    <MagicButton
                        icon={<PlusOutlined />}
                        onClick={() => setAddSourceOpen(true)}
                    >
                        Add Source
                    </MagicButton>
                </Space>
            ]}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 16, height: '100%' }}>
                {/* Main content: sidebar + content */}
                <div style={{
                    display: "flex",
                    gap: 16,
                    flex: 1,
                    minHeight: 600,
                    alignItems: 'stretch'
                }}>
                    {/* Left sidebar — Catalog Tree */}
                    <AnimatePresence mode="wait">
                        {showExplorer && (
                            <motion.div
                                initial={{ width: 0, opacity: 0, x: -20 }}
                                animate={{ width: 280, opacity: 1, x: 0 }}
                                exit={{ width: 0, opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
                                style={{
                                    width: 280,
                                    minWidth: 280,
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <CatalogTree
                                    onSelect={handleSelectDataset}
                                    onCreateSpace={() => setSpaceModalOpen(true)}
                                    onCreateVDS={() => setVdsModalOpen(true)}
                                    onAddSource={() => setAddSourceOpen(true)}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Right content */}
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Toolbar - Only show when showing DataPreview (isDataset) */}
                        {isDataset && (
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 16,
                                padding: '0 4px'
                            }}>
                                <Space align="center" size={16}>
                                    <AnimatedTooltip content={showExplorer ? "Hide Explorer" : "Show Explorer"}>
                                        <Button
                                            type="text"
                                            icon={showExplorer ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                                            onClick={() => setShowExplorer(!showExplorer)}
                                            style={{ fontSize: 16 }}
                                        />
                                    </AnimatedTooltip>

                                    {/* Breadcrumb */}
                                    <Breadcrumb
                                        items={[
                                            { title: <><HomeOutlined /> Catalog</> },
                                            ...selectedPath.map((p, i) => ({
                                                title: <span style={{ fontSize: 13, fontWeight: 500 }}>{p}</span>,
                                            })),
                                        ]}
                                        separator=">"
                                    />
                                </Space>

                                {selectedType && (
                                    <Tag bordered={false} color={isDataset ? "blue" : "green"} style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12 }}>
                                        {selectedType}
                                    </Tag>
                                )}
                            </div>
                        )}

                        {/* Data Content */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{ height: '100%' }}
                            >
                                {isDataset && selectedPath.length > 0 ? (
                                    <DataPreview path={selectedPath} />
                                ) : (
                                    // Always show CatalogBrowser for containers or empty selection (Root)
                                    <CatalogBrowser
                                        path={selectedPath}
                                        id={selectedId}
                                        type={selectedType || 'HOME'}
                                        onNavigate={handleSelectDataset}
                                        sidebarOpen={showExplorer}
                                        onToggleSidebar={() => setShowExplorer(!showExplorer)}
                                    />
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create VDS Modal */}
            <CreateVDSModal
                open={vdsModalOpen}
                onClose={() => setVdsModalOpen(false)}
                defaultSQL={isDataset && selectedPath.length > 0
                    ? `SELECT * FROM ${selectedPath.map(p => `"${p}"`).join(".")}`
                    : ""}
            />

            {/* Add Source Modal */}
            <AddSourceModal
                open={addSourceOpen}
                onClose={() => setAddSourceOpen(false)}
                onSuccess={() => {
                    // Refresh catalog tree if needed
                    // catalogTreeRef.current?.reload(); // We rely on user manual refresh or auto-refresh
                    setThemeKey(prev => prev + 1); // Force re-render of something? No, better relying on reload button
                }}
            />

            {/* Create Space Modal */}
            <Modal
                title="Create Space"
                open={spaceModalOpen}
                onCancel={() => { setSpaceModalOpen(false); setSpaceName(""); }}
                onOk={handleCreateSpace}
                okText="Create"
            >
                <Form layout="vertical">
                    <Form.Item label="Space Name" required>
                        <Input
                            value={spaceName}
                            onChange={(e) => setSpaceName(e.target.value)}
                            placeholder="my-datasets"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
