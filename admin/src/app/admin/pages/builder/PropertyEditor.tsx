import React, { useState } from "react";
import { PageBlock, BlockProps, GridRow, GridColumn } from "./types";
import { PropField, getBlockSchema, getCategories } from "./PropSchema";
import { Form, Input, Switch, Empty, Divider, Select, Tabs, Tag, Button, InputNumber, Row, Col, Collapse, ColorPicker, Space, Card, message } from "antd";
import { SettingOutlined, BgColorsOutlined, PlusOutlined, DeleteOutlined, DownOutlined, RobotOutlined } from "@ant-design/icons";
import { StyleEditor } from "./StyleEditor";
import { aiService } from "@/lib/aiService";

interface PropertyEditorProps {
    block: PageBlock | null;
    selectedElement: string | null;
    onUpdate: (props: BlockProps) => void;
}

// Dynamic field renderer component
const DynamicFieldRenderer: React.FC<{
    field: PropField;
    value: unknown;
    onChange: (value: unknown) => void;
}> = ({ field, value, onChange }) => {
    switch (field.type) {
        case 'text':
            return (
                <Input
                    size="small"
                    value={String(value || '')}
                    placeholder={field.placeholder}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
        case 'textarea':
            return (
                <Input.TextArea
                    size="small"
                    value={String(value || '')}
                    placeholder={field.placeholder}
                    rows={3}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
        case 'number':
            return (
                <InputNumber
                    size="small"
                    value={Number(value) || 0}
                    min={field.min}
                    max={field.max}
                    onChange={(val) => onChange(val)}
                    style={{ width: '100%' }}
                />
            );
        case 'switch':
            return (
                <Switch
                    size="small"
                    checked={Boolean(value)}
                    onChange={(val) => onChange(val)}
                />
            );
        case 'select':
            return (
                <Select
                    size="small"
                    value={value}
                    onChange={(val) => onChange(val)}
                    options={field.options}
                    style={{ width: '100%' }}
                />
            );
        case 'color':
            return (
                <ColorPicker
                    size="small"
                    value={String(value || '#000000')}
                    onChange={(color) => onChange(color.toHexString())}
                />
            );
        case 'image':
            return (
                <Input
                    size="small"
                    value={String(value || '')}
                    placeholder={field.placeholder || 'Enter image URL'}
                    onChange={(e) => onChange(e.target.value)}
                    addonBefore="🖼️"
                />
            );
        default:
            return <Input size="small" value={String(value || '')} onChange={(e) => onChange(e.target.value)} />;
    }
};

// Array field editor component
const ArrayFieldEditor: React.FC<{
    field: PropField;
    value: unknown[];
    onChange: (value: unknown[]) => void;
}> = ({ field, value, onChange }) => {
    const items = Array.isArray(value) ? value : [];
    const itemSchema = field.itemSchema || [];

    const addItem = () => {
        if (itemSchema.length === 1 && itemSchema[0].key === 'value') {
            // Simple array of strings
            onChange([...items, '']);
        } else {
            // Complex object
            const newItem: Record<string, unknown> = {};
            itemSchema.forEach(f => {
                newItem[f.key] = f.defaultValue || '';
            });
            onChange([...items, newItem]);
        }
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        onChange(newItems);
    };

    const updateItem = (index: number, key: string, val: unknown) => {
        const newItems = [...items];
        if (itemSchema.length === 1 && itemSchema[0].key === 'value') {
            // Simple string array
            newItems[index] = val;
        } else {
            // Object array
            newItems[index] = { ...(newItems[index] as Record<string, unknown>), [key]: val };
        }
        onChange(newItems);
    };

    const isSimpleArray = itemSchema.length === 1 && itemSchema[0].key === 'value';

    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <Card
                    key={index}
                    size="small"
                    className="bg-gray-50"
                    extra={
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeItem(index)}
                        />
                    }
                    title={<span className="text-xs">Item {index + 1}</span>}
                >
                    {isSimpleArray ? (
                        <Input
                            size="small"
                            value={String(item || '')}
                            onChange={(e) => updateItem(index, 'value', e.target.value)}
                            placeholder={itemSchema[0].placeholder}
                        />
                    ) : (
                        <div className="space-y-2">
                            {itemSchema.map((subField) => (
                                <Form.Item
                                    key={subField.key}
                                    label={<span className="text-xs">{subField.label}</span>}
                                    style={{ marginBottom: 8 }}
                                >
                                    <DynamicFieldRenderer
                                        field={subField}
                                        value={(item as Record<string, unknown>)?.[subField.key]}
                                        onChange={(val) => updateItem(index, subField.key, val)}
                                    />
                                </Form.Item>
                            ))}
                        </div>
                    )}
                </Card>
            ))}
            <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={addItem}
                block
            >
                Add {field.label.replace(/s$/, '')}
            </Button>
        </div>
    );
};

export const PropertyEditor: React.FC<PropertyEditorProps> = ({ block, selectedElement, onUpdate }) => {
    const [aiPrompt, setAiPrompt] = useState("");
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    if (!block) {
        return <Empty description="Select a block to edit" />;
    }

    // Helper for style update based on selectedElement
    const handleStyleUpdate = (newStyle: React.CSSProperties) => {
        const target = selectedElement || "container";
        if (target === "container") {
            onUpdate({ ...block.props, style: newStyle });
        } else {
            const currentStyles = (block.props.styles as Record<string, React.CSSProperties>) || {};
            onUpdate({
                ...block.props,
                styles: {
                    ...currentStyles,
                    [target]: newStyle,
                },
            });
        }
    };

    const getActiveStyle = (): React.CSSProperties => {
        const target = selectedElement || "container";
        if (target === "container") {
            return (block.props.style as React.CSSProperties) || {};
        }
        const styles = (block.props.styles as Record<string, React.CSSProperties>) || {};
        return styles[target] || {};
    };

    // Update a single prop value
    const updateProp = (key: string, value: unknown) => {
        onUpdate({ ...block.props, [key]: value } as BlockProps);
    };

    // Dynamic schema-based settings editor
    const renderDynamicSettings = () => {
        const schema = getBlockSchema(block.type);

        // Special handling for gridContainer due to complex row/column UI
        if (block.type === 'gridContainer') {
            return renderGridContainerSettings();
        }

        if (!schema) {
            // Fallback for unknown types - show raw JSON
            return (
                <div key={block.id}>
                    <p className="mb-2 text-gray-500">Properties for {block.name}</p>
                    <pre style={{ fontSize: 11, overflow: "auto", maxHeight: 300 }}>
                        {JSON.stringify(block.props, null, 2)}
                    </pre>
                </div>
            );
        }

        const categories = getCategories(schema);

        // Group props by category
        const propsByCategory = categories.reduce((acc, cat) => {
            acc[cat] = schema.props.filter(p => p.category === cat);
            return acc;
        }, {} as Record<string, PropField[]>);

        const collapseItems = categories.map(category => ({
            key: category,
            label: <span className="font-medium text-sm">{category}</span>,
            children: (
                <Form layout="vertical" size="small">
                    {propsByCategory[category].map(field => (
                        <Form.Item
                            key={field.key}
                            label={<span className="text-xs text-gray-600">{field.label}</span>}
                            style={{ marginBottom: 12 }}
                        >
                            {field.type === 'array' ? (
                                <ArrayFieldEditor
                                    field={field}
                                    value={block.props[field.key] as unknown[] || []}
                                    onChange={(val) => updateProp(field.key, val)}
                                />
                            ) : (
                                <DynamicFieldRenderer
                                    field={field}
                                    value={block.props[field.key]}
                                    onChange={(val) => updateProp(field.key, val)}
                                />
                            )}
                        </Form.Item>
                    ))}
                </Form>
            ),
        }));

        return (
            <Collapse
                key={block.id}
                defaultActiveKey={categories}
                size="small"
                expandIcon={({ isActive }) => <DownOutlined rotate={isActive ? 180 : 0} style={{ fontSize: 10 }} />}
                items={collapseItems}
                ghost
            />
        );
    };

    // Grid container special settings (existing implementation)
    const renderGridContainerSettings = () => {
        const rows = (block.props.rows as GridRow[]) || [];
        const gutter = (block.props.gutter as [number, number]) || [16, 16];

        const addRow = () => {
            const newRow: GridRow = {
                columns: [
                    { span: 12, block: null },
                    { span: 12, block: null },
                ]
            };
            onUpdate({ ...block.props, rows: [...rows, newRow] });
        };

        const removeRow = (rowIndex: number) => {
            const newRows = rows.filter((_, i) => i !== rowIndex);
            onUpdate({ ...block.props, rows: newRows });
        };

        const addColumn = (rowIndex: number) => {
            const newRows = [...rows];
            const newCol: GridColumn = { span: 6, block: null };
            newRows[rowIndex] = {
                ...newRows[rowIndex],
                columns: [...newRows[rowIndex].columns, newCol]
            };
            onUpdate({ ...block.props, rows: newRows });
        };

        const removeColumn = (rowIndex: number, colIndex: number) => {
            const newRows = [...rows];
            newRows[rowIndex] = {
                ...newRows[rowIndex],
                columns: newRows[rowIndex].columns.filter((_, i) => i !== colIndex)
            };
            onUpdate({ ...block.props, rows: newRows });
        };

        const updateColumnSpan = (rowIndex: number, colIndex: number, span: number) => {
            const newRows = [...rows];
            const columns = [...newRows[rowIndex].columns];
            columns[colIndex] = { ...columns[colIndex], span };
            newRows[rowIndex] = { ...newRows[rowIndex], columns };
            onUpdate({ ...block.props, rows: newRows });
        };

        const updateGutter = (index: 0 | 1, value: number) => {
            const newGutter = [...gutter] as [number, number];
            newGutter[index] = value;
            onUpdate({ ...block.props, gutter: newGutter });
        };

        return (
            <Form layout="vertical" key={block.id}>
                <Divider>Rows & Columns</Divider>

                {rows.length === 0 ? (
                    <div className="text-center text-gray-400 py-4">No rows. Click "Add Row" to start.</div>
                ) : (
                    rows.map((row, rowIndex) => {
                        const totalSpan = row.columns.reduce((sum, col) => sum + col.span, 0);
                        const isValid = totalSpan === 24;
                        return (
                            <div key={rowIndex} className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-sm">Row {rowIndex + 1}</span>
                                    <div className="flex gap-1">
                                        <Tag color={isValid ? "green" : "red"}>{totalSpan}/24</Tag>
                                        <Button
                                            size="small"
                                            icon={<DeleteOutlined />}
                                            danger
                                            onClick={() => removeRow(rowIndex)}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {row.columns.map((col, colIndex) => (
                                        <div key={colIndex} className="flex items-center gap-1 bg-white p-1 rounded border">
                                            <Select
                                                size="small"
                                                value={col.span}
                                                onChange={(val) => updateColumnSpan(rowIndex, colIndex, val)}
                                                style={{ width: 80 }}
                                                options={[
                                                    { label: "2", value: 2 },
                                                    { label: "3", value: 3 },
                                                    { label: "4", value: 4 },
                                                    { label: "6", value: 6 },
                                                    { label: "8", value: 8 },
                                                    { label: "12", value: 12 },
                                                    { label: "24", value: 24 },
                                                ]}
                                            />
                                            {row.columns.length > 1 && (
                                                <Button
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    type="text"
                                                    danger
                                                    onClick={() => removeColumn(rowIndex, colIndex)}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    size="small"
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    onClick={() => addColumn(rowIndex)}
                                >
                                    Add Column
                                </Button>
                            </div>
                        );
                    })
                )}

                <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={addRow}
                    className="mb-4"
                >
                    Add Row
                </Button>

                <Divider>Spacing</Divider>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="H-Gap">
                            <Select
                                value={gutter[0]}
                                onChange={(val) => updateGutter(0, val)}
                                options={[
                                    { label: "0", value: 0 },
                                    { label: "8", value: 8 },
                                    { label: "16", value: 16 },
                                    { label: "24", value: 24 },
                                    { label: "32", value: 32 },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="V-Gap">
                            <Select
                                value={gutter[1]}
                                onChange={(val) => updateGutter(1, val)}
                                options={[
                                    { label: "0", value: 0 },
                                    { label: "8", value: 8 },
                                    { label: "16", value: 16 },
                                    { label: "24", value: 24 },
                                    { label: "32", value: 32 },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        );
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt) return;
        setIsAiGenerating(true);
        try {
            const schema = getBlockSchema(block.type);
            if (!schema) {
                message.error("No schema found for this block type.");
                setIsAiGenerating(false);
                return;
            }
            
            const newProps = { ...block.props };
            const contentProps = schema.props.filter(p => p.category === 'Content');
            
            for (const prop of contentProps) {
                try {
                    const generatedValue = await aiService.generateBlockProperty(block.type, prop.key, aiPrompt);
                    if (generatedValue) {
                        newProps[prop.key] = generatedValue;
                    }
                } catch (e) {
                    console.error("Failed to generate prop", prop.key, e);
                }
            }
            
            onUpdate(newProps);
            message.success('Content generated successfully!');
            setAiPrompt("");
        } catch (error) {
            message.error("Failed to generate content.");
        }
        setIsAiGenerating(false);
    };

    const items = [
        {
            key: 'settings',
            label: <span><SettingOutlined /> Settings</span>,
            children: renderDynamicSettings(),
        },
        {
            key: 'styles',
            label: <span><BgColorsOutlined /> Styles</span>,
            children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#666" }}>Editing:</span>
                        <Tag color="blue">{selectedElement || "container"}</Tag>
                    </div>
                    <StyleEditor
                        key={selectedElement || "container"}
                        style={getActiveStyle()}
                        onChange={handleStyleUpdate}
                    />
                </div>
            ),
        },
        {
            key: 'ai',
            label: <span className="flex items-center gap-1"><RobotOutlined /> AI</span>,
            children: (
                <div className="flex flex-col gap-3 p-1">
                    <div className="text-xs text-gray-500">
                        Generate or improve content for this block using AI.
                    </div>
                    <Input.TextArea 
                        placeholder="E.g., Write a catchy hero title about our new product..." 
                        rows={3} 
                        className="text-xs rounded-lg"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        disabled={isAiGenerating}
                    />
                    <Button 
                        type="primary" 
                        block 
                        size="small" 
                        className="rounded-lg shadow-sm"
                        style={{ background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)', border: 'none' }}
                        onClick={handleAiGenerate}
                        loading={isAiGenerating}
                        disabled={!aiPrompt}
                    >
                        {isAiGenerating ? 'Generating...' : '✨ Generate Content'}
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>{block.icon}</span>
                <strong>{block.name}</strong>
            </div>
            <Tabs defaultActiveKey="settings" items={items} />
        </div>
    );
};
