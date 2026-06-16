"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal, Input, List, Typography, Space, Tag } from "antd";
import { SearchOutlined, ProjectOutlined, CheckSquareOutlined, RocketOutlined, AimOutlined, FireOutlined, RobotOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

const { Text } = Typography;

const SEARCH_QUERY = `
  query PmSearch($tenantId: String!, $query: String!) {
    pmProjects(tenantId: $tenantId) { id name projectNumber status }
    pmTasks(tenantId: $tenantId) { id title status priority projectId sprintId }
  }
`;

interface PmCommandPaletteProps {
    onClose: () => void;
    onSelectProject: (id: string) => void;
    onSelectTask: (projectId: string, taskId: string) => void;
    onCreateTask?: () => void;
    onCreateSprint?: () => void;
}

export default function PmCommandPalette({ onClose, onSelectProject, onSelectTask, onCreateTask, onCreateSprint }: PmCommandPaletteProps) {
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const { themeColor } = usePreferencesStore();

    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{ type: string; item: any }[]>([]);

    const fetchResults = useCallback(async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            // In a real scenario, this would have a custom backend search resolver.
            // For now, we fetch all and filter client-side for simplicity, or assume the graphql query returns everything if query isn't used as argument in filter.
            const data = await gql(SEARCH_QUERY, { tenantId: DEFAULT_TENANT_ID, query: q });
            
            const projects = (data.pmProjects || [])
                .filter((p: any) => p.name.toLowerCase().includes(q.toLowerCase()) || p.projectNumber?.toLowerCase().includes(q.toLowerCase()))
                .map((p: any) => ({ type: "project", item: p }));
                
            const tasks = (data.pmTasks || [])
                .filter((t: any) => t.title.toLowerCase().includes(q.toLowerCase()))
                .map((t: any) => ({ type: "task", item: t }));

            setResults([...projects, ...tasks].slice(0, 15));
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => fetchResults(query), 300);
        return () => clearTimeout(timer);
    }, [query, fetchResults]);

    const handleSelect = async (result: { type: string; item: any }) => {
        if (result.type === "ai_intent") {
            setLoading(true);
            try {
                // Call an AI endpoint that returns a structured intent JSON
                const response = await fetch("/api/ai/parse-command", {
                    method: "POST",
                    body: JSON.stringify({ prompt: query })
                });
                const intent = await response.json();
                
                if (intent.action === "create_task" && onCreateTask) {
                    // Pass pre-filled AI data to the task creation form
                    onCreateTask(); 
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
                onClose();
            }
            return;
        }

        if (result.type === "project") {
            onSelectProject(result.item.id);
        } else if (result.type === "task") {
            onSelectTask(result.item.projectId, result.item.id);
        } else if (result.type === "command") {
            if (result.item.id === "create-task" && onCreateTask) onCreateTask();
            if (result.item.id === "create-sprint" && onCreateSprint) onCreateSprint();
        }
        onClose();
    };

    const commands = [
        { type: "command", item: { id: "create-task", title: "Create Task", icon: <CheckSquareOutlined /> } },
        { type: "command", item: { id: "create-sprint", title: "Create Sprint", icon: <RocketOutlined /> } },
    ].filter(cmd => cmd.item.title.toLowerCase().includes(query.toLowerCase()));

    const aiCommand = query.length > 5 ? [{
    type: "ai_intent",
    item: { 
        id: "ai-parse", 
        title: `Ask AI to: "${query}"`, 
        icon: <RobotOutlined /> 
    }
}] : [];

const displayResults = query.trim() ? [...commands, ...aiCommand, ...results] : commands;

    return (
        <Modal
            open={true}
            onCancel={onClose}
            footer={null}
            closable={false}
            width={600}
            styles={{
                body: {
                    padding: 0,
                    borderRadius: 16,
                    background: isDark ? "rgba(15,15,23,0.85)" : "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(20px)",
                    border: isDark ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(0,0,0,0.1)",
                    overflow: "hidden",
                    boxShadow: isDark ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(0,0,0,0.15)",
                }
            }}
        >
            <div style={{ padding: "16px 20px", borderBottom: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)" }}>
                <Input
                    autoFocus
                    placeholder="Search projects, tasks, or type a command..."
                    prefix={<SearchOutlined style={{ color: themeColor, fontSize: 18, marginRight: 8 }} />}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    variant="borderless"
                    style={{ fontSize: 16, padding: 0 }}
                />
            </div>
            
            <div style={{ maxHeight: 400, overflowY: "auto", padding: 12 }}>
                {displayResults.length === 0 && !loading ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: isDark ? "#64748b" : "#94a3b8" }}>
                        <AimOutlined style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }} />
                        <div>No results found for "{query}"</div>
                    </div>
                ) : (
                    <List
                        dataSource={displayResults}
                        loading={loading}
                        renderItem={(res) => {
                            const isCommand = res.type === "command";
                            const isProject = res.type === "project";
                            return (
                                <List.Item
                                    onClick={() => handleSelect(res)}
                                    style={{
                                        padding: "10px 16px",
                                        borderRadius: 8,
                                        cursor: "pointer",
                                        border: "none",
                                        transition: "background 0.2s",
                                        marginBottom: 4,
                                    }}
                                    className={isDark ? "hover:bg-white/5" : "hover:bg-black/5"}
                                >
                                    <Space size="middle" style={{ width: "100%" }}>
                                        <div style={{ 
                                            width: 32, height: 32, borderRadius: 8, 
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            background: isCommand ? `linear-gradient(135deg, ${themeColor}22, ${themeColor}44)` : 
                                                      isProject ? "rgba(99,102,241,0.15)" : "rgba(16,185,129,0.15)",
                                            color: isCommand ? themeColor : isProject ? "#6366f1" : "#10b981",
                                            fontSize: 16
                                        }}>
                                            {isCommand ? res.item.icon : isProject ? <ProjectOutlined /> : <CheckSquareOutlined />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: isDark ? "#fff" : "#111" }}>
                                                {res.item.title || res.item.name}
                                            </div>
                                            {!isCommand && (
                                                <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                                                    {isProject ? `Project • ${res.item.projectNumber || 'N/A'}` : `Task • ${res.item.status.replace("_", " ")}`}
                                                </div>
                                            )}
                                        </div>
                                        {res.item.priority === "high" && <FireOutlined style={{ color: "#ef4444" }} />}
                                    </Space>
                                </List.Item>
                            );
                        }}
                    />
                )}
            </div>
            
            <div style={{ 
                padding: "8px 16px", 
                borderTop: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.04)",
                fontSize: 11,
                color: isDark ? "#64748b" : "#94a3b8",
                display: "flex",
                justifyContent: "space-between"
            }}>
                <span><Tag bordered={false} style={{ fontSize: 10, padding: "0 4px", borderRadius: 4 }}>↑↓</Tag> to navigate</span>
                <span><Tag bordered={false} style={{ fontSize: 10, padding: "0 4px", borderRadius: 4 }}>Enter</Tag> to select</span>
                <span><Tag bordered={false} style={{ fontSize: 10, padding: "0 4px", borderRadius: 4 }}>Esc</Tag> to close</span>
            </div>
        </Modal>
    );
}
