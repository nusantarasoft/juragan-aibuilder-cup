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
        action: z.enum([
            'record_sale',
            'sales_report',
            'list_products',
            'check_stock',
            'confirm_sale',
            'cancel_sale',
            'umkm_help',
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

/** UMKM sales assistant — catat penjualan & laporan via WhatsApp (AIDLC guided-flow). */
export function defaultUmkmGuideFlowDefinition(): GuideFlowDefinition {
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
                content:
                    'Halo! Saya asisten penjualan UMKM Anda.\n\n' +
                    '*Menu* — balas angka:\n' +
                    '*1* Catat penjualan\n' +
                    '*2* Cek stok\n' +
                    '*3* Daftar barang\n' +
                    '*4* Laporan hari ini\n' +
                    '*5* Bantuan\n\n' +
                    'Atau ketik kalimat: *jual ...*, *cek stok*, *laporan*, *daftar barang*.',
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
                    // CS-style numbered menu (also mirrored in detectUmkmIntent)
                    { when: 'regex', pattern: '^1$', target: 'do_record' },
                    { when: 'regex', pattern: '^2$', target: 'do_stock' },
                    { when: 'regex', pattern: '^3$', target: 'do_list' },
                    { when: 'regex', pattern: '^4$', target: 'do_report' },
                    { when: 'regex', pattern: '^(0|5|9)$', target: 'help' },
                    { when: 'regex', pattern: '^(ya|iya|y|yes|benar|betul|ok|oke|okay|setuju|simpan|confirm|lanjut)$', target: 'do_confirm' },
                    { when: 'regex', pattern: '^(batal|batalkan|cancel|tidak|tdk|no|ngga|enggak|jangan)$', target: 'do_cancel' },
                    { when: 'keyword', value: 'daftar', target: 'do_list' },
                    { when: 'keyword', value: 'katalog', target: 'do_list' },
                    {
                        when: 'regex',
                        pattern:
                            '\\b(daftar\\s+barang|daftar\\s+produk|list\\s+produk|list\\s+barang|barang\\s+apa|produk\\s+apa)\\b',
                        target: 'do_list',
                    },
                    {
                        when: 'regex',
                        pattern: '\\b(cek\\s+stok|berapa\\s+stok|sisa\\s+stok|stock)\\b',
                        target: 'do_stock',
                    },
                    { when: 'keyword', value: 'stok', target: 'do_stock' },
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
                    { when: 'default', target: 'do_ask' },
                ],
            },
            { id: 'do_record', type: 'action', action: 'record_sale', next: 'listen_intent' },
            { id: 'do_confirm', type: 'action', action: 'confirm_sale', next: 'listen_intent' },
            { id: 'do_cancel', type: 'action', action: 'cancel_sale', next: 'listen_intent' },
            { id: 'do_report', type: 'action', action: 'sales_report', next: 'listen_intent' },
            { id: 'do_list', type: 'action', action: 'list_products', next: 'listen_intent' },
            { id: 'do_stock', type: 'action', action: 'check_stock', next: 'listen_intent' },
            {
                id: 'do_ask',
                type: 'rag',
                instruction:
                    'Jawab singkat dalam Bahasa Indonesia untuk pertanyaan UMKM seputar toko, produk, atau cara pakai asisten. ' +
                    'Gunakan konteks dokumen/notebook bila relevan. Jika tidak yakin, arahkan ke menu angka *1–5* atau ketik *bantuan*, *cek stok*, *laporan*, atau *jual ...*. ' +
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
        description: 'AIDLC: QU + konfirmasi jual, cek stok, laporan, tanya_umum RAG',
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
