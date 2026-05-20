'use client';
import React from 'react';
import { motion } from 'framer-motion';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Row, Col, Typography, Space, Tag, Button, Badge } from 'antd';
import { FileTextOutlined, BarChartOutlined, TeamOutlined, ShoppingOutlined, BugOutlined, AuditOutlined, DollarOutlined, InboxOutlined, CopyOutlined } from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';

const { Text } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

const TEMPLATES = [
    { name: 'Financial Summary', desc: 'Revenue, expenses, P&L, cash flow — monthly or quarterly breakdown', module: 'Accounting', icon: <DollarOutlined />, color: '#3b82f6', fields: 12, downloads: 245 },
    { name: 'HR Headcount Analysis', desc: 'Employee distribution by department, role, tenure, and attrition rate', module: 'HR', icon: <TeamOutlined />, color: '#10b981', fields: 8, downloads: 180 },
    { name: 'Sales Pipeline Report', desc: 'Deals by stage, conversion rates, projected revenue, win/loss analysis', module: 'CRM', icon: <BarChartOutlined />, color: '#f59e0b', fields: 15, downloads: 312 },
    { name: 'Inventory Valuation', desc: 'Stock levels, FIFO/LIFO valuation, reorder alerts, slow-moving items', module: 'Inventory', icon: <InboxOutlined />, color: '#8b5cf6', fields: 10, downloads: 156 },
    { name: 'SLA Compliance Report', desc: 'Response times, resolution rates, SLA breaches, agent performance', module: 'ITSM', icon: <BugOutlined />, color: '#ef4444', fields: 14, downloads: 98 },
    { name: 'Audit Trail Export', desc: 'Complete audit log with user actions, timestamps, IP addresses, and changes', module: 'Compliance', icon: <AuditOutlined />, color: '#06b6d4', fields: 9, downloads: 74 },
    { name: 'E-Commerce Sales', desc: 'Orders, payment methods, top products, customer segments, returns', module: 'Commerce', icon: <ShoppingOutlined />, color: '#ec4899', fields: 11, downloads: 203 },
    { name: 'Project Status Report', desc: 'Task completion, milestones, budget vs actual, risk register', module: 'PM', icon: <FileTextOutlined />, color: '#14b8a6', fields: 13, downloads: 127 },
];

export default function ReportTemplatesPage() {
    const { themeColor } = usePreferencesStore();
    return (
        <CMSLayout title={<AuroraText colors={[themeColor, '#ec4899', '#f59e0b']}>Report Templates</AuroraText>} subTitle={<DecryptedText text="Pre-built report templates — one-click generation across all modules" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Row gutter={[12, 12]}>
                    {TEMPLATES.map((t, i) => (
                        <Col key={t.name} xs={24} sm={12} md={8} lg={6}>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card size="small" hoverable style={{ ...glass, borderTop: `3px solid ${t.color}`, height: '100%' }}>
                                    <div style={{ textAlign: 'center', marginBottom: 10 }}>
                                        <div style={{ fontSize: 28, color: t.color, marginBottom: 6 }}>{t.icon}</div>
                                        <Text strong style={{ fontSize: 13 }}>{t.name}</Text>
                                    </div>
                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 10, lineHeight: 1.5 }}>{t.desc}</Text>
                                    <Space size={4} style={{ marginBottom: 10 }}>
                                        <Tag style={{ fontSize: 9, borderRadius: 6 }}>{t.module}</Tag>
                                        <Tag style={{ fontSize: 9, borderRadius: 6 }}>{t.fields} fields</Tag>
                                        <Tag style={{ fontSize: 9, borderRadius: 6 }}>{t.downloads} uses</Tag>
                                    </Space>
                                    <Button type="primary" block size="small" icon={<CopyOutlined />} style={{ borderRadius: 8 }}>Use Template</Button>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>
            </motion.div>
        </CMSLayout>
    );
}
