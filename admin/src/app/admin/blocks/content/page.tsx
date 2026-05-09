"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { Card, Row, Col, Button, Space, Tag, Statistic } from "antd";
import { EditOutlined, EyeOutlined, PlusOutlined, AppstoreOutlined, BlockOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface ContentBlock {
    name: string;
    icon: string;
    description: string;
    preview: React.ReactNode;
}

const contentBlocks: ContentBlock[] = [
    {
        name: "Text Block",
        icon: "📝",
        description: "Rich text content with formatting",
        preview: (
            <div style={{ padding: 16 }}>
                <h3 style={{ margin: 0 }}>Heading Example</h3>
                <p style={{ color: "#666" }}>
                    This is a sample paragraph with some text content. You can add links,
                    <strong> bold text</strong>, and <em>italic text</em>.
                </p>
            </div>
        ),
    },
    {
        name: "Features Grid",
        icon: "📦",
        description: "Grid layout for showcasing features",
        preview: (
            <div style={{ padding: 16, display: "flex", gap: 16 }}>
                {["🚀", "⚡", "🎯"].map((icon, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
                        <div style={{ fontSize: 32 }}>{icon}</div>
                        <div style={{ fontWeight: 500, marginTop: 8 }}>Feature {i + 1}</div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        name: "Testimonials",
        icon: "💬",
        description: "Animated testimonial carousel",
        preview: (
            <div style={{ padding: 24, background: "#f0f2f5", borderRadius: 8 }}>
                <div style={{ fontStyle: "italic", color: "#666", marginBottom: 12 }}>
                    "This product changed my life! Highly recommended."
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1890ff" }} />
                    <div>
                        <div style={{ fontWeight: 500 }}>John Doe</div>
                        <div style={{ fontSize: 12, color: "#999" }}>CEO, Company</div>
                    </div>
                </div>
            </div>
        ),
    },
    {
        name: "Pricing Table",
        icon: "💰",
        description: "Pricing cards with features comparison",
        preview: (
            <div style={{ padding: 16, display: "flex", gap: 12 }}>
                {[{ name: "Basic", price: "$9" }, { name: "Pro", price: "$29" }].map((plan, i) => (
                    <div key={i} style={{ flex: 1, padding: 16, background: "#fff", borderRadius: 8, border: "1px solid #e8e8e8", textAlign: "center" }}>
                        <div style={{ fontWeight: 500 }}>{plan.name}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, margin: "8px 0" }}>{plan.price}</div>
                        <div style={{ fontSize: 12, color: "#999" }}>/month</div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        name: "Image Gallery",
        icon: "🖼️",
        description: "Grid or carousel image display",
        preview: (
            <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} style={{ aspectRatio: "1", background: `hsl(${i * 40}, 70%, 85%)`, borderRadius: 4 }} />
                ))}
            </div>
        ),
    },
    {
        name: "Contact Form",
        icon: "📧",
        description: "Contact form with validation",
        preview: (
            <div style={{ padding: 16 }}>
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Name</div>
                    <div style={{ height: 32, background: "#f5f5f5", borderRadius: 4 }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Email</div>
                    <div style={{ height: 32, background: "#f5f5f5", borderRadius: 4 }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Message</div>
                    <div style={{ height: 64, background: "#f5f5f5", borderRadius: 4 }} />
                </div>
            </div>
        ),
    },
    {
        name: "FAQ Accordion",
        icon: "❓",
        description: "Expandable FAQ section",
        preview: (
            <div style={{ padding: 16 }}>
                {["How does it work?", "What is the pricing?", "Do you offer support?"].map((q, i) => (
                    <div key={i} style={{ padding: 12, background: i === 0 ? "#e6f7ff" : "#f5f5f5", borderRadius: 4, marginBottom: 8 }}>
                        <div style={{ fontWeight: 500 }}>{q}</div>
                        {i === 0 && <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>Click to expand answer...</div>}
                    </div>
                ))}
            </div>
        ),
    },
    {
        name: "Team Section",
        icon: "👥",
        description: "Team member cards with photos",
        preview: (
            <div style={{ padding: 16, display: "flex", gap: 12, justifyContent: "center" }}>
                {["Alice", "Bob", "Carol"].map((name, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", background: `hsl(${i * 80 + 200}, 60%, 70%)`, margin: "0 auto 8px" }} />
                        <div style={{ fontWeight: 500, fontSize: 12 }}>{name}</div>
                    </div>
                ))}
            </div>
        ),
    },
];

export default function ContentBlocksPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "var(--theme-secondary, #6366f1)", "var(--theme-accent, #a78bfa)"]}>Content Blocks</AuroraText>}
            subTitle={<DecryptedText text="Reusable content sections for your pages" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
            extra={[
                <Button key="add" type="primary" icon={<PlusOutlined />}>
                    Create Custom Block
                </Button>,
            ]}
        >
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { title: 'Block Types', value: contentBlocks.length, icon: <AppstoreOutlined />, color: '#3b82f6' },
                    { title: 'Layout Blocks', value: contentBlocks.filter(b => ['Features Grid','Image Gallery','Team Section'].includes(b.name)).length, icon: <BlockOutlined />, color: '#10b981' },
                    { title: 'Form Blocks', value: contentBlocks.filter(b => ['Contact Form'].includes(b.name)).length, icon: <EditOutlined />, color: '#8b5cf6' },
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
            <Row gutter={[16, 16]}>
                {contentBlocks.map((block, index) => (
                    <Col key={index} xs={24} sm={12} lg={8}>
                        <Card
                            hoverable
                            cover={
                                <div style={{ background: "#fafafa", padding: 8, minHeight: 150 }}>
                                    {block.preview}
                                </div>
                            }
                            actions={[
                                <Button key="edit" type="text" icon={<EditOutlined />}>
                                    Edit
                                </Button>,
                                <Button key="preview" type="text" icon={<EyeOutlined />}>
                                    Preview
                                </Button>,
                            ]}
                        >
                            <Card.Meta
                                avatar={<span style={{ fontSize: 24 }}>{block.icon}</span>}
                                title={block.name}
                                description={block.description}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>
        </CMSLayout>
    );
}
