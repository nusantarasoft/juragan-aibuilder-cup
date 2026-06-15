"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { Card, Button, Space, Tag, Input, Select, message, Typography, Progress, Spin, InputNumber, Slider, Rate, Switch, Divider, Empty, Result, Upload } from "antd";
import {
    ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, SaveOutlined,
    SendOutlined, FormOutlined, UploadOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
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
    sectionTitle?: string;
    fieldType: string;
    label: string;
    description?: string;
    placeholder?: string;
    isRequired: boolean;
    sortOrder: number;
    options: any[];
    kpiConfig: any;
    defaultValue?: string;
}

// ─── GraphQL ────────────────────────────────────────────
const GET_TEMPLATE = `query($id:ID!){formTemplate(id:$id){id name description category status settings tags version}}`;
const GET_FIELDS = `query($tid:String!){formFields(templateId:$tid){id sectionTitle fieldType label description placeholder isRequired sortOrder options kpiConfig defaultValue}}`;
const SUBMIT_FORM = `mutation($tid:String!,$input:SubmitFormInput!){submitForm(tenantId:$tid,input:$input){id status totalScore percentage grade}}`;

const glass = { background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 14 };

// ─── Field Renderer ─────────────────────────────────────
function FieldRenderer({ field, value, onChange }: {
    field: FormField; value: any; onChange: (val: any) => void;
}) {
    switch (field.fieldType) {
        case 'section_header':
            return (
                <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: 8, marginTop: 8 }}>
                    <Title level={5} style={{ margin: 0, color: '#1f2937' }}>{field.label}</Title>
                    {field.description && <Text type="secondary" style={{ fontSize: 12 }}>{field.description}</Text>}
                </div>
            );
        case 'paragraph':
            return <Paragraph type="secondary" style={{ margin: 0 }}>{field.label}</Paragraph>;
        case 'divider':
            return <Divider />;
        case 'text':
            return <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} style={{ borderRadius: 8 }} />;
        case 'textarea':
            return <TextArea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`} rows={4} style={{ borderRadius: 8 }} />;
        case 'number':
            return <InputNumber value={value} onChange={onChange} placeholder="0" style={{ width: '100%', borderRadius: 8 }} />;
        case 'email':
            return <Input type="email" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || 'email@example.com'} style={{ borderRadius: 8 }} />;
        case 'phone':
            return <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || '+62...'} style={{ borderRadius: 8 }} />;
        case 'url':
            return <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || 'https://...'} style={{ borderRadius: 8 }} />;
        case 'date':
            return <Input type="date" value={value || ''} onChange={e => onChange(e.target.value)} style={{ borderRadius: 8 }} />;
        case 'time':
            return <Input type="time" value={value || ''} onChange={e => onChange(e.target.value)} style={{ borderRadius: 8 }} />;
        case 'date_range':
            return (
                <Space>
                    <Input type="date" value={value?.start || ''} onChange={e => onChange({ ...value, start: e.target.value })} style={{ borderRadius: 8 }} />
                    <Text type="secondary">to</Text>
                    <Input type="date" value={value?.end || ''} onChange={e => onChange({ ...value, end: e.target.value })} style={{ borderRadius: 8 }} />
                </Space>
            );
        case 'select':
            return <Select value={value} onChange={onChange} placeholder="Select an option..." style={{ width: '100%' }} options={(field.options || []).map((o: any) => ({ label: o.label, value: o.value }))} allowClear />;
        case 'multi_select':
            return <Select mode="multiple" value={value || []} onChange={onChange} placeholder="Select options..." style={{ width: '100%' }} options={(field.options || []).map((o: any) => ({ label: o.label, value: o.value }))} />;
        case 'radio':
            return (
                <Space direction="vertical" size={8}>
                    {(field.options || []).map((o: any, i: number) => (
                        <div key={i} onClick={() => onChange(o.value)} style={{
                            display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer',
                            padding: '8px 12px', borderRadius: 8,
                            background: value === o.value ? 'rgba(139,92,246,0.08)' : 'transparent',
                            border: value === o.value ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                            transition: 'all 0.15s',
                        }}>
                            <div style={{
                                width: 18, height: 18, borderRadius: '50%',
                                border: value === o.value ? '5px solid #8b5cf6' : '2px solid #d1d5db',
                                transition: 'all 0.15s',
                            }} />
                            <Text>{o.label || o.value}</Text>
                        </div>
                    ))}
                </Space>
            );
        case 'checkbox':
            return (
                <Space direction="vertical" size={8}>
                    {(field.options?.length > 0 ? field.options : [{ label: field.label, value: field.label }]).map((o: any, i: number) => {
                        const checked = Array.isArray(value) ? value.includes(o.value) : value === o.value;
                        return (
                            <div key={i} onClick={() => {
                                if (field.options?.length > 0) {
                                    const arr = Array.isArray(value) ? [...value] : [];
                                    if (arr.includes(o.value)) onChange(arr.filter(v => v !== o.value));
                                    else onChange([...arr, o.value]);
                                } else {
                                    onChange(checked ? '' : o.value);
                                }
                            }} style={{
                                display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer',
                                padding: '8px 12px', borderRadius: 8,
                                background: checked ? 'rgba(16,185,129,0.08)' : 'transparent',
                                border: checked ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                                transition: 'all 0.15s',
                            }}>
                                <div style={{
                                    width: 18, height: 18, borderRadius: 4,
                                    border: checked ? 'none' : '2px solid #d1d5db',
                                    background: checked ? '#10b981' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s',
                                }}>
                                    {checked && <CheckCircleOutlined style={{ color: '#fff', fontSize: 12 }} />}
                                </div>
                                <Text>{o.label || o.value}</Text>
                            </div>
                        );
                    })}
                </Space>
            );
        case 'rating':
            return <Rate value={value || 0} onChange={onChange} count={field.kpiConfig?.max_score || 5} style={{ fontSize: 28 }} />;
        case 'slider':
            return (
                <div>
                    <Slider value={value || 0} onChange={onChange} min={0} max={field.kpiConfig?.max_score || 100}
                        marks={{ 0: '0', [field.kpiConfig?.max_score || 100]: `${field.kpiConfig?.max_score || 100}` }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>Current: {value || 0}</Text>
                </div>
            );
        case 'file_upload':
            return (
                <Upload.Dragger beforeUpload={() => false} onChange={info => onChange(info.file.name)}>
                    <p><UploadOutlined style={{ fontSize: 24, color: '#8b5cf6' }} /></p>
                    <p style={{ fontSize: 13 }}>Click or drag file to upload</p>
                </Upload.Dragger>
            );
        case 'ranking':
            return (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    {(field.options || []).map((o: any, i: number) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb',
                        }}>
                            <Tag color="purple" style={{ margin: 0 }}>{i + 1}</Tag>
                            <Text>{o.label || o.value}</Text>
                        </div>
                    ))}
                </Space>
            );
        default:
            return <Input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Enter value..." style={{ borderRadius: 8 }} />;
    }
}

// ═══════════════════════════════════════════════════════
// MAIN FILL PAGE
// ═══════════════════════════════════════════════════════
function FormFillContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const templateId = searchParams.get('id');
    const { themeColor } = usePreferencesStore();
    const [messageApi, contextHolder] = message.useMessage();

    const [template, setTemplate] = useState<any>(null);
    const [fields, setFields] = useState<FormField[]>([]);
    const [values, setValues] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [currentSection, setCurrentSection] = useState(0);

    // Group fields by section
    const sections: { title: string; fields: FormField[] }[] = [];
    let currentGroup: FormField[] = [];
    let currentTitle = 'General';
    fields.forEach(f => {
        if (f.fieldType === 'section_header') {
            if (currentGroup.length) sections.push({ title: currentTitle, fields: currentGroup });
            currentTitle = f.label;
            currentGroup = [f];
        } else {
            currentGroup.push(f);
        }
    });
    if (currentGroup.length) sections.push({ title: currentTitle, fields: currentGroup });
    if (sections.length === 0) sections.push({ title: 'Form', fields });

    const totalRequired = fields.filter(f => f.isRequired && !['section_header', 'paragraph', 'divider'].includes(f.fieldType)).length;
    const completedRequired = fields.filter(f => f.isRequired && !['section_header', 'paragraph', 'divider'].includes(f.fieldType) && values[f.id]).length;
    const progress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 100;

    const loadData = useCallback(async () => {
        if (!templateId) return;
        setLoading(true);
        try {
            const [tData, fData] = await Promise.all([
                gql(GET_TEMPLATE, { id: templateId }),
                gql(GET_FIELDS, { tid: templateId }),
            ]);
            setTemplate(tData.formTemplate);
            const sortedFields = (fData.formFields || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
            setFields(sortedFields);
            // Set default values
            const defaults: Record<string, any> = {};
            sortedFields.forEach((f: FormField) => { if (f.defaultValue) defaults[f.id] = f.defaultValue; });
            setValues(defaults);
        } catch (err: any) {
            messageApi.error('Failed to load form: ' + err.message);
        }
        setLoading(false);
    }, [templateId, messageApi]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSubmit = async () => {
        // Validate required
        const missing = fields.filter(f => f.isRequired && !['section_header', 'paragraph', 'divider'].includes(f.fieldType) && !values[f.id]);
        if (missing.length) {
            messageApi.warning(`Please fill in: ${missing.map(f => f.label).join(', ')}`);
            return;
        }
        setSubmitting(true);
        try {
            const fieldValues = fields
                .filter(f => !['section_header', 'paragraph', 'divider'].includes(f.fieldType) && values[f.id] !== undefined)
                .map(f => {
                    const v = values[f.id];
                    const isNumeric = ['number', 'rating', 'slider'].includes(f.fieldType);
                    return {
                        fieldId: f.id,
                        value: typeof v === 'object' ? JSON.stringify(v) : String(v),
                        numericValue: isNumeric ? parseFloat(v) || 0 : null,
                        jsonValue: typeof v === 'object' ? v : null,
                    };
                });
            const res = await gql(SUBMIT_FORM, {
                tid: DEFAULT_TENANT_ID,
                input: { templateId, values: fieldValues },
            });
            setResult(res.submitForm);
            setSubmitted(true);
            messageApi.success('Form submitted successfully!');
        } catch (err: any) {
            messageApi.error('Failed to submit: ' + err.message);
        }
        setSubmitting(false);
    };

    if (!templateId) {
        return (
            <CMSLayout title="Fill Form">
                <div style={{ textAlign: 'center', padding: 100 }}>
                    <Empty description="No form selected." />
                    <Button type="primary" onClick={() => router.push('/admin/forms/templates')} style={{ marginTop: 16 }}>Go to Templates</Button>
                </div>
            </CMSLayout>
        );
    }

    if (loading) {
        return <CMSLayout title="Fill Form"><div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div></CMSLayout>;
    }

    if (submitted) {
        return (
            <CMSLayout
                title={<AuroraText colors={[themeColor, '#10b981', '#3b82f6']}>Form Submitted</AuroraText>}
                subTitle={<DecryptedText text="Thank you for your response!" animateOn="view" revealDirection="center" speed={40} sequential />}
            >
                <div style={{ maxWidth: 600, margin: '40px auto' }}>
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                        <Result
                            status="success"
                            title="Response Submitted!"
                            subTitle={result?.grade ? `Score: ${result.percentage}% — ${result.grade}` : 'Your response has been recorded.'}
                            extra={[
                                <Button type="primary" key="templates" onClick={() => router.push('/admin/forms/templates')} style={{ background: themeColor, borderColor: themeColor }}>Back to Templates</Button>,
                                <Button key="submissions" onClick={() => router.push('/admin/forms/submissions')}>View Submissions</Button>,
                            ]}
                        />
                    </motion.div>
                </div>
            </CMSLayout>
        );
    }

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, '#ec4899', '#3b82f6']}>Fill Form</AuroraText>}
            subTitle={<DecryptedText text={template?.name || 'Form'} animateOn="view" revealDirection="start" speed={60} sequential />}
        >
            {contextHolder}
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                {/* Header Card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card size="small" style={{
                        ...glass, marginBottom: 16,
                        borderTop: `3px solid ${themeColor}`,
                        background: `linear-gradient(135deg, ${themeColor}08, rgba(255,255,255,0.7))`,
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <Title level={4} style={{ margin: 0 }}>{template?.name}</Title>
                                {template?.description && <Text type="secondary">{template.description}</Text>}
                                <div style={{ marginTop: 6 }}>
                                    <Space size={4}>
                                        <Tag color={themeColor}>{template?.category}</Tag>
                                        {(template?.tags || []).map((t: string) => <Tag key={t}>{t}</Tag>)}
                                    </Space>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', minWidth: 100 }}>
                                <Progress type="circle" percent={progress} size={56}
                                    strokeColor={progress === 100 ? '#10b981' : themeColor} />
                                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{completedRequired}/{totalRequired} required</div>
                            </div>
                        </div>
                    </Card>
                </motion.div>

                {/* Section Navigation */}
                {sections.length > 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                        <Card size="small" style={{ ...glass, marginBottom: 16, padding: '4px 8px' }}>
                            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '4px 0' }}>
                                {sections.map((s, i) => (
                                    <Button key={i} size="small" type={currentSection === i ? 'primary' : 'text'}
                                        onClick={() => setCurrentSection(i)}
                                        style={{
                                            borderRadius: 8, fontSize: 12, flexShrink: 0,
                                            ...(currentSection === i ? { background: themeColor, borderColor: themeColor } : {}),
                                        }}>
                                        {s.title}
                                    </Button>
                                ))}
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Fields */}
                <AnimatePresence mode="wait">
                    <motion.div key={currentSection} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                        <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            {(sections[currentSection]?.fields || []).map((field, idx) => {
                                if (['section_header', 'paragraph', 'divider'].includes(field.fieldType)) {
                                    return (
                                        <motion.div key={field.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                                            <FieldRenderer field={field} value={null} onChange={() => {}} />
                                        </motion.div>
                                    );
                                }
                                return (
                                    <motion.div key={field.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                                        <Card size="small" style={{
                                            borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)',
                                            background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(8px)',
                                        }}>
                                            <div style={{ marginBottom: 8 }}>
                                                <Text strong style={{ fontSize: 14 }}>{field.label}</Text>
                                                {field.isRequired && <Text type="danger"> *</Text>}
                                                {field.kpiConfig?.weight > 0 && (
                                                    <Tag color="purple" style={{ marginLeft: 8, fontSize: 10 }}>KPI {field.kpiConfig.weight}%</Tag>
                                                )}
                                            </div>
                                            {field.description && <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{field.description}</Text>}
                                            <FieldRenderer field={field} value={values[field.id]} onChange={v => setValues(prev => ({ ...prev, [field.id]: v }))} />
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </Space>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation + Submit */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <Card size="small" style={{ ...glass, marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button icon={<ArrowLeftOutlined />} disabled={currentSection === 0}
                                onClick={() => setCurrentSection(prev => prev - 1)}>
                                Previous
                            </Button>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Section {currentSection + 1} of {sections.length}
                            </Text>
                            {currentSection < sections.length - 1 ? (
                                <Button type="primary" icon={<ArrowRightOutlined />}
                                    onClick={() => setCurrentSection(prev => prev + 1)}
                                    style={{ background: themeColor, borderColor: themeColor }}>
                                    Next
                                </Button>
                            ) : (
                                <Button type="primary" icon={<SendOutlined />} loading={submitting}
                                    onClick={handleSubmit}
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', borderRadius: 8 }}>
                                    Submit Response
                                </Button>
                            )}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </CMSLayout>
    );
}

export default function FormFillPage() { return <React.Suspense fallback={<div>Loading...</div>}><FormFillPageContent /></React.Suspense>; } 
function FormFillPageContent() {
    return (
        <Suspense fallback={<CMSLayout title="Fill Form"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><Spin size="large" /></div></CMSLayout>}>
            <FormFillContent />
        </Suspense>
    );
}
