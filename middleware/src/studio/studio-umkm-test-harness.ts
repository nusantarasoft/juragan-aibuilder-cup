/**
 * Shared test harness for UMKM WA wizard / intent scenario tests.
 */
import { vi } from 'vitest';
import { StudioUmkmService } from './studio-umkm.service';

export const TEST_CATALOG = [
    { id: 'p1', name: 'Mie Ayam', sku: 'MA-01', sellingPrice: 15000 },
    { id: 'p2', name: 'Bakso', sku: 'BK-01', sellingPrice: 18000 },
    { id: 'p3', name: 'Es Teh', sku: 'ET-01', sellingPrice: 5000 },
];

export type MakeUmkmServiceOpts = {
    products?: typeof TEST_CATALOG;
    createItemError?: Error;
    purchases?: Array<{
        purchase_number: string;
        purchase_date: string;
        total_cost: number;
        supplier_name?: string;
    }>;
    orders?: Array<{
        order_number: string;
        customer_name?: string;
        total_amount: number;
        created_at: string;
    }>;
};

export function makeUmkmService(opts?: MakeUmkmServiceOpts) {
    const products = opts?.products ?? TEST_CATALOG;
    const purchases = opts?.purchases ?? [];
    const orders = opts?.orders ?? [];

    const createItem = vi.fn(
        async (_tenant: string, input: { name: string; sellingPrice: number; costPrice?: number }) => {
            if (opts?.createItemError) throw opts.createItemError;
            return {
                name: input.name,
                sku: 'SKU-NEW',
                selling_price: input.sellingPrice,
            };
        },
    );
    const createStockMovement = vi.fn(async () => ({ id: 'mov-1' }));

    const invChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
            data: products.map((p) => ({
                id: p.id,
                name: p.name,
                sku: p.sku,
                selling_price: p.sellingPrice,
            })),
            error: null,
        }),
    };

    const purchaseChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'pur-1' }, error: null }),
    };
    // terminal for list
    purchaseChain.limit.mockResolvedValue({ data: purchases, error: null });
    purchaseChain.lte.mockResolvedValue({ data: purchases, error: null });
    purchaseChain.gte.mockReturnValue(purchaseChain);

    const orderChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
    };
    orderChain.limit.mockResolvedValue({ data: orders, error: null });
    orderChain.lte.mockResolvedValue({ data: orders, error: null });
    orderChain.gte.mockReturnValue(orderChain);
    // report path: no limit — resolve on eq chain end via thenable-like: last eq returns promise if no further call
    // buildCombinedReport uses: select().eq() optionally .gte().lte() — need await on final
    const reportSales: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockImplementation(() => Promise.resolve({ data: orders, error: null })),
    };
    // If no gte/lte, awaiting eq() won't work — supabase client returns builder. Service awaits the query object.
    // In JS, await on non-thenable returns the object. So we need thenable builders.
    const asThenable = (data: unknown) => {
        const b: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'x1' }, error: null }),
            then: (resolve: (v: unknown) => unknown) => resolve({ data, error: null }),
        };
        // keep chain returning same thenable
        for (const k of ['select', 'eq', 'order', 'limit', 'gte', 'lte', 'gt', 'in', 'insert', 'update']) {
            b[k] = vi.fn().mockReturnValue(b);
        }
        b.single = vi.fn().mockResolvedValue({
            data: { id: 'x1', order_number: 'WA-TEST-1', total_amount: 18000 },
            error: null,
        });
        return b;
    };

    const supabase = {
        getAdminClient: () => ({
            from: (table: string) => {
                if (table === 'inv_items') return invChain;
                if (table === 'inv_stock_ledger') {
                    return asThenable([]);
                }
                if (table === 'studio_umkm_purchases') return asThenable(purchases);
                if (table === 'studio_umkm_purchase_items') return asThenable([]);
                if (table === 'ecom_orders') return asThenable(orders);
                if (table === 'studio_umkm_pending_sales') return asThenable([]);
                if (table === 'studio_umkm_pending_purchases') return asThenable([]);
                if (table === 'studio_umkm_session_wizards') return asThenable([]);
                return asThenable([]);
            },
        }),
    };
    const ai = { generateText: vi.fn(async () => '') };
    const inventory = { createItem, createStockMovement };
    const svc = new StudioUmkmService(supabase as any, ai as any, inventory as any);
    return { svc, createItem, createStockMovement, reportSales };
}
