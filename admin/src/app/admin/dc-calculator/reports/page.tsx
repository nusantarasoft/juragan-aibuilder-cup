"use client";

import React, { useState, useEffect } from 'react';
import { Typography, Card, Select, Button, Space, Row, Col, Statistic, Descriptions, Table, Empty } from 'antd';
import { DownloadOutlined, PrinterOutlined, FilePdfOutlined, LeftOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { theme } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Title, Text } = Typography;

interface Scenario {
    id: string;
    name: string;
    createdAt: string;
    params: {
        itLoad: number;
        powerRedundancy: string;
        coolingRedundancy: string;
        coolingArchitecture: string;
        containment: string;
        upsTopology: string;
        distribution: string;
        buildingType: string;
        raisedFloor: boolean;
        droppedCeiling: boolean;
        region: string;
    };
    totalCapex: number;
    costPerKw: number;
    breakdown: { name: string; value: number; color: string }[];
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function ReportsPage() {
    const { themeColor } = usePreferencesStore();
    const router = useRouter();
    const { token } = theme.useToken();
    const isDark = token.colorBgContainer === '#141414' || token.colorBgBase?.includes('14');
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

    useEffect(() => {
        const savedScenarios = localStorage.getItem('dc-calculator-scenarios');
        if (savedScenarios) {
            try {
                const parsed = JSON.parse(savedScenarios);
                setScenarios(parsed);
                if (parsed.length > 0) {
                    setSelectedScenarioId(parsed[0].id);
                }
            } catch (e) {
                console.error("Failed to parse scenarios", e);
            }
        }
    }, []);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

    const handleExportCSV = () => {
        if (!selectedScenario) return;
        const headers = ["Subsystem", "Cost ($)", "% of Total"];
        const rows = selectedScenario.breakdown.map(item => {
            const percentage = ((item.value / selectedScenario.totalCapex) * 100).toFixed(2);
            return [item.name, item.value.toString(), percentage];
        });
        const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${selectedScenario.name}_cost_breakdown.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(value);
    };

    const columns = [
        {
            title: 'Subsystem',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: any) => (
                <Space>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: record.color }} />
                    <Text strong>{text}</Text>
                </Space>
            )
        },
        {
            title: 'Cost ($)',
            dataIndex: 'value',
            key: 'value',
            align: 'right' as const,
            render: (val: number) => formatCurrency(val)
        },
        {
            title: '% of Total',
            key: 'percentage',
            align: 'right' as const,
            render: (_: any, record: any) => {
                const perc = ((record.value / (selectedScenario?.totalCapex || 1)) * 100).toFixed(1);
                return `${perc}%`;
            }
        }
    ];

    return (
        <CMSLayout>
            <style>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    .print-only {
                        display: block !important;
                    }
                    body {
                        background: white !important;
                    }
                    .print-card {
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                    }
                }
            `}</style>

            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
                className="max-w-6xl mx-auto space-y-6 pb-12"
            >
                {/* Header */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
                    <div>
                        <Button
                            type="text"
                            icon={<LeftOutlined />}
                            onClick={() => router.back()}
                            className="mb-2 -ml-4"
                            style={{ color: token.colorTextSecondary }}
                        >
                            Back
                        </Button>
                        <Title level={2} style={{ margin: 0 }}>
                            <AuroraText>Cost Reports</AuroraText>
                        </Title>
                        <div style={{ color: token.colorTextSecondary, marginTop: 4 }}>
                            <DecryptedText text="Export & share data center cost analysis" speed={50} animateOn="view" />
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="no-print">
                    <Card style={glassStyle} bordered={false}>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex-1 w-full flex items-center gap-4">
                                <Text strong>Select Scenario:</Text>
                                <Select
                                    style={{ width: 300 }}
                                    placeholder="Select a saved scenario"
                                    value={selectedScenarioId}
                                    onChange={setSelectedScenarioId}
                                    options={scenarios.map(s => ({ label: s.name, value: s.id }))}
                                    notFoundContent="No scenarios saved"
                                />
                            </div>
                            {selectedScenario && (
                                <Space>
                                    <Button icon={<FilePdfOutlined />} onClick={handlePrint}>Export PDF</Button>
                                    <Button icon={<DownloadOutlined />} onClick={handleExportCSV}>Export CSV</Button>
                                    <Button type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                                </Space>
                            )}
                        </div>
                    </Card>
                </motion.div>

                {selectedScenario ? (
                    <motion.div variants={itemVariants}>
                        <Card style={glassStyle} bordered={false} className="print-card">
                            <div className="text-center mb-8">
                                <Title level={3} style={{ marginBottom: 4 }}>Data Center Capital Cost Report</Title>
                                <Text type="secondary">Scenario: {selectedScenario.name} | Date: {new Date(selectedScenario.createdAt).toLocaleDateString()}</Text>
                            </div>

                            <Row gutter={[24, 24]}>
                                <Col xs={24} md={12}>
                                    <Card size="small" title="Cost Summary" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', height: '100%' }}>
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Statistic 
                                                    title="Total CapEx" 
                                                    value={selectedScenario.totalCapex} 
                                                    formatter={(val) => formatCurrency(Number(val))} 
                                                    valueStyle={{ color: token.colorPrimary, fontWeight: 'bold' }}
                                                />
                                            </Col>
                                            <Col span={12}>
                                                <Statistic 
                                                    title="Cost per kW" 
                                                    value={selectedScenario.costPerKw} 
                                                    formatter={(val) => formatCurrency(Number(val))}
                                                />
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Card size="small" title="Parameters Summary" style={{ background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)', height: '100%' }}>
                                        <Descriptions column={2} size="small">
                                            <Descriptions.Item label="IT Load">{selectedScenario.params.itLoad} kW</Descriptions.Item>
                                            <Descriptions.Item label="Region">{selectedScenario.params.region}</Descriptions.Item>
                                            <Descriptions.Item label="Power Redundancy">{selectedScenario.params.powerRedundancy}</Descriptions.Item>
                                            <Descriptions.Item label="Cooling">{selectedScenario.params.coolingArchitecture}</Descriptions.Item>
                                            <Descriptions.Item label="UPS">{selectedScenario.params.upsTopology}</Descriptions.Item>
                                            <Descriptions.Item label="Containment">{selectedScenario.params.containment}</Descriptions.Item>
                                        </Descriptions>
                                    </Card>
                                </Col>
                            </Row>

                            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                                <Col xs={24} lg={12}>
                                    <Title level={5}>Cost Breakdown Table</Title>
                                    <Table 
                                        dataSource={selectedScenario.breakdown} 
                                        columns={columns} 
                                        rowKey="name"
                                        pagination={false}
                                        size="middle"
                                    />
                                </Col>
                                <Col xs={24} lg={12}>
                                    <Title level={5}>Cost Distribution</Title>
                                    <div style={{ height: 350, width: '100%' }}>
                                        <ResponsiveContainer>
                                            <BarChart data={selectedScenario.breakdown} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                                                <XAxis type="number" tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} />
                                                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                                                <Tooltip 
                                                    formatter={(val: number) => formatCurrency(val as number)}
                                                    contentStyle={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderColor: token.colorBorder }}
                                                />
                                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                    {selectedScenario.breakdown.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div variants={itemVariants}>
                        <Card style={glassStyle} bordered={false}>
                            <Empty 
                                description={
                                    <Text type="secondary">
                                        No saved scenarios found. Please calculate and save a scenario first.
                                    </Text>
                                }
                            />
                        </Card>
                    </motion.div>
                )}
            </motion.div>
        </CMSLayout>
    );
}
