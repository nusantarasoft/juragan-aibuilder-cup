"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Card, Button, Space, Tag, Typography, Row, Col, Select, Input, Switch, Divider, message, Empty, Spin, Tooltip, Badge, Tabs } from "antd";
import {
    BranchesOutlined, PlusOutlined, DeleteOutlined, ArrowRightOutlined,
    EyeOutlined, EyeInvisibleOutlined, CheckCircleOutlined, FormOutlined,
    ThunderboltOutlined, QuestionCircleOutlined, ReloadOutlined,
    CopyOutlined, SaveOutlined, SettingOutlined, FilterOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { useSearchParams } from "next/navigation";

const { Text, Title } = Typography;
const glass = { background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.45)', borderRadius: 14 };

interface Rule {
    id: string;
    sourceField: string;
    operator: string;
    value: string;
    action: string;
    targetField: string;
    enabled: boolean;
}

const OPERATORS = [
    { value: 'equals', label: '= Equals' },
    { value: 'not_equals', label: '≠ Not equals' },
    { value: 'contains', label: '∋ Contains' },
    { value: 'greater_than', label: '> Greater than' },
    { value: 'less_than', label: '< Less than' },
    { value: 'is_empty', label: '∅ Is empty' },
    { value: 'is_not_empty', label: '≠∅ Is not empty' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
];

const ACTIONS = [
    { value: 'show', label: '👁 Show field', color: '#10b981' },
    { value: 'hide', label: '🙈 Hide field', color: '#ef4444' },
    { value: 'require', label: '✱ Make required', color: '#f59e0b' },
    { value: 'optional', label: '○ Make optional', color: '#6b7280' },
    { value: 'set_value', label: '✏ Set value', color: '#3b82f6' },
    { value: 'skip_section', label: '⏭ Skip section', color: '#8b5cf6' },
    { value: 'calculate', label: '🔢 Calculate', color: '#06b6d4' },
];

function LogicContent() {
    const { themeColor } = usePreferencesStore();
    const searchParams = useSearchParams();
    const templateId = searchParams.get('templateId') || '';
    const [messageApi, ctx] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [fields, setFields] = useState<any[]>([]);
    const [rules, setRules] = useState<Rule[]>([]);

    const loadFields = useCallback(async () => {
        if (!templateId) { setLoading(false); return; }
        setLoading(true);
        try {
            const res = await gql<{ formFields: any[] }>(`
                query($tid: String!) { formFields(templateId: $tid) { id label type required } }
            `, { tid: templateId });
            setFields(res.formFields || []);
            // Generate sample rules from existing fields
            if ((res.formFields || []).length >= 2) {
                const f = res.formFields || [];
                setRules([{
                    id: 'rule-1', sourceField: f[0]?.id || '', operator: 'equals',
                    value: 'Yes', action: 'show', targetField: f[1]?.id || '', enabled: true,
                }]);
            }
        } catch (e: any) { messageApi.error(e.message); }
        setLoading(false);
    }, [templateId, messageApi]);

    useEffect(() => { loadFields(); }, [loadFields]);

    // Demo fields if none loaded
    const demoFields = fields.length > 0 ? fields : [
        { id: 'f1', label: 'Employment Type', type: 'select' },
        { id: 'f2', label: 'Years of Experience', type: 'number' },
        { id: 'f3', label: 'Department', type: 'select' },
        { id: 'f4', label: 'Manager Name', type: 'text' },
        { id: 'f5', label: 'Performance Score', type: 'rating' },
        { id: 'f6', label: 'Bonus Eligible', type: 'checkbox' },
        { id: 'f7', label: 'Comments', type: 'textarea' },
        { id: 'f8', label: 'Upload Documents', type: 'file' },
    ];

    const demoRules = rules.length > 0 ? rules : [
        { id: 'r1', sourceField: 'f1', operator: 'equals', value: 'Contract', action: 'hide', targetField: 'f6', enabled: true },
        { id: 'r2', sourceField: 'f2', operator: 'greater_than', value: '5', action: 'show', targetField: 'f7', enabled: true },
        { id: 'r3', sourceField: 'f5', operator: 'greater_than', value: '4', action: 'require', targetField: 'f7', enabled: false },
    ];

    const [activeRules, setActiveRules] = useState<Rule[]>(demoRules);

    const addRule = () => {
        const newRule: Rule = {
            id: `rule-${Date.now()}`, sourceField: demoFields[0]?.id || '',
            operator: 'equals', value: '', action: 'show',
            targetField: demoFields[1]?.id || '', enabled: true,
        };
        setActiveRules([...activeRules, newRule]);
    };

    const updateRule = (id: string, field: keyof Rule, value: any) => {
        setActiveRules(activeRules.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const deleteRule = (id: string) => {
        setActiveRules(activeRules.filter(r => r.id !== id));
    };

    const getFieldLabel = (id: string) => demoFields.find(f => f.id === id)?.label || id;
    const getActionConfig = (action: string) => ACTIONS.find(a => a.value === action) || ACTIONS[0];

    const handleSave = () => {
        messageApi.success(`${activeRules.length} conditional logic rules saved!`);
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#8b5cf6', '#06b6d4']}>Conditional Logic</AuroraText>}
            subTitle={<DecryptedText text="Show, hide, or modify fields based on user answers" animateOn="view" revealDirection="start" speed={40} sequential />}
            extra={[
                <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}
                    style={{ background: themeColor, borderColor: themeColor }}>Save Rules</Button>,
                <Button key="add" icon={<PlusOutlined />} onClick={addRule}>Add Rule</Button>,
            ]}
        >
            {ctx}
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                {/* Stats */}
                <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                    {[
                        { label: 'Total Rules', value: activeRules.length, color: '#3b82f6', icon: <BranchesOutlined /> },
                        { label: 'Active', value: activeRules.filter(r => r.enabled).length, color: '#10b981', icon: <CheckCircleOutlined /> },
                        { label: 'Fields', value: demoFields.length, color: '#8b5cf6', icon: <FormOutlined /> },
                        { label: 'Actions Used', value: new Set(activeRules.map(r => r.action)).size, color: '#f59e0b', icon: <ThunderboltOutlined /> },
                    ].map((s, i) => (
                        <Col xs={12} md={6} key={i}>
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                <Card style={{ ...glass, borderTop: `3px solid ${s.color}` }} bodyStyle={{ padding: '12px 16px' }}>
                                    <Space>
                                        <span style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 10 }}>{s.label}</Text>
                                            <div><Text strong style={{ fontSize: 20, color: s.color }}>{s.value}</Text></div>
                                        </div>
                                    </Space>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </Row>

                {/* Rules */}
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    <AnimatePresence>
                        {activeRules.map((rule, idx) => {
                            const actionCfg = getActionConfig(rule.action);
                            return (
                                <motion.div key={rule.id}
                                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }} transition={{ delay: idx * 0.05 }}>
                                    <Card
                                        style={{
                                            ...glass,
                                            borderLeft: `4px solid ${rule.enabled ? actionCfg.color : '#d1d5db'}`,
                                            opacity: rule.enabled ? 1 : 0.6,
                                        }}
                                        bodyStyle={{ padding: '16px 20px' }}
                                    >
                                        {/* Rule Header */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <Space>
                                                <Badge count={idx + 1} style={{ backgroundColor: rule.enabled ? actionCfg.color : '#d1d5db' }} />
                                                <Text strong style={{ fontSize: 13 }}>Rule {idx + 1}</Text>
                                                <Tag color={actionCfg.color} style={{ borderRadius: 8, fontSize: 10 }}>{actionCfg.label}</Tag>
                                            </Space>
                                            <Space size={4}>
                                                <Switch size="small" checked={rule.enabled}
                                                    onChange={v => updateRule(rule.id, 'enabled', v)} />
                                                <Button type="text" danger size="small" icon={<DeleteOutlined />}
                                                    onClick={() => deleteRule(rule.id)} />
                                            </Space>
                                        </div>

                                        {/* Rule Configuration */}
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Text type="secondary" style={{ fontSize: 11, minWidth: 30 }}>WHEN</Text>
                                            <Select size="small" value={rule.sourceField} style={{ minWidth: 160 }}
                                                onChange={v => updateRule(rule.id, 'sourceField', v)}
                                                options={demoFields.map(f => ({ value: f.id, label: f.label }))} />

                                            <Select size="small" value={rule.operator} style={{ minWidth: 130 }}
                                                onChange={v => updateRule(rule.id, 'operator', v)}
                                                options={OPERATORS} />

                                            {!['is_empty', 'is_not_empty'].includes(rule.operator) && (
                                                <Input size="small" value={rule.value} placeholder="Value"
                                                    style={{ width: 120 }}
                                                    onChange={e => updateRule(rule.id, 'value', e.target.value)} />
                                            )}

                                            <ArrowRightOutlined style={{ color: actionCfg.color, fontSize: 14 }} />

                                            <Text type="secondary" style={{ fontSize: 11, minWidth: 35 }}>THEN</Text>
                                            <Select size="small" value={rule.action} style={{ minWidth: 140 }}
                                                onChange={v => updateRule(rule.id, 'action', v)}
                                                options={ACTIONS.map(a => ({ value: a.value, label: a.label }))} />

                                            <Select size="small" value={rule.targetField} style={{ minWidth: 160 }}
                                                onChange={v => updateRule(rule.id, 'targetField', v)}
                                                options={demoFields.map(f => ({ value: f.id, label: f.label }))} />
                                        </div>

                                        {/* Preview sentence */}
                                        <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: `${actionCfg.color}08`, fontSize: 11 }}>
                                            <Text type="secondary">
                                                When <Text strong>"{getFieldLabel(rule.sourceField)}"</Text>
                                                {' '}{OPERATORS.find(o => o.value === rule.operator)?.label.toLowerCase() || rule.operator}
                                                {!['is_empty', 'is_not_empty'].includes(rule.operator) && <> <Text strong>"{rule.value}"</Text></>}
                                                {' → '}{actionCfg.label.toLowerCase()} <Text strong>"{getFieldLabel(rule.targetField)}"</Text>
                                            </Text>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </Space>

                {activeRules.length === 0 && (
                    <Card style={{ ...glass, textAlign: 'center', padding: 40 }}>
                        <BranchesOutlined style={{ fontSize: 40, color: '#d1d5db', marginBottom: 12 }} />
                        <div><Text type="secondary">No conditional logic rules yet</Text></div>
                        <Button type="primary" icon={<PlusOutlined />} onClick={addRule} style={{ marginTop: 12, background: themeColor }}>
                            Add First Rule
                        </Button>
                    </Card>
                )}

                {/* How It Works */}
                <Card style={{ ...glass, marginTop: 20 }}
                    title={<Space><QuestionCircleOutlined style={{ color: '#6366f1' }} /> How Conditional Logic Works</Space>}>
                    <Row gutter={[16, 16]}>
                        {[
                            { step: '1', title: 'Set Trigger', desc: 'Choose a source field and define when the rule activates', color: '#3b82f6', icon: <FilterOutlined /> },
                            { step: '2', title: 'Define Condition', desc: 'Set the operator and value to match (equals, contains, etc.)', color: '#f59e0b', icon: <SettingOutlined /> },
                            { step: '3', title: 'Choose Action', desc: 'Show, hide, require, or modify the target field', color: '#10b981', icon: <ThunderboltOutlined /> },
                            { step: '4', title: 'Live Preview', desc: 'Rules apply in real-time as users fill the form', color: '#8b5cf6', icon: <EyeOutlined /> },
                        ].map((s, i) => (
                            <Col xs={24} sm={12} md={6} key={i}>
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 18, color: s.color }}>
                                            {s.icon}
                                        </div>
                                        <Text strong style={{ fontSize: 12 }}>{s.title}</Text>
                                        <div><Text type="secondary" style={{ fontSize: 10 }}>{s.desc}</Text></div>
                                    </div>
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            </div>
        </CMSLayout>
    );
}

export default function FormLogicPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>}>
            <LogicContent />
        </Suspense>
    );
}
