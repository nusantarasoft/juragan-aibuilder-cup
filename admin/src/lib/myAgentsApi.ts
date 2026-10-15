import { aosGql } from "@/components/agentic-os/lib/api";

export type TenantOwnerAgentSettings = {
    agentId: string;
    slug: string;
    name: string;
    role: string;
    status: string;
    dailyRunBudget: number;
    quietHoursEnabled: boolean;
    quietHoursTimezone: string;
    quietHoursStart: string;
    quietHoursEnd: string;
};

export type TenantOwnerAgentSettingsInput = {
    status?: string;
    dailyRunBudget?: number;
    quietHours?: {
        enabled?: boolean;
        timezone?: string;
        start?: string;
        end?: string;
    } | null;
};

const SETTINGS_FIELDS = `
  agentId slug name role status dailyRunBudget
  quietHoursEnabled quietHoursTimezone quietHoursStart quietHoursEnd
`;

export async function fetchTenantOwnerAgentSettingsList(): Promise<TenantOwnerAgentSettings[]> {
    const d = await aosGql<{ aosTenantOwnerAgentSettingsList: TenantOwnerAgentSettings[] }>(
        `query { aosTenantOwnerAgentSettingsList { ${SETTINGS_FIELDS} } }`,
    );
    return d.aosTenantOwnerAgentSettingsList;
}

export async function fetchTenantOwnerAgentSettings(agentId: string): Promise<TenantOwnerAgentSettings> {
    const d = await aosGql<{ aosTenantOwnerAgentSettings: TenantOwnerAgentSettings }>(
        `query($agentId: String!) { aosTenantOwnerAgentSettings(agentId: $agentId) { ${SETTINGS_FIELDS} } }`,
        { agentId },
    );
    return d.aosTenantOwnerAgentSettings;
}

export async function updateTenantOwnerAgentSettings(
    agentId: string,
    input: TenantOwnerAgentSettingsInput,
): Promise<TenantOwnerAgentSettings> {
    const d = await aosGql<{ aosTenantOwnerUpdateAgentSettings: TenantOwnerAgentSettings }>(
        `mutation($agentId: String!, $input: AosTenantOwnerAgentSettingsInput!) {
      aosTenantOwnerUpdateAgentSettings(agentId: $agentId, input: $input) { ${SETTINGS_FIELDS} }
    }`,
        { agentId, input },
    );
    return d.aosTenantOwnerUpdateAgentSettings;
}
