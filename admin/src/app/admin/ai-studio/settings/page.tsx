"use client";

import React, { useEffect, useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import { 
    Form, Input, Button, Card, Select, Switch, Row, Col, Divider, 
    message, Spin, Typography 
} from "antd";
import { SaveOutlined, ReloadOutlined, RobotOutlined, KeyOutlined, ApiOutlined, GlobalOutlined } from "@ant-design/icons";
import { studioService } from "@/lib/studioService";

const { Title, Text } = Typography;

export default function AiStudioSettingsPage() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const settings = await studioService.getSettings();
            if (settings) {
                form.setFieldsValue(settings);
            }
        } catch (error: any) {
            message.error(error.message || "Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (values: any) => {
        setSaving(true);
        try {
            await studioService.updateSettings(values);
            message.success("Settings saved successfully");
        } catch (error: any) {
            message.error(error.message || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const cardStyle = {
        background: "#ffffff",
        borderColor: "#f0f0f0",
        marginBottom: 24,
    };

    return (
        <CMSLayout 
            title={<AuroraText>AI Models & Configuration</AuroraText>}
            breadcrumb={[{ title: "AI Studio" }, { title: "Settings" }]}
        >
            <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 64 }}>
                <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Model Configurations</Title>
                        <Text type="secondary">Manage your AI providers, models, and endpoints directly from the database.</Text>
                    </div>
                    <div>
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={loadSettings} 
                            style={{ marginRight: 8 }}
                        >
                            Refresh
                        </Button>
                        <Button 
                            type="primary" 
                            icon={<SaveOutlined />} 
                            loading={saving} 
                            onClick={() => form.submit()}
                        >
                            Save Settings
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: 100 }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16 }}>Loading configuration...</div>
                    </div>
                ) : (
                    <Form 
                        form={form} 
                        layout="vertical" 
                        onFinish={handleSave}
                        initialValues={{
                            default_llm_provider: 'anthropic',
                            default_embedding_provider: 'auto',
                            waha_dashboard_url: 'http://127.0.0.1:3010/dashboard'
                        }}
                    >
                        <Row gutter={[24, 24]}>
                            <Col xs={24} lg={8}>
                                <Card title={<><RobotOutlined /> Global Defaults</>} style={cardStyle} bordered>
                                    <Form.Item 
                                        name="default_llm_provider" 
                                        label="Default Chat LLM Provider"
                                        rules={[{ required: true }]}
                                    >
                                        <Select>
                                            <Select.Option value="anthropic">Anthropic (Claude)</Select.Option>
                                            <Select.Option value="google">Google (Gemini/Vertex)</Select.Option>
                                            <Select.Option value="openai">OpenAI</Select.Option>
                                            <Select.Option value="ollama">Ollama (Local)</Select.Option>
                                        </Select>
                                    </Form.Item>
                                    
                                    <Form.Item 
                                        name="default_embedding_provider" 
                                        label="Default Embedding Provider"
                                        rules={[{ required: true }]}
                                    >
                                        <Select>
                                            <Select.Option value="auto">Auto (Google Cloud if available)</Select.Option>
                                            <Select.Option value="google_ai">Google AI Studio</Select.Option>
                                            <Select.Option value="vertex">Vertex AI</Select.Option>
                                            <Select.Option value="ollama">Ollama (Local)</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Card>

                                <Card title={<><GlobalOutlined /> Integrations</>} style={cardStyle} bordered>
                                    <Form.Item 
                                        name="waha_dashboard_url" 
                                        label="WAHA Dashboard URL"
                                    >
                                        <Input placeholder="http://127.0.0.1:3010/dashboard" />
                                    </Form.Item>
                                </Card>
                            </Col>

                            <Col xs={24} lg={16}>
                                <Card title={<><KeyOutlined /> Anthropic Configuration</>} style={cardStyle} bordered>
                                    <Row gutter={16}>
                                        <Col span={24}>
                                            <Form.Item name="anthropic_api_key" label="API Key">
                                                <Input.Password placeholder="sk-ant-api03-..." />
                                            </Form.Item>
                                        </Col>
                                        <Col span={24}>
                                            <Form.Item name="anthropic_model" label="Default Model">
                                                <Input placeholder="claude-3-5-haiku-20241022" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Card>

                                <Card title={<><KeyOutlined /> Google Gemini / Vertex Configuration</>} style={cardStyle} bordered>
                                    <Row gutter={16}>
                                        <Col span={24}>
                                            <Form.Item name="google_api_key" label="Google AI Studio API Key (Overrides Vertex)">
                                                <Input.Password placeholder="AIzaSy..." />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="google_project_id" label="Vertex Project ID">
                                                <Input placeholder="my-gcp-project" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="google_location" label="Vertex Location">
                                                <Input placeholder="us-central1" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={24}>
                                            <Form.Item name="google_model" label="Default Generative Model">
                                                <Input placeholder="gemini-2.5-flash" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Card>

                                <Card title={<><ApiOutlined /> Ollama / Local Configuration</>} style={cardStyle} bordered>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="ollama_base_url" label="Ollama Endpoint">
                                                <Input placeholder="http://host.docker.internal:11434" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="ollama_model" label="Default Model">
                                                <Input placeholder="llama3" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Card>

                                <Card title={<><KeyOutlined /> OpenAI Configuration</>} style={cardStyle} bordered>
                                    <Row gutter={16}>
                                        <Col span={24}>
                                            <Form.Item name="openai_api_key" label="API Key">
                                                <Input.Password placeholder="sk-..." />
                                            </Form.Item>
                                        </Col>
                                        <Col span={24}>
                                            <Form.Item name="openai_model" label="Default Model">
                                                <Input placeholder="gpt-4o" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Card>
                            </Col>
                        </Row>
                    </Form>
                )}
            </div>
        </CMSLayout>
    );
}
