const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000010';

export interface BimModel {
    id: string;
    name: string;
    version: string;
    fileUrl: string;
    format: string;
    status?: string;
}

export interface BimElement {
    id: string;
    modelId: string;
    globalId: string;
    name: string;
    type: string;
}

export interface BimIssue {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    assignedTo?: string;
}

export interface BimClashResult {
    id: string;
    elementAId: string;
    elementBId: string;
    clashType: string;
    severity: string;
    status: string;
}

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

export const bimService = {
    async getModels(tenantId = DEFAULT_TENANT_ID): Promise<BimModel[]> {
        const data = await graphqlRequest<{ bimModels: BimModel[] }>(`
            query($tenantId: String!) { 
                bimModels(tenantId: $tenantId) { id name version fileUrl format status } 
            }
        `, { tenantId });
        return data.bimModels || [];
    },

    async getElements(tenantId = DEFAULT_TENANT_ID, modelId: string): Promise<BimElement[]> {
        const data = await graphqlRequest<{ bimElements: BimElement[] }>(`
            query($tenantId: String!, $modelId: String!) { 
                bimElements(tenantId: $tenantId, modelId: $modelId) { id globalId name type } 
            }
        `, { tenantId, modelId });
        return data.bimElements || [];
    },

    async getIssues(tenantId = DEFAULT_TENANT_ID, modelId?: string): Promise<BimIssue[]> {
        const data = await graphqlRequest<{ bimIssues: BimIssue[] }>(`
            query($tenantId: String!, $modelId: String) { 
                bimIssues(tenantId: $tenantId, modelId: $modelId) { id title description status priority assignedTo } 
            }
        `, { tenantId, modelId });
        return data.bimIssues || [];
    },

    async getClashResults(tenantId = DEFAULT_TENANT_ID, modelId?: string): Promise<BimClashResult[]> {
        const data = await graphqlRequest<{ bimClashResults: BimClashResult[] }>(`
            query($tenantId: String!, $modelId: String) { 
                bimClashResults(tenantId: $tenantId, modelId: $modelId) { id elementAId elementBId clashType severity status } 
            }
        `, { tenantId, modelId });
        return data.bimClashResults || [];
    }
};
