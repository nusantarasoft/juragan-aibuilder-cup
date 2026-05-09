"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { Card, Row, Col, Tag, Button, Space, Input, Tabs, Statistic } from "antd";
import { motion } from "framer-motion";
import {
    AppstoreOutlined,
    EditOutlined,
    SearchOutlined,
    PlusOutlined,
} from "@ant-design/icons";

const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface BlockItem {
    id: string;
    name: string;
    icon: string;
    description: string;
    category: "template" | "content" | "widget";
}

const templateBlocks: BlockItem[] = [
    { id: "1", name: "Navigation", icon: "🧭", description: "Header with logo and menu", category: "template" },
    { id: "2", name: "Hero Banner", icon: "🎨", description: "Full-width hero with CTA", category: "template" },
    { id: "3", name: "Footer", icon: "📋", description: "Page footer with links", category: "template" },
    { id: "4", name: "Sidebar", icon: "📱", description: "Side navigation panel", category: "template" },
];

const contentBlocks: BlockItem[] = [
    { id: "5", name: "Text Block", icon: "📝", description: "Rich text content", category: "content" },
    { id: "6", name: "Features Grid", icon: "📦", description: "Grid of feature cards", category: "content" },
    { id: "7", name: "Testimonials", icon: "💬", description: "Animated testimonials", category: "content" },
    { id: "8", name: "Pricing Table", icon: "💰", description: "Pricing cards", category: "content" },
    { id: "9", name: "Image Gallery", icon: "🖼️", description: "Grid or carousel", category: "content" },
    { id: "10", name: "Contact Form", icon: "📧", description: "Form with validation", category: "content" },
    { id: "11", name: "FAQ Accordion", icon: "❓", description: "Expandable FAQ", category: "content" },
    { id: "12", name: "Team", icon: "👥", description: "Team member cards", category: "content" },
];

const widgetBlocks: BlockItem[] = [
    { id: "13", name: "Floating Dock", icon: "🚀", description: "Mac-style dock", category: "widget" },
    { id: "14", name: "Mini Games", icon: "🎮", description: "Embedded games", category: "widget" },
    { id: "15", name: "Chat Widget", icon: "💬", description: "Live chat", category: "widget" },
    { id: "16", name: "Stats Counter", icon: "📊", description: "Animated counters", category: "widget" },
    { id: "17", name: "Social Feed", icon: "📱", description: "Social media embed", category: "widget" },
    { id: "18", name: "Weather", icon: "🌤️", description: "Weather display", category: "widget" },
    { id: "19", name: "Countdown", icon: "⏱️", description: "Countdown timer", category: "widget" },
];

const BlockCard = ({ block }: { block: BlockItem }) => (
    <Card
        hoverable
        size="small"
        style={{ height: "100%" }}
        actions={[
            <Button key="edit" type="text" icon={<EditOutlined />}>
                Edit
            </Button>,
            <Button key="preview" type="text">
                Preview
            </Button>,
        ]}
    >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 32 }}>{block.icon}</div>
            <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{block.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{block.description}</div>
                <Tag style={{ marginTop: 8 }} color={
                    block.category === "template" ? "blue" :
                        block.category === "content" ? "green" : "purple"
                }>
                    {block.category}
                </Tag>
            </div>
        </div>
    </Card>
);

const BlockGrid = ({ blocks }: { blocks: BlockItem[] }) => (
    <Row gutter={[16, 16]}>
        {blocks.map((block) => (
            <Col key={block.id} xs={24} sm={12} md={8} lg={6}>
                <BlockCard block={block} />
            </Col>
        ))}
    </Row>
);

export default function BlocksTemplatesPage() {
    const { themeColor } = usePreferencesStore();
    const items = [
        {
            key: "templates",
            label: (
                <span>
                    <AppstoreOutlined /> Template Blocks ({templateBlocks.length})
                </span>
            ),
            children: <BlockGrid blocks={templateBlocks} />,
        },
        {
            key: "content",
            label: `Content Blocks (${contentBlocks.length})`,
            children: <BlockGrid blocks={contentBlocks} />,
        },
        {
            key: "widgets",
            label: `Widgets (${widgetBlocks.length})`,
            children: <BlockGrid blocks={widgetBlocks} />,
        },
    ];

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Blocks Library</AuroraText>}
            subTitle={<DecryptedText text="Manage reusable page builder blocks" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="add" type="primary" icon={<PlusOutlined />}>
                    Create Custom Block
                </Button>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Templates', value: templateBlocks.length, icon: <AppstoreOutlined />, color: '#3b82f6' },
                    { title: 'Content', value: contentBlocks.length, icon: <EditOutlined />, color: '#10b981' },
                    { title: 'Widgets', value: widgetBlocks.length, icon: <AppstoreOutlined />, color: '#8b5cf6' },
                ].map((s, i) => (
                    <Col key={i} xs={12} md={8}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card size="small" style={{ ...glass, borderTop: `3px solid ${s.color}` }}>
                                <Statistic title={s.title} value={s.value} prefix={s.icon} valueStyle={{ color: s.color }} />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>
            <Space style={{ marginBottom: 16 }}>
                <Input
                    placeholder="Search blocks..."
                    prefix={<SearchOutlined />}
                    style={{ width: 250 }}
                />
            </Space>
            <Tabs items={items} size="large" />
        </CMSLayout>
    );
}
