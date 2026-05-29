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
    FolderOpenOutlined,
    EditOutlined
} from "@ant-design/icons";
import Hyperspeed from "@/components/react-bits/Hyperspeed";
import { hyperspeedPresets } from "@/components/react-bits/HyperSpeedPresets";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { MagicButton } from "@/components/custom/MagicButton"; // Added
import { TooltipWrapper as AnimatedTooltip } from '@/components/mvpblocks/AnimatedTooltip';
import CatalogTree from "./CatalogTreeStyled";
import CatalogBrowser from "./CatalogBrowser";
import DataPreview from "./DataPreview";
import AddSourceModal from "./AddSourceModal";
import EditSourceModal from "./EditSourceModal";
import CreateVDSModal from "./CreateVDSModal";
import EditVDSModal from "./EditVDSModal";
import RenameSpaceModal from "./RenameSpaceModal";
import { dremioService } from "@/lib/dremioService";

const { Title, Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

export default function DatasetsPage() {
    const { resolvedTheme } = useTheme();
    const { themeColor } = usePreferencesStore();
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
    const [editSourceId, setEditSourceId] = useState<string | null>(null);
    const [spaceModalOpen, setSpaceModalOpen] = useState(false);
    const [spaceName, setSpaceName] = useState("");
    const [connectionStatus, setConnectionStatus] = useState<null | { success: boolean; message: string }>(null);
    const [testingConnection, setTestingConnection] = useState(false);

    // Header State
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Edit VDS state
    const [editVDSId, setEditVDSId] = useState<string | null>(null);

    // Rename Space state
    const [renameSpaceState, setRenameSpaceState] = useState<{ id: string; tag: string; name: string } | null>(null);

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

    // ─── Delete handler for catalog tree context menu ─────────────────────
    const handleDeleteItem = async (id: string, actionKey: string, tag: string) => {
        try {
            if (actionKey === 'deleteSource') {
                await dremioService.deleteSource(id, tag);
                message.success('Source deleted');
            } else if (actionKey === 'deleteVDS') {
                await dremioService.deleteVDS(id, tag);
                message.success('VDS deleted');
            } else if (actionKey === 'deleteSpace') {
                await dremioService.deleteSpace(id, tag);
                message.success('Space deleted');
            }
            setRefreshTrigger(prev => prev + 1);
            // Clear selection if deleted item was selected
            if (selectedId === id) {
                setSelectedPath([]);
                setSelectedType('');
                setSelectedId('');
            }
        } catch (err: any) {
            message.error('Delete failed: ' + err.message);
        }
    };

    // ─── Edit VDS handler ─────────────────────────────────────────────────
    const handleEditVDS = (id: string, _tag: string) => {
        setEditVDSId(id);
    };

    // ─── Rename Space handler ────────────────────────────────────────────
    const handleRenameSpace = (id: string, tag: string, currentName: string) => {
        setRenameSpaceState({ id, tag, name: currentName });
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, 'var(--theme-secondary, #6366f1)', 'var(--theme-accent, #a78bfa)']}>Datasets</AuroraText>}
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
                                    onDeleteItem={handleDeleteItem}
                                    onEditVDS={handleEditVDS}
                                    onRenameSpace={handleRenameSpace}
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
                        {/* Toolbar - show for dataset (DataPreview) or when source selected (Edit Source) */}
                        {(isDataset || selectedType === "SOURCE") && (
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

                                <Space size={12}>
                                    {selectedType && (
                                        <Tag bordered={false} color={isDataset ? "blue" : "green"} style={{ fontSize: 12, padding: '2px 10px', borderRadius: 12 }}>
                                            {selectedType}
                                        </Tag>
                                    )}
                                    {selectedType === "SOURCE" && selectedId && (
                                        <AnimatedTooltip content="Edit this source">
                                            <Button
                                                type="default"
                                                size="small"
                                                icon={<EditOutlined />}
                                                onClick={() => setEditSourceId(selectedId)}
                                            >
                                                Edit Source
                                            </Button>
                                        </AnimatedTooltip>
                                    )}
                                </Space>
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
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
            />

            {/* Edit Source Modal */}
            <EditSourceModal
                open={!!editSourceId}
                onClose={() => setEditSourceId(null)}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
                sourceId={editSourceId}
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

            {/* Edit VDS Modal */}
            <EditVDSModal
                open={!!editVDSId}
                onClose={() => setEditVDSId(null)}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
                vdsId={editVDSId}
            />

            {/* Rename Space Modal */}
            <RenameSpaceModal
                open={!!renameSpaceState}
                onClose={() => setRenameSpaceState(null)}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
                spaceId={renameSpaceState?.id || null}
                spaceTag={renameSpaceState?.tag || ''}
                currentName={renameSpaceState?.name || ''}
            />
        </CMSLayout>
    );
}
