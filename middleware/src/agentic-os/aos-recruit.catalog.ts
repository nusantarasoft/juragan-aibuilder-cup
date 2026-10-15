/** Server-side recruit catalog (F2-2 + F3-1). Enterprise templates stay in Agent Studio for platform admins only. */

export const TRIAL_MAX_RECRUITED_AGENTS = 3;

export const KASIR_RECRUIT_TEMPLATE_ID = 'umkm-kasir';
export const SERVICE_DESK_RECRUIT_TEMPLATE_ID = 'service-desk';

export type RecruitCatalogKind = 'recruitable' | 'coming_soon' | 'enterprise_hidden';

export type RecruitCatalogEntryDef = {
    id: string;
    name: string;
    role: string;
    description: string;
    kind: RecruitCatalogKind;
    color: string;
    sortOrder: number;
};

export const RECRUIT_CATALOG: RecruitCatalogEntryDef[] = [
    {
        id: KASIR_RECRUIT_TEMPLATE_ID,
        name: 'Kasir UMKM',
        role: 'UMKM WhatsApp Kasir',
        description: 'Kasir WhatsApp — catat jual, stok, dan konsultasi pelanggan.',
        kind: 'recruitable',
        color: '#22c55e',
        sortOrder: 1,
    },
    {
        id: SERVICE_DESK_RECRUIT_TEMPLATE_ID,
        name: 'Service Desk',
        role: 'Service Desk / ITSM',
        description: 'Triage tiket, usulkan solusi dari knowledge base, komentar draft — tanpa tutup tiket otomatis.',
        kind: 'recruitable',
        color: '#60a5fa',
        sortOrder: 2,
    },
    {
        id: 'cs-soon',
        name: 'Customer Service',
        role: 'CS WhatsApp',
        description: 'Balas pertanyaan pelanggan dan FAQ toko.',
        kind: 'coming_soon',
        color: '#a78bfa',
        sortOrder: 3,
    },
    {
        id: 'stok-soon',
        name: 'Stok & gudang',
        role: 'Asisten stok',
        description: 'Pantau stok, alert habis, dan restock.',
        kind: 'coming_soon',
        color: '#f59e0b',
        sortOrder: 4,
    },
];

/** Kasir agent row aligned with F1-3 migration + browser runner for WA consult path (#34/#38). */
export const KASIR_RECRUIT_AGENT_DEFAULTS = {
    name: 'Kasir UMKM',
    baseSlug: KASIR_RECRUIT_TEMPLATE_ID,
    role: 'UMKM WhatsApp Kasir',
    persona: 'Kasir WhatsApp untuk UMKM — catat jual, stok, dan konsultasi.',
    color: '#22c55e',
    zone: 'operations',
    deskId: 'ops-1',
    modules: ['ai-studio'],
    skills: ['Kasir WA', 'Konsultasi', 'Stok'],
    tools: ['module.read', 'activity.log'],
    permissions: { 'ai-studio': 'write' } as Record<string, string>,
    /** F1-3 seed + kasir-consult path use browser runner (documented in design §D5). */
    runner: 'browser' as const,
    guardrails: {
        denySend: true,
        denyShare: true,
        denyDelete: true,
        requireApproval: [],
        /** Until F2-3 WA connect — enforced also at studio outbound gate. */
        blockCustomerOutboundUntilWa: true,
    },
    status: 'active',
};

/** Aligned with Agent Studio `service-desk` preset + Semar seed modules; draft/comment only on tickets. */
export const SERVICE_DESK_RECRUIT_AGENT_DEFAULTS = {
    name: 'Service Desk',
    baseSlug: SERVICE_DESK_RECRUIT_TEMPLATE_ID,
    role: 'Service Desk Agent',
    persona:
        'You triage incoming tickets, propose resolutions from the knowledge base and keep requesters informed. You never close a ticket without a human.',
    color: '#60a5fa',
    zone: 'operations',
    deskId: 'ops-1',
    modules: ['itsm', 'knowledge'],
    skills: ['Triage', 'SLA', 'Customer empathy'],
    tools: ['module.read', 'module.draft', 'kb.search', 'ticket.comment', 'email.draft', 'activity.log'],
    permissions: { itsm: 'write', knowledge: 'draft' } as Record<string, string>,
    runner: 'cloud' as const,
    guardrails: {
        denySend: true,
        denyShare: true,
        denyDelete: true,
        requireApproval: ['ticket.close', 'send'],
        /** Human must confirm resolution before close. */
        noAutoCloseTickets: true,
    },
    status: 'active',
};

export const RECRUIT_TEMPLATE_IDS = [KASIR_RECRUIT_TEMPLATE_ID, SERVICE_DESK_RECRUIT_TEMPLATE_ID] as const;

export type RecruitTemplateId = (typeof RECRUIT_TEMPLATE_IDS)[number];

export function recruitDefaultsForTemplate(templateId: string) {
    if (templateId === KASIR_RECRUIT_TEMPLATE_ID) return KASIR_RECRUIT_AGENT_DEFAULTS;
    if (templateId === SERVICE_DESK_RECRUIT_TEMPLATE_ID) return SERVICE_DESK_RECRUIT_AGENT_DEFAULTS;
    return null;
}

export function isRecruitedSlug(baseSlug: string, slug: string): boolean {
    return slug === baseSlug || slug.startsWith(`${baseSlug}-`);
}
