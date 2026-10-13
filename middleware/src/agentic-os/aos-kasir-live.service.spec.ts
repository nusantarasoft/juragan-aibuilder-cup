import { describe, expect, it, vi } from 'vitest';
import { AOS_DEFAULT_TENANT } from './agentic-os.types';
import { AosKasirLiveService, jakartaTodayUtcBounds, KASIR_EMPLOYEE_SLUG } from './aos-kasir-live.service';

describe('jakartaTodayUtcBounds', () => {
    it('returns a 24h window aligned to Jakarta midnight', () => {
        const { startIso, endIso } = jakartaTodayUtcBounds(new Date('2026-10-13T10:00:00Z'));
        expect(startIso).toBe('2026-10-12T17:00:00.000Z');
        expect(endIso).toBe('2026-10-13T17:00:00.000Z');
    });
});

type Row = Record<string, unknown>;

function mockAdmin(handlers: {
    configs: Record<string, Row | 'ERROR'>;
    chatsCount?: number;
    ordersCount?: number;
    readError?: boolean;
    lastWa?: Row | null;
    lastOrder?: Row | null;
}) {
    const writes: string[] = [];
    const admin = {
        from: (table: string) => {
            const chain: Record<string, unknown> = {};
            const self = () => chain;
            chain.select = (_cols?: string, opts?: { count?: string; head?: boolean }) => {
                if (table === 'studio_whatsapp_sessions' && opts?.head) {
                    return {
                        eq: () => ({
                            gte: () => ({
                                lt: async () =>
                                    handlers.readError
                                        ? { count: null, error: { message: 'read fail' } }
                                        : { count: handlers.chatsCount ?? 0, error: null },
                            }),
                        }),
                    };
                }
                if (table === 'ecom_orders' && opts?.head) {
                    return {
                        eq: () => ({
                            gte: () => ({
                                lt: async () =>
                                    handlers.readError
                                        ? { count: null, error: { message: 'read fail' } }
                                        : { count: handlers.ordersCount ?? 0, error: null },
                            }),
                        }),
                    };
                }
                if (table === 'studio_whatsapp_sessions') {
                    return {
                        eq: () => ({
                            order: () => ({
                                limit: () => ({
                                    maybeSingle: async () => ({ data: handlers.lastWa ?? null, error: null }),
                                }),
                            }),
                        }),
                    };
                }
                if (table === 'ecom_orders') {
                    return {
                        eq: () => ({
                            order: () => ({
                                limit: () => ({
                                    maybeSingle: async () => ({ data: handlers.lastOrder ?? null, error: null }),
                                }),
                            }),
                        }),
                    };
                }
                if (table === 'studio_whatsapp_config') {
                    return {
                        eq: (_k: string, tid: string) => ({
                            maybeSingle: async () => {
                                if (!(tid in handlers.configs)) {
                                    return { data: null, error: null };
                                }
                                const row = handlers.configs[tid];
                                if (row === 'ERROR') {
                                    return { data: null, error: { message: 'db down' } };
                                }
                                return { data: row, error: null };
                            },
                        }),
                    };
                }
                return self();
            };
            chain.insert = () => {
                writes.push(`insert:${table}`);
                return chain;
            };
            chain.update = () => {
                writes.push(`update:${table}`);
                return chain;
            };
            chain.delete = () => {
                writes.push(`delete:${table}`);
                return chain;
            };
            return chain;
        },
        writes,
    };
    return admin;
}

function svc(admin: ReturnType<typeof mockAdmin>, hermesConnected = true) {
    return new AosKasirLiveService({ getAdminClient: () => admin as any } as any, {
        getSessionStatus: vi.fn(async () => ({ connected: hermesConnected, status: 'WORKING', name: 'hermes' })),
    } as any);
}

describe('AosKasirLiveService.getSnapshot', () => {
    it('returns unavailable when no WA config exists for any candidate tenant', async () => {
        const admin = mockAdmin({ configs: {} });
        const snap = await svc(admin).getSnapshot(AOS_DEFAULT_TENANT);
        expect(snap.available).toBe(false);
        expect(snap.unavailableReason).toBe('data tidak tersedia');
        expect(snap.waChatsToday).toBeNull();
        expect(admin.writes).toEqual([]);
    });

    it('scopes reads to resolved studio_whatsapp_config tenant (default fallback)', async () => {
        const admin = mockAdmin({
            configs: {
                default: { tenant_id: 'default', label: 'Warung Demo', enabled: true },
            },
            chatsCount: 2,
            ordersCount: 1,
            lastWa: { last_message_at: '2026-10-13T08:00:00.000Z' },
        });
        const snap = await svc(admin, true).getSnapshot(AOS_DEFAULT_TENANT);
        expect(snap.available).toBe(true);
        expect(snap.tenantId).toBe('default');
        expect(snap.name).toBe('Warung Demo');
        expect(snap.waChatsToday).toBe(2);
        expect(snap.transactionsToday).toBe(1);
        expect(snap.waOnline).toBe(true);
        expect(snap.slug).toBe(KASIR_EMPLOYEE_SLUG);
        expect(snap.source).toBe('ai_studio');
        expect(admin.writes).toEqual([]);
    });

    it('returns available with zero metrics when config exists but no activity today', async () => {
        const admin = mockAdmin({
            configs: { default: { tenant_id: 'default', label: null, enabled: true } },
            chatsCount: 0,
            ordersCount: 0,
        });
        const snap = await svc(admin, false).getSnapshot('default');
        expect(snap.available).toBe(true);
        expect(snap.waChatsToday).toBe(0);
        expect(snap.transactionsToday).toBe(0);
        expect(snap.waOnline).toBe(false);
        expect(snap.unavailableReason).toBeNull();
    });

    it('returns unavailable when session/order count queries fail', async () => {
        const admin = mockAdmin({
            configs: { default: { tenant_id: 'default', label: 'X', enabled: true } },
            readError: true,
        });
        const snap = await svc(admin).getSnapshot('default');
        expect(snap.available).toBe(false);
        expect(snap.unavailableReason).toBe('data tidak tersedia');
    });

    it('returns unavailable when config query errors', async () => {
        const broken = {
            from: (table: string) => {
                if (table === 'studio_whatsapp_config') {
                    return {
                        select: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({ data: null, error: { message: 'denied' } }),
                            }),
                        }),
                    };
                }
                throw new Error(`unexpected table ${table}`);
            },
            writes: [] as string[],
        };
        const snap = await svc(broken as ReturnType<typeof mockAdmin>).getSnapshot(AOS_DEFAULT_TENANT);
        expect(snap.available).toBe(false);
        expect(snap.unavailableReason).toBe('data tidak tersedia');
    });

    it('never performs write operations', async () => {
        const admin = mockAdmin({
            configs: { default: { tenant_id: 'default', label: 'K', enabled: true } },
        });
        await svc(admin).getSnapshot('default');
        expect(admin.writes).toEqual([]);
    });
});
