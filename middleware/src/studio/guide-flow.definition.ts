import { z } from 'zod';
import {
    DEFAULT_UMKM_COMMANDS,
    escapeRegexToken,
    formatWelcomeFromCommands,
    resolveUmkmCommands,
    umkmIntentToListenTarget,
    uniqueMenuForDisplay,
    type UmkmCommandsConfig,
    type UmkmCommandIntent,
    type UmkmPendampingDisplayOpts,
} from './studio-umkm-commands';

const transitionSchema = z.discriminatedUnion('when', [
    z.object({ when: z.literal('keyword'), value: z.string(), target: z.string() }),
    z.object({ when: z.literal('regex'), pattern: z.string(), target: z.string() }),
    z.object({ when: z.literal('default'), target: z.string() }),
]);

export const guideFlowNodeSchema = z.discriminatedUnion('type', [
    z.object({ id: z.string().min(1), type: z.literal('start'), next: z.string().min(1) }),
    z.object({ id: z.string().min(1), type: z.literal('message'), content: z.string(), next: z.string().min(1) }),
    z.object({
        id: z.string().min(1),
        type: z.literal('listen'),
        transitions: z.array(transitionSchema).min(1),
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal('rag'),
        instruction: z.string().min(1),
        next: z.string().min(1),
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal('sql'),
        sql: z.string().min(1),
        context: z.array(z.string()).optional(),
        next: z.string().min(1),
    }),
    z.object({
        id: z.string().min(1),
        type: z.literal('action'),
        action: z.enum([
            'record_sale',
            'sales_report',
            'list_products',
            'check_stock',
            'confirm_sale',
            'cancel_sale',
            'umkm_help',
            'menu_hub',
            'purchase_hub',
            'report_hub',
            'add_product',
            'add_stock',
            'list_purchases',
            'record_purchase',
            'list_sales',
        ]),
        next: z.string().min(1),
    }),
    z.object({ id: z.string().min(1), type: z.literal('end') }),
]);

export const guideFlowMetaSchema = z.object({
    flowKind: z.enum(['rag_qa', 'umkm', 'custom']).optional(),
    description: z.string().optional(),
});

export const guideFlowDefinitionSchema = z.object({
    version: z.literal(1),
    startNodeId: z.string().min(1),
    nodes: z.array(guideFlowNodeSchema).min(1),
    meta: guideFlowMetaSchema.optional(),
});

export type GuideFlowDefinition = z.infer<typeof guideFlowDefinitionSchema>;
export type GuideFlowNode = z.infer<typeof guideFlowNodeSchema>;
export type GuideFlowTransition = GuideFlowNode extends { type: 'listen'; transitions: infer T }
    ? T extends (infer U)[]
        ? U
        : never
    : never;

export function parseGuideFlowDefinition(raw: unknown): GuideFlowDefinition {
    return guideFlowDefinitionSchema.parse(raw);
}

export function safeParseGuideFlowDefinition(raw: unknown) {
    return guideFlowDefinitionSchema.safeParse(raw);
}

/** Minimal valid graph for new flows — simulator-friendly. */
export function defaultGuideFlowDefinition(): GuideFlowDefinition {
    return {
        version: 1,
        startNodeId: 'start',
        meta: { flowKind: 'rag_qa', description: 'RAG Q&A loop dengan listen → rag → follow-up' },
        nodes: [
            { id: 'start', type: 'start', next: 'welcome' },
            {
                id: 'welcome',
                type: 'message',
                content: 'Halo! Saya asisten dari basis pengetahuan ini. Ada yang bisa dibantu?',
                next: 'listen_main',
            },
            {
                id: 'listen_main',
                type: 'listen',
                transitions: [
                    { when: 'keyword', value: 'bye', target: 'goodbye' },
                    { when: 'default', target: 'rag_answer' },
                ],
            },
            {
                id: 'rag_answer',
                type: 'rag',
                instruction:
                    'Jawab pertanyaan pelanggan hanya berdasarkan dokumen sumber. ' +
                    'Jika tidak ada di sumber, katakan jujur. ' +
                    'Pertanyaan (sudah dinormalisasi/ditulis ulang bila tersedia):\n{{lastUserMessage}}',
                next: 'after_rag',
            },
            {
                id: 'after_rag',
                type: 'message',
                content: 'Ada lagi yang ingin Anda tanyakan?',
                next: 'listen_main',
            },
            {
                id: 'goodbye',
                type: 'message',
                content: 'Terima kasih. Sampai jumpa!',
                next: 'end',
            },
            { id: 'end', type: 'end' },
        ],
    };
}

type ListenTransition =
    | { when: 'keyword'; value: string; target: string }
    | { when: 'regex'; pattern: string; target: string }
    | { when: 'default'; target: string };

function buildKeywordAlternation(keywords: string[]): string | null {
    const cleaned = keywords.map((k) => k.trim()).filter(Boolean);
    if (!cleaned.length) return null;
    return cleaned
        .map((k) => {
            const escaped = escapeRegexToken(k);
            if (!/\s/.test(k)) return `\\b${escaped}\\b`;
            return escaped;
        })
        .join('|');
}

/** Build listen transitions from configurable UMKM commands. */
export function buildUmkmListenTransitions(commands: UmkmCommandsConfig): ListenTransition[] {
    const transitions: ListenTransition[] = [
        { when: 'keyword', value: 'bye', target: 'goodbye' },
    ];

    const menu = uniqueMenuForDisplay(commands);
    for (const m of menu) {
        transitions.push({
            when: 'regex',
            pattern: `^${escapeRegexToken(m.digit)}$`,
            target: umkmIntentToListenTarget(m.intent),
        });
    }

    const confirmWords = commands.confirm.filter((c) => !/^[0-9]$/.test(c));
    const cancelWords = commands.cancel.filter((c) => !/^[0-9]$/.test(c));
    const confirmAlt = buildKeywordAlternation(confirmWords);
    const cancelAlt = buildKeywordAlternation(cancelWords);
    if (confirmAlt) {
        transitions.push({ when: 'regex', pattern: `^(?:${confirmAlt})$`, target: 'do_confirm' });
    }
    if (cancelAlt) {
        transitions.push({ when: 'regex', pattern: `^(?:${cancelAlt})$`, target: 'do_cancel' });
    }

    const intentOrder: UmkmCommandIntent[] = [
        'add_product',
        'add_stock',
        'check_stock',
        'record_purchase',
        'list_purchases',
        'list_sales',
        'record_sale',
        'list_products',
        'sales_report',
        'menu_hub',
        'purchase_hub',
        'report_hub',
        'ask',
        'help',
    ];
    for (const intent of intentOrder) {
        const kws = commands.keywords[intent] || [];
        const alt = buildKeywordAlternation(kws);
        if (!alt) continue;
        transitions.push({
            when: 'regex',
            pattern: `(?:${alt})`,
            target: umkmIntentToListenTarget(intent),
        });
    }

    transitions.push({ when: 'default', target: 'do_ask' });
    return transitions;
}

/** UMKM sales assistant — catat penjualan & laporan via WhatsApp (AIDLC guided-flow). */
export function defaultUmkmGuideFlowDefinition(
    commands?: UmkmCommandsConfig | unknown,
    opts?: UmkmPendampingDisplayOpts,
): GuideFlowDefinition {
    const cfg = resolveUmkmCommands(commands ?? DEFAULT_UMKM_COMMANDS);
    const menuDigits = uniqueMenuForDisplay(cfg)
        .map((m) => m.digit)
        .join(', ');
    /* v8 ignore start -- keyword lists are always present after resolveUmkmCommands(); the `|| []` is a type-guard */
    const helpKw = (cfg.keywords.help || [])[0] || 'bantuan';
    const saleKw = (cfg.keywords.record_sale || [])[0] || 'jual';
    const stockKw = (cfg.keywords.add_stock || [])[0] || 'tambah stok';
    const reportKw = (cfg.keywords.sales_report || [])[0] || 'laporan';
    /* v8 ignore stop */

    return {
        version: 1,
        startNodeId: 'start',
        meta: {
            flowKind: 'umkm',
            description:
                'AIDLC UMKM: parse → preview konfirmasi → commit; cek stok; laporan via WhatsApp',
        },
        nodes: [
            { id: 'start', type: 'start', next: 'welcome' },
            {
                id: 'welcome',
                type: 'message',
                content: formatWelcomeFromCommands(cfg, opts),
                next: 'listen_intent',
            },
            {
                id: 'listen_intent',
                type: 'listen',
                transitions: buildUmkmListenTransitions(cfg),
            },
            { id: 'do_record', type: 'action', action: 'record_sale', next: 'listen_intent' },
            { id: 'do_confirm', type: 'action', action: 'confirm_sale', next: 'listen_intent' },
            { id: 'do_cancel', type: 'action', action: 'cancel_sale', next: 'listen_intent' },
            { id: 'do_report', type: 'action', action: 'sales_report', next: 'listen_intent' },
            { id: 'do_list', type: 'action', action: 'list_products', next: 'listen_intent' },
            { id: 'do_stock', type: 'action', action: 'check_stock', next: 'listen_intent' },
            { id: 'do_menu_hub', type: 'action', action: 'menu_hub', next: 'listen_intent' },
            { id: 'do_purchase_hub', type: 'action', action: 'purchase_hub', next: 'listen_intent' },
            { id: 'do_report_hub', type: 'action', action: 'report_hub', next: 'listen_intent' },
            { id: 'do_add_product', type: 'action', action: 'add_product', next: 'listen_intent' },
            { id: 'do_add_stock', type: 'action', action: 'add_stock', next: 'listen_intent' },
            { id: 'do_list_purchases', type: 'action', action: 'list_purchases', next: 'listen_intent' },
            { id: 'do_record_purchase', type: 'action', action: 'record_purchase', next: 'listen_intent' },
            { id: 'do_list_sales', type: 'action', action: 'list_sales', next: 'listen_intent' },
            {
                id: 'do_ask',
                type: 'rag',
                instruction:
                    'Jawab singkat dalam Bahasa Indonesia. Gunakan data toko dari tool (stok/penjualan/belanja/laporan/katalog) dan dokumen notebook bila relevan. ' +
                    'Jangan mengarang angka. Jika user ingin mencatat transaksi, arahkan ke menu angka — jangan mengeksekusi aksi tulis. ' +
                    `Menu: ${menuDigits || 'lihat bantuan'}; *${helpKw}*, *${stockKw}*, *${reportKw}*, atau *${saleKw} ...*. ` +
                    'Pertanyaan: {{rewrittenQuery}}',
                next: 'listen_intent',
            },
            { id: 'help', type: 'action', action: 'umkm_help', next: 'listen_intent' },
            {
                id: 'goodbye',
                type: 'message',
                content: 'Terima kasih. Semoga laris manis!',
                next: 'end',
            },
            { id: 'end', type: 'end' },
        ],
    };
}

export function validateGuideFlowGraph(def: GuideFlowDefinition): void {
    const byId = new Map(def.nodes.map((n) => [n.id, n]));
    if (!byId.has(def.startNodeId)) {
        throw new Error(`startNodeId "${def.startNodeId}" not found in nodes`);
    }
    for (const node of def.nodes) {
        if (node.type === 'listen') {
            const hasDefault = node.transitions.some((t) => t.when === 'default');
            if (!hasDefault) {
                throw new Error(`listen node "${node.id}" must include a default transition`);
            }
        }
    }
    const targets = new Set<string>();
    for (const node of def.nodes) {
        if (node.type === 'start') targets.add(node.next);
        if (node.type === 'message') targets.add(node.next);
        if (node.type === 'rag') targets.add(node.next);
        if (node.type === 'sql') targets.add(node.next);
        if (node.type === 'action') targets.add(node.next);
        if (node.type === 'listen') {
            for (const t of node.transitions) targets.add(t.target);
        }
    }
    for (const t of targets) {
        if (!byId.has(t)) {
            throw new Error(`Transition target "${t}" does not match any node id`);
        }
    }
}

export type GuideFlowTemplateKind = 'rag_qa' | 'umkm' | 'blank';

export const GUIDE_FLOW_TEMPLATES: Record<
    GuideFlowTemplateKind,
    { label: string; description: string; definition: () => GuideFlowDefinition }
> = {
    rag_qa: {
        label: 'RAG Q&A',
        description: 'State machine: welcome → listen → RAG → loop (best practice untuk notebook dokumen)',
        definition: defaultGuideFlowDefinition,
    },
    umkm: {
        label: 'UMKM Penjualan',
        description: 'AIDLC: QU + konfirmasi jual, cek stok, laporan, tanya_umum agentic RAG',
        definition: defaultUmkmGuideFlowDefinition,
    },
    blank: {
        label: 'Kosong',
        description: 'Minimal start → message → listen → end — susun sendiri',
        definition: () => ({
            version: 1 as const,
            startNodeId: 'start',
            meta: { flowKind: 'custom' as const, description: 'Custom flow' },
            nodes: [
                { id: 'start', type: 'start' as const, next: 'welcome' },
                { id: 'welcome', type: 'message' as const, content: 'Halo!', next: 'listen_main' },
                {
                    id: 'listen_main',
                    type: 'listen' as const,
                    transitions: [{ when: 'default' as const, target: 'end' }],
                },
                { id: 'end', type: 'end' as const },
            ],
        }),
    },
};

export function getGuideFlowTemplate(kind: GuideFlowTemplateKind): GuideFlowDefinition {
    return GUIDE_FLOW_TEMPLATES[kind].definition();
}
