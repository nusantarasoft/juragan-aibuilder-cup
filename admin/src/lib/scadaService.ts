import { DEFAULT_TENANT_ID, gql as graphqlRequest } from '@/lib/graphql';

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

export interface ScadaTagValuePoint {
    id: string;
    tagId: string;
    timestamp: string;
    valueNumeric?: number;
    valueText?: string;
    quality?: string;
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
    },

    async getTagValueHistory(
        tagIds: string[],
        tenantId = DEFAULT_TENANT_ID,
        limit = 120,
    ): Promise<ScadaTagValuePoint[]> {
        if (!tagIds.length) return [];
        const data = await graphqlRequest<{ scadaTagValueHistory: ScadaTagValuePoint[] }>(`
            query($tenantId: String!, $tagIds: [String!]!, $limit: Int) {
                scadaTagValueHistory(tenantId: $tenantId, tagIds: $tagIds, limit: $limit) {
                    id tagId timestamp valueNumeric valueText quality
                }
            }
        `, { tenantId, tagIds, limit });
        return data.scadaTagValueHistory || [];
    },
};
