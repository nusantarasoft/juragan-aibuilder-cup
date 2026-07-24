/**
 * PO scenarios — Simulasi chat WA (tanpa WAHA), coverage penuh pipeline inbound.
 *
 * Target 100% statements/branches pada:
 *   - simulateInboundMessage
 *   - processInboundCore
 * plus matriks perintah UMKM lewat jalur yang sama dengan WA live.
 */
import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { StudioWhatsAppService } from './studio-whatsapp.service';
import { DEFAULT_STUDIO_UMKM_CONTEXT } from './studio-umkm.service';
import { makeUmkmService } from './studio-umkm-test-harness';

const TENANT = 'toko-sim';
const NOTEBOOK = 'nb-sim';
const PHONE = '6281111000001';

type SimOpts = {
    enabled?: boolean;
    useGuidedFlow?: boolean;
    notebookId?: string | null;
    /** Override tenant_id di notebook context (untuk mismatch warning). */
    notebookTenantId?: string;
    umkmMode?: boolean;
    rateLimitPerMinute?: number;
    publishedFlow?: { id: string } | null;
    guidedStart?: {
        conversationId: string;
        replies: { content: string }[];
        waitingForInput: boolean;
    };
    guidedTurnReplies?: { content: string }[];
    /** Existing guide_flow on conversation (for mismatch / ended). */
    convGuide?: { guide_flow_id: string | null; guide_flow_node_id: string | null };
};

function makeSim(opts?: SimOpts) {
    const { svc: umkm, createItem, createStockMovement } = makeUmkmService();
    const enabled = opts?.enabled ?? true;
    const useGuidedFlow = opts?.useGuidedFlow ?? false;
    const notebookId = opts?.notebookId === undefined ? NOTEBOOK : opts.notebookId;
    const umkmMode = opts?.umkmMode ?? true;
    const notebookTenantId = opts?.notebookTenantId ?? TENANT;
    const rateLimit = opts?.rateLimitPerMinute ?? 60;
    const publishedFlow = opts?.publishedFlow === undefined ? null : opts.publishedFlow;
    const guidedStart = opts?.guidedStart ?? {
        conversationId: 'conv-guided-new',
        replies: [{ content: 'Halo guided' }],
        waitingForInput: true,
    };
    const guidedTurnReplies = opts?.guidedTurnReplies ?? [{ content: 'Guided jawab jual' }];
    const convGuide = opts?.convGuide ?? { guide_flow_id: null, guide_flow_node_id: null };

    const configRow = {
        tenant_id: TENANT,
        notebook_id: notebookId,
        waha_session: 'default',
        business_phone: null as string | null,
        label: 'Toko Sim',
        enabled,
        allowlist_phones: [PHONE],
        use_guided_flow: useGuidedFlow,
    };

    const sessions = new Map<string, string>();
    let convSeq = 0;

    const supabase = {
        getAdminClient: () => ({
            from: (table: string) => {
                if (table === 'studio_whatsapp_config') {
                    const b: any = {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn().mockReturnThis(),
                        order: vi.fn().mockResolvedValue({ data: [configRow], error: null }),
                        maybeSingle: vi.fn().mockResolvedValue({
                            data: configRow.enabled && configRow.notebook_id ? configRow : null,
                            error: null,
                        }),
                    };
                    // When enabled=false but notebook set, getConfig still returns row —
                    // simulateInbound checks enabled && notebook_id
                    if (!enabled || !notebookId) {
                        b.maybeSingle = vi.fn().mockResolvedValue({
                            data: { ...configRow, enabled, notebook_id: notebookId },
                            error: null,
                        });
                    }
                    return b;
                }
                if (table === 'studio_whatsapp_sessions') {
                    const state: { chatId?: string } = {};
                    const b: any = {
                        select: vi.fn().mockReturnThis(),
                        eq: vi.fn((col: string, val: string) => {
                            if (col === 'chat_id') state.chatId = val;
                            return b;
                        }),
                        maybeSingle: vi.fn(async () => {
                            const id = state.chatId ? sessions.get(state.chatId) : undefined;
                            return {
                                data: id ? { conversation_id: id } : null,
                                error: null,
                            };
                        }),
                        insert: vi.fn(async (row: { chat_id: string; conversation_id: string }) => {
                            sessions.set(row.chat_id, row.conversation_id);
                            return { data: row, error: null };
                        }),
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                eq: vi.fn().mockResolvedValue({ data: null, error: null }),
                            }),
                        }),
                    };
                    return b;
                }
                if (table === 'studio_conversations') {
                    return {
                        insert: vi.fn((row: Record<string, unknown>) => ({
                            select: vi.fn().mockReturnValue({
                                single: vi.fn(async () => {
                                    convSeq += 1;
                                    return {
                                        data: { id: `conv-sim-${convSeq}`, ...row },
                                        error: null,
                                    };
                                }),
                            }),
                        })),
                        delete: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({ error: null }),
                        }),
                        select: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                single: vi.fn().mockResolvedValue({
                                    data: convGuide,
                                    error: null,
                                }),
                            }),
                        }),
                    };
                }
                const empty: any = {};
                for (const k of ['select', 'eq', 'order', 'limit', 'insert', 'update']) {
                    empty[k] = vi.fn().mockReturnValue(empty);
                }
                empty.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
                empty.single = vi.fn().mockResolvedValue({ data: null, error: null });
                empty.then = (r: (v: unknown) => unknown) => r({ data: [], error: null });
                return empty;
            },
        }),
    };

    const wahaSend = vi.fn(async () => ({ success: true }));
    const studioChat = vi.fn(async () => ({ answer: 'RAG-FALLBACK', conversationId: 'c-rag' }));
    const startGuidedSession = vi.fn(async () => guidedStart);
    const guidedChatTurn = vi.fn(async () => ({
        replies: guidedTurnReplies,
        waitingForInput: true,
    }));
    const getPublishedFlowForNotebook = vi.fn(async () => publishedFlow);

    const wa = new StudioWhatsAppService(
        {
            get: (key: string) =>
                key === 'STUDIO_WHATSAPP_RATE_LIMIT_PER_MINUTE' ? String(rateLimit) : undefined,
        } as any,
        supabase as any,
        {
            sendText: wahaSend,
            defaultSession: 'default',
            phoneToChatId: (p: string) => `${p}@c.us`,
            downloadMedia: vi.fn(async () => null),
        } as any,
        {
            getNotebook: vi.fn(async () => ({
                id: NOTEBOOK,
                context_config: {
                    ...DEFAULT_STUDIO_UMKM_CONTEXT,
                    umkm_mode: umkmMode,
                    tenant_id: notebookTenantId,
                },
            })),
            chat: studioChat,
            appendStudioMessage: vi.fn(),
        } as any,
        {
            getPublishedFlowForNotebook,
            startGuidedSession,
            guidedChatTurn,
        } as any,
        {
            parseConfig: (raw: unknown) =>
                raw && typeof raw === 'object' ? { ...(raw as object) } : {},
        } as any,
        umkm,
    );

    const chat = (message: string, phone = PHONE) =>
        wa.simulateInboundMessage({ tenantId: TENANT, message, phone });

    /** Akses processInboundCore untuk branch rate-limit / enforce. */
    const core = (overrides?: {
        enforceRateLimit?: boolean;
        chatId?: string;
        question?: string;
        phone?: string;
        displayName?: string;
        message?: string;
    }) =>
        (wa as any).processInboundCore({
            config: configRow,
            phone: overrides?.phone || PHONE,
            chatId: overrides?.chatId || `sim:${TENANT}:${PHONE}`,
            question: overrides?.question || overrides?.message || 'ping',
            displayName: overrides?.displayName || 'Simulator WA',
            feedbackProvider: 'whatsapp_sim',
            enforceRateLimit: overrides?.enforceRateLimit ?? false,
        });

    return {
        wa,
        umkm,
        chat,
        core,
        createItem,
        createStockMovement,
        wahaSend,
        studioChat,
        sessions,
        startGuidedSession,
        guidedChatTurn,
        getPublishedFlowForNotebook,
        configRow,
    };
}

describe('PO — simulasi WA: validasi & path core', () => {
    it('V1: tenant kosong / message kosong / phone pendek → BadRequest', async () => {
        const { wa } = makeSim();
        await expect(wa.simulateInboundMessage({ tenantId: '', message: 'x' })).rejects.toThrow(
            /tenantId/i,
        );
        await expect(wa.simulateInboundMessage({ tenantId: TENANT, message: '  ' })).rejects.toThrow(
            /message/i,
        );
        await expect(
            wa.simulateInboundMessage({ tenantId: TENANT, message: 'jual', phone: '12' }),
        ).rejects.toThrow(/phone/i);
    });

    it('V2: UMKM nonaktif / tanpa notebook → BadRequest', async () => {
        const a = makeSim({ enabled: false });
        await expect(a.chat('jual')).rejects.toBeInstanceOf(BadRequestException);
        const b = makeSim({ notebookId: null });
        await expect(b.chat('jual')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('V3: rate limit enforce → pesan tunggu (path umkm, tanpa session)', async () => {
        const { core } = makeSim({ rateLimitPerMinute: 1 });
        const first = await core({ enforceRateLimit: true, question: 'jual' });
        expect(first.answer).toMatch(/Konfirmasi|Barang|Siap|jual|catat/i);
        const second = await core({ enforceRateLimit: true, question: 'jual' });
        expect(second.answer).toMatch(/Terlalu banyak|tunggu/i);
        expect(second.conversationId).toBe('');
    });

    it('V4: tenant notebook mismatch → tetap jalan + path umkm', async () => {
        const { chat } = makeSim({ notebookTenantId: 'other-tenant' });
        const r = await chat('daftar barang');
        expect(r.path).toBe('umkm');
        expect(r.answer).toMatch(/Daftar Barang|Bakso/i);
    });

    it('V5: umkm_mode off → path rag', async () => {
        const { chat, studioChat } = makeSim({ umkmMode: false });
        const r = await chat('halo apa kabar');
        expect(r.path).toBe('rag');
        expect(r.answer).toBe('RAG-FALLBACK');
        expect(studioChat).toHaveBeenCalled();
    });

    it('V6: ask intent (handleMessage null) → fallback RAG', async () => {
        const { chat, studioChat } = makeSim();
        // "tanya" → ask → handleMessage returns null → RAG
        const r = await chat('tanya');
        expect(r.path).toBe('rag');
        expect(studioChat).toHaveBeenCalled();
        expect(r.answer).toBe('RAG-FALLBACK');
    });

    it('V7: guided flow ON + no published flow → RAG via guided branch', async () => {
        const { chat, studioChat, getPublishedFlowForNotebook } = makeSim({
            useGuidedFlow: true,
            publishedFlow: null,
        });
        const r = await chat('jual 1 bakso');
        expect(r.path).toBe('guided');
        expect(getPublishedFlowForNotebook).toHaveBeenCalled();
        expect(studioChat).toHaveBeenCalled();
        expect(r.answer).toBe('RAG-FALLBACK');
    });

    it('V8: guided flow ON + published → start + turn', async () => {
        const { chat, startGuidedSession, guidedChatTurn } = makeSim({
            useGuidedFlow: true,
            publishedFlow: { id: 'flow-1' },
            convGuide: { guide_flow_id: null, guide_flow_node_id: null },
        });
        const r = await chat('jual 1 bakso');
        expect(r.path).toBe('guided');
        expect(startGuidedSession).toHaveBeenCalled();
        expect(guidedChatTurn).toHaveBeenCalled();
        expect(r.answer).toMatch(/Halo guided/);
        expect(r.answer).toMatch(/Guided jawab/);
    });

    it('V9: guided start tidak waiting → hanya intro', async () => {
        const { chat, guidedChatTurn } = makeSim({
            useGuidedFlow: true,
            publishedFlow: { id: 'flow-1' },
            guidedStart: {
                conversationId: 'conv-end',
                replies: [{ content: 'Selesai' }],
                waitingForInput: false,
            },
        });
        const r = await chat('halo');
        expect(r.path).toBe('guided');
        expect(r.answer).toBe('Selesai');
        expect(guidedChatTurn).not.toHaveBeenCalled();
    });

    it('V10: guided flow mismatch → restart session', async () => {
        const { chat, startGuidedSession } = makeSim({
            useGuidedFlow: true,
            publishedFlow: { id: 'flow-new' },
            convGuide: { guide_flow_id: 'flow-old', guide_flow_node_id: 'n1' },
            guidedStart: {
                conversationId: 'conv-restart',
                replies: [{ content: 'Restart' }],
                waitingForInput: true,
            },
        });
        // First message creates session; second hits existing conv with mismatch when guided reads conv
        const r = await chat('jual');
        expect(r.path).toBe('guided');
        expect(startGuidedSession).toHaveBeenCalled();
        expect(r.answer).toMatch(/Restart/);
    });

    it('V11: feedback "ok" saat ada pending sale → konfirmasi jual (bukan feedback path)', async () => {
        const { chat } = makeSim();
        await chat('jual 1 bakso 18000');
        const r = await chat('ok');
        // "ok" is confirm — should commit, not feedback thanks
        expect(r.path).toBe('umkm');
        expect(r.answer).toMatch(/tercatat|WA-/i);
    });

    it('V13: RAG/chat answer kosong → string kosong (umkm ask + non-umkm)', async () => {
        const a = makeSim();
        a.studioChat.mockResolvedValueOnce({ answer: '', conversationId: 'c' });
        const r1 = await a.chat('tanya');
        expect(r1.path).toBe('rag');
        expect(r1.answer).toBe('');

        const b = makeSim({ umkmMode: false });
        b.studioChat.mockResolvedValueOnce({ answer: '', conversationId: 'c' });
        const r2 = await b.chat('halo');
        expect(r2.path).toBe('rag');
        expect(r2.answer).toBe('');
    });

    it('V14: guided empty replies → "..." ; flowEnded restart', async () => {
        const empty = makeSim({
            useGuidedFlow: true,
            publishedFlow: { id: 'flow-1' },
            guidedStart: {
                conversationId: 'conv-same',
                replies: [{ content: '' }, { content: 'Hi' }],
                waitingForInput: true,
            },
            guidedTurnReplies: [{ content: '' }],
        });
        // Pre-seed session so start keeps/changes conversation
        const r = await empty.chat('x');
        expect(r.path).toBe('guided');
        expect(r.answer).toMatch(/Hi/);

        const ended = makeSim({
            useGuidedFlow: true,
            publishedFlow: { id: 'flow-1' },
            convGuide: { guide_flow_id: 'flow-1', guide_flow_node_id: null },
            guidedStart: {
                conversationId: 'conv-ended-new',
                replies: [],
                waitingForInput: false,
            },
        });
        const r2 = await ended.chat('lanjut');
        expect(r2.path).toBe('guided');
        expect(r2.answer).toBe('...');
    });

    it('V15: resolveSession non-sim title branches (displayName / phone only)', async () => {
        const { core } = makeSim();
        const withName = await core({
            chatId: '6285555000001@c.us',
            phone: '6285555000001',
            displayName: 'Bu Ani',
            question: 'bantuan',
        });
        expect(withName.conversationId).toBeTruthy();

        const noName = await core({
            chatId: '6285555000002@c.us',
            phone: '6285555000002',
            displayName: '',
            question: 'bantuan',
        });
        expect(noName.conversationId).toBeTruthy();
        expect(noName.conversationId).not.toBe(withName.conversationId);
    });

    it('V16: guided no published flow + empty RAG answer', async () => {
        const { chat, studioChat } = makeSim({
            useGuidedFlow: true,
            publishedFlow: null,
        });
        studioChat.mockResolvedValueOnce({ answer: '', conversationId: 'c' });
        const r = await chat('apa');
        expect(r.path).toBe('guided');
        expect(r.answer).toBe('');
    });
});

describe('PO — simulasi WA: matriks perintah UMKM', () => {
    it('M1: jual one-shot + batal pending', async () => {
        const { chat } = makeSim();
        await chat('jual 2 bakso');
        const cancel = await chat('batal');
        expect(cancel.answer).toMatch(/batal|Dibatalkan/i);
    });

    it('M2: jual override harga', async () => {
        const { chat } = makeSim();
        const r = await chat('jual 1 bakso 14000');
        expect(r.answer).toMatch(/14\.000|14000/);
        expect(r.answer).not.toMatch(/18\.000|18000/);
    });

    it('M3: cek stok bakso langsung + miss', async () => {
        const { chat } = makeSim();
        expect((await chat('cek stok bakso')).answer).toMatch(/Bakso/i);
        expect((await chat('cek stok xyzabc999')).answer).toMatch(/tidak ditemukan|Tidak ditemukan|belum/i);
    });

    it('M4: laporan soft + laporan hari ini', async () => {
        const { chat } = makeSim();
        const soft = await chat('laporan');
        expect(soft.answer).toMatch(/hari ini|minggu|bulan/i);
        const day = await chat('hari ini');
        expect(day.answer).toMatch(/Laporan/i);
        const direct = await chat('laporan hari ini');
        expect(direct.answer).toMatch(/Laporan/i);
    });

    it('M5: daftar barang / penjualan / belanja', async () => {
        const { chat } = makeSim();
        expect((await chat('daftar barang')).answer).toMatch(/Daftar Barang|Bakso/i);
        expect((await chat('daftar penjualan')).answer).toMatch(/penjualan|Total|belum|WA/i);
        expect((await chat('daftar belanja')).answer).toMatch(/belanja|Total|belum|BL/i);
    });

    it('M6: tambah stok match + miss', async () => {
        const okSim = makeSim();
        const ok = await okSim.chat('tambah stok mie 5');
        expect(ok.answer).toMatch(/Stok|Mie Ayam|\+5/i);
        expect(okSim.createStockMovement).toHaveBeenCalled();

        const missSim = makeSim();
        const miss = await missSim.chat('tambah stok baranganeh 3');
        expect(miss.answer).toMatch(/tidak ditemukan/i);
    });

    it('M7: belanja one-shot → ya', async () => {
        const { chat } = makeSim();
        const preview = await chat('belanja 5 bakso @3000');
        expect(preview.answer).toMatch(/Konfirmasi belanja/i);
        expect(preview.answer).toMatch(/15\.000|15000/);
        const done = await chat('ya');
        expect(done.answer).toMatch(/tercatat|Belanja|BL-/i);
    });

    it('M8: help + menu digit 0', async () => {
        const { chat } = makeSim();
        expect((await chat('bantuan')).answer).toMatch(/bantuan|\*1\*|\*5\*|jual/i);
        expect((await chat('0')).answer).toMatch(/bantuan|\*1\*|menu/i);
    });

    it('M9: hubs menu / belanja / laporan (digit)', async () => {
        const { chat } = makeSim();
        expect((await chat('2')).answer).toMatch(/Menu|daftar|tambah/i);
        expect((await chat('batal')).answer).toMatch(/batal|Dibatalkan/i);
        expect((await chat('3')).answer).toMatch(/Belanja|daftar|tambah/i);
        expect((await chat('batal')).answer).toMatch(/batal|Dibatalkan/i);
        expect((await chat('6')).answer).toMatch(/Laporan|hari|minggu|bulan/i);
    });

    it('M11: digit 4 daftar penjualan + digit 5 mulai jual', async () => {
        const { chat } = makeSim();
        expect((await chat('4')).answer).toMatch(/penjualan|Total|belum|WA/i);
        expect((await chat('5')).answer).toMatch(/Barang apa|Siap catat|jual/i);
    });

    it('M12: purchase hub digit 3 + batal; cek stok semua eksplisit', async () => {
        const a = makeSim();
        expect((await a.chat('3')).answer).toMatch(/Belanja|daftar|tambah/i);
        expect((await a.chat('batal')).answer).toMatch(/batal|Dibatalkan/i);
        const b = makeSim();
        expect((await b.chat('cek stok semua')).answer).toMatch(/Cek Stok|Bakso|Mie/i);
    });

    it('M13: jual multi-turn full commit (katalog skip harga)', async () => {
        const { chat } = makeSim();
        await chat('jual');
        await chat('es teh');
        const preview = await chat('2');
        expect(preview.answer).toMatch(/Konfirmasi penjualan/i);
        expect(preview.answer).toMatch(/10\.000|10000/);
        const done = await chat('ya');
        expect(done.answer).toMatch(/tercatat|WA-/i);
    });
});

describe('PO — simulasi WA: apple-to-apple & isolasi', () => {
    it('A1: sim answer ≡ handleMessage untuk jual katalog', async () => {
        const { chat, umkm } = makeSim();
        const msg = 'jual 2 mie ayam';
        const sim = await chat(msg);
        const direct = await umkm.handleMessage(
            msg,
            TENANT,
            '6289999000111',
            { ...DEFAULT_STUDIO_UMKM_CONTEXT, tenant_id: TENANT },
            { conversationId: 'cmp-a1' },
        );
        expect(sim.path).toBe('umkm');
        expect(sim.answer).toMatch(/30\.000|30000/);
        expect(direct).toMatch(/30\.000|30000/);
        expect(sim.answer).toMatch(/Konfirmasi penjualan/i);
        expect(direct).toMatch(/Konfirmasi penjualan/i);
    });

    it('A2: tidak pernah memanggil WAHA sendText', async () => {
        const { chat, wahaSend } = makeSim();
        await chat('jual 1 bakso');
        await chat('ya');
        await chat('cek stok semua');
        await chat('bantuan');
        expect(wahaSend).not.toHaveBeenCalled();
    });

    it('A3: session sticky + phone isolasi', async () => {
        const { chat } = makeSim();
        const a1 = await chat('jual', '6281111000001');
        const a2 = await chat('bakso', '6281111000001');
        expect(a2.conversationId).toBe(a1.conversationId);
        const b1 = await chat('jual', '6281111000002');
        expect(b1.conversationId).not.toBe(a1.conversationId);
        expect(b1.chatId).toContain('6281111000002');
    });
});
