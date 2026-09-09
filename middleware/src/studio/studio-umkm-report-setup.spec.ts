import { describe, expect, it, vi } from 'vitest';
import { StudioUmkmService } from './studio-umkm.service';
import { DEFAULT_UMKM_COMMANDS } from './studio-umkm-commands';

function thenable(data: unknown, error: unknown = null) {
    const b: any = {};
    for (const k of ['select', 'eq', 'order', 'limit', 'gte', 'lte', 'update', 'insert']) {
        b[k] = vi.fn(() => b);
    }
    b.single = vi.fn(async () => ({ data, error }));
    b.then = (resolve: (v: unknown) => unknown) => resolve({ data, error });
    return b;
}

describe('StudioUmkmService.fetchDailyReport + setupUmkmNotebook', () => {
    it('fetchDailyReport aggregates paid revenue and top products', async () => {
        const today = new Date().toISOString().slice(0, 10);
        const todayOrders = [
            { total_amount: 30000, paid_amount: 30000, payment_status: 'paid', status: 'completed' },
            { total_amount: 10000, paid_amount: 0, payment_status: 'unpaid', status: 'completed' },
            { total_amount: 5000, paid_amount: 5000, payment_status: 'paid', status: 'cancelled' },
        ];
        const lineItems = [
            {
                item_name: 'Bakso',
                quantity: 2,
                subtotal: 36000,
                status: 'ok',
                ecom_orders: { status: 'completed' },
            },
            {
                item_name: 'Bakso',
                quantity: 1,
                subtotal: 18000,
                status: 'cancelled',
                ecom_orders: { status: 'completed' },
            },
            {
                item_name: 'Mie',
                quantity: 1,
                subtotal: 15000,
                status: 'ok',
                ecom_orders: { status: 'cancelled' },
            },
        ];
        const recent = [
            {
                order_number: 'WA-1',
                customer_name: 'Ani',
                total_amount: 30000,
                created_at: `${today}T10:00:00.000Z`,
            },
        ];

        let ecomCall = 0;
        const from = vi.fn((table: string) => {
            if (table === 'ecom_orders') {
                ecomCall += 1;
                // first: today filter; second: recent
                return thenable(ecomCall === 1 ? todayOrders : recent);
            }
            if (table === 'ecom_order_items') return thenable(lineItems);
            return thenable([]);
        });
        const svc = new StudioUmkmService(
            { getAdminClient: () => ({ from }) } as any,
            { generateText: vi.fn() } as any,
            { createItem: vi.fn(), createStockMovement: vi.fn() } as any,
            { coach: vi.fn() } as any,
        );
        vi.spyOn(svc['logger'], 'warn').mockImplementation(() => undefined);

        const report = await svc.fetchDailyReport('t1');
        expect(report.orderCount).toBe(2);
        expect(report.paidOrderCount).toBe(1);
        expect(report.revenueGross).toBe(40000);
        expect(report.revenuePaid).toBe(30000);
        expect(report.topProducts[0]).toMatchObject({ name: 'Bakso', unitsSold: 2, revenue: 36000 });
        expect(report.recentOrders[0].orderNumber).toBe('WA-1');
    });

    it('setupUmkmNotebook seeds commands and preserves custom', async () => {
        const customCmds = {
            ...DEFAULT_UMKM_COMMANDS,
            keywords: { ...DEFAULT_UMKM_COMMANDS.keywords, record_sale: ['jualajah'] },
        };
        const from = vi.fn((table: string) => {
            if (table !== 'studio_notebooks') return thenable(null);
            return {
                select: vi.fn(() => ({
                    eq: vi.fn(() => ({
                        single: vi.fn(async () => ({
                            data: {
                                id: 'nb-1',
                                context_config: { umkm_commands: customCmds, foo: 1 },
                            },
                            error: null,
                        })),
                    })),
                })),
                update: vi.fn(() => ({
                    eq: vi.fn(async () => ({ error: null })),
                })),
            };
        });
        const svc = new StudioUmkmService(
            { getAdminClient: () => ({ from }) } as any,
            { generateText: vi.fn() } as any,
            { createItem: vi.fn(), createStockMovement: vi.fn() } as any,
            { coach: vi.fn() } as any,
        );

        const withCustom = await svc.setupUmkmNotebook('nb-1', 'tenant-x');
        expect(withCustom.contextConfig.umkm_mode).toBe(true);
        expect(withCustom.contextConfig.tenant_id).toBe('tenant-x');
        expect(withCustom.contextConfig.umkm_commands?.keywords?.record_sale).toContain('jualajah');

        from.mockImplementation(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(async () => ({
                        data: { id: 'nb-2', context_config: {} },
                        error: null,
                    })),
                })),
            })),
            update: vi.fn(() => ({
                eq: vi.fn(async () => ({ error: null })),
            })),
        }));
        const seeded = await svc.setupUmkmNotebook('nb-2');
        expect(seeded.contextConfig.umkm_commands?.keywords?.record_sale?.length).toBeGreaterThan(0);

        from.mockImplementation(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(async () => ({ data: null, error: { message: 'missing' } })),
                })),
            })),
            update: vi.fn(),
        }));
        await expect(svc.setupUmkmNotebook('missing')).rejects.toBeTruthy();
    });
});
