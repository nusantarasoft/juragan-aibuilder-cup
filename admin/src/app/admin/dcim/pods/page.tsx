"use client";

import React, { useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { theme, Card, Table, Tag, Button, Input, Space, Row, Col, Statistic } from "antd";
import { SearchOutlined, FilterOutlined, PlusOutlined, DatabaseOutlined, BlockOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

export default function DcimPods() {
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

    const podData = [
        { id: '1', name: 'Pod A (Core Network)', code: 'POD-A', room: 'Server Room 1', rowsCount: 2, racksCount: 16, status: 'Active' },
        { id: '2', name: 'Pod B (Compute)', code: 'POD-B', room: 'Server Room 1', rowsCount: 4, racksCount: 32, status: 'Active' },
        { id: '3', name: 'Pod C (Storage)', code: 'POD-C', room: 'Server Room 2', rowsCount: 2, racksCount: 12, status: 'Planned' },
    ];

    const columns = [
        { 
            title: 'Name', 
            dataIndex: 'name', 
            key: 'name',
            render: (text: string) => <a style={{ color: themeColor, fontWeight: 500 }}>{text}</a>,
        },
        { title: 'Code', dataIndex: 'code', key: 'code' },
        { title: 'Location (Room)', dataIndex: 'room', key: 'room' },
        { title: 'Rows', dataIndex: 'rowsCount', key: 'rowsCount' },
        { title: 'Racks', dataIndex: 'racksCount', key: 'racksCount' },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            render: (status: string) => {
                let color = 'success';
                if (status === 'Planned') color = 'warning';
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

    return (
        <CMSLayout 
            title={<AuroraText>Pod Management</AuroraText>}
            subTitle={<DecryptedText text="Containment and Zones" speed={60} />}
        >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={8}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <Card style={glassStyle} bordered={false}>
                            <Statistic title="Total Pods" value={3} prefix={<BlockOutlined />} valueStyle={{ color: themeColor }} />
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card style={glassStyle} bordered={false} bodyStyle={{ padding: 0 }}>
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${isDark ? '#333' : '#f0f0f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                        <Space>
                            <Input 
                                placeholder="Search pods..." 
                                prefix={<SearchOutlined />} 
                                style={{ width: 300, borderRadius: 8 }}
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                            />
                            <Button icon={<FilterOutlined />}>Filters</Button>
                        </Space>
                        <Space>
                            <Button type="primary" icon={<PlusOutlined />} style={{ background: themeColor }}>Create Pod</Button>
                        </Space>
                    </div>
                    <Table 
                        columns={columns} 
                        dataSource={podData.filter(d => d.name.toLowerCase().includes(searchText.toLowerCase()) || d.code.toLowerCase().includes(searchText.toLowerCase()))}
                        pagination={{ pageSize: 10 }}
                        rowKey="id"
                        style={{ background: 'transparent' }}
                    />
                </Card>
            </motion.div>
        </CMSLayout>
    );
}
