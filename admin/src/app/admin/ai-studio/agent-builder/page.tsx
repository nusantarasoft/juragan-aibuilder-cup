"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { Card, Row, Col, Typography, Button, Space, Divider, Select, Steps, Tag, Collapse } from "antd";
import { 
    RobotOutlined, NodeIndexOutlined, SettingOutlined, PlayCircleOutlined,
    ApiOutlined, DatabaseOutlined, GlobalOutlined, CodeOutlined
} from "@ant-design/icons";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Title, Text } = Typography;
const { Panel } = Collapse;

export default function AgentBuilderPage() {
    const { themeColor } = usePreferencesStore();
    const [currentStep, setCurrentStep] = useState(0);

    return (
        <CMSLayout title="Visual Agent Builder" subTitle="Orchestrate autonomous AI agents and toolchains">
            <Row gutter={24}>
                {/* Node Palette */}
                <Col span={6}>
                    <Card title="Node Library" size="small" bordered={false} className="shadow-sm">
                        <Collapse defaultActiveKey={['1', '2']} ghost>
                            <Panel header="LLM Engines" key="1">
                                <Card size="small" hoverable style={{ marginBottom: 8, borderLeft: `4px solid ${themeColor}` }}>
                                    <Space><RobotOutlined /> GPT-4 Turbo</Space>
                                </Card>
                                <Card size="small" hoverable style={{ marginBottom: 8, borderLeft: `4px solid ${themeColor}` }}>
                                    <Space><RobotOutlined /> Claude 3.5 Sonnet</Space>
                                </Card>
                            </Panel>
                            <Panel header="Tools & Integrations" key="2">
                                <Card size="small" hoverable style={{ marginBottom: 8, borderLeft: `4px solid #52c41a` }}>
                                    <Space><GlobalOutlined /> Web Crawler</Space>
                                </Card>
                                <Card size="small" hoverable style={{ marginBottom: 8, borderLeft: `4px solid #52c41a` }}>
                                    <Space><DatabaseOutlined /> Vector DB Search</Space>
                                </Card>
                                <Card size="small" hoverable style={{ marginBottom: 8, borderLeft: `4px solid #52c41a` }}>
                                    <Space><ApiOutlined /> REST API Call</Space>
                                </Card>
                            </Panel>
                        </Collapse>
                    </Card>
                </Col>

                {/* Canvas Area */}
                <Col span={18}>
                    <Card 
                        title={<><NodeIndexOutlined /> Workflow Canvas</>} 
                        extra={<Button type="primary" icon={<PlayCircleOutlined />}>Test Run</Button>}
                        bordered={false} 
                        className="shadow-sm"
                        style={{ minHeight: 600, backgroundColor: '#fafafa', backgroundImage: 'radial-gradient(#e5e5e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                    >
                        <div style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                            {/* Mocked Node Chain */}
                            <Card style={{ width: 300, borderTop: `4px solid #1890ff` }} size="small">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Space  style={{ width: '100%', display: 'flex' }}>
                                        <Text strong><GlobalOutlined /> Trigger: Webhook</Text>
                                        <Tag color="blue">Input</Tag>
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Awaits incoming JSON payload</Text>
                                </Space>
                            </Card>

                            <div style={{ height: 40, width: 2, backgroundColor: '#d9d9d9' }} />

                            <Card style={{ width: 300, borderTop: `4px solid ${themeColor}` }} size="small">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Space  style={{ width: '100%', display: 'flex' }}>
                                        <Text strong><RobotOutlined /> Intent Classifier</Text>
                                        <Tag color="purple">LLM</Tag>
                                    </Space>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Model: Claude 3.5 Sonnet</Text>
                                    <Button size="small" type="dashed" block icon={<SettingOutlined />}>Edit Prompt</Button>
                                </Space>
                            </Card>

                            <div style={{ height: 40, width: 2, backgroundColor: '#d9d9d9' }} />

                            <Row gutter={40}>
                                <Col>
                                    <Card style={{ width: 250, borderTop: `4px solid #52c41a` }} size="small">
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Space  style={{ width: '100%', display: 'flex' }}>
                                                <Text strong><DatabaseOutlined /> Context Retrieval</Text>
                                                <Tag color="green">Tool</Tag>
                                            </Space>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Queries Supabase pgvector</Text>
                                        </Space>
                                    </Card>
                                </Col>
                                <Col>
                                    <Card style={{ width: 250, borderTop: `4px solid #faad14` }} size="small">
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            <Space  style={{ width: '100%', display: 'flex' }}>
                                                <Text strong><CodeOutlined /> Python Script</Text>
                                                <Tag color="orange">Logic</Tag>
                                            </Space>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Executes custom formatting</Text>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>
                        </div>
                    </Card>
                </Col>
            </Row>
        </CMSLayout>
    );
}
