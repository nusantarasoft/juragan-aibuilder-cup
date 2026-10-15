"use client";

import React from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Input, Space, Tag, Empty, Statistic, Tree } from "antd";
import { 
    ShareAltOutlined, SearchOutlined, NodeIndexOutlined, DatabaseOutlined, LinkOutlined 
} from "@ant-design/icons";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { StudioDemoBanner, StudioDemoModeTag } from "@/components/ai-studio/StudioDemoBanner";

const { Title, Text } = Typography;
const { Search } = Input;

export default function KnowledgeGraphPage() {
    const { themeColor } = usePreferencesStore();

    // Mock tree data representing a knowledge graph structure
    const treeData = [
        {
            title: <span style={{ fontWeight: 600 }}>Company Documentation (Root)</span>,
            key: '0-0',
            icon: <DatabaseOutlined />,
            children: [
                {
                    title: <span>Employee Handbook</span>,
                    key: '0-0-0',
                    icon: <LinkOutlined />,
                    children: [
                        { title: 'Leave Policy [Vector Chunk: 142]', key: '0-0-0-0', isLeaf: true },
                        { title: 'Code of Conduct [Vector Chunk: 98]', key: '0-0-0-1', isLeaf: true },
                    ],
                },
                {
                    title: <span>Technical Architecture</span>,
                    key: '0-0-1',
                    icon: <LinkOutlined />,
                    children: [
                        { title: 'Microservices Overview [Vector Chunk: 412]', key: '0-0-1-0', isLeaf: true },
                        { title: 'Database Schema [Vector Chunk: 88]', key: '0-0-1-1', isLeaf: true },
                    ],
                },
            ],
        },
    ];

    return (
        <CMSLayout
            title="Knowledge Graph Explorer"
            subTitle="Visualize semantic relationships in your Vector DB"
            extra={[<StudioDemoModeTag key="demo" />]}
        >
            <StudioDemoBanner
                title="Knowledge Graph Explorer"
                detail="Sample tree and metrics only — not loaded from your vector database yet (P2 backlog)."
            />
            <Row gutter={[24, 24]}>
                
                {/* Search & Metrics */}
                <Col span={24}>
                    <Card bordered={false} className="shadow-sm">
                        <Row gutter={24} align="middle">
                            <Col span={12}>
                                <Search 
                                    placeholder="Search nodes or semantic concepts (e.g., 'Leave Policy')" 
                                    enterButton={<SearchOutlined />} 
                                    size="large" 
                                />
                            </Col>
                            <Col span={4}>
                                <Statistic title="Total Nodes" value={1428} />
                            </Col>
                            <Col span={4}>
                                <Statistic title="Total Edges" value={5934} />
                            </Col>
                            <Col span={4}>
                                <Statistic title="Orphaned Chunks" value={12} valueStyle={{ color: '#cf1322' }} />
                            </Col>
                        </Row>
                    </Card>
                </Col>

                {/* Graph Visualization (Mock) & Details */}
                <Col span={16}>
                    <Card 
                        title={<><ShareAltOutlined /> Entity Graph</>} 
                        bordered={false} 
                        className="shadow-sm"
                        style={{ minHeight: 500, backgroundColor: '#000' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, flexDirection: 'column' }}>
                            <ShareAltOutlined style={{ fontSize: 64, color: themeColor, opacity: 0.5, marginBottom: 16 }} />
                            <Text style={{ color: '#fff' }}>Interactive 3D Graph Visualization requires WebGL.</Text>
                            <Text type="secondary">Displaying hierarchical tree fallback.</Text>
                            <div style={{ marginTop: 24, padding: 24, backgroundColor: '#141414', width: '80%', borderRadius: 8 }}>
                                <Tree
                                    showIcon
                                    defaultExpandAll
                                    treeData={treeData}
                                    style={{ background: 'transparent', color: '#fff' }}
                                />
                            </div>
                        </div>
                    </Card>
                </Col>

                {/* Node Inspector */}
                <Col span={8}>
                    <Card title={<><NodeIndexOutlined /> Node Inspector</>} bordered={false} className="shadow-sm" style={{ minHeight: 500 }}>
                        <Empty 
                            description="Select a node to view its semantic properties and raw text chunk" 
                            style={{ marginTop: 100 }} 
                        />
                    </Card>
                </Col>
            </Row>
        </CMSLayout>
    );
}
