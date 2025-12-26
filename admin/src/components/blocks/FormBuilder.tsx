"use client";

import React, { useState } from "react";
import {
    Card,
    Form,
    Input,
    Button,
    Select,
    Switch,
    Space,
    Divider,
    Empty,
    message,
    Modal,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    DragOutlined,
    SettingOutlined,
} from "@ant-design/icons";

// Field types
type FieldType = "text" | "email" | "textarea" | "select" | "checkbox" | "number" | "phone";

interface FormField {
    id: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    required?: boolean;
    options?: string[]; // For select fields
}

interface FormBuilderProps {
    fields?: FormField[];
    onChange?: (fields: FormField[]) => void;
    submitLabel?: string;
    onSubmitLabelChange?: (label: string) => void;
    editable?: boolean;
}

// Field type options
const fieldTypes: { value: FieldType; label: string }[] = [
    { value: "text", label: "Text" },
    { value: "email", label: "Email" },
    { value: "textarea", label: "Text Area" },
    { value: "select", label: "Dropdown" },
    { value: "checkbox", label: "Checkbox" },
    { value: "number", label: "Number" },
    { value: "phone", label: "Phone" },
];

/**
 * Form Builder Block Component
 * Visual form builder for creating custom forms
 */
export default function FormBuilder({
    fields = [],
    onChange,
    submitLabel = "Submit",
    onSubmitLabelChange,
    editable = false,
}: FormBuilderProps) {
    const [editingField, setEditingField] = useState<FormField | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [form] = Form.useForm();

    const addField = (type: FieldType) => {
        const newField: FormField = {
            id: `field-${Date.now()}`,
            type,
            label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
            placeholder: "",
            required: false,
        };
        if (onChange) {
            onChange([...fields, newField]);
        }
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        if (onChange) {
            onChange(
                fields.map((f) => (f.id === id ? { ...f, ...updates } : f))
            );
        }
    };

    const deleteField = (id: string) => {
        if (onChange) {
            onChange(fields.filter((f) => f.id !== id));
        }
    };

    const openEditModal = (field: FormField) => {
        setEditingField(field);
        form.setFieldsValue(field);
        setEditModalOpen(true);
    };

    const saveFieldEdit = () => {
        form.validateFields().then((values) => {
            if (editingField) {
                updateField(editingField.id, values);
                setEditModalOpen(false);
                setEditingField(null);
            }
        });
    };

    const handleFormSubmit = (values: any) => {
        console.log("Form submitted:", values);
        message.success("Form submitted successfully!");
    };

    // Render form preview/actual form
    const renderFormField = (field: FormField) => {
        const commonProps = {
            placeholder: field.placeholder,
        };

        switch (field.type) {
            case "textarea":
                return <Input.TextArea {...commonProps} rows={4} />;
            case "select":
                return (
                    <Select {...commonProps}>
                        {(field.options || []).map((opt) => (
                            <Select.Option key={opt} value={opt}>
                                {opt}
                            </Select.Option>
                        ))}
                    </Select>
                );
            case "checkbox":
                return <Switch />;
            case "number":
                return <Input type="number" {...commonProps} />;
            default:
                return <Input type={field.type} {...commonProps} />;
        }
    };

    if (fields.length === 0 && !editable) {
        return (
            <Card>
                <Empty description="No form fields configured" />
            </Card>
        );
    }

    return (
        <div style={{ padding: 16 }}>
            {/* Form Preview */}
            <Card title="Form Preview">
                <Form layout="vertical" onFinish={handleFormSubmit}>
                    {fields.map((field) => (
                        <div
                            key={field.id}
                            style={{
                                position: "relative",
                                padding: editable ? "8px 0" : 0,
                                borderRadius: 4,
                            }}
                        >
                            <Form.Item
                                name={field.id}
                                label={field.label}
                                rules={
                                    field.required
                                        ? [{ required: true, message: `${field.label} is required` }]
                                        : []
                                }
                                valuePropName={field.type === "checkbox" ? "checked" : "value"}
                            >
                                {renderFormField(field)}
                            </Form.Item>

                            {editable && (
                                <Space
                                    style={{
                                        position: "absolute",
                                        top: 8,
                                        right: 0,
                                    }}
                                >
                                    <Button
                                        size="small"
                                        icon={<SettingOutlined />}
                                        onClick={() => openEditModal(field)}
                                    />
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => deleteField(field.id)}
                                    />
                                </Space>
                            )}
                        </div>
                    ))}

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            {submitLabel}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {/* Field Palette (Editor Mode) */}
            {editable && (
                <Card title="Add Field" style={{ marginTop: 16 }}>
                    <Space wrap>
                        {fieldTypes.map((ft) => (
                            <Button
                                key={ft.value}
                                icon={<PlusOutlined />}
                                onClick={() => addField(ft.value)}
                            >
                                {ft.label}
                            </Button>
                        ))}
                    </Space>

                    <Divider />

                    <Form.Item label="Submit Button Label">
                        <Input
                            value={submitLabel}
                            onChange={(e) => onSubmitLabelChange?.(e.target.value)}
                            placeholder="Submit"
                        />
                    </Form.Item>
                </Card>
            )}

            {/* Field Edit Modal */}
            <Modal
                title="Edit Field"
                open={editModalOpen}
                onOk={saveFieldEdit}
                onCancel={() => setEditModalOpen(false)}
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="label" label="Label" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="placeholder" label="Placeholder">
                        <Input />
                    </Form.Item>
                    <Form.Item name="required" label="Required" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                    {editingField?.type === "select" && (
                        <Form.Item name="options" label="Options (one per line)">
                            <Input.TextArea
                                rows={4}
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                                onChange={(e) => {
                                    const options = e.target.value.split("\n").filter(Boolean);
                                    form.setFieldValue("options", options);
                                }}
                                value={(form.getFieldValue("options") || []).join("\n")}
                            />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
}
