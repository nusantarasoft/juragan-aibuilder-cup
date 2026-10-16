import { graphql } from '@/lib/graphqlClient';
import { DEFAULT_TENANT_ID } from '@/lib/graphql';

export type WorkflowNodeKind = 'trigger' | 'llm' | 'tool' | 'logic';

export type WorkflowNode = {
    id: string;
    kind: WorkflowNodeKind;
    label: string;
    detail?: string;
    tag?: string;
};

export type WorkflowGraph = {
    nodes: WorkflowNode[];
    edges: Array<{ from: string; to: string }>;
};

export type AgentWorkflow = {
    id: string;
    name: string;
    description: string;
    status: string;
    graph: WorkflowGraph;
    aosPlaybookId?: string;
    lastTestedAt?: string;
    updatedAt?: string;
};

/** Persisted workflows via middleware GraphQL (P2-3). Node palette labels are static UX helpers only. */
export const AGENT_BUILDER_DATA_MODE = 'live' as const;

type GqlWorkflow = {
    id: string;
    name: string;
    description: string;
    status: string;
    graph: WorkflowGraph;
    aosPlaybookId?: string;
    lastTestedAt?: string;
    updatedAt?: string;
};

function mapWorkflow(row: GqlWorkflow): AgentWorkflow {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        status: row.status,
        graph: row.graph ?? { nodes: [], edges: [] },
        aosPlaybookId: row.aosPlaybookId,
        lastTestedAt: row.lastTestedAt,
        updatedAt: row.updatedAt,
    };
}

const WORKFLOWS_QUERY = `
  query StudioAgentWorkflows($tenantId: String) {
    studioAgentWorkflows(tenantId: $tenantId) {
      id name description status graph aosPlaybookId lastTestedAt updatedAt
    }
  }
`;

const CREATE_MUTATION = `
  mutation CreateStudioAgentWorkflow($tenantId: String, $input: StudioAgentWorkflowInput!) {
    createStudioAgentWorkflow(tenantId: $tenantId, input: $input) {
      id name description status graph aosPlaybookId lastTestedAt updatedAt
    }
  }
`;

const UPDATE_MUTATION = `
  mutation UpdateStudioAgentWorkflow($tenantId: String, $id: String!, $input: StudioAgentWorkflowUpdateInput!) {
    updateStudioAgentWorkflow(tenantId: $tenantId, id: $id, input: $input) {
      id name description status graph aosPlaybookId lastTestedAt updatedAt
    }
  }
`;

const DELETE_MUTATION = `
  mutation DeleteStudioAgentWorkflow($tenantId: String, $id: String!) {
    deleteStudioAgentWorkflow(tenantId: $tenantId, id: $id)
  }
`;

const TEST_RUN_MUTATION = `
  mutation RecordStudioAgentWorkflowTestRun($tenantId: String, $id: String!) {
    recordStudioAgentWorkflowTestRun(tenantId: $tenantId, id: $id) {
      id lastTestedAt
    }
  }
`;

export const agentBuilderService = {
    async listWorkflows(): Promise<AgentWorkflow[]> {
        const data = await graphql<{ studioAgentWorkflows: GqlWorkflow[] }>(WORKFLOWS_QUERY, {
            variables: { tenantId: DEFAULT_TENANT_ID },
        });
        return (data.studioAgentWorkflows ?? []).map(mapWorkflow);
    },

    async createWorkflow(name: string, graph?: WorkflowGraph): Promise<AgentWorkflow> {
        const data = await graphql<{ createStudioAgentWorkflow: GqlWorkflow }>(CREATE_MUTATION, {
            variables: { tenantId: DEFAULT_TENANT_ID, input: { name, graph: graph ?? { nodes: [], edges: [] } } },
        });
        return mapWorkflow(data.createStudioAgentWorkflow);
    },

    async updateWorkflow(id: string, input: { name?: string; graph?: WorkflowGraph; status?: string }): Promise<AgentWorkflow> {
        const data = await graphql<{ updateStudioAgentWorkflow: GqlWorkflow }>(UPDATE_MUTATION, {
            variables: { tenantId: DEFAULT_TENANT_ID, id, input },
        });
        return mapWorkflow(data.updateStudioAgentWorkflow);
    },

    async deleteWorkflow(id: string): Promise<void> {
        await graphql(DELETE_MUTATION, { variables: { tenantId: DEFAULT_TENANT_ID, id } });
    },

    async recordTestRun(id: string): Promise<AgentWorkflow> {
        const data = await graphql<{ recordStudioAgentWorkflowTestRun: GqlWorkflow }>(TEST_RUN_MUTATION, {
            variables: { tenantId: DEFAULT_TENANT_ID, id },
        });
        return mapWorkflow(data.recordStudioAgentWorkflowTestRun);
    },
};
