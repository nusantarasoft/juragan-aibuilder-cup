"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import {
    Layout,
    Button,
    Space,
    Typography,
    Input,
    Select,
    Tag,
    Breadcrumb,
    Tooltip,
    Segmented
} from "antd";
import {
    ConsoleSqlOutlined,
    PlayCircleOutlined,
    SaveOutlined,
    HistoryOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DatabaseOutlined,
    TableOutlined
} from "@ant-design/icons";
import { MagicButton } from "@/components/custom/MagicButton";
import CatalogTree from "@/app/admin/datasets/CatalogTreeStyled";
import SQLEditor from "@/app/admin/datasets/SQLEditor";
import { dremioService } from "@/lib/dremioService";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Content, Sider } = Layout;
const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

export default function SQLRunnerPage() {
    const [showExplorer, setShowExplorer] = useState(true);
    const { themeColor } = usePreferencesStore();
    const [selectedPath, setSelectedPath] = useState<string[]>([]);
    const [queryContext, setQueryContext] = useState<string[]>([]);
    const [initialSQL, setInitialSQL] = useState("");

    // If a dataset is selected in the tree, we might want to generate a SELECT * for it
    // or just set the context.
    const handleSelectDataset = useCallback((path: string[], type: string, id: string) => {
        setSelectedPath(path);
        // Automatically set context to the folder/space of the selected item
        if (path.length > 0) {
            setQueryContext(path.slice(0, -1));
            // Optional: Auto-generate SQL if it's a table? 
            // Dremio usually just sets context.
            // Let's provide a hint in the editor if it's empty?
            // For now, let's just update context.
            if (type === "VIRTUAL" || type === "PROMOTED" || type === "DIRECT" || type === "DATASET_TABLE" || type === "DATASET_VIRTUAL") {
                setInitialSQL(`SELECT * FROM ${path.map(p => `"${p}"`).join(".")} LIMIT 100`);
            }
        }
    }, []);

    return (
        <CMSLayout
            title={
                <AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>SQL Runner</AuroraText>
            }
            subTitle={<DecryptedText text="Execute queries and analyze data" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Space key="actions" size={16}>
                    <Select
                        mode="tags"
                        style={{ width: 200 }}
                        placeholder="Context"
                        value={queryContext}
                        onChange={setQueryContext}
                        maxTagCount={1}
                        className="hidden md:block"
                    />
                    <Button icon={<HistoryOutlined />}>History</Button>
                    <Button icon={<SaveOutlined />}>Save Script</Button>
                </Space>
            ]}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
                <div style={{
                    display: "flex",
                    gap: 16,
                    flex: 1,
                    minHeight: 600,
                    alignItems: 'stretch'
                }}>
                    {/* Left Sidebar - Catalog Tree */}
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
                                <CatalogTree onSelect={handleSelectDataset} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Main Content - SQL Editor */}
                    <div style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        {/* Toolbar */}
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: '0 4px'
                        }}>
                            <Tooltip title={showExplorer ? "Hide Explorer" : "Show Explorer"}>
                                <Button
                                    type="text"
                                    icon={showExplorer ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
                                    onClick={() => setShowExplorer(!showExplorer)}
                                    style={{ fontSize: 16 }}
                                />
                            </Tooltip>
                        </div>

                        {/* Editor Component */}
                        <div style={{ flex: 1, position: 'relative' }}>
                            <SQLEditor
                                defaultSQL={initialSQL}
                                context={queryContext.length > 0 ? queryContext : undefined}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </CMSLayout>
    );
}
