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
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const isDataset = selectedType === "VIRTUAL" || selectedType === "PROMOTED" || selectedType === "DIRECT"
        || selectedType === "DATASET" || selectedType === "DATASET_TABLE" || selectedType === "DATASET_VIRTUAL"
        || selectedType === "FILE" || selectedType === "PHYSICAL_DATASET";

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
            setRefreshTrigger(prev => prev + 1);
        } catch (err: any) {
            message.error("Failed: " + err.message);
        }
    };

    return (
        <CMSLayout
            title={<AuroraText colors={["#9333ea", "#7c3aed", "#6366f1", "#00ffff", "#ff00ff"]}>Datasets</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Manage your data sources and datasets"
                    animateOn="view"
                    revealDirection="center"
                    speed={50}
                    maxIterations={15}
                    sequential={true}
                />
            }

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
                                    refreshTrigger={refreshTrigger}
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
                        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="absolute inset-0"
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
                                        onAddSource={() => setAddSourceOpen(true)}
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
