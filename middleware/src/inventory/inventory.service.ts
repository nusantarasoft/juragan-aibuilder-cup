import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { VertexAiService } from '../ai/vertex-ai.service';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(
        private supabaseService: SupabaseService,
        private vertexAi: VertexAiService,
    ) { }

    private get db() {
        return this.supabaseService.getAdminClient();
    }

    // ─── ITEM CATEGORIES ─────────────────────────────────────

    async getCategories(tenantId: string) {
        const { data, error } = await this.db.from('inv_categories')
            .select('*').eq('tenant_id', tenantId)
            .order('sort_order').order('name');
        if (error) throw error;
        return data;
    }

    async createCategory(tenantId: string, input: {
        name: string; parentId?: string; description?: string;
        icon?: string; color?: string; sortOrder?: number;
    }) {
        const { data, error } = await this.db.from('inv_categories').insert({
            tenant_id: tenantId,
            name: input.name,
            parent_id: input.parentId || null,
            description: input.description || null,
            icon: input.icon || null,
            color: input.color || null,
            sort_order: input.sortOrder ?? 0,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateCategory(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', parentId: 'parent_id', description: 'description',
            icon: 'icon', color: 'color', sortOrder: 'sort_order',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('inv_categories').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteCategory(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_categories').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── ITEMS ───────────────────────────────────────────────

    async getItems(tenantId: string, filters?: {
        fulfillmentType?: string; itemType?: string; categoryId?: string;
        status?: string; search?: string;
    }) {
        let query = this.db.from('inv_items').select('*').eq('tenant_id', tenantId);
        if (filters?.fulfillmentType) query = query.eq('fulfillment_type', filters.fulfillmentType);
        if (filters?.itemType) query = query.eq('item_type', filters.itemType);
        if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async getItem(id: string) {
        const { data, error } = await this.db.from('inv_items').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createItem(tenantId: string, input: {
        name: string; sku?: string; description?: string;
        itemType?: string; fulfillmentType?: string;
        categoryId?: string; brand?: string; tags?: any;
        costPrice?: number; sellingPrice?: number; currency?: string; taxRate?: number;
        barcode?: string; qrCode?: string; mediaIds?: any;
        primaryUom?: string; weight?: number; weightUnit?: string;
        dimensions?: any; minStock?: number; maxStock?: number;
        reorderPoint?: number; reorderQty?: number;
        metadata?: any; status?: string;
    }) {
        const skuVal = input.sku || await this.generateSku(tenantId, input.fulfillmentType || 'physical');

        const { data, error } = await this.db.from('inv_items').insert({
            tenant_id: tenantId,
            name: input.name,
            sku: skuVal,
            description: input.description || null,
            item_type: input.itemType || 'goods',
            fulfillment_type: input.fulfillmentType || 'physical',
            category_id: input.categoryId || null,
            brand: input.brand || null,
            tags: input.tags || [],
            cost_price: input.costPrice ?? 0,
            selling_price: input.sellingPrice ?? 0,
            currency: input.currency || 'IDR',
            tax_rate: input.taxRate ?? 0,
            barcode: input.barcode || null,
            qr_code: input.qrCode || null,
            media_ids: input.mediaIds || [],
            primary_uom: input.primaryUom || 'pcs',
            weight: input.weight || null,
            weight_unit: input.weightUnit || 'kg',
            dimensions: input.dimensions || null,
            min_stock: input.minStock ?? 0,
            max_stock: input.maxStock ?? 0,
            reorder_point: input.reorderPoint ?? 0,
            reorder_qty: input.reorderQty ?? 0,
            metadata: input.metadata || {},
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateItem(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            name: 'name', sku: 'sku', description: 'description',
            itemType: 'item_type', fulfillmentType: 'fulfillment_type',
            categoryId: 'category_id', brand: 'brand', tags: 'tags',
            costPrice: 'cost_price', sellingPrice: 'selling_price',
            currency: 'currency', taxRate: 'tax_rate',
            barcode: 'barcode', qrCode: 'qr_code', mediaIds: 'media_ids',
            primaryUom: 'primary_uom', weight: 'weight', weightUnit: 'weight_unit',
            dimensions: 'dimensions', minStock: 'min_stock', maxStock: 'max_stock',
            reorderPoint: 'reorder_point', reorderQty: 'reorder_qty',
            metadata: 'metadata', status: 'status',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('inv_items').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteItem(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_items').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    private async generateSku(tenantId: string, fulfillmentType: string): Promise<string> {
        const prefix = { physical: 'PHY', ticket: 'TKT', scheduled: 'SCH', rental: 'RNT' }[fulfillmentType] || 'ITM';
        const { count } = await this.db.from('inv_items').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `${prefix}-${String((count || 0) + 1).padStart(6, '0')}`;
    }

    // ─── ITEM VARIANTS ────────────────────────────────────────

    async getVariants(itemId: string) {
        const { data, error } = await this.db.from('inv_item_variants')
            .select('*').eq('item_id', itemId).order('name');
        if (error) throw error;
        return data;
    }

    async createVariant(itemId: string, input: {
        name: string; sku?: string; attributes?: any;
        costPrice?: number; sellingPrice?: number;
        barcode?: string; mediaIds?: any; status?: string;
    }) {
        const { data, error } = await this.db.from('inv_item_variants').insert({
            item_id: itemId,
            name: input.name,
            sku: input.sku || null,
            attributes: input.attributes || {},
            cost_price: input.costPrice ?? null,
            selling_price: input.sellingPrice ?? null,
            barcode: input.barcode || null,
            media_ids: input.mediaIds || [],
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deleteVariant(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_item_variants').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── STOCK LEDGER ─────────────────────────────────────────

    async getStockSummary(tenantId: string, filters?: {
        itemId?: string; warehouseId?: string; search?: string;
    }) {
        let query = this.db.from('inv_stock_ledger').select('*').eq('tenant_id', tenantId);
        if (filters?.itemId) query = query.eq('item_id', filters.itemId);
        if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
        const { data, error } = await query.order('updated_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getStockMovements(tenantId: string, filters?: {
        itemId?: string; movementType?: string; limit?: number;
    }) {
        let query = this.db.from('inv_stock_movements').select('*').eq('tenant_id', tenantId);
        if (filters?.itemId) query = query.eq('item_id', filters.itemId);
        if (filters?.movementType) query = query.eq('movement_type', filters.movementType);
        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(filters?.limit || 100);
        if (error) throw error;
        return data;
    }

    async createStockMovement(tenantId: string, input: {
        itemId: string; variantId?: string; warehouseId?: string;
        movementType: string; quantity: number; unitCost?: number;
        reference?: string; referenceType?: string; referenceId?: string;
        batchNumber?: string; serialNumber?: string; expiryDate?: string;
        notes?: string;
    }) {
        // 1. Create movement record
        const { data: movement, error: mvErr } = await this.db.from('inv_stock_movements').insert({
            tenant_id: tenantId,
            item_id: input.itemId,
            variant_id: input.variantId || null,
            warehouse_id: input.warehouseId || null,
            movement_type: input.movementType,
            quantity: input.quantity,
            unit_cost: input.unitCost ?? 0,
            total_cost: (input.unitCost ?? 0) * Math.abs(input.quantity),
            reference: input.reference || null,
            reference_type: input.referenceType || null,
            reference_id: input.referenceId || null,
            batch_number: input.batchNumber || null,
            serial_number: input.serialNumber || null,
            expiry_date: input.expiryDate || null,
            notes: input.notes || null,
        }).select().single();
        if (mvErr) throw mvErr;

        // 2. Upsert stock ledger
        const { data: existing } = await this.db.from('inv_stock_ledger')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('item_id', input.itemId)
            .eq('warehouse_id', input.warehouseId || 'default')
            .maybeSingle();

        const qtyDelta = ['IN', 'RETURN_IN', 'ADJUST_IN', 'PRODUCTION'].includes(input.movementType)
            ? Math.abs(input.quantity)
            : -Math.abs(input.quantity);

        if (existing) {
            await this.db.from('inv_stock_ledger').update({
                on_hand: (existing.on_hand || 0) + qtyDelta,
                updated_at: new Date().toISOString(),
            }).eq('id', existing.id);
        } else {
            await this.db.from('inv_stock_ledger').insert({
                tenant_id: tenantId,
                item_id: input.itemId,
                variant_id: input.variantId || null,
                warehouse_id: input.warehouseId || 'default',
                on_hand: Math.max(0, qtyDelta),
                reserved: 0,
                committed: 0,
            });
        }

        return movement;
    }

    // ─── STOCK DASHBOARD STATS ────────────────────────────────

    async getStockStats(tenantId: string) {
        const { count: totalItems } = await this.db.from('inv_items')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);

        const { count: activeItems } = await this.db.from('inv_items')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId).eq('status', 'active');

        const { data: ledger } = await this.db.from('inv_stock_ledger')
            .select('on_hand, reserved, item_id').eq('tenant_id', tenantId);

        const totalOnHand = (ledger || []).reduce((sum: number, r: any) => sum + (r.on_hand || 0), 0);
        const totalReserved = (ledger || []).reduce((sum: number, r: any) => sum + (r.reserved || 0), 0);

        // Low stock items
        const { data: items } = await this.db.from('inv_items')
            .select('id, name, reorder_point').eq('tenant_id', tenantId).gt('reorder_point', 0);

        let lowStockCount = 0;
        if (items && ledger) {
            const ledgerMap = new Map((ledger as any[]).map((l: any) => [l.item_id, l.on_hand || 0]));
            for (const item of items as any[]) {
                const onHand = ledgerMap.get(item.id) || 0;
                if (onHand <= item.reorder_point) lowStockCount++;
            }
        }

        const { count: totalMovements } = await this.db.from('inv_stock_movements')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);

        // Count by fulfillment type
        const { count: physicalCount } = await this.db.from('inv_items')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId).eq('fulfillment_type', 'physical');
        const { count: ticketCount } = await this.db.from('inv_items')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId).eq('fulfillment_type', 'ticket');
        const { count: scheduledCount } = await this.db.from('inv_items')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId).eq('fulfillment_type', 'scheduled');
        const { count: rentalCount } = await this.db.from('inv_items')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId).eq('fulfillment_type', 'rental');

        return {
            totalItems: totalItems || 0,
            activeItems: activeItems || 0,
            totalOnHand, totalReserved,
            lowStockCount,
            totalMovements: totalMovements || 0,
            physicalCount: physicalCount || 0,
            ticketCount: ticketCount || 0,
            scheduledCount: scheduledCount || 0,
            rentalCount: rentalCount || 0,
        };
    }

    // ─── AI: AUTO-CLASSIFY ITEM ──────────────────────────────

    async aiClassifyItem(name: string, description: string) {
        const prompt = `
You are an inventory classification AI. Analyze the following item and return a JSON object:

Item Name: ${name}
Description: ${description || 'No description'}

Return JSON with:
- suggestedCategory: best category name (e.g. "Electronics", "Office Supplies", "Raw Materials")
- suggestedTags: array of 3-5 relevant tags
- suggestedItemType: one of "goods", "service", "raw_material", "finished_good", "consumable"
- suggestedFulfillmentType: one of "physical", "ticket", "scheduled", "rental"
- confidence: number 0-100

IMPORTANT: Return ONLY valid JSON. No markdown.`;

        try {
            return await this.vertexAi.generateStructuredJSON(prompt);
        } catch (e) {
            this.logger.error('AI classify failed', e);
            return {
                suggestedCategory: 'Uncategorized',
                suggestedTags: [],
                suggestedItemType: 'goods',
                suggestedFulfillmentType: 'physical',
                confidence: 0,
            };
        }
    }

    // ─── AI: ANOMALY DETECTION ────────────────────────────────

    async aiDetectAnomalies(tenantId: string) {
        const { data: movements } = await this.db.from('inv_stock_movements')
            .select('*, inv_items(name)')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (!movements || movements.length === 0) {
            return { anomalies: [], message: 'No movements to analyze' };
        }

        const summary = (movements as any[]).map((m: any) => (
            `${m.movement_type} | ${m.inv_items?.name || m.item_id} | Qty: ${m.quantity} | ${m.created_at}`
        )).join('\n');

        const prompt = `
You are a supply chain anomaly detection AI. Analyze these recent stock movements and identify any anomalies:

${summary}

Return JSON with:
- anomalies: array of { itemName, movementType, quantity, reason, riskLevel ("low"|"medium"|"high") }
- summary: one-sentence overview

IMPORTANT: Return ONLY valid JSON.`;

        try {
            return await this.vertexAi.generateStructuredJSON(prompt);
        } catch (e) {
            return { anomalies: [], message: 'AI analysis unavailable' };
        }
    }
}
