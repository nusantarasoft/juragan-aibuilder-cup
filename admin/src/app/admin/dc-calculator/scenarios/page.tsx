"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  theme, 
  Table, 
  Button, 
  Input, 
  Popconfirm, 
  Badge, 
  Space, 
  Typography, 
  Card,
  Tooltip,
  Empty
} from "antd";
import { motion } from "framer-motion";
import { 
  Search, 
  Trash2, 
  Copy, 
  Play, 
  Database,
  Calculator
} from "lucide-react";
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
}

export default function SavedScenariosPage() {
    const { themeColor } = usePreferencesStore();
    const { token } = theme.useToken();
    const isDark = token.colorBgContainer === '#141414' || token.colorBgBase?.includes('14');
    const router = useRouter();

    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [searchText, setSearchText] = useState("");
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const stored = localStorage.getItem("dc-calculator-scenarios");
        if (stored) {
            try {
                setScenarios(JSON.parse(stored));
            } catch (error) {
                console.error("Failed to parse saved scenarios", error);
            }
        }
    }, []);

    const saveToLocalStorage = (data: Scenario[]) => {
        localStorage.setItem("dc-calculator-scenarios", JSON.stringify(data));
        setScenarios(data);
    };

    const handleDelete = (id: string) => {
        const updated = scenarios.filter(s => s.id !== id);
        saveToLocalStorage(updated);
    };

    const handleDuplicate = (scenario: Scenario) => {
        const duplicated: Scenario = {
            ...scenario,
            id: crypto.randomUUID(),
            name: `${scenario.name} (Copy)`,
            createdAt: new Date().toISOString(),
        };
        const updated = [duplicated, ...scenarios];
        saveToLocalStorage(updated);
    };

    const handleClearAll = () => {
        saveToLocalStorage([]);
    };

    const handleLoad = (scenario: Scenario) => {
        // We pass the scenario id via query parameters, so the calculator page can load it from localStorage
        router.push(`/admin/dc-calculator?loadScenario=${scenario.id}`);
    };

    const filteredScenarios = scenarios.filter(s => 
        s.name.toLowerCase().includes(searchText.toLowerCase())
    );

    const glassStyle = {
        background: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.65)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)"}`,
        borderRadius: 16,
    };

    const columns = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (text: string) => (
                <Text strong style={{ color: token.colorPrimary }}>{text}</Text>
            )
        },
        {
            title: "IT Load",
            dataIndex: ["params", "itLoad"],
            key: "itLoad",
            render: (val: number) => `${val?.toLocaleString() || 0} kW`
        },
        {
            title: "Power Redundancy",
            dataIndex: ["params", "powerRedundancy"],
            key: "powerRedundancy",
        },
        {
            title: "Cooling Type",
            dataIndex: ["params", "coolingArchitecture"],
            key: "coolingArchitecture",
        },
        {
            title: "Total CapEx",
            dataIndex: "totalCapex",
            key: "totalCapex",
            render: (val: number) => (
                <Text style={{ color: token.colorSuccess, fontWeight: 500 }}>
                    ${val?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}
                </Text>
            )
        },
        {
            title: "Cost/kW",
            dataIndex: "costPerKw",
            key: "costPerKw",
            render: (val: number) => `$${val?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 0}/kW`
        },
        {
            title: "Created Date",
            dataIndex: "createdAt",
            key: "createdAt",
            render: (val: string) => new Date(val).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        },
        {
            title: "Actions",
            key: "actions",
            render: (_: any, record: Scenario) => (
                <Space>
                    <Tooltip title="Load Scenario">
                        <Button 
                            type="text" 
                            icon={<Play size={16} />} 
                            onClick={() => handleLoad(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Duplicate">
                        <Button 
                            type="text" 
                            icon={<Copy size={16} />} 
                            onClick={() => handleDuplicate(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete Scenario"
                        description="Are you sure you want to delete this scenario?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Tooltip title="Delete">
                            <Button type="text" danger icon={<Trash2 size={16} />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    if (!isMounted) return null;

    return (
        <CMSLayout>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{ display: "flex", flexDirection: "column", gap: 24 }}
            >
                <div>
                    <Title level={2} style={{ margin: 0 }}>
                        <AuroraText>Saved Scenarios</AuroraText>
                    </Title>
                    <div style={{ marginTop: 8 }}>
                        <DecryptedText 
                            text="Compare & manage your data center designs" 
                            speed={50} 
                            maxIterations={15} 
                            animateOn="view"
                        />
                    </div>
                </div>

                {scenarios.length > 0 ? (
                    <Card style={glassStyle} bordered={false} styles={{ body: { padding: 24 } }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                            <Space align="center" size="middle">
                                <Badge 
                                    count={scenarios.length} 
                                    color={token.colorPrimary} 
                                    style={{ backgroundColor: token.colorPrimary, color: '#fff', boxShadow: 'none' }}
                                />
                                <Text strong style={{ fontSize: 16 }}>Total Scenarios</Text>
                            </Space>
                            <Space wrap>
                                <Input
                                    placeholder="Search by name..."
                                    prefix={<Search size={16} style={{ color: token.colorTextTertiary }} />}
                                    value={searchText}
                                    onChange={e => setSearchText(e.target.value)}
                                    style={{ width: 250, borderRadius: 8 }}
                                    allowClear
                                />
                                <Popconfirm
                                    title="Clear All Scenarios"
                                    description="Are you sure you want to delete all saved scenarios? This action cannot be undone."
                                    onConfirm={handleClearAll}
                                    okText="Yes, Clear All"
                                    cancelText="Cancel"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button danger icon={<Trash2 size={16} />} style={{ borderRadius: 8 }}>
                                        Clear All
                                    </Button>
                                </Popconfirm>
                            </Space>
                        </div>
                        
                        <Table 
                            columns={columns} 
                            dataSource={filteredScenarios} 
                            rowKey="id" 
                            pagination={{ pageSize: 10, position: ['bottomCenter'] }}
                            scroll={{ x: 'max-content' }}
                            style={{ 
                                background: 'transparent'
                            }}
                        />
                    </Card>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                    >
                        <Card style={{ ...glassStyle, textAlign: 'center', padding: '60px 20px' }} bordered={false}>
                            <Empty
                                image={<Database size={64} style={{ color: token.colorTextTertiary, opacity: 0.5 }} />}
                                imageStyle={{ height: 60, marginBottom: 24 }}
                                description={
                                    <Space direction="vertical" size={8}>
                                        <Text strong style={{ fontSize: 18 }}>No saved scenarios yet</Text>
                                        <Text type="secondary">
                                            Design your data center and save scenarios to compare different configurations.
                                        </Text>
                                    </Space>
                                }
                            >
                                <Button 
                                    type="primary" 
                                    size="large" 
                                    icon={<Calculator size={18} />}
                                    onClick={() => router.push('/admin/dc-calculator')}
                                    style={{ marginTop: 24, borderRadius: 8 }}
                                >
                                    Go to Calculator
                                </Button>
                            </Empty>
                        </Card>
                    </motion.div>
                )}
            </motion.div>
        </CMSLayout>
    );
}
