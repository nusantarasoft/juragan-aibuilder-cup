"use client";

import React, { useState, useMemo } from "react";
import {
  Modal, Steps, Button, Typography, Card, Descriptions, Tag,
  Space, Divider, Form, Alert,
} from "antd";
import {
  ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined,
  EditOutlined, FileTextOutlined,
} from "@ant-design/icons";
import type { FormInstance } from "antd";
import DataImportExport, { FieldDef } from "./DataImportExport";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text, Title } = Typography;

export interface StepDef {
  title: string;
  icon?: React.ReactNode;
  fields: string[];
  content: React.ReactNode;
}

interface SteppedFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
  form: FormInstance;
  title: string;
  entityName: string;
  steps: StepDef[];
  fields: FieldDef[];
  width?: number;
  loading?: boolean;
  onBatchCreate?: (records: any[]) => Promise<{ success: number; failed: number; errors?: string[] }>;
  gradient?: [string, string];
  editMode?: boolean;
  initialValues?: Record<string, any>;
}

const fmtValue = (v: any): React.ReactNode => {
  if (v === undefined || v === null || v === "") return <Text type="secondary" className="text-xs">—</Text>;
  if (typeof v === "boolean") return <Tag color={v ? "green" : "default"} className="rounded-full text-xs">{v ? "Yes" : "No"}</Tag>;
  if (Array.isArray(v)) {
    if (v.length === 0) return <Text type="secondary" className="text-xs">—</Text>;
    return <>{v.map((item, i) => <Tag key={i} className="rounded-full text-xs mb-0.5">{String(item)}</Tag>)}</>;
  }
  if (typeof v === "object") return <Text code className="text-xs">{JSON.stringify(v)}</Text>;
  if (typeof v === "number") {
    if (v >= 1000) return <Text strong className="text-sm">{v.toLocaleString()}</Text>;
    return <Text className="text-sm">{v}</Text>;
  }
  return <Text className="text-sm">{String(v)}</Text>;
};

export default function SteppedFormModal({
  open, onCancel, onSubmit, form, title, entityName,
  steps, fields, width = 620, loading = false,
  onBatchCreate, gradient, editMode = false, initialValues,
}: SteppedFormModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { themeColor } = usePreferencesStore();
  const g1 = gradient?.[0] || themeColor || "#6366f1";
  const g2 = gradient?.[1] || `${themeColor}dd` || "var(--theme-color, #8b5cf6)";

  const totalSteps = steps.length + 1; // +1 for review step
  const isReviewStep = currentStep === steps.length;

  const handleNext = async () => {
    if (currentStep < steps.length) {
      try {
        const currentFields = steps[currentStep].fields;
        if (currentFields.length > 0) {
          await form.validateFields(currentFields);
        }
        setCurrentStep(currentStep + 1);
      } catch {
        // validation error, stay
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = form.getFieldsValue();
      await onSubmit(values);
      setCurrentStep(0);
    } catch {
      // handled by parent
    }
  };

  const handleCancel = () => {
    setCurrentStep(0);
    onCancel();
  };

  const goToStep = (step: number) => {
    if (step < steps.length) setCurrentStep(step);
  };

  // Build review data
  const reviewData = useMemo(() => {
    if (!open) return [];
    const values = form.getFieldsValue();
    return steps.map((step, i) => ({
      title: step.title,
      stepIndex: i,
      items: step.fields
        .map(fieldName => {
          const fieldDef = fields.find(f => f.name === fieldName);
          return {
            name: fieldName,
            label: fieldDef?.label || fieldName,
            value: values[fieldName],
          };
        })
        .filter(item => item.value !== undefined && item.value !== null && item.value !== ""),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentStep, steps, fields]);

  return (
    <Modal
      title={
        <span
          style={{ fontSize: 16, fontWeight: 600, background: `linear-gradient(135deg, ${g1}, ${g2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          {editMode ? `✏️ ${title}` : `✨ ${title}`}
        </span>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={width}
      centered
      destroyOnClose={false}
      styles={{
        header: { padding: "14px 24px", background: `linear-gradient(135deg, ${g1}06, ${g2}03)`, borderBottom: "1px solid #f0f0f0" },
        body: { padding: 0 },
      }}
    >
      {/* Steps indicator */}
      <div style={{ padding: "12px 24px 8px", borderBottom: "1px solid #f5f5f5", background: `linear-gradient(135deg, ${g1}04, ${g2}02)` }}>
        <div className="themed-steps" style={{ '--step-theme-color': g1, '--step-theme-color-light': `${g1}18` } as React.CSSProperties}>
          <style>{`
            .themed-steps .ant-steps-item .ant-steps-item-icon {
              width: 28px !important;
              height: 28px !important;
              line-height: 28px !important;
              font-size: 14px !important;
              overflow: visible !important;
            }
            .themed-steps .ant-steps-item .ant-steps-item-icon .ant-steps-icon {
              font-size: 14px !important;
            }
            .themed-steps .ant-steps-item .ant-steps-item-icon .anticon {
              font-size: 14px !important;
            }
            .themed-steps .ant-steps-item-process .ant-steps-item-icon {
              background: var(--step-theme-color) !important;
              border-color: var(--step-theme-color) !important;
            }
            .themed-steps .ant-steps-item-process .ant-steps-item-icon > .ant-steps-icon,
            .themed-steps .ant-steps-item-process .ant-steps-item-icon .anticon {
              color: #fff !important;
            }
            .themed-steps .ant-steps-item-process .ant-steps-item-icon .anticon svg {
              fill: #fff !important;
            }
            .themed-steps .ant-steps-item-finish .ant-steps-item-icon {
              background: var(--step-theme-color-light) !important;
              border-color: var(--step-theme-color) !important;
            }
            .themed-steps .ant-steps-item-finish .ant-steps-item-icon > .ant-steps-icon,
            .themed-steps .ant-steps-item-finish .ant-steps-item-icon .anticon {
              color: var(--step-theme-color) !important;
            }
            .themed-steps .ant-steps-item-finish .ant-steps-item-icon .anticon svg {
              fill: var(--step-theme-color) !important;
            }
            .themed-steps .ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-tail::after {
              background-color: var(--step-theme-color) !important;
            }
            .themed-steps .ant-steps-item-wait .ant-steps-item-icon {
              border-color: #d9d9d9 !important;
              background: transparent !important;
            }
            .themed-steps .ant-steps-item-wait .ant-steps-item-icon > .ant-steps-icon,
            .themed-steps .ant-steps-item-wait .ant-steps-item-icon .anticon {
              color: rgba(0,0,0,0.25) !important;
            }
          `}</style>
          <Steps
            size="small"
            current={currentStep}
            items={[
              ...steps.map((s, i) => ({
                title: <Text className="text-xs" style={{ whiteSpace: 'nowrap' }}>{s.title}</Text>,
                icon: s.icon,
              })),
              {
                title: <Text className="text-xs" style={{ whiteSpace: 'nowrap' }}>Review</Text>,
                icon: <FileTextOutlined />,
              },
            ]}
            style={{ maxWidth: "100%" }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 28px" }}>
        {/* Import/Export toolbar — only on first step */}
        {currentStep === 0 && (
          <DataImportExport
            form={form}
            entityName={entityName}
            fields={fields}
            onBatchCreate={onBatchCreate}
            gradient={[g1, g2]}
          />
        )}

        <Form form={form} layout="vertical" size="middle" initialValues={initialValues}>
          {/* Render ALL form steps — hide non-active with display:none to preserve field state */}
          {steps.map((step, idx) => (
            <div key={`step-${idx}`} style={{ display: currentStep === idx ? 'block' : 'none' }}>
              {step.content}
            </div>
          ))}
        </Form>

          {/* Review Step — rendered separately (no form fields) */}
          {isReviewStep && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileTextOutlined style={{ color: g1 }} />
                <Text strong className="text-sm">Review Before Submitting</Text>
              </div>

              {reviewData.map((section, i) => (
                <Card
                  key={i}
                  size="small"
                  className="mb-2 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => goToStep(section.stepIndex)}
                  style={{
                    borderRadius: 10,
                    border: "1px solid #f0f0f0",
                    background: "#fafafa",
                  }}
                  title={
                    <div className="flex items-center justify-between">
                      <Text strong className="text-xs">{section.title}</Text>
                      <Divider type="vertical" />
                      <Button type="link" size="small" icon={<EditOutlined />} className="text-xs p-0"
                        style={{ color: g1, height: "auto" }}>
                        Edit
                      </Button>
                    </div>
                  }
                  styles={{ header: { minHeight: 32, padding: "4px 12px" }, body: { padding: "8px 12px" } }}
                >
                  {section.items.length === 0 ? (
                    <Text type="secondary" className="text-xs">No fields filled</Text>
                  ) : (
                    <Descriptions size="small" column={2} colon={false}>
                      {section.items.map((item, j) => (
                        <Descriptions.Item
                          key={j}
                          label={<Text type="secondary" className="text-xs">{item.label}</Text>}
                          span={typeof item.value === "object" && !Array.isArray(item.value) ? 2 : 1}
                        >
                          {fmtValue(item.value)}
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  )}
                </Card>
              ))}

              <Alert
                message={<Text className="text-xs">Click any section to go back and edit</Text>}
                type="info"
                showIcon
                style={{ borderRadius: 8, marginTop: 8 }}
              />
            </div>
          )}
      </div>

      {/* Footer Navigation */}
      <div style={{
        padding: "12px 28px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          {currentStep > 0 && (
            <Button onClick={handleBack} style={{ borderRadius: 8 }} icon={<ArrowLeftOutlined />}>
              Back
            </Button>
          )}
        </div>

        <Space>
          <Text type="secondary" className="text-xs">
            Step {currentStep + 1} of {totalSteps}
          </Text>
          {!isReviewStep ? (
            <Button
              type="primary"
              onClick={handleNext}
              style={{
                background: `linear-gradient(135deg, ${g1}, ${g2})`,
                border: "none",
                borderRadius: 8,
                minWidth: 120,
              }}
              icon={<ArrowRightOutlined />}
            >
              Next
            </Button>
          ) : (
            <Button
              type="primary"
              onClick={handleSubmit}
              loading={loading}
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                border: "none",
                borderRadius: 8,
                minWidth: 140,
              }}
              icon={<CheckCircleOutlined />}
            >
              {editMode ? "Save Changes" : "Submit"}
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
}
