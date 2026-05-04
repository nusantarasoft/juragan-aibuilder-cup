"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { Card, Row, Col, Space, Button, Tag } from "antd";
import { PlayCircleOutlined, EyeOutlined } from "@ant-design/icons";
import MiniGamesWidget from "@/components/widgets/MiniGamesWidget";
import ChatWidget from "@/components/widgets/ChatWidget";
import StatsCounterWidget from "@/components/widgets/StatsCounterWidget";

interface WidgetCard {
    name: string;
    description: string;
    icon: string;
    preview: React.ReactNode;
    demoEnabled: boolean;
}

const widgets: WidgetCard[] = [
    {
        name: "Floating Dock",
        description: "Mac-style navigation dock with hover animations",
        icon: "🚀",
        preview: (
            <div className="flex justify-center gap-2 p-4 bg-gray-100 rounded-lg">
                {["🏠", "👤", "💼", "📧"].map((icon, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">
                        {icon}
                    </div>
                ))}
            </div>
        ),
        demoEnabled: true,
    },
    {
        name: "Mini Games",
        description: "Embedded interactive games (Snake, Tetris, etc.)",
        icon: "🎮",
        preview: <MiniGamesWidget enabled={true} />,
        demoEnabled: true,
    },
    {
        name: "Chat Widget",
        description: "Floating chat with automated responses",
        icon: "💬",
        preview: (
            <div style={{ position: "relative", height: 300 }}>
                <ChatWidget enabled={true} position="bottom-right" />
            </div>
        ),
        demoEnabled: true,
    },
    {
        name: "Stats Counter",
        description: "Animated number counters for statistics",
        icon: "📊",
        preview: <StatsCounterWidget />,
        demoEnabled: true,
    },
];

export default function WidgetsPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Widgets</AuroraText>}
            subTitle={<DecryptedText text="Interactive components for your landing pages" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
        >
            <Row gutter={[16, 16]}>
                {widgets.map((widget, index) => (
                    <Col key={index} xs={24} lg={12}>
                        <Card
                            title={
                                <Space>
                                    <span style={{ fontSize: 24 }}>{widget.icon}</span>
                                    <span>{widget.name}</span>
                                </Space>
                            }
                            extra={
                                widget.demoEnabled && (
                                    <Tag color="green">
                                        <PlayCircleOutlined /> Interactive Demo
                                    </Tag>
                                )
                            }
                        >
                            <p style={{ color: "#666", marginBottom: 16 }}>
                                {widget.description}
                            </p>
                            <div style={{
                                background: "#f9f9f9",
                                borderRadius: 8,
                                overflow: "hidden",
                                minHeight: 200,
                            }}>
                                {widget.preview}
                            </div>
                            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                                <Button type="primary" icon={<EyeOutlined />}>
                                    Use in Page Builder
                                </Button>
                                <Button>View Code</Button>
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>
        </CMSLayout>
    );
}
