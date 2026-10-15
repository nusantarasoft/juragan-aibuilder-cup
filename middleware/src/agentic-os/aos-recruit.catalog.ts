/** Server-side recruit catalog (F2-2). Enterprise templates stay in Agent Studio for platform admins only. */

export const TRIAL_MAX_RECRUITED_AGENTS = 3;

export const KASIR_RECRUIT_TEMPLATE_ID = 'umkm-kasir';

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
        id: 'pembukuan-soon',
        name: 'Pembukuan',
        role: 'Asisten pembukuan',
        description: 'Rekap transaksi dan laporan keuangan sederhana.',
        kind: 'coming_soon',
        color: '#38bdf8',
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
    runner: 'browser',
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
