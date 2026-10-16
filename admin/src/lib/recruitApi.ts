import { aosGql } from "@/components/agentic-os/lib/api";

export type RecruitCatalogEntry = {
    id: string;
    name: string;
    role: string;
    description: string;
    kind: string;
    color: string;
    sortOrder: number;
    recruitable: boolean;
};

export type RecruitStatus = {
    recruitedCount: number;
    maxAgents: number;
    kasirRecruited: boolean;
    serviceDeskRecruited: boolean;
    financeRecruited: boolean;
};

export async function fetchRecruitCatalog(): Promise<RecruitCatalogEntry[]> {
    const d = await aosGql<{ aosRecruitCatalog: RecruitCatalogEntry[] }>(
        `query { aosRecruitCatalog { id name role description kind color sortOrder recruitable } }`,
    );
    return d.aosRecruitCatalog;
}

export async function fetchRecruitStatus(): Promise<RecruitStatus> {
    const d = await aosGql<{ aosRecruitStatus: RecruitStatus }>(
        `query { aosRecruitStatus { recruitedCount maxAgents kasirRecruited serviceDeskRecruited financeRecruited } }`,
    );
    return d.aosRecruitStatus;
}

export async function recruitAgent(templateId: string): Promise<{
    message: string;
    waConnectRequired: boolean;
    agent: { id: string; slug: string; name: string };
}> {
    const d = await aosGql<{
        aosRecruitAgent: { message: string; waConnectRequired: boolean; agent: { id: string; slug: string; name: string } };
    }>(
        `mutation Recruit($templateId: String!) { aosRecruitAgent(templateId: $templateId) { message waConnectRequired agent { id slug name } } }`,
        { templateId },
    );
    return d.aosRecruitAgent;
}

export async function recruitKasirAgent(): Promise<{ message: string; agent: { id: string; slug: string } }> {
    const res = await recruitAgent("umkm-kasir");
    return { message: res.message, agent: res.agent };
}
