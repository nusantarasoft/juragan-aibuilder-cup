"use client";

import React, { useState } from 'react';
import CMSLayout from '@/components/layout/CMSLayout';
import { Card, Typography, Button, Space, Input, Tag } from 'antd';
import { motion } from 'framer-motion';
import { 
    ApiOutlined, 
    MailOutlined, 
    DatabaseOutlined, 
    PlayCircleOutlined, 
    SaveOutlined,
    SettingOutlined,
    ShareAltOutlined,
    CheckCircleFilled,
    WarningOutlined,
    NodeIndexOutlined,
    DragOutlined
} from '@ant-design/icons';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { useTheme } from "next-themes";
import { AuroraText } from '@/components/magicui/aurora-text';

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)' };

const SIDEBAR_NODES = [
    { type: 'trigger', icon: <ApiOutlined />, label: 'Webhook Trigger', color: '#10b981' },
    { type: 'trigger', icon: <PlayCircleOutlined />, label: 'Schedule', color: '#8b5cf6' },
    { type: 'action', icon: <MailOutlined />, label: 'Send Email', color: '#3b82f6' },
    { type: 'action', icon: <DatabaseOutlined />, label: 'Update Record', color: '#f59e0b' },
    { type: 'condition', icon: <ShareAltOutlined />, label: 'If/Else Split', color: '#ef4444' }
];

export default function AutomationWorkflowPage() {
    const { themeColor } = usePreferencesStore();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [workflowName, setWorkflowName] = useState('New Customer Onboarding');

    return (
        <CMSLayout 
            title={<AuroraText colors={[themeColor, '#ff6d5a', '#10b981']}>Workflow Builder</AuroraText>} 
            subTitle="Drag and drop nodes to create automated processes"
            extra={[
                <Button key="test" icon={<PlayCircleOutlined />}>Test Run</Button>,
                <Button key="save" type="primary" icon={<SaveOutlined />} style={{ backgroundColor: themeColor, border: 'none' }}>Save Workflow</Button>
            ]}
        >
            <div className="flex h-full gap-4" style={{ minHeight: 'calc(100vh - 180px)' }}>
                {/* Sidebar */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="w-64 flex flex-col gap-4"
                >
                    <Card size="small" style={{ ...glass, borderRadius: 14 }} className="dark:!bg-[rgba(15,15,23,0.6)]">
                        <Input 
                            value={workflowName} 
                            onChange={e => setWorkflowName(e.target.value)} 
                            bordered={false}
                            className="text-lg font-semibold px-0 mb-2"
                        />
                        <div className="flex gap-2 mb-4">
                            <Tag color="success" className="rounded-full border-none m-0"><CheckCircleFilled /> Active</Tag>
                            <Tag className="rounded-full m-0">v1.2</Tag>
                        </div>
                    </Card>

                    <Card size="small" title="Nodes" style={{ ...glass, borderRadius: 14, flex: 1 }} className="dark:!bg-[rgba(15,15,23,0.6)]">
                        <div className="flex flex-col gap-2">
                            {SIDEBAR_NODES.map((node, i) => (
                                <div 
                                    key={i} 
                                    className="flex items-center gap-3 p-2 rounded-lg cursor-grab hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-black/10 dark:hover:border-white/10"
                                >
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: node.color }}>
                                        {node.icon}
                                    </div>
                                    <div className="flex-1">
                                        <Text className="text-xs font-medium block">{node.label}</Text>
                                        <Text type="secondary" className="text-[10px] uppercase tracking-wider">{node.type}</Text>
                                    </div>
                                    <DragOutlined className="text-gray-400" />
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>

                {/* Canvas */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="flex-1 rounded-2xl relative overflow-hidden flex items-center justify-center"
                    style={{ 
                        ...glass,
                        background: isDark 
                            ? 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px) 0 0 / 20px 20px, rgba(15,15,23,0.6)'
                            : 'radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px) 0 0 / 20px 20px, rgba(255,255,255,0.65)' 
                    }}
                >
                    {/* Mock Nodes on Canvas */}
                    <div className="absolute top-1/4 left-1/4">
                        <Card size="small" className="shadow-lg border-t-4 w-48" style={{ borderTopColor: '#10b981', borderRadius: 12 }}>
                            <div className="flex items-center gap-2 mb-2">
                                <ApiOutlined style={{ color: '#10b981' }} />
                                <Text strong className="text-xs">Webhook</Text>
                            </div>
                            <Text type="secondary" className="text-[10px] block">Listens for POST /api/v1/user</Text>
                        </Card>
                    </div>

                    {/* Mock SVG Line */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <path 
                            d="M 330 250 C 400 250, 400 350, 480 350" 
                            fill="none" 
                            stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} 
                            strokeWidth="2" 
                            strokeDasharray="4 4"
                        />
                    </svg>

                    <div className="absolute top-[45%] left-[45%]">
                        <Card size="small" className="shadow-lg border-t-4 w-48" style={{ borderTopColor: '#3b82f6', borderRadius: 12 }}>
                            <div className="flex items-center gap-2 mb-2">
                                <MailOutlined style={{ color: '#3b82f6' }} />
                                <Text strong className="text-xs">Send Email</Text>
                            </div>
                            <Text type="secondary" className="text-[10px] block">Template: Welcome v2</Text>
                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                <Text type="secondary" className="text-[10px]">Success</Text>
                                <SettingOutlined className="text-gray-400 hover:text-blue-500 cursor-pointer" />
                            </div>
                        </Card>
                    </div>

                    {/* Canvas Controls */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                        <Button shape="circle" icon={<NodeIndexOutlined />} />
                        <Button shape="circle">-</Button>
                        <Button shape="circle" className="text-xs">100%</Button>
                        <Button shape="circle">+</Button>
                    </div>
                </motion.div>
            </div>
        </CMSLayout>
    );
}
