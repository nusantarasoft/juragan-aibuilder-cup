"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Tag, Button, Input, Space, Row, Col, Statistic, Modal, Form, InputNumber, Select } from "antd";
import { SearchOutlined, FilterOutlined, PlusOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

export default function DcimRacks() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const [searchText, setSearchText] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const [rackData, setRackData] = useState([
        { id: '1', name: 'Rack N01', code: 'N01', pod: 'Pod A', row: 'Row 1', totalU: 42, usedU: 38, status: 'Active' },
        { id: '2', name: 'Rack N02', code: 'N02', pod: 'Pod A', row: 'Row 1', totalU: 42, usedU: 20, status: 'Active' },
        { id: '3', name: 'Rack S01', code: 'S01', pod: 'Pod C', row: 'Row 5', totalU: 48, usedU: 48, status: 'Full' },
    ]);

    const columns = [
        { 
            title: 'Name', 
            dataIndex: 'name', 
            key: 'name',
            render: (text: string) => <a style={{ color: themeColor, fontWeight: 500 }}>{text}</a>,
        },
        { title: 'Code', dataIndex: 'code', key: 'code' },
        { title: 'Pod', dataIndex: 'pod', key: 'pod' },
        { title: 'Row', dataIndex: 'row', key: 'row' },
        { 
            title: 'U Space', 
            key: 'uSpace',
            render: (_: any, record: any) => `${record.usedU} / ${record.totalU} U`
        },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            render: (status: string) => {
                let color = 'success';
                if (status === 'Full') color = 'error';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: () => (
                <Space size="small">
                    <Button type="text" size="small">Edit</Button>
                    <Button type="text" size="small" danger>Delete</Button>
                </Space>
            ),
        },
    ];

    const handleCreate = (values: any) => {
        setRackData([...rackData, {
            id: Math.random().toString(),
            name: values.name,
            code: values.code,
            pod: values.pod || '-',
            row: values.row || '-',
            totalU: values.totalU,
            usedU: 0,
            status: 'Active'
        }]);
        setIsModalOpen(false);
        form.resetFields();
    };

    return (
        <CMSLayout 
            title={<AuroraText>Rack Management</AuroraText>}
            subTitle={<DecryptedText text="Cabinets and Enclosures" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Racks" value={rackData.length} prefix={<UnorderedListOutlined />} valueStyle={{ color: themeColor }} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <Space>
                            <Input 
                                placeholder="Search racks..." 
                                prefix={<SearchOutlined />} 
                                style={{ width: 300, borderRadius: 8 }}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                            />
                            <Button icon={<FilterOutlined />}>Filters</Button>
                        </Space>
                        <Space>
                            <Button type="primary" icon={<PlusOutlined />} style={{ background: themeColor }} onClick={() => setIsModalOpen(true)}>Create Rack</Button>
                        </Space>
                    </div>
                    <Table 
                        columns={columns} 
                        dataSource={rackData.filter(d => d.name.toLowerCase().includes(searchText.toLowerCase()) || d.code.toLowerCase().includes(searchText.toLowerCase()))}
                        pagination={{ pageSize: 10 }}
                        rowKey="id"
                        style={{ background: 'transparent' }}
                    />
                </Card>
            </motion.div>

            <Modal
                title="Create New Rack"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form layout="vertical" form={form} onFinish={handleCreate} initialValues={{ totalU: 42 }}>
                    <Form.Item name="name" label="Rack Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Rack A1" />
                    </Form.Item>
                    <Form.Item name="code" label="Rack Code">
                        <Input placeholder="e.g. A1" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="pod" label="Assign to Pod">
                                <Select placeholder="Select Pod" options={[{label:'Pod A', value:'Pod A'}, {label:'Pod B', value:'Pod B'}, {label:'Pod C', value:'Pod C'}]} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="row" label="Assign to Row">
                                <Select placeholder="Select Row" options={[{label:'Row 1', value:'Row 1'}, {label:'Row 2', value:'Row 2'}]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="totalU" label="Total Height (U)" rules={[{ required: true }]} help="Specify how many U units this rack has (e.g. 42, 48)">
                        <InputNumber min={1} max={60} style={{ width: '100%' }} />
                    </Form.Item>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                        <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit" style={{ background: themeColor }}>Create</Button>
                    </div>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
