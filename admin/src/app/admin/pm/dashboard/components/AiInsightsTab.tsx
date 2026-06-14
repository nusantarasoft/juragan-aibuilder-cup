"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, Button, Row, Col, Typography, Space, Spin, message, Badge, Progress, Alert } from "antd";
import { RobotOutlined, CheckCircleOutlined, ExclamationCircleOutlined, LineChartOutlined, ThunderboltOutlined, BulbOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const { Text, Title, Paragraph } = Typography;

const GET_PROJECT_DETAILS = `
  query GetProjectDetailsForAI($id: ID!) {
    pmProject(id: $id) {
      id name status priority budget spent startDate endDate
      taskCounts { total done inProgress }
      risks { id title severity status }
      issues { id title priority status }
    }
  }
`;

export default function AiInsightsTab({ projectId }: { projectId: string }) {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === "dark";

    const [projectData, setProjectData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const data = await gql(GET_PROJECT_DETAILS, { id: projectId });
            setProjectData(data.pmProject);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [projectId]);

    const transport = useMemo(() => new DefaultChatTransport({ api: "/api/ai/project-insights" }), []);
    const { messages, sendMessage, status } = useChat({
        transport,
    });
    const aiLoading = status === 'submitted' || status === 'streaming';

    const generateInsights = () => {
        if (!projectData) return;
        const prompt = `Analyze this project data and provide 3 key insights/risks and 3 actionable recommendations:
Project: ${projectData.name}
Status: ${projectData.status}
Budget: $${projectData.budget} | Spent: $${projectData.spent}
Tasks: ${projectData.taskCounts?.done}/${projectData.taskCounts?.total} done
Risks: ${projectData.risks?.map((r: any) => `[${r.severity}] ${r.title}`).join(', ')}`;
        
        sendMessage({ parts: [{ type: "text", text: prompt }] });
    };

    const glassCard = {
        background: isDark ? "rgba(15, 15, 23, 0.7)" : "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(0,0,0,0.06)",
        borderRadius: 12,
    };

    if (loading) return <div style={{ textAlign: "center", padding: 60 }}><Spin /></div>;

    const tc = projectData?.taskCounts || { total: 0, done: 0 };
    const pct = tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0;
    const overBudget = projectData && projectData.spent > projectData.budget;

    return (
        <div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={24} md={8}>
                        <Card style={{ ...glassCard, borderLeft: `4px solid ${themeColor}` }} size="small">
                            <Space align="center" style={{ marginBottom: 8 }}>
                                <LineChartOutlined style={{ color: themeColor, fontSize: 18 }} />
                                <Text strong>Progress Tracker</Text>
                            </Space>
                            <Progress percent={pct} strokeColor={themeColor} status={pct === 100 ? "success" : "active"} />
                            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>{tc.done} / {tc.total} Tasks</Text>
                                <Text style={{ fontSize: 12, color: pct < 50 ? "#f59e0b" : "#10b981", fontWeight: 600 }}>
                                    {pct < 50 ? "Needs Attention" : "On Track"}
                                </Text>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card style={{ ...glassCard, borderLeft: `4px solid ${overBudget ? '#ef4444' : '#10b981'}` }} size="small">
                            <Space align="center" style={{ marginBottom: 8 }}>
                                <ExclamationCircleOutlined style={{ color: overBudget ? '#ef4444' : '#10b981', fontSize: 18 }} />
                                <Text strong>Budget Health</Text>
                            </Space>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                <Text style={{ fontSize: 24, fontWeight: 700, color: overBudget ? '#ef4444' : '#10b981' }}>
                                    \${projectData?.spent?.toLocaleString() || 0}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>/ \${projectData?.budget?.toLocaleString() || 0}</Text>
                            </div>
                            <Progress percent={projectData?.budget > 0 ? Math.round((projectData.spent / projectData.budget) * 100) : 0} 
                                strokeColor={overBudget ? '#ef4444' : '#10b981'} showInfo={false} size="small" />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card style={{ ...glassCard, borderLeft: `4px solid #3b82f6` }} size="small">
                            <Space align="center" style={{ marginBottom: 8 }}>
                                <ThunderboltOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                                <Text strong>Active Risks</Text>
                            </Space>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>
                                {projectData?.risks?.length || 0}
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>Identified project risks</Text>
                        </Card>
                    </Col>
                </Row>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card 
                    title={
                        <Space>
                            <RobotOutlined style={{ color: themeColor, fontSize: 18 }} />
                            <Text strong style={{ fontSize: 16 }}>AI Executive Summary & Insights</Text>
                        </Space>
                    }
                    extra={
                        <Button type="primary" onClick={generateInsights} loading={aiLoading} icon={<BulbOutlined />}
                            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: "none" }}>
                            Generate Analysis
                        </Button>
                    }
                    style={{ ...glassCard, minHeight: 300 }}
                >
                    {messages.length === 0 && !aiLoading ? (
                        <div style={{ textAlign: "center", padding: "40px 0", color: isDark ? "#64748b" : "#94a3b8" }}>
                            <RobotOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                            <p>Click "Generate Analysis" to let AI evaluate project health and provide recommendations.</p>
                        </div>
                    ) : (
                        <div style={{ padding: "0 16px" }}>
                            {messages.filter(m => m.role === 'assistant').map((m, i) => {
                                const content = m.parts?.map((p: any) => p.type === 'text' ? p.text : '').join('') || '';
                                return (
                                    <div key={i} style={{ marginBottom: 24 }}>
                                        {content.split('\n').map((line, j) => {
                                            if (line.startsWith('##')) return <Title level={4} key={j} style={{ color: themeColor, marginTop: 16 }}>{line.replace('##', '')}</Title>;
                                            if (line.startsWith('-')) return <li key={j} style={{ marginLeft: 16, marginBottom: 8 }}>{line.substring(1)}</li>;
                                            if (line.trim() === '') return <br key={j} />;
                                            return <Paragraph key={j}>{line}</Paragraph>;
                                        })}
                                    </div>
                                );
                            })}
                            {aiLoading && (
                                <div style={{ display: "flex", alignItems: "center", gap: 12, color: themeColor }}>
                                    <Spin size="small" /> <Text type="secondary">AI is analyzing project data...</Text>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    );
}
