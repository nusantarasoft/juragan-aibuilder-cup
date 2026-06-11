"use client";
import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { Card, Button, Space, Tag, Input, Select, Modal, Form, message, Tooltip, Typography, Row, Col, Switch, Slider, InputNumber, Divider, Empty, Spin, Popconfirm, Badge, Drawer, Collapse, ColorPicker } from "antd";
import {
    PlusOutlined, DeleteOutlined, CopyOutlined, EyeOutlined, SaveOutlined,
    ArrowLeftOutlined, ArrowUpOutlined, ArrowDownOutlined, SettingOutlined,
    DragOutlined, FormOutlined, FontSizeOutlined, NumberOutlined, MailOutlined,
    PhoneOutlined, LinkOutlined, CalendarOutlined, ClockCircleOutlined,
    CheckSquareOutlined, StarOutlined, SlidersFilled, UploadOutlined,
    EditOutlined, FileTextOutlined, MinusOutlined, OrderedListOutlined,
    AppstoreOutlined, BarsOutlined, MenuOutlined, MobileOutlined,
    DesktopOutlined, UndoOutlined, RedoOutlined, RocketOutlined,
    CheckCircleOutlined, CloseOutlined, ExpandOutlined, CompressOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import CMSLayout from "@/components/layout/CMSLayout";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useSearchParams, useRouter } from "next/navigation";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

// ─── Types ──────────────────────────────────────────────
interface FormField {
    id: string;
    templateId?: string;
    sectionId?: string;
    sectionTitle?: string;
    fieldType: string;
    label: string;
    description?: string;
    placeholder?: string;
    isRequired: boolean;
    sortOrder: number;
    options: any[];
    validation: any;
    kpiConfig: any;
    conditional: any;
    defaultValue?: string;
    metadata: any;
    _isNew?: boolean;
    _localId?: string;
}

interface FormTemplate {
    id: string;
    name: string;
    description?: string;
    category: string;
    status: string;
    settings: any;
    scoringConfig: any;
    styleConfig: any;
    version: number;
    tags: string[];
}

// ─── Field Type Definitions ─────────────────────────────
const FIELD_TYPES = [
    { type: 'section_header', label: 'Section Header', icon: <MenuOutlined />, category: 'layout', color: '#8b5cf6' },
    { type: 'paragraph', label: 'Paragraph', icon: <FileTextOutlined />, category: 'layout', color: '#8b5cf6' },
    { type: 'divider', label: 'Divider', icon: <MinusOutlined />, category: 'layout', color: '#8b5cf6' },
    { type: 'text', label: 'Text', icon: <FontSizeOutlined />, category: 'input', color: '#3b82f6' },
    { type: 'textarea', label: 'Long Text', icon: <EditOutlined />, category: 'input', color: '#3b82f6' },
    { type: 'number', label: 'Number', icon: <NumberOutlined />, category: 'input', color: '#3b82f6' },
    { type: 'email', label: 'Email', icon: <MailOutlined />, category: 'input', color: '#06b6d4' },
    { type: 'phone', label: 'Phone', icon: <PhoneOutlined />, category: 'input', color: '#06b6d4' },
    { type: 'url', label: 'URL', icon: <LinkOutlined />, category: 'input', color: '#06b6d4' },
    { type: 'date', label: 'Date', icon: <CalendarOutlined />, category: 'input', color: '#f59e0b' },
    { type: 'date_range', label: 'Date Range', icon: <CalendarOutlined />, category: 'input', color: '#f59e0b' },
    { type: 'time', label: 'Time', icon: <ClockCircleOutlined />, category: 'input', color: '#f59e0b' },
    { type: 'select', label: 'Dropdown', icon: <BarsOutlined />, category: 'choice', color: '#10b981' },
    { type: 'multi_select', label: 'Multi Select', icon: <AppstoreOutlined />, category: 'choice', color: '#10b981' },
    { type: 'radio', label: 'Radio', icon: <CheckCircleOutlined />, category: 'choice', color: '#10b981' },
    { type: 'checkbox', label: 'Checkbox', icon: <CheckSquareOutlined />, category: 'choice', color: '#10b981' },
    { type: 'rating', label: 'Rating', icon: <StarOutlined />, category: 'advanced', color: '#ec4899' },
    { type: 'slider', label: 'Slider', icon: <SlidersFilled />, category: 'advanced', color: '#ec4899' },
    { type: 'file_upload', label: 'File Upload', icon: <UploadOutlined />, category: 'advanced', color: '#ec4899' },
    { type: 'ranking', label: 'Ranking', icon: <OrderedListOutlined />, category: 'advanced', color: '#ec4899' },
];

const FIELD_CATEGORIES = [
    { key: 'layout', label: 'Layout', color: '#8b5cf6' },
    { key: 'input', label: 'Text & Numbers', color: '#3b82f6' },
    { key: 'choice', label: 'Choice', color: '#10b981' },
    { key: 'advanced', label: 'Advanced', color: '#ec4899' },
];

const getFieldTypeDef = (type: string) => FIELD_TYPES.find(f => f.type === type);

const glass = { background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)', border: '1px solid rgba(255, 255, 255, 0.6)', borderRadius: 12 };
const glassPanel = { background: 'rgba(255, 255, 255, 0.35)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.05)', border: '1px solid rgba(255, 255, 255, 0.5)', borderRadius: 10 };

// ─── GraphQL ────────────────────────────────────────────
const GET_TEMPLATE = `query($id:ID!){formTemplate(id:$id){id name description category status settings scoringConfig styleConfig version tags}}`;
const GET_FIELDS = `query($tid:String!){formFields(templateId:$tid){id templateId sectionId sectionTitle fieldType label description placeholder isRequired sortOrder options validation kpiConfig conditional defaultValue metadata}}`;
const SAVE_FIELDS = `mutation($tid:String!,$fields:[FormFieldInput!]!){saveFormFields(templateId:$tid,fields:$fields)}`;
const PUBLISH = `mutation($id:ID!){publishFormTemplate(id:$id){id status}}`;
const UPDATE_TEMPLATE = `mutation($id:ID!,$input:UpdateFormTemplateInput!){updateFormTemplate(id:$id,input:$input){id name}}`;

// ─── Field Preview Component ────────────────────────────
function FieldPreview({ field }: { field: FormField }) {
    const typeDef = getFieldTypeDef(field.fieldType);
    switch (field.fieldType) {
        case 'section_header':
            return (
                <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: 8 }}>
                    <Text strong style={{ fontSize: 16, color: '#1f2937' }}>{field.label}</Text>
                    {field.description && <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{field.description}</Text>}
                </div>
            );
        case 'paragraph':
            return <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>{field.label}</Paragraph>;
        case 'divider':
            return <Divider style={{ margin: '4px 0' }} />;
        case 'text': case 'email': case 'phone': case 'url':
            return <Input placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} disabled style={{ borderRadius: 8 }} prefix={typeDef?.icon} />;
        case 'textarea':
            return <TextArea placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} disabled rows={3} style={{ borderRadius: 8 }} />;
        case 'number':
            return <InputNumber placeholder="0" disabled style={{ width: '100%', borderRadius: 8 }} />;
        case 'date': case 'time': case 'date_range':
            return <Input placeholder={field.fieldType === 'date_range' ? 'Start — End' : `Select ${field.fieldType}...`} disabled suffix={<CalendarOutlined />} style={{ borderRadius: 8 }} />;
        case 'select':
            return <Select placeholder="Select an option..." disabled style={{ width: '100%' }} options={(field.options || []).map((o: any) => ({ label: o.label, value: o.value }))} />;
        case 'multi_select':
            return <Select mode="multiple" placeholder="Select options..." disabled style={{ width: '100%' }} options={(field.options || []).map((o: any) => ({ label: o.label, value: o.value }))} />;
        case 'radio':
            return (
                <Space direction="vertical" size={4}>
                    {(field.options || []).slice(0, 4).map((o: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #d1d5db' }} />
                            <Text style={{ fontSize: 13 }}>{o.label || o.value}</Text>
                        </div>
                    ))}
                </Space>
            );
        case 'checkbox':
            return (
                <Space direction="vertical" size={4}>
                    {(field.options?.length > 0 ? field.options : [{ label: field.label }]).slice(0, 4).map((o: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 16, height: 16, borderRadius: 3, border: '2px solid #d1d5db' }} />
                            <Text style={{ fontSize: 13 }}>{o.label || o.value}</Text>
                        </div>
                    ))}
                </Space>
            );
        case 'rating':
            return (
                <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <StarOutlined key={i} style={{ fontSize: 22, color: i <= 3 ? '#fadb14' : '#d9d9d9' }} />
                    ))}
                </div>
            );
        case 'slider':
            return <Slider disabled defaultValue={50} style={{ margin: '4px 0' }} />;
        case 'file_upload':
            return (
                <div style={{ border: '2px dashed #d1d5db', borderRadius: 8, padding: '16px 0', textAlign: 'center', color: '#9ca3af' }}>
                    <UploadOutlined style={{ fontSize: 20 }} />
                    <div style={{ fontSize: 12, marginTop: 4 }}>Click or drag to upload</div>
                </div>
            );
        case 'ranking':
            return (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {(field.options || []).slice(0, 3).map((o: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                            <DragOutlined style={{ color: '#9ca3af' }} />
                            <Text style={{ fontSize: 13 }}>{i + 1}. {o.label || o.value}</Text>
                        </div>
                    ))}
                </Space>
            );
        default:
            return <Input disabled placeholder="Field preview" style={{ borderRadius: 8 }} />;
    }
}

// ─── Option Editor ──────────────────────────────────────
function OptionEditor({ options, onChange }: { options: any[]; onChange: (opts: any[]) => void }) {
    return (
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
            {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Input size="small" value={opt.label} placeholder="Label"
                        onChange={e => { const n = [...options]; n[i] = { ...n[i], label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }; onChange(n); }}
                        style={{ flex: 1, borderRadius: 6 }} />
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onChange(options.filter((_, j) => j !== i))} />
                </div>
            ))}
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => onChange([...options, { label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` }])} block style={{ borderRadius: 6 }}>
                Add Option
            </Button>
        </Space>
    );
}

// ─── KPI Config Editor ──────────────────────────────────
function KpiConfigEditor({ config, onChange }: { config: any; onChange: (c: any) => void }) {
    return (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Weight (%)</Text>
                    <InputNumber size="small" min={0} max={100} value={config.weight || 0} onChange={v => onChange({ ...config, weight: v })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Max Score</Text>
                    <InputNumber size="small" min={0} value={config.max_score || 5} onChange={v => onChange({ ...config, max_score: v })} style={{ width: '100%' }} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Target</Text>
                    <InputNumber size="small" min={0} value={config.target || 0} onChange={v => onChange({ ...config, target: v })} style={{ width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>Dimension</Text>
                    <Input size="small" value={config.dimension || ''} onChange={e => onChange({ ...config, dimension: e.target.value })} style={{ borderRadius: 6 }} />
                </div>
            </div>
        </Space>
    );
}

// ═══════════════════════════════════════════════════════
// MAIN BUILDER PAGE
// ═══════════════════════════════════════════════════════
function FormBuilderContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const templateId = searchParams.get('id');
    const { themeColor } = usePreferencesStore();
    const [messageApi, contextHolder] = message.useMessage();

    // State
    const [template, setTemplate] = useState<FormTemplate | null>(null);
    const [fields, setFields] = useState<FormField[]>([]);
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [showFieldPalette, setShowFieldPalette] = useState(true);
    const [hasChanges, setHasChanges] = useState(false);
    const [history, setHistory] = useState<FormField[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const selectedField = fields.find(f => (f._localId || f.id) === selectedFieldId) || null;

    // ─── Load Data ──────────────────────────────────────
    const loadData = useCallback(async () => {
        if (!templateId) return;
        setLoading(true);
        try {
            const [tData, fData] = await Promise.all([
                gql(GET_TEMPLATE, { id: templateId }),
                gql(GET_FIELDS, { tid: templateId }),
            ]);
            setTemplate(tData.formTemplate);
            const loadedFields = (fData.formFields || [])
                .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                .map((f: any) => ({ ...f, _localId: f.id }));
            setFields(loadedFields);
            setHistory([loadedFields]);
            setHistoryIndex(0);
        } catch (err: any) {
            messageApi.error('Failed to load template: ' + err.message);
        }
        setLoading(false);
    }, [templateId, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    // ─── History Management ─────────────────────────────
    const pushHistory = useCallback((newFields: FormField[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            newHistory.push(newFields);
            return newHistory.slice(-30); // max 30 history items
        });
        setHistoryIndex(prev => Math.min(prev + 1, 29));
        setHasChanges(true);
    }, [historyIndex]);

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
            setFields(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(prev => prev + 1);
            setFields(history[historyIndex + 1]);
        }
    };

    // ─── Field Operations ───────────────────────────────
    const updateFields = (newFields: FormField[]) => {
        setFields(newFields);
        pushHistory(newFields);
    };

    const addField = (fieldType: string) => {
        const typeDef = getFieldTypeDef(fieldType);
        const newField: FormField = {
            id: '',
            _localId: `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            _isNew: true,
            fieldType,
            label: typeDef?.label || 'New Field',
            description: '',
            placeholder: '',
            isRequired: false,
            sortOrder: fields.length,
            options: ['select', 'multi_select', 'radio', 'checkbox', 'ranking'].includes(fieldType)
                ? [{ label: 'Option 1', value: 'option_1' }, { label: 'Option 2', value: 'option_2' }]
                : [],
            validation: {},
            kpiConfig: {},
            conditional: {},
            defaultValue: '',
            metadata: {},
        };
        const newFields = [...fields, newField];
        updateFields(newFields);
        setSelectedFieldId(newField._localId!);
    };

    const duplicateField = (field: FormField) => {
        const newField: FormField = {
            ...field,
            id: '',
            _localId: `dup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            _isNew: true,
            label: `${field.label} (Copy)`,
            sortOrder: field.sortOrder + 1,
        };
        const idx = fields.findIndex(f => (f._localId || f.id) === (field._localId || field.id));
        const newFields = [...fields];
        newFields.splice(idx + 1, 0, newField);
        // Reorder
        newFields.forEach((f, i) => f.sortOrder = i);
        updateFields(newFields);
        setSelectedFieldId(newField._localId!);
    };

    const deleteField = (fieldId: string) => {
        const newFields = fields.filter(f => (f._localId || f.id) !== fieldId);
        newFields.forEach((f, i) => f.sortOrder = i);
        updateFields(newFields);
        if (selectedFieldId === fieldId) setSelectedFieldId(null);
    };

    const moveField = (fieldId: string, direction: 'up' | 'down') => {
        const idx = fields.findIndex(f => (f._localId || f.id) === fieldId);
        if (direction === 'up' && idx <= 0) return;
        if (direction === 'down' && idx >= fields.length - 1) return;
        const newFields = [...fields];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [newFields[idx], newFields[swapIdx]] = [newFields[swapIdx], newFields[idx]];
        newFields.forEach((f, i) => f.sortOrder = i);
        updateFields(newFields);
    };

    const updateField = (fieldId: string, updates: Partial<FormField>) => {
        const newFields = fields.map(f =>
            (f._localId || f.id) === fieldId ? { ...f, ...updates } : f
        );
        updateFields(newFields);
    };

    // ─── Save ───────────────────────────────────────────
    const handleSave = async () => {
        if (!templateId) return;
        setSaving(true);
        try {
            const fieldsInput = fields.map((f, i) => ({
                id: f._isNew ? undefined : f.id,
                fieldType: f.fieldType,
                label: f.label,
                description: f.description || '',
                placeholder: f.placeholder || '',
                isRequired: f.isRequired,
                sortOrder: i,
                sectionTitle: f.sectionTitle || '',
                options: JSON.stringify(f.options || []),
                validation: JSON.stringify(f.validation || {}),
                kpiConfig: JSON.stringify(f.kpiConfig || {}),
                conditional: JSON.stringify(f.conditional || {}),
                defaultValue: f.defaultValue || '',
            }));
            await gql(SAVE_FIELDS, { tid: templateId, fields: fieldsInput });
            messageApi.success('Form saved successfully!');
            setHasChanges(false);
            loadData();
        } catch (err: any) {
            messageApi.error('Failed to save: ' + err.message);
        }
        setSaving(false);
    };

    const handlePublish = async () => {
        if (!templateId) return;
        try {
            await handleSave();
            await gql(PUBLISH, { id: templateId });
            messageApi.success('Form published!');
            loadData();
        } catch (err: any) {
            messageApi.error('Failed to publish: ' + err.message);
        }
    };

    // ─── Render ─────────────────────────────────────────
    if (!templateId) {
        return (
            <CMSLayout title="Form Builder">
                <div style={{ textAlign: 'center', padding: 100 }}>
                    <Empty description="No template selected. Go to Templates and click Edit." />
                    <Button type="primary" onClick={() => router.push('/admin/forms/templates')} style={{ marginTop: 16 }}>Go to Templates</Button>
                </div>
            </CMSLayout>
        );
    }

    if (loading) {
        return (
            <CMSLayout title="Form Builder"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /><div style={{ marginTop: 12 }}>Loading form builder...</div></div></CMSLayout>
        );
    }

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#ec4899', '#3b82f6']} className="text-[20px] font-bold tracking-tight">Form Builder</AuroraText>}
            subTitle={<DecryptedText text={template?.name || 'Untitled Form'} animateOn="view" revealDirection="start" speed={60} sequential />}
        >
            {contextHolder}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* ═══ Toolbar ═══ */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card size="small" style={{ ...glass, padding: '4px 8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/admin/forms/templates')} type="text">Templates</Button>
                                <Divider type="vertical" />
                                <Tag color={template?.status === 'published' ? 'green' : 'blue'}>{template?.status?.toUpperCase()}</Tag>
                                <Tag color="purple">{template?.category}</Tag>
                                <Text type="secondary" style={{ fontSize: 12 }}>v{template?.version} · {fields.length} fields</Text>
                                {hasChanges && <Badge status="warning" text={<Text type="warning" style={{ fontSize: 11 }}>Unsaved</Text>} />}
                            </Space>
                            <Space>
                                <Tooltip title="Undo"><Button icon={<UndoOutlined />} type="text" onClick={undo} disabled={historyIndex <= 0} /></Tooltip>
                                <Tooltip title="Redo"><Button icon={<RedoOutlined />} type="text" onClick={redo} disabled={historyIndex >= history.length - 1} /></Tooltip>
                                <Divider type="vertical" />
                                <Tooltip title={previewMode === 'desktop' ? 'Switch to Mobile' : 'Switch to Desktop'}>
                                    <Button icon={previewMode === 'desktop' ? <MobileOutlined /> : <DesktopOutlined />} type="text"
                                        onClick={() => setPreviewMode(previewMode === 'desktop' ? 'mobile' : 'desktop')} />
                                </Tooltip>
                                <Tooltip title={showFieldPalette ? 'Hide Palette' : 'Show Palette'}>
                                    <Button icon={showFieldPalette ? <CompressOutlined /> : <ExpandOutlined />} type="text"
                                        onClick={() => setShowFieldPalette(!showFieldPalette)} />
                                </Tooltip>
                                <Divider type="vertical" />
                                <Button icon={<SaveOutlined />} onClick={handleSave} loading={saving} disabled={!hasChanges}>Save</Button>
                                <Button icon={<RocketOutlined />} type="primary" onClick={handlePublish}
                                    style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`, border: 'none', borderRadius: 8 }}>
                                    Publish
                                </Button>
                            </Space>
                        </div>
                    </Card>
                </motion.div>

                {/* ═══ Main Builder Area ═══ */}
                <div style={{ display: 'flex', gap: 12, minHeight: 'calc(100vh - 220px)' }}>
                    {/* ─── Left: Field Palette ─── */}
                    <AnimatePresence>
                        {showFieldPalette && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 220, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                style={{ minWidth: 220, flexShrink: 0 }}
                            >
                                <Card size="small" title={<><PlusOutlined style={{ color: themeColor }} /> Add Field</>}
                                    style={{ ...glassPanel, position: 'sticky', top: 16 }}
                                    styles={{ body: { padding: 8, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' } }}>
                                    {FIELD_CATEGORIES.map(cat => (
                                        <div key={cat.key} style={{ marginBottom: 8 }}>
                                            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 8px', display: 'block' }}>
                                                {cat.label}
                                            </Text>
                                            {FIELD_TYPES.filter(ft => ft.category === cat.key).map(ft => (
                                                <motion.div key={ft.type} whileHover={{ scale: 1.02, x: 2 }} whileTap={{ scale: 0.98 }}>
                                                    <Button
                                                        type="text"
                                                        block
                                                        onClick={() => addField(ft.type)}
                                                        style={{
                                                            textAlign: 'left', height: 32, borderRadius: 8, fontSize: 12,
                                                            display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px',
                                                        }}
                                                    >
                                                        <span style={{ color: ft.color, fontSize: 13 }}>{ft.icon}</span>
                                                        {ft.label}
                                                    </Button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ))}
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ─── Center: Canvas ─── */}
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: previewMode === 'mobile' ? 400 : '100%',
                            maxWidth: previewMode === 'mobile' ? 400 : 720,
                            transition: 'all 0.3s ease',
                        }}>
                            {/* Form Header */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <Card size="small" style={{
                                    ...glassPanel, marginBottom: 12,
                                    borderTop: `3px solid ${themeColor}`,
                                    background: `linear-gradient(135deg, ${themeColor}08, rgba(255,255,255,0.7))`,
                                }}>
                                    <Title level={4} style={{ margin: 0 }}>{template?.name}</Title>
                                    {template?.description && <Text type="secondary">{template.description}</Text>}
                                    <div style={{ marginTop: 8 }}>
                                        <Space size={4}>
                                            <Tag color={themeColor}>{template?.category}</Tag>
                                            {(template?.tags || []).map(t => <Tag key={t}>{t}</Tag>)}
                                        </Space>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Fields Canvas */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {fields.length === 0 ? (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <Card style={{ ...glassPanel, textAlign: 'center', padding: 40 }}>
                                            <Empty
                                                image={<FormOutlined style={{ fontSize: 48, color: themeColor, opacity: 0.3 }} />}
                                                description={<><Text type="secondary">No fields yet.</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>Click a field type from the palette to add it.</Text></>}
                                            />
                                        </Card>
                                    </motion.div>
                                ) : (
                                    fields.map((field, index) => {
                                        const fid = field._localId || field.id;
                                        const isSelected = selectedFieldId === fid;
                                        const typeDef = getFieldTypeDef(field.fieldType);
                                        return (
                                            <motion.div
                                                key={fid}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                transition={{ delay: index * 0.02 }}
                                                onClick={() => setSelectedFieldId(fid)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Card
                                                    size="small"
                                                    style={{
                                                        ...glassPanel,
                                                        borderColor: isSelected ? themeColor : 'rgba(255, 255, 255, 0.5)',
                                                        borderWidth: isSelected ? 2 : 1,
                                                        boxShadow: isSelected ? `0 0 0 3px ${themeColor}18, 0 8px 32px 0 rgba(31,38,135,0.07)` : glassPanel.boxShadow,
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    {/* Field Header */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                        <Space size={6}>
                                                            <DragOutlined style={{ color: '#9ca3af', fontSize: 11, cursor: 'grab' }} />
                                                            <span style={{ color: typeDef?.color, fontSize: 13 }}>{typeDef?.icon}</span>
                                                            <Text strong style={{ fontSize: 13 }}>{field.label}</Text>
                                                            {field.isRequired && <Text type="danger" style={{ fontSize: 11 }}>*</Text>}
                                                            {field.kpiConfig?.weight > 0 && (
                                                                <Tag color="purple" style={{ fontSize: 9, margin: 0, lineHeight: '16px', padding: '0 4px' }}>
                                                                    KPI {field.kpiConfig.weight}%
                                                                </Tag>
                                                            )}
                                                        </Space>
                                                        {isSelected && (
                                                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                                                                <Space size={2}>
                                                                    <Tooltip title="Move Up"><Button size="small" type="text" icon={<ArrowUpOutlined style={{ fontSize: 11 }} />} onClick={e => { e.stopPropagation(); moveField(fid, 'up'); }} disabled={index === 0} /></Tooltip>
                                                                    <Tooltip title="Move Down"><Button size="small" type="text" icon={<ArrowDownOutlined style={{ fontSize: 11 }} />} onClick={e => { e.stopPropagation(); moveField(fid, 'down'); }} disabled={index === fields.length - 1} /></Tooltip>
                                                                    <Tooltip title="Duplicate"><Button size="small" type="text" icon={<CopyOutlined style={{ fontSize: 11 }} />} onClick={e => { e.stopPropagation(); duplicateField(field); }} /></Tooltip>
                                                                    <Popconfirm title="Delete this field?" onConfirm={() => deleteField(fid)} okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}>
                                                                        <Button size="small" type="text" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />} onClick={e => e.stopPropagation()} />
                                                                    </Popconfirm>
                                                                </Space>
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                    {/* Field Description */}
                                                    {field.description && field.fieldType !== 'section_header' && (
                                                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>{field.description}</Text>
                                                    )}
                                                    {/* Field Preview */}
                                                    <FieldPreview field={field} />
                                                </Card>
                                            </motion.div>
                                        );
                                    })
                                )}

                                {/* Add Field Button */}
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                                    <Button
                                        type="dashed" block icon={<PlusOutlined />}
                                        onClick={() => addField('text')}
                                        style={{ height: 48, borderRadius: 12, borderColor: `${themeColor}40`, color: themeColor }}
                                    >
                                        Add Field
                                    </Button>
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Right: Properties Panel ─── */}
                    <div style={{ width: 300, minWidth: 300, flexShrink: 0 }}>
                        <Card
                            size="small"
                            title={selectedField ? <><SettingOutlined style={{ color: themeColor }} /> Field Properties</> : <><SettingOutlined /> Properties</>}
                            style={{ ...glassPanel, position: 'sticky', top: 16 }}
                            styles={{ body: { padding: 12, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' } }}
                        >
                            {!selectedField ? (
                                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                                    <SettingOutlined style={{ fontSize: 32, opacity: 0.3 }} />
                                    <div style={{ marginTop: 8, fontSize: 13 }}>Select a field to edit properties</div>
                                </div>
                            ) : (
                                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                    {/* Field Type Badge */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: `${getFieldTypeDef(selectedField.fieldType)?.color}10`, borderRadius: 8 }}>
                                        <span style={{ color: getFieldTypeDef(selectedField.fieldType)?.color }}>{getFieldTypeDef(selectedField.fieldType)?.icon}</span>
                                        <Text strong style={{ fontSize: 12 }}>{getFieldTypeDef(selectedField.fieldType)?.label}</Text>
                                    </div>

                                    {/* Label */}
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>Label</Text>
                                        <Input size="small" value={selectedField.label} style={{ borderRadius: 6, marginTop: 4 }}
                                            onChange={e => updateField(selectedFieldId!, { label: e.target.value })} />
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>Description</Text>
                                        <TextArea size="small" rows={2} value={selectedField.description || ''} style={{ borderRadius: 6, marginTop: 4 }}
                                            onChange={e => updateField(selectedFieldId!, { description: e.target.value })} />
                                    </div>

                                    {/* Placeholder */}
                                    {!['section_header', 'paragraph', 'divider', 'checkbox', 'radio', 'rating', 'slider', 'file_upload', 'ranking'].includes(selectedField.fieldType) && (
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>Placeholder</Text>
                                            <Input size="small" value={selectedField.placeholder || ''} style={{ borderRadius: 6, marginTop: 4 }}
                                                onChange={e => updateField(selectedFieldId!, { placeholder: e.target.value })} />
                                        </div>
                                    )}

                                    {/* Section Title */}
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>Section Group</Text>
                                        <Input size="small" value={selectedField.sectionTitle || ''} placeholder="Optional section group" style={{ borderRadius: 6, marginTop: 4 }}
                                            onChange={e => updateField(selectedFieldId!, { sectionTitle: e.target.value })} />
                                    </div>

                                    {/* Required Toggle */}
                                    {!['section_header', 'paragraph', 'divider'].includes(selectedField.fieldType) && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12 }}>Required</Text>
                                            <Switch size="small" checked={selectedField.isRequired}
                                                onChange={v => updateField(selectedFieldId!, { isRequired: v })} />
                                        </div>
                                    )}

                                    {/* Options Editor */}
                                    {['select', 'multi_select', 'radio', 'checkbox', 'ranking'].includes(selectedField.fieldType) && (
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>Options</Text>
                                            <OptionEditor options={selectedField.options || []}
                                                onChange={opts => updateField(selectedFieldId!, { options: opts })} />
                                        </div>
                                    )}

                                    {/* KPI Configuration */}
                                    {template?.category === 'kpi' && !['section_header', 'paragraph', 'divider'].includes(selectedField.fieldType) && (
                                        <>
                                            <Divider style={{ margin: '4px 0' }} />
                                            <div>
                                                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                                                    <StarOutlined style={{ color: '#f59e0b' }} /> KPI Scoring
                                                </Text>
                                                <KpiConfigEditor config={selectedField.kpiConfig || {}}
                                                    onChange={c => updateField(selectedFieldId!, { kpiConfig: c })} />
                                            </div>
                                        </>
                                    )}

                                    {/* Default Value */}
                                    {['text', 'textarea', 'number', 'email', 'phone', 'url'].includes(selectedField.fieldType) && (
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>Default Value</Text>
                                            <Input size="small" value={selectedField.defaultValue || ''} style={{ borderRadius: 6, marginTop: 4 }}
                                                onChange={e => updateField(selectedFieldId!, { defaultValue: e.target.value })} />
                                        </div>
                                    )}

                                    {/* Delete Button */}
                                    <Divider style={{ margin: '4px 0' }} />
                                    <Popconfirm title="Delete this field?" onConfirm={() => deleteField(selectedFieldId!)} okText="Delete" okButtonProps={{ danger: true }}>
                                        <Button danger block size="small" icon={<DeleteOutlined />} style={{ borderRadius: 6 }}>
                                            Delete Field
                                        </Button>
                                    </Popconfirm>
                                </Space>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </CMSLayout>
    );
}

export default function FormBuilderPage() {
    return (
        <Suspense fallback={
            <CMSLayout title="Form Builder">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                    <Spin size="large" />
                </div>
            </CMSLayout>
        }>
            <FormBuilderContent />
        </Suspense>
    );
}
