"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Tag, Button, Input, Space, Row, Col, Statistic, Dropdown } from "antd";
import { SearchOutlined, FilterOutlined, ExportOutlined, PlusOutlined, DatabaseOutlined, QrcodeOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

export default function DcimAssets() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');

    const [searchText, setSearchText] = useState("");

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    // Demo Data
    const assetData = [
        { id: '1', assetTag: 'SRV-1001', type: 'Server', model: 'Dell R740', rack: 'A12', uPos: 'U10-11', status: 'Active', lifecycle: 'Production' },
        { id: '2', assetTag: 'SRV-1002', type: 'Server', model: 'Dell R740', rack: 'A12', uPos: 'U12-13', status: 'Warning', lifecycle: 'Production' },
        { id: '3', assetTag: 'SW-CORE-01', type: 'Switch', model: 'Cisco Nexus 9k', rack: 'N01', uPos: 'U38', status: 'Active', lifecycle: 'Production' },
        { id: '4', assetTag: 'PDU-A12-L', type: 'PDU', model: 'APC 8000', rack: 'A12', uPos: 'Zero-U', status: 'Active', lifecycle: 'Production' },
        { id: '5', assetTag: 'SRV-0988', type: 'Server', model: 'HP ProLiant', rack: 'C05', uPos: 'U22', status: 'Offline', lifecycle: 'Maintenance' },
        { id: '6', assetTag: 'SAN-01', type: 'Storage', model: 'NetApp AFF', rack: 'S01', uPos: 'U10-16', status: 'Active', lifecycle: 'Production' },
        { id: '7', assetTag: 'SRV-0552', type: 'Server', model: 'Dell R640', rack: 'StorageRm', uPos: '-', status: 'Inventory', lifecycle: 'Stock' },
    ];

    const columns = [
        { 
            title: 'Asset Tag', 
            dataIndex: 'assetTag', 
            key: 'assetTag',
            render: (text: string) => <a style={{ color: themeColor, fontWeight: 500 }}>{text}</a>,
        },
        { 
            title: 'Type', 
            dataIndex: 'type', 
            key: 'type',
            render: (text: string) => {
                let color = 'default';
                if (text === 'Server') color = 'blue';
                if (text === 'Switch') color = 'purple';
                if (text === 'Storage') color = 'cyan';
                if (text === 'PDU') color = 'orange';
                return <Tag color={color}>{text}</Tag>;
            }
        },
        { title: 'Model', dataIndex: 'model', key: 'model' },
        { title: 'Rack', dataIndex: 'rack', key: 'rack' },
        { title: 'U-Position', dataIndex: 'uPos', key: 'uPos' },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            render: (status: string) => {
                let color = 'success';
                if (status === 'Warning') color = 'warning';
                if (status === 'Offline') color = 'error';
                if (status === 'Inventory') color = 'default';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        { title: 'Lifecycle', dataIndex: 'lifecycle', key: 'lifecycle' },
        {
            title: 'Actions',
            key: 'actions',
            render: () => (
                <Space size="small">
                    <Button type="text" size="small">Edit</Button>
                    <Button type="text" size="small" icon={<QrcodeOutlined />} />
                </Space>
            ),
        },
    ];

    return (
        <CMSLayout 
            title={<AuroraText>Asset Management</AuroraText>}
            subTitle={<DecryptedText text="Data Center Inventory & Lifecycle" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Assets" value={1248} prefix={<DatabaseOutlined />} valueStyle={{ color: themeColor }} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Servers" value={842} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Networking" value={156} />
                        </Card>
                    </motion.div>
                </Col>
                <Col xs={24} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="In Maintenance" value={12} valueStyle={{ color: '#faad14' }} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <Space>
                            <Input 
                                placeholder="Search by tag, model..." 
                                prefix={<SearchOutlined />} 
                                style={{ width: 300, borderRadius: 8 }}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                            />
                            <Button icon={<FilterOutlined />}>Filters</Button>
                        </Space>
                        <Space>
                            <Button icon={<ExportOutlined />}>Export</Button>
                            <Button type="primary" icon={<PlusOutlined />} style={{ background: themeColor }}>Add Asset</Button>
                        </Space>
                    </div>
                    <Table 
                        columns={columns} 
                        dataSource={assetData.filter(d => d.assetTag.toLowerCase().includes(searchText.toLowerCase()) || d.model.toLowerCase().includes(searchText.toLowerCase()))}
                        pagination={{ pageSize: 10 }}
                        rowKey="id"
                        style={{ background: 'transparent' }}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
