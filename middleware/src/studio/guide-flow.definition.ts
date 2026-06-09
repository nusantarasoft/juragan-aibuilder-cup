import { z } from 'zod';

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
        action: z.enum(['record_sale', 'sales_report', 'list_products', 'umkm_help']),
        next: z.string().min(1),
    }),
    z.object({ id: z.string().min(1), type: z.literal('end') }),
]);

export const guideFlowDefinitionSchema = z.object({
    version: z.literal(1),
    startNodeId: z.string().min(1),
    nodes: z.array(guideFlowNodeSchema).min(1),
});

export type GuideFlowDefinition = z.infer<typeof guideFlowDefinitionSchema>;
export type GuideFlowNode = z.infer<typeof guideFlowNodeSchema>;

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

/** UMKM sales assistant — catat penjualan & laporan via WhatsApp. */
export function defaultUmkmGuideFlowDefinition(): GuideFlowDefinition {
    return {
        version: 1,
        startNodeId: 'start',
        nodes: [
            { id: 'start', type: 'start', next: 'welcome' },
            {
                id: 'welcome',
                type: 'message',
                content:
                    'Halo! Saya asisten penjualan UMKM Anda.\n\n' +
                    '• Ketik *jual ...* untuk catat penjualan\n' +
                    '• Ketik *daftar barang* untuk katalog produk\n' +
                    '• Ketik *laporan* untuk rekap hari ini\n' +
                    '• Ketik *bantuan* untuk contoh format',
                next: 'listen_intent',
            },
            {
                id: 'listen_intent',
                type: 'listen',
                transitions: [
                    { when: 'keyword', value: 'bye', target: 'goodbye' },
                    { when: 'keyword', value: 'bantuan', target: 'help' },
                    { when: 'keyword', value: 'help', target: 'help' },
                    { when: 'keyword', value: 'menu', target: 'help' },
                    { when: 'keyword', value: 'daftar', target: 'do_list' },
                    { when: 'keyword', value: 'katalog', target: 'do_list' },
                    { when: 'keyword', value: 'produk', target: 'do_list' },
                    { when: 'keyword', value: 'stok', target: 'do_list' },
                    {
                        when: 'regex',
                        pattern:
                            '\\b(daftar\\s+barang|daftar\\s+produk|list\\s+produk|list\\s+barang|barang\\s+apa|produk\\s+apa)\\b',
                        target: 'do_list',
                    },
                    { when: 'keyword', value: 'laporan', target: 'do_report' },
                    { when: 'keyword', value: 'laporkan', target: 'do_report' },
                    { when: 'keyword', value: 'rekap', target: 'do_report' },
                    { when: 'keyword', value: 'ringkasan', target: 'do_report' },
                    { when: 'keyword', value: 'omzet', target: 'do_report' },
                    { when: 'keyword', value: 'omset', target: 'do_report' },
                    {
                        when: 'regex',
                        pattern:
                            '\\b(penjualan\\s+hari\\s+ini|berapa\\s+(?:penjualan|omzet|omset|jualan)|total\\s+penjualan)\\b',
                        target: 'do_report',
                    },
                    { when: 'regex', pattern: '\\b(jual|jualan|catat|order|transaksi)\\b', target: 'do_record' },
                    { when: 'default', target: 'help' },
                ],
            },
            { id: 'do_record', type: 'action', action: 'record_sale', next: 'listen_intent' },
            { id: 'do_report', type: 'action', action: 'sales_report', next: 'listen_intent' },
            { id: 'do_list', type: 'action', action: 'list_products', next: 'listen_intent' },
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
