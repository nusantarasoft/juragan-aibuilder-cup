"use client";

import React, { useState, useEffect } from "react";
import { ProCard, ProForm, ProFormTextArea, ProFormInstance } from "@ant-design/pro-components";
import { Button, message, Space, Spin, Alert, Progress, Typography } from "antd";
import { RobotOutlined, SaveOutlined } from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from 'next-themes';
import { usePreferencesStore } from '@/store/usePreferencesStore';

const GET_CHARTER = `
  query GetProjectCharter($projectId: String!) {
    pmProjectCharter(projectId: $projectId) {
      id
      purpose
      objectives
      highLevelRequirements
      highLevelRisks
      summaryMilestoneSchedule
      preapprovedFinancialResources
      keyStakeholders
      projectApprovalRequirements
      updatedAt
    }
  }
`;

const UPSERT_CHARTER = `
  mutation UpsertProjectCharter($tenantId: String!, $projectId: String!, $input: UpdatePmProjectCharterInput!) {
    upsertPmProjectCharter(tenantId: $tenantId, projectId: $projectId, input: $input) {
      id
      purpose
      updatedAt
    }
  }
`;

const AI_DRAFT_CHARTER = `
  query GenerateProjectCharter($projectId: String!) {
    generateProjectCharter(projectId: $projectId)
  }
`;

export default function ProjectCharterTab({ projectId }: { projectId: string }) {
    const { resolvedTheme } = useTheme();
    const { themeColor } = usePreferencesStore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = mounted && resolvedTheme === 'dark';

    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [charterData, setCharterData] = useState<any>(null);
    const formRef = React.useRef<ProFormInstance>(null);

    const CHARTER_FIELDS = ['purpose', 'objectives', 'highLevelRequirements', 'highLevelRisks', 'summaryMilestoneSchedule', 'preapprovedFinancialResources', 'keyStakeholders', 'projectApprovalRequirements'];
    const charterCompletion = React.useMemo(() => {
        if (!charterData) return 0;
        const filled = CHARTER_FIELDS.filter(f => charterData[f] && String(charterData[f]).trim().length > 0).length;
        return Math.round((filled / CHARTER_FIELDS.length) * 100);
    }, [charterData]);

    const loadCharter = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await gql(GET_CHARTER, { projectId });
            if (data.pmProjectCharter) {
                setCharterData(data.pmProjectCharter);
                formRef.current?.setFieldsValue(data.pmProjectCharter);
            }
        } catch (error) {
            // Ignore error if it's just "not found", otherwise show error
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadCharter();
    }, [loadCharter]);

    const handleSave = async (values: any) => {
        try {
            await gql(UPSERT_CHARTER, {
                tenantId: DEFAULT_TENANT_ID,
                projectId,
                input: values
            });
            messageApi.success("Project Charter saved successfully.");
            loadCharter();
        } catch (error: any) {
            messageApi.error(`Failed to save charter: ${error.message}`);
        }
    };

    const handleAiDraft = async () => {
        setAiLoading(true);
        try {
            const data = await gql(AI_DRAFT_CHARTER, { projectId });
            const draft = data.generateProjectCharter;
            if (draft) {
                formRef.current?.setFieldsValue(draft);
                messageApi.success("AI successfully drafted the Project Charter.");
            }
        } catch (error: any) {
            messageApi.error(`AI Drafting failed: ${error.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <ProCard title="Integration Management: Project Charter" bordered>
            {contextHolder}
            <div style={{ marginBottom: 16 }}>
                <Alert
                    message="The Project Charter formally authorizes the project and provides the project manager with the authority to apply organizational resources to project activities."
                    type="info"
                    showIcon
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(15,15,23,0.5)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                <Progress type="circle" percent={charterCompletion} size={48} strokeColor={charterCompletion === 100 ? '#10b981' : themeColor} />
                <div>
                    <Typography.Text strong style={{ fontSize: 13 }}>Charter Completion</Typography.Text>
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {CHARTER_FIELDS.filter(f => charterData?.[f] && String(charterData[f]).trim().length > 0).length} of {CHARTER_FIELDS.length} sections filled
                    </Typography.Text>
                </div>
            </div>

            <div style={{ marginBottom: 24 }}>
                <Button
                    type="dashed"
                    icon={<RobotOutlined />}
                    loading={aiLoading}
                    onClick={handleAiDraft}
                >
                    Draft with Vertex AI
                </Button>
            </div>

            {loading ? <Spin /> : (
                <ProForm
                    formRef={formRef}
                    initialValues={charterData}
                    onFinish={handleSave}
                    submitter={{
                        render: (props, _doms) => {
                            return (
                                <Space>
                                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Save Charter</Button>
                                </Space>
                            );
                        }
                    }}
                >
                    <ProFormTextArea name="purpose" label="Project Purpose / Justification" placeholder="State the business case for this project." />
                    <ProFormTextArea name="objectives" label="Measurable Project Objectives and Success Criteria" placeholder="How do we measure success?" />
                    <ProFormTextArea name="highLevelRequirements" label="High-Level Requirements" placeholder="What are the macro requirements or conditions to be met?" />
                    <ProFormTextArea name="highLevelRisks" label="High-Level Risks" placeholder="What are the biggest preliminary known risks?" />
                    <ProFormTextArea name="summaryMilestoneSchedule" label="Summary Milestone Schedule" placeholder="Describe key milestone delivery dates." />
                    <ProFormTextArea name="preapprovedFinancialResources" label="Preapproved Financial Resources" placeholder="Summarize budget and limits." />
                    <ProFormTextArea name="keyStakeholders" label="Key Stakeholder List" placeholder="Who are the main project sponsors, clients, and impacted groups?" />
                    <ProFormTextArea name="projectApprovalRequirements" label="Project Approval Requirements" placeholder="What constitutes success and who signs off?" />
                </ProForm>
            )}
        </ProCard>
    );
}
