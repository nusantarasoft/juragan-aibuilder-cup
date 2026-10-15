"use client";

import React, { useState, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { 
    Card, Form, Input, InputNumber, Switch, Button, Select, Tabs, 
    Table, Tag, Progress, Space, Row, Col, Typography, message, 
    Popconfirm, Divider, Tooltip, Badge, Statistic
} from "antd";
import { 
    GlobalOutlined, SettingOutlined, BugOutlined, PlayCircleOutlined,
    ClockCircleOutlined, CheckCircleOutlined, SyncOutlined, DatabaseOutlined,
    FileTextOutlined, StopOutlined, DeleteOutlined
} from "@ant-design/icons";
import { webCrawlerService, CrawlJob, CrawlJobConfig } from "@/lib/webCrawlerService";
import { StudioDemoBanner, StudioDemoModeTag } from "@/components/ai-studio/StudioDemoBanner";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function WebCrawlerPage() {
    const { themeColor } = usePreferencesStore();
    const [form] = Form.useForm();
    const [jobs, setJobs] = useState<CrawlJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchJobs = async () => {
        setLoading(true);
        const data = await webCrawlerService.getJobs();
        setJobs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 10000);
        return () => clearInterval(interval);
    }, []);

    const onStartCrawl = async (values: any) => {
        setSubmitting(true);
        try {
            const config: CrawlJobConfig = {
                seedUrls: values.seedUrls.split('\n').filter((u: string) => u.trim()),
                maxDepth: values.maxDepth || 2,
                includeRegex: values.includeRegex,
                excludeRegex: values.excludeRegex,
                useJsRendering: values.useJsRendering || false,
                authType: values.authType || 'none',
                rps: values.rps || 5,
                concurrency: values.concurrency || 2,
                proxyEnabled: values.proxyEnabled || false,
                cssSelector: values.cssSelector || 'body',
                autoMetadata: values.autoMetadata || false,
                chunkSize: values.chunkSize || 1000,
                chunkOverlap: values.chunkOverlap || 200,
                scheduleCron: values.scheduleCron,
            };
            
            const newJob = await webCrawlerService.createJob(values.jobName || 'Untitled Crawl', config);
            message.success('Crawl job created and queued!');
            
            // Start simulation
            webCrawlerService.startJobSimulation(newJob.id, (updatedJob) => {
                setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
            });
            
            fetchJobs();
            form.resetFields();
        } catch (error) {
            message.error('Failed to start crawl job.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        await webCrawlerService.deleteJob(id);
        message.success('Job deleted');
        fetchJobs();
    };

    const renderStatusTag = (status: string) => {
        switch(status) {
            case 'completed': return <Tag color="success" icon={<CheckCircleOutlined />}>Completed</Tag>;
            case 'running': return <Tag color="processing" icon={<SyncOutlined spin />}>Running</Tag>;
            case 'failed': return <Tag color="error" icon={<StopOutlined />}>Failed</Tag>;
            case 'paused': return <Tag color="warning" icon={<ClockCircleOutlined />}>Paused</Tag>;
            default: return <Tag color="default">Pending</Tag>;
        }
    };

    const columns = [
        {
            title: 'Job Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: CrawlJob) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.config.seedUrls[0]}</Text>
                </Space>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: renderStatusTag
        },
        {
            title: 'Progress',
            key: 'progress',
            render: (_: any, record: CrawlJob) => (
                <div style={{ minWidth: 150 }}>
                    <Progress percent={record.progress} size="small" status={record.status === 'failed' ? 'exception' : record.status === 'running' ? 'active' : 'normal'} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888' }}>
                        <span><FileTextOutlined /> {record.pagesScraped} pages</span>
                        <span><DatabaseOutlined /> {record.documentsGenerated} docs</span>
                    </div>
                </div>
            )
        },
        {
            title: 'Errors',
            dataIndex: 'errors',
            key: 'errors',
            render: (val: number) => val > 0 ? <Text type="danger">{val}</Text> : <Text type="secondary">0</Text>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: CrawlJob) => (
                <Space>
                    {record.status === 'running' && <Button size="small" danger icon={<StopOutlined />}>Stop</Button>}
                    <Popconfirm title="Delete job?" onConfirm={() => handleDelete(record.id)}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <CMSLayout
            title="Web Crawler Studio"
            subTitle="Ingest website data into your Vector Database"
            extra={[<StudioDemoModeTag key="demo" />]}
        >
            <StudioDemoBanner
                title="Web Crawler Studio"
                detail="Jobs run in the browser with in-memory simulation — no crawl worker or persistence yet (P2 backlog)."
            />
            <Row gutter={[24, 24]}>
                
                {/* CONFIGURATION PANEL */}
                <Col xs={24} lg={9}>
                    <Card title={<><GlobalOutlined /> New Crawl Job</>} bordered={false} className="shadow-sm">
                        <Form form={form} layout="vertical" onFinish={onStartCrawl} initialValues={{
                            maxDepth: 2, useJsRendering: false, authType: 'none', rps: 5, concurrency: 2,
                            proxyEnabled: false, cssSelector: 'body', autoMetadata: false, chunkSize: 1000, chunkOverlap: 200
                        }}>
                            
                            <Tabs defaultActiveKey="1" items={[
                                {
                                    key: '1',
                                    label: 'Basic Settings',
                                    children: (
                                        <>
                                            <Form.Item name="jobName" label="Job Name" rules={[{ required: true }]}>
                                                <Input placeholder="e.g. My Company Docs" />
                                            </Form.Item>
                                            <Form.Item name="seedUrls" label="Seed URLs (One per line)" rules={[{ required: true }]}>
                                                <TextArea rows={4} placeholder="https://example.com/docs&#10;https://example.com/blog" />
                                            </Form.Item>
                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item name="maxDepth" label="Max Depth">
                                                        <InputNumber min={1} max={10} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item name="scheduleCron" label="Schedule (Cron)">
                                                        <Input placeholder="e.g. 0 0 * * *" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Form.Item name="includeRegex" label="Include Paths (Regex)">
                                                <Input placeholder="e.g. ^/docs/.*" />
                                            </Form.Item>
                                        </>
                                    )
                                },
                                {
                                    key: '2',
                                    label: 'Advanced Engine',
                                    children: (
                                        <>
                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item name="rps" label="Requests per second">
                                                        <InputNumber min={1} max={50} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item name="concurrency" label="Concurrent Workers">
                                                        <InputNumber min={1} max={10} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Form.Item name="authType" label="Authentication">
                                                <Select options={[
                                                    { value: 'none', label: 'None' },
                                                    { value: 'basic', label: 'HTTP Basic Auth' },
                                                    { value: 'custom_header', label: 'Custom Headers / Bearer' }
                                                ]} />
                                            </Form.Item>
                                            <Form.Item name="useJsRendering" valuePropName="checked">
                                                <Switch /> <Text style={{ marginLeft: 8 }}>Enable Headless Browser (JS Rendering)</Text>
                                            </Form.Item>
                                            <Form.Item name="proxyEnabled" valuePropName="checked">
                                                <Switch /> <Text style={{ marginLeft: 8 }}>Use Rotating Proxies</Text>
                                            </Form.Item>
                                        </>
                                    )
                                },
                                {
                                    key: '3',
                                    label: 'Extraction Pipeline',
                                    children: (
                                        <>
                                            <Form.Item name="cssSelector" label="Target CSS Selector (Main Content)">
                                                <Input placeholder="e.g. main.article-body, #content" />
                                            </Form.Item>
                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item name="chunkSize" label="Chunk Size (Tokens)">
                                                        <InputNumber min={100} max={8000} step={100} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item name="chunkOverlap" label="Chunk Overlap">
                                                        <InputNumber min={0} max={1000} step={50} style={{ width: '100%' }} />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Form.Item name="autoMetadata" valuePropName="checked">
                                                <Switch /> <Text style={{ marginLeft: 8 }}>LLM Auto-Metadata Extraction (Title, Author, Tags)</Text>
                                            </Form.Item>
                                        </>
                                    )
                                }
                            ]} />

                            <Divider />
                            
                            <Button type="primary" htmlType="submit" icon={<PlayCircleOutlined />} size="large" block loading={submitting} style={{ backgroundColor: themeColor }}>
                                Start Crawling
                            </Button>
                        </Form>
                    </Card>
                </Col>

                {/* DASHBOARD PANEL */}
                <Col xs={24} lg={15}>
                    <Card title={<><DatabaseOutlined /> Job History</>} bordered={false} className="shadow-sm">
                        <Table 
                            dataSource={jobs} 
                            columns={columns} 
                            rowKey="id" 
                            loading={loading}
                            pagination={{ pageSize: 5 }}
                            size="middle"
                        />
                    </Card>
                    
                    {/* Active Workers Simulation Metric Card */}
                    <Row gutter={16} style={{ marginTop: 24 }}>
                        <Col span={8}>
                            <Card bordered={false} className="shadow-sm" style={{ textAlign: 'center' }}>
                                <Statistic title="Total Pages Ingested" value={jobs.reduce((acc, job) => acc + job.pagesScraped, 0)} prefix={<FileTextOutlined style={{ color: themeColor }}/>} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card bordered={false} className="shadow-sm" style={{ textAlign: 'center' }}>
                                <Statistic title="Vector Documents Generated" value={jobs.reduce((acc, job) => acc + job.documentsGenerated, 0)} prefix={<DatabaseOutlined style={{ color: '#52c41a' }}/>} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card bordered={false} className="shadow-sm" style={{ textAlign: 'center' }}>
                                <Statistic title="Crawl Errors" value={jobs.reduce((acc, job) => acc + job.errors, 0)} valueStyle={{ color: '#cf1322' }} prefix={<BugOutlined />}/>
                            </Card>
                        </Col>
                    </Row>
                </Col>

            </Row>
        </CMSLayout>
    );
}
