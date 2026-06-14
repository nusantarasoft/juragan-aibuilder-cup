const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000010';

export interface ScadaDataSource {
    id: string;
    name: string;
    protocol: string;
    host?: string;
    port?: number;
    status?: string;
}

export interface ScadaTag {
    id: string;
    sourceId?: string;
    name: string;
    dataType: string;
    unit?: string;
}

export interface ScadaAlarmEvent {
    id: string;
    tagId?: string;
    severity: string;
    message: string;
    status: string;
    createdAt: string;
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

export const scadaService = {
    async getDataSources(tenantId = DEFAULT_TENANT_ID): Promise<ScadaDataSource[]> {
        const data = await graphqlRequest<{ scadaDataSources: ScadaDataSource[] }>(`
            query($tenantId: String!) { 
                scadaDataSources(tenantId: $tenantId) { id name protocol host port status } 
            }
        `, { tenantId });
        return data.scadaDataSources || [];
    },

    async getTags(tenantId = DEFAULT_TENANT_ID, sourceId?: string): Promise<ScadaTag[]> {
        const data = await graphqlRequest<{ scadaTags: ScadaTag[] }>(`
            query($tenantId: String!, $sourceId: String) { 
                scadaTags(tenantId: $tenantId, sourceId: $sourceId) { id name sourceId dataType unit } 
            }
        `, { tenantId, sourceId });
        return data.scadaTags || [];
    },

    async getActiveAlarms(tenantId = DEFAULT_TENANT_ID): Promise<ScadaAlarmEvent[]> {
        const data = await graphqlRequest<{ scadaActiveAlarms: ScadaAlarmEvent[] }>(`
            query($tenantId: String!) { 
                scadaActiveAlarms(tenantId: $tenantId) { id severity message status createdAt } 
            }
        `, { tenantId });
        return data.scadaActiveAlarms || [];
    }
};
