const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000010';

export interface BmsSystem {
    id: string;
    tenantId: string;
    name: string;
    systemType: string;
    status?: string;
}

export interface BmsZone {
    id: string;
    systemId?: string;
    name: string;
    parentZoneId?: string;
}

export interface BmsEquipment {
    id: string;
    systemId?: string;
    zoneId?: string;
    name: string;
    equipmentType: string;
    status?: string;
}

export interface BmsAlarm {
    id: string;
    systemId?: string;
    equipmentId?: string;
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

export const bmsService = {
    async getSystems(tenantId = DEFAULT_TENANT_ID): Promise<BmsSystem[]> {
        const data = await graphqlRequest<{ bmsSystems: BmsSystem[] }>(`
            query($tenantId: String!) { 
                bmsSystems(tenantId: $tenantId) { id name systemType status } 
            }
        `, { tenantId });
        return data.bmsSystems || [];
    },

    async getZones(tenantId = DEFAULT_TENANT_ID, systemId?: string): Promise<BmsZone[]> {
        const data = await graphqlRequest<{ bmsZones: BmsZone[] }>(`
            query($tenantId: String!, $systemId: String) { 
                bmsZones(tenantId: $tenantId, systemId: $systemId) { id name systemId parentZoneId } 
            }
        `, { tenantId, systemId });
        return data.bmsZones || [];
    },

    async getEquipment(tenantId = DEFAULT_TENANT_ID, systemId?: string, zoneId?: string): Promise<BmsEquipment[]> {
        const data = await graphqlRequest<{ bmsEquipment: BmsEquipment[] }>(`
            query($tenantId: String!, $systemId: String, $zoneId: String) { 
                bmsEquipment(tenantId: $tenantId, systemId: $systemId, zoneId: $zoneId) { id name equipmentType status } 
            }
        `, { tenantId, systemId, zoneId });
        return data.bmsEquipment || [];
    },

    async getAlarms(tenantId = DEFAULT_TENANT_ID, systemId?: string): Promise<BmsAlarm[]> {
        const data = await graphqlRequest<{ bmsAlarms: BmsAlarm[] }>(`
            query($tenantId: String!, $systemId: String) { 
                bmsAlarms(tenantId: $tenantId, systemId: $systemId) { id severity message status createdAt } 
            }
        `, { tenantId, systemId });
        return data.bmsAlarms || [];
    }
};
