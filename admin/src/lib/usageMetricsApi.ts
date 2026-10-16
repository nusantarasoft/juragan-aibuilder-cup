import { aosGql } from "@/components/agentic-os/lib/api";

export type AgentUsageMetrics = {
    agentId: string;
    slug: string;
    name: string;
    role: string;
    status: string;
    tasksCreated: number;
    tasksCompleted: number;
    tasksFailed: number;
    kasirWaTasks: number;
};

export type TenantUsageMetrics = {
    available: boolean;
    tenantId: string;
    periodDays: number;
    periodStart: string;
    periodEnd: string;
    unavailableReason: string | null;
    recruitedAgents: number;
    waChatsToday: number | null;
    tasksCreated: number | null;
    tasksCompleted: number | null;
    tasksFailed: number | null;
    waInboundMessages: number | null;
    waOutboundReplies: number | null;
    crawlJobs: number | null;
    builderWorkflows: number | null;
    kgEmbeddedChunks: number | null;
    agents: AgentUsageMetrics[];
};

const FIELDS = `
  available tenantId periodDays periodStart periodEnd unavailableReason recruitedAgents
  waChatsToday tasksCreated tasksCompleted tasksFailed
  waInboundMessages waOutboundReplies crawlJobs builderWorkflows kgEmbeddedChunks
  agents {
    agentId slug name role status
    tasksCreated tasksCompleted tasksFailed kasirWaTasks
  }
`;

export async function fetchTenantUsageMetrics(days = 30): Promise<TenantUsageMetrics> {
    const d = await aosGql<{ aosTenantUsageMetrics: TenantUsageMetrics }>(
        `query($days: Int) { aosTenantUsageMetrics(days: $days) { ${FIELDS} } }`,
        { days },
    );
    return d.aosTenantUsageMetrics;
}
