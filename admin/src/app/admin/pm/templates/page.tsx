"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { motion } from "framer-motion";
import { AuroraText } from "@/components/magicui/aurora-text";
import DecryptedText from "@/components/react-bits/DecryptedText";
import {
  Button, Card, Col, DatePicker, Drawer, Empty, Form, Input, InputNumber,
  message, Modal, Row, Space, Spin, Statistic, Tag, Typography, Select, Popconfirm,
} from "antd";
import {
  RocketOutlined, ThunderboltOutlined, CloudServerOutlined, TeamOutlined,
  NotificationOutlined, BugOutlined, ProjectOutlined, CheckCircleOutlined,
  ClockCircleOutlined, UnorderedListOutlined, CalendarOutlined, StarOutlined,
  ArrowRightOutlined, AppstoreOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, ArrowUpOutlined, ArrowDownOutlined, CopyOutlined, UserOutlined,
  SaveOutlined, SearchOutlined,
} from "@ant-design/icons";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text } = Typography;

// ── GraphQL ──
const CREATE_PROJECT = `
  mutation($tenantId: String!, $input: CreatePmProjectInput!) {
    createPmProject(tenantId: $tenantId, input: $input) { id name }
  }
`;
const CREATE_TASK = `
  mutation($tenantId: String!, $input: CreatePmTaskInput!) {
    createPmTask(tenantId: $tenantId, input: $input) { id title }
  }
`;
const CREATE_SPRINT = `
  mutation($tenantId: String!, $input: CreatePmSprintInput!) {
    createPmSprint(tenantId: $tenantId, input: $input) { id name }
  }
`;
const GET_PROJECTS = `
  query($tenantId: String!) {
    pmProjects(tenantId: $tenantId) { id name methodology status }
  }
`;
const GET_PROJECT_TASKS = `
  query($tenantId: String!, $projectId: String) {
    pmTasks(tenantId: $tenantId, projectId: $projectId) {
      id title type priority status
    }
  }
`;

// ── Methodology colors ──
const METHODOLOGY_COLORS: Record<string, { color: string; gradient: string }> = {
  agile:     { color: "#3b82f6", gradient: "linear-gradient(135deg, #3b82f6, #60a5fa)" },
  waterfall: { color: "#10b981", gradient: "linear-gradient(135deg, #10b981, #34d399)" },
  hybrid:    { color: "#8b5cf6", gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)" },
};

// ── Task definition type ──
interface TemplateTask { title: string; type: string; priority: string; }
interface TemplateSprint { name: string; taskIndices: number[]; }
interface ProjectTemplate {
  id: string; name: string; description: string; icon: React.ReactNode;
  methodology: string; duration: string; tasks: TemplateTask[];
  sprints?: TemplateSprint[]; labels?: string[];
}

// ── Custom template type (serializable) ──
interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  methodology: string;
  duration: string;
  tasks: TemplateTask[];
  createdAt: string;
}

// ── Built-in Templates ──
const TEMPLATES: ProjectTemplate[] = [
  {
    id: "agile-sprint", name: "Agile Software Sprint", icon: <ThunderboltOutlined />,
    methodology: "agile", duration: "2–4 weeks",
    description: "A complete agile sprint setup with user stories, technical spikes, bug reserves, and ceremonies.",
    labels: ["frontend", "backend", "devops", "qa"],
    sprints: [
      { name: "Sprint 1", taskIndices: [0, 1, 2, 3, 4, 5, 8, 9, 10] },
      { name: "Sprint 2", taskIndices: [0, 1, 2, 6, 7, 8, 9, 10] },
    ],
    tasks: [
      { title: "User Story: Authentication Flow", type: "story", priority: "high" },
      { title: "User Story: Dashboard UI", type: "story", priority: "high" },
      { title: "User Story: Data Export", type: "story", priority: "medium" },
      { title: "User Story: Notifications", type: "story", priority: "medium" },
      { title: "User Story: Settings Page", type: "story", priority: "low" },
      { title: "Technical Spike: API Performance", type: "spike", priority: "high" },
      { title: "Bug Fix Reserve #1", type: "bug", priority: "medium" },
      { title: "Bug Fix Reserve #2", type: "bug", priority: "low" },
      { title: "Sprint Review", type: "task", priority: "medium" },
      { title: "Sprint Retrospective", type: "task", priority: "medium" },
      { title: "Daily Standups", type: "task", priority: "low" },
    ],
  },
  {
    id: "product-launch", name: "Product Launch", icon: <RocketOutlined />,
    methodology: "hybrid", duration: "6–10 weeks",
    description: "End-to-end product launch plan covering research, design, development, testing, and go-to-market.",
    tasks: [
      { title: "Market Research", type: "research", priority: "high" },
      { title: "Competitive Analysis", type: "research", priority: "high" },
      { title: "Feature Specification", type: "task", priority: "critical" },
      { title: "Design Mockups", type: "design", priority: "high" },
      { title: "MVP Build", type: "development", priority: "critical" },
      { title: "Beta Testing", type: "testing", priority: "high" },
      { title: "Marketing Site", type: "task", priority: "medium" },
      { title: "Launch Campaign", type: "task", priority: "high" },
      { title: "Post-Launch Review", type: "review", priority: "medium" },
    ],
  },
  {
    id: "infra-migration", name: "Infrastructure Migration", icon: <CloudServerOutlined />,
    methodology: "waterfall", duration: "8–12 weeks",
    description: "Structured infrastructure migration with assessment, risk analysis, cutover, and validation phases.",
    tasks: [
      { title: "Current State Assessment", type: "research", priority: "critical" },
      { title: "Risk Analysis", type: "research", priority: "critical" },
      { title: "Migration Plan", type: "task", priority: "high" },
      { title: "Environment Setup", type: "task", priority: "high" },
      { title: "Data Migration", type: "task", priority: "critical" },
      { title: "Testing & Validation", type: "testing", priority: "high" },
      { title: "Cutover Execution", type: "task", priority: "critical" },
      { title: "Post-Migration Validation", type: "testing", priority: "high" },
      { title: "Documentation Update", type: "task", priority: "medium" },
    ],
  },
  {
    id: "client-onboarding", name: "Client Onboarding", icon: <TeamOutlined />,
    methodology: "hybrid", duration: "4–6 weeks",
    description: "Streamlined client onboarding process from kickoff to go-live with training and review milestones.",
    tasks: [
      { title: "Kickoff Meeting", type: "task", priority: "high" },
      { title: "Requirements Gathering", type: "research", priority: "critical" },
      { title: "Account Setup", type: "task", priority: "high" },
      { title: "Data Import", type: "task", priority: "high" },
      { title: "Training Sessions", type: "task", priority: "medium" },
      { title: "User Acceptance Testing", type: "testing", priority: "high" },
      { title: "Go-Live", type: "task", priority: "critical" },
      { title: "30-Day Review", type: "review", priority: "medium" },
    ],
  },
  {
    id: "marketing-campaign", name: "Marketing Campaign", icon: <NotificationOutlined />,
    methodology: "agile", duration: "3–6 weeks",
    description: "Full marketing campaign lifecycle from brief creation through performance reporting.",
    tasks: [
      { title: "Brief Creation", type: "task", priority: "high" },
      { title: "Audience Research", type: "research", priority: "high" },
      { title: "Content Strategy", type: "task", priority: "critical" },
      { title: "Design Assets", type: "design", priority: "high" },
      { title: "Social Media Plan", type: "task", priority: "medium" },
      { title: "Email Sequence", type: "task", priority: "medium" },
      { title: "Landing Page", type: "development", priority: "high" },
      { title: "A/B Testing", type: "testing", priority: "medium" },
      { title: "Campaign Launch", type: "task", priority: "critical" },
      { title: "Performance Report", type: "review", priority: "high" },
    ],
  },
  {
    id: "bug-bash", name: "Bug Bash / Quality Sprint", icon: <BugOutlined />,
    methodology: "agile", duration: "1–2 weeks",
    description: "Focused quality sprint to triage and fix bugs across priorities. Includes 10 pre-defined bug tasks.",
    sprints: [{ name: "Bug Bash Sprint", taskIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] }],
    tasks: [
      { title: "Critical: Login failure on Safari", type: "bug", priority: "critical" },
      { title: "Critical: Data loss on concurrent edit", type: "bug", priority: "critical" },
      { title: "High: Dashboard chart rendering lag", type: "bug", priority: "high" },
      { title: "High: Email notification delay", type: "bug", priority: "high" },
      { title: "High: Broken pagination on mobile", type: "bug", priority: "high" },
      { title: "Medium: Avatar upload size limit", type: "bug", priority: "medium" },
      { title: "Medium: Search filter not persisting", type: "bug", priority: "medium" },
      { title: "Medium: Tooltip clipping at edges", type: "bug", priority: "medium" },
      { title: "Low: Typo in onboarding wizard", type: "bug", priority: "low" },
      { title: "Low: Footer alignment on wide screens", type: "bug", priority: "low" },
    ],
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#6b7280",
};

const CUSTOM_TEMPLATES_KEY = "pm_custom_templates";

function loadCustomTemplates(): CustomTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || "[]");
  } catch (err: any) { console.error("PM Error", err);  return []; }
}

function saveCustomTemplates(templates: CustomTemplate[]) {
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

export default function ProjectTemplatesPage() {
  const router = useRouter();
  const { themeColor } = usePreferencesStore();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [previewTemplate, setPreviewTemplate] = useState<ProjectTemplate | null>(null);
  const [createTemplate, setCreateTemplate] = useState<ProjectTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  // Custom templates state
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomTemplate | null>(null);
  const [customForm] = Form.useForm();
  const [customTasks, setCustomTasks] = useState<TemplateTask[]>([]);

  // Save project as template state
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [saveAsLoading, setSaveAsLoading] = useState(false);
  const [saveAsForm] = Form.useForm();

  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  // Load custom templates from localStorage
  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  const glassCard = useMemo(() => ({
    background: isDark ? "rgba(15, 15, 23, 0.7)" : "rgba(255,255,255,0.85)",
    backdropFilter: "blur(12px)",
    border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid rgba(0,0,0,0.06)",
    borderRadius: 16,
  }), [isDark]);

  // ── Recently used (localStorage) ──
  const [recentIds, setRecentIds] = useState<string[]>([]);
  useEffect(() => {
    try { setRecentIds(JSON.parse(localStorage.getItem("pm_recent_templates") || "[]")); } catch (err: any) { console.error("PM Error", err); }
  }, []);
  const markRecent = (id: string) => {
    const updated = [id, ...recentIds.filter(r => r !== id)].slice(0, 5);
    setRecentIds(updated);
    localStorage.setItem("pm_recent_templates", JSON.stringify(updated));
  };

  // ── Create from template ──
  const handleCreate = useCallback(async (values: any) => {
    if (!createTemplate) return;
    setCreating(true);
    try {
      const projectInput: any = {
        name: values.name,
        description: values.description || createTemplate.description,
        methodology: createTemplate.methodology,
        status: "planning",
        priority: "medium",
        startDate: values.startDate?.toISOString(),
      };
      if (values.budget) projectInput.budget = values.budget;

      const pRes = await gql<{ createPmProject: { id: string; name: string } }>(
        CREATE_PROJECT, { tenantId: DEFAULT_TENANT_ID, input: projectInput }
      );
      const projectId = pRes.createPmProject.id;

      // Create sprints
      const sprintMap: Record<number, string> = {};
      if (createTemplate.sprints) {
        for (let i = 0; i < createTemplate.sprints.length; i++) {
          const s = createTemplate.sprints[i];
          const startDate = dayjs(values.startDate || dayjs()).add(i * 14, "day");
          const sRes = await gql<{ createPmSprint: { id: string } }>(
            CREATE_SPRINT, {
              tenantId: DEFAULT_TENANT_ID,
              input: {
                projectId, name: s.name, status: i === 0 ? "active" : "planning",
                startDate: startDate.toISOString(),
                endDate: startDate.add(14, "day").toISOString(),
              },
            }
          );
          s.taskIndices.forEach(idx => { sprintMap[idx] = sRes.createPmSprint.id; });
        }
      }

      // Create tasks
      for (let i = 0; i < createTemplate.tasks.length; i++) {
        const t = createTemplate.tasks[i];
        const taskInput: any = {
          projectId, title: t.title, type: t.type, priority: t.priority, status: "todo",
        };
        if (sprintMap[i]) taskInput.sprintId = sprintMap[i];
        await gql(CREATE_TASK, { tenantId: DEFAULT_TENANT_ID, input: taskInput });
      }

      markRecent(createTemplate.id);
      messageApi.success(`Project "${pRes.createPmProject.name}" created with ${createTemplate.tasks.length} tasks!`);
      setCreateTemplate(null);
      form.resetFields();
      setTimeout(() => router.push(`/admin/pm/dashboard?projectId=${projectId}`), 600);
    } catch (e: any) {
      messageApi.error(e.message || "Failed to create project from template");
    } finally {
      setCreating(false);
    }
  }, [createTemplate, form, markRecent, messageApi, router]);

  // ── Custom template helpers ──
  const handleAddCustomTask = () => {
    setCustomTasks(prev => [...prev, { title: "", type: "task", priority: "medium" }]);
  };

  const handleRemoveCustomTask = (index: number) => {
    setCustomTasks(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveCustomTask = (index: number, direction: "up" | "down") => {
    setCustomTasks(prev => {
      const arr = [...prev];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= arr.length) return arr;
      [arr[index], arr[targetIdx]] = [arr[targetIdx], arr[index]];
      return arr;
    });
  };

  const handleUpdateCustomTask = (index: number, field: keyof TemplateTask, value: string) => {
    setCustomTasks(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const openCustomModal = (existing?: CustomTemplate) => {
    if (existing) {
      setEditingCustom(existing);
      customForm.setFieldsValue({
        name: existing.name,
        description: existing.description,
        methodology: existing.methodology,
        duration: existing.duration,
      });
      setCustomTasks([...existing.tasks]);
    } else {
      setEditingCustom(null);
      customForm.resetFields();
      setCustomTasks([{ title: "", type: "task", priority: "medium" }]);
    }
    setCustomModalOpen(true);
  };

  const handleSaveCustomTemplate = async () => {
    try {
      const values = await customForm.validateFields();
      const validTasks = customTasks.filter(t => t.title.trim() !== "");
      if (validTasks.length === 0) {
        messageApi.warning("Please add at least one task with a title.");
        return;
      }

      const newTemplate: CustomTemplate = {
        id: editingCustom?.id || `custom-${Date.now()}`,
        name: values.name,
        description: values.description || "",
        methodology: values.methodology || "hybrid",
        duration: values.duration || "",
        tasks: validTasks,
        createdAt: editingCustom?.createdAt || new Date().toISOString(),
      };

      let updated: CustomTemplate[];
      if (editingCustom) {
        updated = customTemplates.map(t => t.id === editingCustom.id ? newTemplate : t);
        messageApi.success(`Template "${newTemplate.name}" updated!`);
      } else {
        updated = [...customTemplates, newTemplate];
        messageApi.success(`Template "${newTemplate.name}" created!`);
      }

      setCustomTemplates(updated);
      saveCustomTemplates(updated);
      setCustomModalOpen(false);
      setEditingCustom(null);
      customForm.resetFields();
      setCustomTasks([]);
    } catch (err: any) { console.error("PM Error", err); }
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
    messageApi.success("Custom template deleted.");
  };

  const customToProjectTemplate = (ct: CustomTemplate): ProjectTemplate => ({
    id: ct.id,
    name: ct.name,
    description: ct.description,
    icon: <UserOutlined />,
    methodology: ct.methodology,
    duration: ct.duration,
    tasks: ct.tasks,
  });

  // ── Save Project as Template ──
  const openSaveAsTemplate = async () => {
    setSaveAsTemplateOpen(true);
    setProjectsLoading(true);
    try {
      const data = await gql<{ pmProjects: any[] }>(GET_PROJECTS, { tenantId: DEFAULT_TENANT_ID });
      setProjects(data.pmProjects || []);
    } catch (err: any) { console.error("PM Error", err); 
      messageApi.error("Failed to load projects.");
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleSaveProjectAsTemplate = async () => {
    if (!selectedProjectId) {
      messageApi.warning("Please select a project.");
      return;
    }
    setSaveAsLoading(true);
    try {
      const values = await saveAsForm.validateFields();
      const data = await gql<{ pmTasks: any[] }>(GET_PROJECT_TASKS, {
        tenantId: DEFAULT_TENANT_ID,
        projectId: selectedProjectId,
      });
      const tasks: TemplateTask[] = (data.pmTasks || []).map((t: any) => ({
        title: t.title,
        type: t.type || "task",
        priority: t.priority || "medium",
      }));

      if (tasks.length === 0) {
        messageApi.warning("Selected project has no tasks.");
        setSaveAsLoading(false);
        return;
      }

      const selectedProject = projects.find(p => p.id === selectedProjectId);
      const newTemplate: CustomTemplate = {
        id: `custom-proj-${Date.now()}`,
        name: values.templateName || selectedProject?.name || "Project Template",
        description: values.templateDescription || `Template from project: ${selectedProject?.name}`,
        methodology: selectedProject?.methodology || "hybrid",
        duration: "",
        tasks,
        createdAt: new Date().toISOString(),
      };

      const updated = [...customTemplates, newTemplate];
      setCustomTemplates(updated);
      saveCustomTemplates(updated);
      messageApi.success(`Saved "${newTemplate.name}" as template with ${tasks.length} tasks!`);
      setSaveAsTemplateOpen(false);
      setSelectedProjectId(null);
      saveAsForm.resetFields();
    } catch (e: any) {
      messageApi.error(e.message || "Failed to save project as template.");
    } finally {
      setSaveAsLoading(false);
    }
  };

  // ── Search & filter state ──
  const [searchQuery, setSearchQuery] = useState('');
  const [methodologyFilter, setMethodologyFilter] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    let result = TEMPLATES;
    if (methodologyFilter) result = result.filter(t => t.methodology === methodologyFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return result;
  }, [searchQuery, methodologyFilter]);

  const filteredCustomTemplates = useMemo(() => {
    if (!searchQuery.trim()) return customTemplates;
    const q = searchQuery.toLowerCase();
    return customTemplates.filter(t => t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
  }, [customTemplates, searchQuery]);

  // ── Stats ──
  const recentlyUsed = useMemo(() => TEMPLATES.filter(t => recentIds.includes(t.id)), [recentIds]);
  const mostPopular = useMemo(() => {
    if (recentIds.length === 0) return TEMPLATES[0]?.name || 'None';
    const freq: Record<string, number> = {};
    recentIds.forEach(id => { freq[id] = (freq[id] || 0) + 1; });
    const topId = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
    return TEMPLATES.find(t => t.id === topId)?.name || TEMPLATES[0]?.name || 'None';
  }, [recentIds]);

  return (
    <CMSLayout
      title={<AuroraText colors={[themeColor, "#3b82f6", "#8b5cf6"]}>Project Templates</AuroraText>}
      subTitle={<DecryptedText text="Pre-built project templates for quick setup" animateOn="view" revealDirection="center" speed={40} maxIterations={15} sequential />}
    >
      {contextHolder}

      {/* ── Stats Row ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={6}>
            <Card size="small" style={{ ...glassCard, overflow: "hidden", position: "relative" }}
              styles={{ body: { padding: "18px 16px", position: "relative", zIndex: 1 } }} hoverable>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, borderRadius: "16px 16px 0 0" }} />
              <Statistic title={<Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Built-in Templates</Text>}
                value={TEMPLATES.length} prefix={<AppstoreOutlined style={{ color: themeColor }} />}
                valueStyle={{ fontSize: 28, fontWeight: 800, color: themeColor }} />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small" style={{ ...glassCard, overflow: "hidden", position: "relative" }}
              styles={{ body: { padding: "18px 16px", position: "relative", zIndex: 1 } }} hoverable>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(135deg, #f59e0b, #fbbf24)", borderRadius: "16px 16px 0 0" }} />
              <Statistic title={<Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Most Popular</Text>}
                value={mostPopular} prefix={<StarOutlined style={{ color: "#f59e0b" }} />}
                valueStyle={{ fontSize: 16, fontWeight: 700, color: "#f59e0b" }} />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small" style={{ ...glassCard, overflow: "hidden", position: "relative" }}
              styles={{ body: { padding: "18px 16px", position: "relative", zIndex: 1 } }} hoverable>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(135deg, #10b981, #34d399)", borderRadius: "16px 16px 0 0" }} />
              <Statistic title={<Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Recently Used</Text>}
                value={recentlyUsed.length} prefix={<ClockCircleOutlined style={{ color: "#10b981" }} />}
                valueStyle={{ fontSize: 28, fontWeight: 800, color: "#10b981" }} />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card size="small" style={{ ...glassCard, overflow: "hidden", position: "relative" }}
              styles={{ body: { padding: "18px 16px", position: "relative", zIndex: 1 } }} hoverable>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(135deg, #ec4899, #f472b6)", borderRadius: "16px 16px 0 0" }} />
              <Statistic title={<Text style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>Custom Templates</Text>}
                value={customTemplates.length} prefix={<UserOutlined style={{ color: "#ec4899" }} />}
                valueStyle={{ fontSize: 28, fontWeight: 800, color: "#ec4899" }} />
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* ── Action Buttons ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openCustomModal()}
          style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: "none", borderRadius: 10 }}>
          Create Custom Template
        </Button>
        <Button icon={<SaveOutlined />} onClick={openSaveAsTemplate}
          style={{ borderRadius: 10 }}>
          Save Project as Template
        </Button>
      </div>

      {/* ── Search & Filter Bar ── */}
      <Card size="small" style={{ ...glassCard, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Input
            prefix={<SearchOutlined style={{ color: isDark ? '#64748b' : '#94a3b8' }} />}
            placeholder="Search templates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 220, borderRadius: 8 }}
          />
          <Select
            placeholder="Methodology"
            allowClear
            value={methodologyFilter}
            onChange={setMethodologyFilter}
            style={{ width: 160 }}
            options={[
              { label: 'Agile', value: 'agile' },
              { label: 'Waterfall', value: 'waterfall' },
              { label: 'Hybrid', value: 'hybrid' },
            ]}
          />
          <Typography.Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>
            {filteredTemplates.length} of {TEMPLATES.length} templates
          </Typography.Text>
        </div>
      </Card>

      {/* ── Recently Used Section ── */}
      {recentlyUsed.length > 0 && (
        <Card
          size="small"
          title={<Space><ClockCircleOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 600 }}>Recently Used</span><Tag color="purple">{recentlyUsed.length}</Tag></Space>}
          style={{ ...glassCard, marginBottom: 20 }}
        >
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {recentlyUsed.map(t => (
              <motion.div
                key={t.id}
                whileHover={{ scale: 1.02 }}
                style={{
                  minWidth: 200, maxWidth: 220, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                  transition: 'border-color 0.2s',
                }}
                onClick={() => setPreviewTemplate(t)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <Typography.Text strong style={{ fontSize: 12 }}>{t.name}</Typography.Text>
                </div>
                <Tag style={{ fontSize: 10, textTransform: 'capitalize', borderRadius: 6 }}>{t.methodology}</Tag>
                <Tag style={{ fontSize: 10, borderRadius: 6 }}>{t.tasks.length} tasks</Tag>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Built-in Template Gallery ── */}
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: isDark ? "#a78bfa" : themeColor }}>
          Built-in Templates
        </Text>
      </div>
      <Row gutter={[16, 16]}>
        {filteredTemplates.map((tpl, i) => {
          const mCfg = METHODOLOGY_COLORS[tpl.methodology] || METHODOLOGY_COLORS.hybrid;
          return (
            <Col xs={24} sm={12} lg={8} key={tpl.id}>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.35 }} whileHover={{ scale: 1.02 }}>
                <Card hoverable size="small"
                  style={{ ...glassCard, overflow: "hidden", position: "relative", cursor: "pointer", height: "100%" }}
                  styles={{ body: { padding: "20px 18px" } }}
                  onClick={() => setPreviewTemplate(tpl)}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: mCfg.gradient, borderRadius: "16px 16px 0 0" }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, background: mCfg.gradient,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff",
                    }}>
                      {tpl.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <Text strong style={{ fontSize: 14, display: "block", lineHeight: 1.3 }}>{tpl.name}</Text>
                      <Tag style={{
                        fontSize: 9, borderRadius: 8, padding: "0 6px", margin: 0, marginTop: 2,
                        background: mCfg.color + "18", color: mCfg.color, border: `1px solid ${mCfg.color}33`,
                        textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5,
                      }}>
                        {tpl.methodology}
                      </Tag>
                    </div>
                  </div>

                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8, lineHeight: 1.5 }}>
                    {tpl.description}
                  </Text>

                  {/* Task type summary */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {Object.entries(
                      tpl.tasks.reduce((acc: Record<string, number>, task: any) => {
                        const type = task.type || 'task';
                        acc[type] = (acc[type] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([type, count]) => (
                      <Tag key={type} style={{ fontSize: 9, borderRadius: 6, margin: 0 }}>
                        {count} {type}{Number(count) > 1 ? 's' : ''}
                      </Tag>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Space size={12}>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        <UnorderedListOutlined style={{ marginRight: 4 }} />{tpl.tasks.length} tasks
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />{tpl.duration}
                      </Text>
                    </Space>
                    {tpl.sprints && (
                      <Tag color="blue" style={{ fontSize: 9, borderRadius: 8 }}>
                        {tpl.sprints.length} sprint{tpl.sprints.length > 1 ? "s" : ""}
                      </Tag>
                    )}
                  </div>
                </Card>
              </motion.div>
            </Col>
          );
        })}
      </Row>

      {/* ── Custom Templates Section ── */}
      {filteredCustomTemplates.length > 0 && (
        <>
          <div style={{ marginTop: 32, marginBottom: 12 }}>
            <Text strong style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: "#ec4899" }}>
              Custom Templates
            </Text>
          </div>
          <Row gutter={[16, 16]}>
            {filteredCustomTemplates.map((ct, i) => {
              const mCfg = METHODOLOGY_COLORS[ct.methodology] || METHODOLOGY_COLORS.hybrid;
              const tpl = customToProjectTemplate(ct);
              return (
                <Col xs={24} sm={12} lg={8} key={ct.id}>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35 }} whileHover={{ scale: 1.02 }}>
                    <Card hoverable size="small"
                      style={{ ...glassCard, overflow: "hidden", position: "relative", cursor: "pointer", height: "100%" }}
                      styles={{ body: { padding: "20px 18px" } }}
                      onClick={() => setPreviewTemplate(tpl)}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(135deg, #ec4899, #f472b6)", borderRadius: "16px 16px 0 0" }} />

                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: "linear-gradient(135deg, #ec4899, #f472b6)",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff",
                        }}>
                          <UserOutlined />
                        </div>
                        <div style={{ flex: 1 }}>
                          <Text strong style={{ fontSize: 14, display: "block", lineHeight: 1.3 }}>{ct.name}</Text>
                          <Space size={4}>
                            <Tag style={{
                              fontSize: 9, borderRadius: 8, padding: "0 6px", margin: 0, marginTop: 2,
                              background: mCfg.color + "18", color: mCfg.color, border: `1px solid ${mCfg.color}33`,
                              textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5,
                            }}>
                              {ct.methodology}
                            </Tag>
                            <Tag style={{
                              fontSize: 9, borderRadius: 8, padding: "0 6px", margin: 0, marginTop: 2,
                              background: "#ec489918", color: "#ec4899", border: "1px solid #ec489933",
                              fontWeight: 700, letterSpacing: 0.5,
                            }}>
                              CUSTOM
                            </Tag>
                          </Space>
                        </div>
                      </div>

                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 12, lineHeight: 1.5 }}>
                        {ct.description || "Custom template"}
                      </Text>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Space size={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <UnorderedListOutlined style={{ marginRight: 4 }} />{ct.tasks.length} tasks
                          </Text>
                          {ct.duration && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              <CalendarOutlined style={{ marginRight: 4 }} />{ct.duration}
                            </Text>
                          )}
                        </Space>
                        <Space size={4} onClick={e => e.stopPropagation()}>
                          <Button type="text" size="small" icon={<EditOutlined />}
                            onClick={(e) => { e.stopPropagation(); openCustomModal(ct); }} />
                          <Popconfirm title="Delete this custom template?" onConfirm={(e) => { e?.stopPropagation(); handleDeleteCustomTemplate(ct.id); }}>
                            <Button type="text" size="small" danger icon={<DeleteOutlined />}
                              onClick={(e) => e.stopPropagation()} />
                          </Popconfirm>
                        </Space>
                      </div>
                    </Card>
                  </motion.div>
                </Col>
              );
            })}
          </Row>
        </>
      )}

      {/* ── Template Preview Drawer ── */}
      <Drawer
        title={<Space>{previewTemplate?.icon}<span style={{ fontWeight: 700 }}>{previewTemplate?.name}</span></Space>}
        open={!!previewTemplate} onClose={() => setPreviewTemplate(null)}
        width={520}
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button onClick={() => setPreviewTemplate(null)}>Close</Button>
            <Button type="primary" icon={<RocketOutlined />}
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: "none" }}
              onClick={() => { setCreateTemplate(previewTemplate); setPreviewTemplate(null); form.setFieldsValue({ name: previewTemplate?.name, startDate: dayjs() }); }}>
              Use This Template
            </Button>
          </div>
        }
      >
        {previewTemplate && (() => {
          const mCfg = METHODOLOGY_COLORS[previewTemplate.methodology] || METHODOLOGY_COLORS.hybrid;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Methodology + Duration */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Tag style={{ fontSize: 11, borderRadius: 8, background: mCfg.color + "18", color: mCfg.color, border: `1px solid ${mCfg.color}33`, fontWeight: 600 }}>
                  {previewTemplate.methodology.toUpperCase()}
                </Tag>
                <Tag icon={<CalendarOutlined />} style={{ fontSize: 11, borderRadius: 8 }}>{previewTemplate.duration}</Tag>
                <Tag icon={<UnorderedListOutlined />} style={{ fontSize: 11, borderRadius: 8 }}>{previewTemplate.tasks.length} tasks</Tag>
              </div>

              <Text style={{ fontSize: 13, lineHeight: 1.6 }}>{previewTemplate.description}</Text>

              {/* Labels */}
              {previewTemplate.labels && (
                <div>
                  <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Labels</Text>
                  <Space size={4} wrap>{previewTemplate.labels.map(l => <Tag key={l} style={{ borderRadius: 8, fontSize: 10 }}>{l}</Tag>)}</Space>
                </div>
              )}

              {/* Sprint Plan */}
              {previewTemplate.sprints && (
                <div>
                  <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Sprint Plan</Text>
                  {previewTemplate.sprints.map((s, i) => (
                    <div key={i} style={{
                      padding: "10px 14px", marginBottom: 6, borderRadius: 10,
                      background: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.04)",
                      border: "1px solid rgba(59,130,246,0.15)",
                    }}>
                      <Text strong style={{ fontSize: 12 }}>{s.name}</Text>
                      <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{s.taskIndices.length} tasks</Text>
                    </div>
                  ))}
                </div>
              )}

              {/* Task List */}
              <div>
                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>Tasks</Text>
                {previewTemplate.tasks.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0",
                      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "#f5f5f5"}`,
                    }}>
                    <div style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12 }}>{t.title}</Text>
                      <div><Tag style={{ fontSize: 9, borderRadius: 8, marginTop: 2 }}>{t.type}</Tag></div>
                    </div>
                    <Tag color={PRIORITY_COLORS[t.priority]} style={{ fontSize: 9, borderRadius: 8, textTransform: "uppercase" }}>
                      {t.priority}
                    </Tag>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* ── Create from Template Modal ── */}
      <Modal
        title={<Space><RocketOutlined style={{ color: themeColor }} /><span style={{ fontWeight: 700 }}>Create from "{createTemplate?.name}"</span></Space>}
        open={!!createTemplate} onCancel={() => { setCreateTemplate(null); form.resetFields(); }}
        footer={null} destroyOnClose width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}
          initialValues={{ name: createTemplate?.name, startDate: dayjs() }}>
          <Form.Item name="name" label="Project Name" rules={[{ required: true, message: "Project name is required" }]}>
            <Input placeholder="Enter project name" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional project description" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="startDate" label="Start Date">
                <DatePicker style={{ width: "100%", borderRadius: 10 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="budget" label="Budget">
                <InputNumber style={{ width: "100%", borderRadius: 10 }} min={0} placeholder="Optional" prefix="$" />
              </Form.Item>
            </Col>
          </Row>
          {createTemplate && (
            <div style={{
              padding: "12px 16px", borderRadius: 12, marginBottom: 16,
              background: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.04)",
              border: "1px solid rgba(139,92,246,0.15)",
            }}>
              <Text style={{ fontSize: 12 }}>
                <CheckCircleOutlined style={{ color: "#10b981", marginRight: 6 }} />
                This will create <strong>1 project</strong>
                {createTemplate.sprints ? <>, <strong>{createTemplate.sprints.length} sprint{createTemplate.sprints.length > 1 ? "s" : ""}</strong></> : null}
                , and <strong>{createTemplate.tasks.length} tasks</strong>.
              </Text>
            </div>
          )}
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setCreateTemplate(null); form.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={creating} icon={<RocketOutlined />}
                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: "none", borderRadius: 10 }}>
                Create Project
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Create Custom Template Modal ── */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: themeColor }} />
            <span style={{ fontWeight: 700 }}>{editingCustom ? "Edit Custom Template" : "Create Custom Template"}</span>
          </Space>
        }
        open={customModalOpen}
        onCancel={() => { setCustomModalOpen(false); setEditingCustom(null); customForm.resetFields(); setCustomTasks([]); }}
        footer={null}
        destroyOnClose
        width={640}
      >
        <Form form={customForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Template Name" rules={[{ required: true, message: "Template name is required" }]}>
            <Input placeholder="e.g. My Sprint Template" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="What is this template for?" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="methodology" label="Methodology" initialValue="hybrid">
                <Select
                  options={[
                    { value: "agile", label: "⚡ Agile" },
                    { value: "waterfall", label: "🌊 Waterfall" },
                    { value: "hybrid", label: "🔀 Hybrid" },
                  ]}
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="duration" label="Duration">
                <Input placeholder="e.g. 2–4 weeks" style={{ borderRadius: 10 }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Task List Editor */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>Tasks ({customTasks.length})</Text>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddCustomTask}>
                Add Task
              </Button>
            </div>

            <div style={{
              maxHeight: 320, overflowY: "auto",
              border: isDark ? "1px solid rgba(139,92,246,0.15)" : "1px solid #f0f0f0",
              borderRadius: 10, padding: customTasks.length > 0 ? 8 : 0,
            }}>
              {customTasks.length === 0 ? (
                <Empty description="No tasks yet" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />
              ) : (
                customTasks.map((task, idx) => (
                  <div key={idx} style={{
                    display: "flex", gap: 8, alignItems: "center", marginBottom: 8,
                    padding: "8px 10px", borderRadius: 8,
                    background: isDark ? "rgba(255,255,255,0.03)" : "#fafafa",
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={idx === 0}
                        onClick={() => handleMoveCustomTask(idx, "up")} style={{ padding: 0, width: 20, height: 16 }} />
                      <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={idx === customTasks.length - 1}
                        onClick={() => handleMoveCustomTask(idx, "down")} style={{ padding: 0, width: 20, height: 16 }} />
                    </div>
                    <Input size="small" placeholder="Task title" value={task.title}
                      onChange={e => handleUpdateCustomTask(idx, "title", e.target.value)}
                      style={{ flex: 1, borderRadius: 6 }} />
                    <Select size="small" value={task.type} onChange={v => handleUpdateCustomTask(idx, "type", v)}
                      style={{ width: 100 }}
                      options={[
                        { value: "feature", label: "Feature" },
                        { value: "bug", label: "Bug" },
                        { value: "chore", label: "Chore" },
                        { value: "task", label: "Task" },
                      ]} />
                    <Select size="small" value={task.priority} onChange={v => handleUpdateCustomTask(idx, "priority", v)}
                      style={{ width: 90 }}
                      options={[
                        { value: "low", label: "Low" },
                        { value: "medium", label: "Medium" },
                        { value: "high", label: "High" },
                        { value: "critical", label: "Critical" },
                      ]} />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />}
                      onClick={() => handleRemoveCustomTask(idx)} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setCustomModalOpen(false); setEditingCustom(null); customForm.resetFields(); setCustomTasks([]); }}>
                Cancel
              </Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveCustomTemplate}
                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: "none", borderRadius: 10 }}>
                {editingCustom ? "Update Template" : "Save Template"}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ── Save Project as Template Modal ── */}
      <Modal
        title={
          <Space>
            <CopyOutlined style={{ color: themeColor }} />
            <span style={{ fontWeight: 700 }}>Save Project as Template</span>
          </Space>
        }
        open={saveAsTemplateOpen}
        onCancel={() => { setSaveAsTemplateOpen(false); setSelectedProjectId(null); saveAsForm.resetFields(); }}
        footer={null}
        destroyOnClose
        width={480}
      >
        <Form form={saveAsForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="Select Project">
            {projectsLoading ? (
              <div style={{ textAlign: "center", padding: 20 }}><Spin /></div>
            ) : (
              <Select
                showSearch
                placeholder="Choose a project..."
                optionFilterProp="label"
                value={selectedProjectId}
                onChange={(val) => {
                  setSelectedProjectId(val);
                  const proj = projects.find(p => p.id === val);
                  if (proj) saveAsForm.setFieldsValue({ templateName: proj.name + " Template" });
                }}
                options={projects.map(p => ({
                  value: p.id,
                  label: `${p.name}${p.methodology ? ` (${p.methodology})` : ""}`,
                }))}
                style={{ width: "100%", borderRadius: 10 }}
              />
            )}
          </Form.Item>
          <Form.Item name="templateName" label="Template Name" rules={[{ required: true, message: "Template name is required" }]}>
            <Input placeholder="Name for this template" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="templateDescription" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" style={{ borderRadius: 10 }} />
          </Form.Item>
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 16,
            background: isDark ? "rgba(59,130,246,0.08)" : "rgba(59,130,246,0.04)",
            border: "1px solid rgba(59,130,246,0.15)",
          }}>
            <Text style={{ fontSize: 12 }}>
              <CheckCircleOutlined style={{ color: "#3b82f6", marginRight: 6 }} />
              This will capture all tasks from the selected project and save them as a reusable custom template.
            </Text>
          </div>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setSaveAsTemplateOpen(false); setSelectedProjectId(null); saveAsForm.resetFields(); }}>
                Cancel
              </Button>
              <Button type="primary" icon={<SaveOutlined />} loading={saveAsLoading}
                onClick={handleSaveProjectAsTemplate} disabled={!selectedProjectId}
                style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`, border: "none", borderRadius: 10 }}>
                Save as Template
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </CMSLayout>
  );
}


