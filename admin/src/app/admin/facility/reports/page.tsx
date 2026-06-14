'use client';

import React, { useState, useRef } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { AuroraText } from '@/components/magicui/aurora-text';
import DecryptedText from '@/components/react-bits/DecryptedText';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { Row, Col, Card, Button, Form, Select, DatePicker, Checkbox, message, theme, Typography, Space, Modal, Input } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, SendOutlined, SettingOutlined, ProjectOutlined, PlusOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import html2canvas from 'html2canvas';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const mockPueData = Array.from({ length: 24 }).map((_, i) => ({
    hour: `${i}:00`,
    pue: 1.2 + Math.random() * 0.4,
}));

export default function FacilityReports() {
    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [form] = Form.useForm();
    const chartRef = useRef<HTMLDivElement>(null);

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)'}`,
        borderRadius: 16,
    };

    const mockAlarmData = [
        ['10:05 AM', 'DCIM', 'Server Room 2 Temp High', 'Resolved'],
        ['11:30 AM', 'BMS', 'AHU-1 Filter Pressure Warning', 'Active'],
        ['14:15 PM', 'SCADA', 'Modbus Gateway Disconnected', 'Resolved'],
        ['15:45 PM', 'BMS', 'Door 4 Forced Open', 'Active'],
    ];

    const generatePDF = async () => {
        setIsGenerating(true);
        try {
            const doc = new jsPDF();
            
            doc.setFontSize(20);
            doc.text('Facility Operations Shift Report', 14, 22);
            
            doc.setFontSize(11);
            doc.text(`Generated: ${dayjs().format('YYYY-MM-DD HH:mm:ss')}`, 14, 30);
            doc.text(`Operator: Admin User`, 14, 36);

            doc.setFontSize(14);
            doc.text('Executive Summary', 14, 48);
            doc.setFontSize(10);
            doc.text('The facility operated within normal parameters for the duration of the shift.', 14, 55);
            doc.text('Average PUE: 1.35 | Total Energy Consumed: 12.4 MWh', 14, 61);

            if (chartRef.current) {
                const canvas = await html2canvas(chartRef.current, { backgroundColor: isDark ? '#141414' : '#ffffff' });
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', 14, 70, 180, 80);
            }

            autoTable(doc, {
                startY: 160,
                head: [['Time', 'Module', 'Event Description', 'Status']],
                body: mockAlarmData,
                theme: 'grid',
                headStyles: { fillColor: [24, 144, 255] },
            });

            doc.save(`Facility_Report_${dayjs().format('YYYYMMDD')}.pdf`);
            message.success('PDF Report Downloaded Successfully');
        } catch (err) {
            console.error(err);
            message.error('Failed to generate PDF');
        } finally {
            setIsGenerating(false);
        }
    };

    const generateExcel = () => {
        setIsGenerating(true);
        setTimeout(() => {
            const ws = XLSX.utils.aoa_to_sheet([
                ['Time', 'Module', 'Event Description', 'Status'],
                ...mockAlarmData
            ]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Shift Alarms");
            XLSX.writeFile(wb, `Facility_Alarms_${dayjs().format('YYYYMMDD')}.xlsx`);
            setIsGenerating(false);
            message.success('Excel Report Downloaded Successfully');
        }, 1000);
    };

    const dispatchToPM = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setIsDispatchModalOpen(false);
            message.success('Report dispatched to PM Knowledge Base & ITSM Ticket successfully!');
        }, 1500);
    };

    return (
        <CMSLayout
            title={<AuroraText>Automated Reporting</AuroraText>}
            subTitle={<DecryptedText text="Generate Compliance & Shift Reports" speed={60} />}
        >
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Row gutter={[24, 24]}>
                    {/* Left Col: Config & Preview */}
                    <Col xs={24} lg={14}>
                        <Card title="Report Configuration" style={glassStyle} bordered={false}>
                            <Form form={form} layout="vertical" initialValues={{ reportType: 'shift', modules: ['dcim', 'bms', 'scada'] }}>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item label="Report Type" name="reportType">
                                            <Select>
                                                <Select.Option value="shift">Daily Shift Report</Select.Option>
                                                <Select.Option value="pue">Sustainability & PUE Report</Select.Option>
                                                <Select.Option value="alarm">Comprehensive Alarm History</Select.Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Date Range" name="dateRange">
                                            <RangePicker style={{ width: '100%' }} showTime />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Form.Item label="Include Modules" name="modules">
                                    <Checkbox.Group>
                                        <Space direction="horizontal" wrap>
                                            <Checkbox value="dcim">DCIM</Checkbox>
                                            <Checkbox value="bms">BMS</Checkbox>
                                            <Checkbox value="scada">SCADA</Checkbox>
                                            <Checkbox value="itsm">ITSM</Checkbox>
                                        </Space>
                                    </Checkbox.Group>
                                </Form.Item>

                                <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                                    <Button type="primary" icon={<FilePdfOutlined />} onClick={generatePDF} loading={isGenerating} style={{ background: '#cf1322', borderColor: '#cf1322' }}>
                                        Export as PDF
                                    </Button>
                                    <Button type="primary" icon={<FileExcelOutlined />} onClick={generateExcel} loading={isGenerating} style={{ background: '#389e0d', borderColor: '#389e0d' }}>
                                        Export as Excel
                                    </Button>
                                    <Button type="default" icon={<ProjectOutlined />} onClick={() => setIsDispatchModalOpen(true)}>
                                        Dispatch to PM Project
                                    </Button>
                                </div>
                            </Form>
                        </Card>

                        <Card title="Report Data Preview (PUE Trend)" style={{ ...glassStyle, marginTop: 24 }} bordered={false}>
                            <div ref={chartRef} style={{ height: 300, width: '100%', background: isDark ? '#141414' : '#fff', padding: 16 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={mockPueData}>
                                        <defs>
                                            <linearGradient id="colorPue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={themeColor} stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor={themeColor} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                                        <XAxis dataKey="hour" />
                                        <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} />
                                        <RechartsTooltip />
                                        <Area type="monotone" dataKey="pue" stroke={themeColor} fillOpacity={1} fill="url(#colorPue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>

                    {/* Right Col: Scheduling */}
                    <Col xs={24} lg={10}>
                        <Card title="Scheduled Distributions" style={glassStyle} bordered={false}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: 16, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 8, border: `1px solid ${themeColor}40` }}>
                                <div>
                                    <Text strong style={{ display: 'block' }}>Daily Manager Briefing</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Every day at 08:00 AM via Email</Text>
                                </div>
                                <Space>
                                    <Button size="small" icon={<SendOutlined />} title="Run Now" />
                                    <Button size="small" icon={<SettingOutlined />} title="Edit" />
                                </Space>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
                                <div>
                                    <Text strong style={{ display: 'block' }}>Weekly Energy Compliance</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Every Monday at 06:00 AM to Knowledge Base</Text>
                                </div>
                                <Space>
                                    <Button size="small" icon={<SendOutlined />} />
                                    <Button size="small" icon={<SettingOutlined />} />
                                </Space>
                            </div>

                            <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setIsScheduleModalOpen(true)} style={{ marginTop: 16 }}>Create New Schedule</Button>
                        </Card>
                    </Col>
                </Row>
            </motion.div>

            {/* PM Dispatch Modal */}
            <Modal
                title="Dispatch Report to PM"
                open={isDispatchModalOpen}
                onOk={dispatchToPM}
                onCancel={() => setIsDispatchModalOpen(false)}
                okText="Dispatch"
                confirmLoading={isGenerating}
            >
                <Form layout="vertical">
                    <Form.Item label="Target PM Project" required>
                        <Select placeholder="Select PM Project">
                            <Select.Option value="P-101">Data Center Alpha Migration</Select.Option>
                            <Select.Option value="P-102">HVAC Upgrade Phase 2</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="Action">
                        <Select defaultValue="kb">
                            <Select.Option value="kb">Upload to Knowledge Base</Select.Option>
                            <Select.Option value="ticket">Attach to New ITSM Ticket</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="Note (Optional)">
                        <Input.TextArea rows={2} placeholder="Add a note to the dispatch..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Schedule Modal */}
            <Modal
                title="Create Report Schedule"
                open={isScheduleModalOpen}
                onOk={() => setIsScheduleModalOpen(false)}
                onCancel={() => setIsScheduleModalOpen(false)}
                okText="Save Schedule"
            >
                <Form layout="vertical">
                    <Form.Item label="Schedule Name" required>
                        <Input placeholder="e.g. Monthly Compliance" />
                    </Form.Item>
                    <Form.Item label="Frequency" required>
                        <Select defaultValue="daily">
                            <Select.Option value="daily">Daily</Select.Option>
                            <Select.Option value="weekly">Weekly</Select.Option>
                            <Select.Option value="monthly">Monthly</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="Delivery Method">
                        <Checkbox.Group options={['Email', 'Slack', 'PM Knowledge Base']} defaultValue={['Email']} />
                    </Form.Item>
                </Form>
            </Modal>
        </CMSLayout>
    );
}
