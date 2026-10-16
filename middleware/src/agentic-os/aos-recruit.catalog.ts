/** Server-side recruit catalog (F2-2 + F3-1 + F3-5 + F3-6 + F3-7 + F3-8). Enterprise templates stay in Agent Studio for platform admins only. */

export const TRIAL_MAX_RECRUITED_AGENTS = 3;

export const KASIR_RECRUIT_TEMPLATE_ID = 'umkm-kasir';
export const SERVICE_DESK_RECRUIT_TEMPLATE_ID = 'service-desk';
export const FINANCE_RECRUIT_TEMPLATE_ID = 'finance';
export const SALES_RECRUIT_TEMPLATE_ID = 'sales';
export const DEVOPS_RECRUIT_TEMPLATE_ID = 'devops';
export const SECURITY_RECRUIT_TEMPLATE_ID = 'security';

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
        id: FINANCE_RECRUIT_TEMPLATE_ID,
        name: 'Finance',
        role: 'Finance Analyst',
        description:
            'Rekonsiliasi buku besar, flag anomali, dan laporan — draft jurnal saja; posting butuh persetujuan manusia. Data akuntansi live tenant.',
        kind: 'recruitable',
        color: '#facc15',
        sortOrder: 3,
    },
    {
        id: SALES_RECRUIT_TEMPLATE_ID,
        name: 'Sales',
        role: 'Sales & Market Analyst',
        description:
            'Lead scoring, riset pasar, dan draft follow-up — hanya draft email; kirim butuh persetujuan manusia. Data CRM live tenant.',
        kind: 'recruitable',
        color: '#fb7185',
        sortOrder: 4,
    },
    {
        id: DEVOPS_RECRUIT_TEMPLATE_ID,
        name: 'DevOps',
        role: 'DevOps Engineer',
        description:
            'Pipeline CI/CD, observability, dan runbook — trigger pipeline & eksekusi runbook butuh persetujuan manusia; tidak deploy otomatis. Data DevOps live tenant.',
        kind: 'recruitable',
        color: '#38bdf8',
        sortOrder: 5,
    },
    {
        id: SECURITY_RECRUIT_TEMPLATE_ID,
        name: 'Security',
        role: 'Security Analyst',
        description:
            'Triage temuan keamanan by exploitability, buka tiket remediasi dengan bukti — buat tiket butuh persetujuan manusia. Data security live tenant.',
        kind: 'recruitable',
        color: '#f43f5e',
        sortOrder: 6,
    },
    {
        id: 'cs-soon',
        name: 'Customer Service',
        role: 'CS WhatsApp',
        description: 'Balas pertanyaan pelanggan dan FAQ toko.',
        kind: 'coming_soon',
        color: '#a78bfa',
        sortOrder: 7,
    },
    {
        id: 'stok-soon',
        name: 'Stok & gudang',
        role: 'Asisten stok',
        description: 'Pantau stok, alert habis, dan restock.',
        kind: 'coming_soon',
        color: '#f59e0b',
        sortOrder: 8,
    },
    {
        id: 'facilities-soon',
        name: 'Facilities',
        role: 'Facilities Engineer',
        description: 'BMS / DCIM / SCADA telemetry dan work order — antrian F3-9.',
        kind: 'coming_soon',
        color: '#84cc16',
        sortOrder: 9,
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

/** Aligned with Agent Studio `finance` preset; draft journals/reports only — no auto-post. */
export const FINANCE_RECRUIT_AGENT_DEFAULTS = {
    name: 'Finance',
    baseSlug: FINANCE_RECRUIT_TEMPLATE_ID,
    role: 'Finance Analyst',
    persona:
        'You reconcile ledgers, flag anomalies and prepare reports. You never post journal entries without approval.',
    color: '#facc15',
    zone: 'research',
    deskId: 'research-1',
    modules: ['accounting', 'reports'],
    skills: ['Reconciliation', 'Forecasting'],
    tools: ['module.read', 'module.draft', 'db.query', 'report.generate', 'activity.log'],
    permissions: { accounting: 'draft', reports: 'read' } as Record<string, string>,
    runner: 'cloud' as const,
    guardrails: {
        denySend: true,
        denyShare: true,
        denyDelete: true,
        requireApproval: ['journal.post', 'write', 'send'],
        noAutoPostJournal: true,
    },
    status: 'active',
};

/** Aligned with Agent Studio `sales` preset; draft CRM updates and email follow-ups only — no auto-send. */
export const SALES_RECRUIT_AGENT_DEFAULTS = {
    name: 'Sales',
    baseSlug: SALES_RECRUIT_TEMPLATE_ID,
    role: 'Sales & Market Analyst',
    persona:
        'You enrich and score leads, watch competitors and draft follow-ups for the sales team to send.',
    color: '#fb7185',
    zone: 'research',
    deskId: 'research-1',
    modules: ['crm', 'news'],
    skills: ['Lead scoring', 'Market research'],
    tools: ['module.read', 'module.draft', 'web.search', 'email.draft', 'activity.log'],
    permissions: { crm: 'draft', news: 'read' } as Record<string, string>,
    runner: 'cloud' as const,
    guardrails: {
        denySend: true,
        denyShare: true,
        denyDelete: true,
        requireApproval: ['send'],
        draftsOnlyOutbound: true,
    },
    status: 'active',
};

/** Aligned with Agent Studio `devops` preset; pipeline/runbook triggers need approval — no auto-deploy. */
export const DEVOPS_RECRUIT_AGENT_DEFAULTS = {
    name: 'DevOps',
    baseSlug: DEVOPS_RECRUIT_TEMPLATE_ID,
    role: 'DevOps Engineer',
    persona:
        'You keep pipelines green and services healthy. Before any deployment or restart you run pre-checks and you attach logs to the related incident.',
    color: '#38bdf8',
    zone: 'engineering',
    deskId: 'eng-1-a',
    modules: ['devops', 'infrastructure', 'ops'],
    skills: ['CI/CD', 'Docker', 'Observability'],
    tools: ['module.read', 'module.draft', 'pipeline.trigger', 'runbook.execute', 'kb.search', 'activity.log'],
    permissions: { devops: 'draft', infrastructure: 'read', ops: 'draft' } as Record<string, string>,
    runner: 'cloud' as const,
    guardrails: {
        denySend: true,
        denyShare: true,
        denyDelete: true,
        requireApproval: ['pipeline.trigger', 'runbook.execute', 'deploy', 'write'],
        noAutoDeploy: true,
    },
    status: 'active',
};

/** Aligned with Agent Studio `security` preset; remediation tickets need approval — no auto-write. */
export const SECURITY_RECRUIT_AGENT_DEFAULTS = {
    name: 'Security',
    baseSlug: SECURITY_RECRUIT_TEMPLATE_ID,
    role: 'Security Analyst',
    persona:
        'You triage security findings by real exploitability and raise remediation tickets with clear evidence.',
    color: '#f43f5e',
    zone: 'engineering',
    deskId: 'eng-3-a',
    modules: ['security', 'infrastructure'],
    skills: ['Threat triage', 'CVE analysis'],
    tools: ['module.read', 'module.draft', 'kb.search', 'ticket.create', 'activity.log'],
    permissions: { security: 'draft', infrastructure: 'read' } as Record<string, string>,
    runner: 'cloud' as const,
    guardrails: {
        denySend: true,
        denyShare: true,
        denyDelete: true,
        requireApproval: ['ticket.create', 'write'],
        noAutoRemediation: true,
    },
    status: 'active',
};

export const RECRUIT_TEMPLATE_IDS = [
    KASIR_RECRUIT_TEMPLATE_ID,
    SERVICE_DESK_RECRUIT_TEMPLATE_ID,
    FINANCE_RECRUIT_TEMPLATE_ID,
    SALES_RECRUIT_TEMPLATE_ID,
    DEVOPS_RECRUIT_TEMPLATE_ID,
    SECURITY_RECRUIT_TEMPLATE_ID,
] as const;

export type RecruitTemplateId = (typeof RECRUIT_TEMPLATE_IDS)[number];

export function recruitDefaultsForTemplate(templateId: string) {
    if (templateId === KASIR_RECRUIT_TEMPLATE_ID) return KASIR_RECRUIT_AGENT_DEFAULTS;
    if (templateId === SERVICE_DESK_RECRUIT_TEMPLATE_ID) return SERVICE_DESK_RECRUIT_AGENT_DEFAULTS;
    if (templateId === FINANCE_RECRUIT_TEMPLATE_ID) return FINANCE_RECRUIT_AGENT_DEFAULTS;
    if (templateId === SALES_RECRUIT_TEMPLATE_ID) return SALES_RECRUIT_AGENT_DEFAULTS;
    if (templateId === DEVOPS_RECRUIT_TEMPLATE_ID) return DEVOPS_RECRUIT_AGENT_DEFAULTS;
    if (templateId === SECURITY_RECRUIT_TEMPLATE_ID) return SECURITY_RECRUIT_AGENT_DEFAULTS;
    return null;
}

export function isRecruitedSlug(baseSlug: string, slug: string): boolean {
    return slug === baseSlug || slug.startsWith(`${baseSlug}-`);
}
