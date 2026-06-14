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
        hasExpiry?: boolean; defaultShelfLifeDays?: number;
        hasDepreciation?: boolean; depreciationMethod?: string;
        usefulLifeMonths?: number; salvageValue?: number;
        isFixedAsset?: boolean; assetCategory?: string;
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
            has_expiry: input.hasExpiry ?? false,
            default_shelf_life_days: input.defaultShelfLifeDays || null,
            has_depreciation: input.hasDepreciation ?? false,
            depreciation_method: input.depreciationMethod || 'none',
            useful_life_months: input.usefulLifeMonths || null,
            salvage_value: input.salvageValue ?? 0,
            is_fixed_asset: input.isFixedAsset ?? false,
            asset_category: input.assetCategory || null,
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
            hasExpiry: 'has_expiry', defaultShelfLifeDays: 'default_shelf_life_days',
            hasDepreciation: 'has_depreciation', depreciationMethod: 'depreciation_method',
            usefulLifeMonths: 'useful_life_months', salvageValue: 'salvage_value',
            isFixedAsset: 'is_fixed_asset', assetCategory: 'asset_category',
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

        const qtyDelta = ['IN', 'RETURN_IN', 'ADJUST_IN', 'PRODUCTION', 'MANUAL_IN'].includes(input.movementType)
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

    // ═══════════════════════════════════════════════════════════
    // ─── PROCUREMENT MODULE ───────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    // ─── SUPPLIERS ────────────────────────────────────────────

    async getSuppliers(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('inv_suppliers').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('name');
        if (error) throw error;
        return data;
    }

    async getSupplier(id: string) {
        const { data, error } = await this.db.from('inv_suppliers').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createSupplier(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('inv_suppliers').insert({
            tenant_id: tenantId,
            code: input.code, name: input.name,
            contact_person: input.contactPerson || null,
            email: input.email || null, phone: input.phone || null,
            address: input.address || null, city: input.city || null,
            country: input.country || 'Indonesia',
            tax_id: input.taxId || null,
            payment_terms: input.paymentTerms || 'Net 30',
            currency: input.currency || 'IDR',
            rating: input.rating ?? 0,
            lead_time_days: input.leadTimeDays ?? 7,
            tags: input.tags || [],
            notes: input.notes || null,
            status: input.status || 'active',
            account_id: input.accountId || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateSupplier(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            code: 'code', name: 'name', contactPerson: 'contact_person',
            email: 'email', phone: 'phone', address: 'address', city: 'city',
            country: 'country', taxId: 'tax_id', paymentTerms: 'payment_terms',
            currency: 'currency', rating: 'rating', leadTimeDays: 'lead_time_days',
            tags: 'tags', notes: 'notes', status: 'status',
            accountId: 'account_id',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('inv_suppliers').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteSupplier(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_suppliers').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── PURCHASE REQUISITIONS ────────────────────────────────

    async getPurchaseRequisitions(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('inv_purchase_requisitions').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `pr_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getPrLines(prId: string) {
        const { data, error } = await this.db.from('inv_pr_lines')
            .select('*').eq('pr_id', prId).order('sort_order');
        if (error) throw error;
        return data;
    }

    async createPurchaseRequisition(tenantId: string, input: Record<string, any>) {
        const prNumber = await this.generatePrNumber(tenantId);
        const { data, error } = await this.db.from('inv_purchase_requisitions').insert({
            tenant_id: tenantId,
            pr_number: prNumber, title: input.title,
            description: input.description || null,
            requested_by: input.requestedBy || null,
            department: input.department || null,
            priority: input.priority || 'normal',
            required_date: input.requiredDate || null,
            total_estimated: input.totalEstimated ?? 0,
            currency: input.currency || 'IDR',
            notes: input.notes || null,
            status: input.status || 'draft',
        }).select().single();
        if (error) throw error;

        // Insert lines
        if (input.lines?.length) {
            const lines = input.lines.map((l: any, i: number) => ({
                pr_id: data.id,
                item_id: l.itemId || null,
                item_name: l.itemName, description: l.description || null,
                quantity: l.quantity || 1,
                uom: l.uom || 'pcs',
                estimated_unit_price: l.estimatedUnitPrice ?? 0,
                estimated_total: (l.quantity || 1) * (l.estimatedUnitPrice ?? 0),
                preferred_supplier_id: l.preferredSupplierId || null,
                notes: l.notes || null,
                sort_order: i,
            }));
            await this.db.from('inv_pr_lines').insert(lines);
        }
        return data;
    }

    async updatePrStatus(id: string, status: string, extra?: { approvedBy?: string; rejectionReason?: string }) {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'approved') {
            updates.approved_by = extra?.approvedBy || null;
            updates.approved_at = new Date().toISOString();
        }
        if (status === 'rejected') updates.rejection_reason = extra?.rejectionReason || null;
        const { data, error } = await this.db.from('inv_purchase_requisitions').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deletePurchaseRequisition(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_purchase_requisitions').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    private async generatePrNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const { count } = await this.db.from('inv_purchase_requisitions')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `PR-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
    }

    // ─── PURCHASE ORDERS ─────────────────────────────────────

    async getPurchaseOrders(tenantId: string, filters?: { status?: string; supplierId?: string; search?: string }) {
        let query = this.db.from('inv_purchase_orders').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.supplierId) query = query.eq('supplier_id', filters.supplierId);
        if (filters?.search) query = query.or(
            `po_number.ilike.%${filters.search}%,title.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getPoLines(poId: string) {
        const { data, error } = await this.db.from('inv_po_lines')
            .select('*').eq('po_id', poId).order('sort_order');
        if (error) throw error;
        return data;
    }

    async createPurchaseOrder(tenantId: string, input: Record<string, any>) {
        const poNumber = await this.generatePoNumber(tenantId);
        const { data, error } = await this.db.from('inv_purchase_orders').insert({
            tenant_id: tenantId,
            po_number: poNumber,
            pr_id: input.prId || null,
            supplier_id: input.supplierId,
            title: input.title || null,
            shipping_address: input.shippingAddress || null,
            payment_terms: input.paymentTerms || 'Net 30',
            expected_delivery: input.expectedDelivery || null,
            subtotal: input.subtotal ?? 0,
            tax_amount: input.taxAmount ?? 0,
            discount_amount: input.discountAmount ?? 0,
            total_amount: input.totalAmount ?? 0,
            currency: input.currency || 'IDR',
            notes: input.notes || null,
            status: input.status || 'draft',
        }).select().single();
        if (error) throw error;

        if (input.lines?.length) {
            const lines = input.lines.map((l: any, i: number) => ({
                po_id: data.id,
                item_id: l.itemId || null,
                item_name: l.itemName, description: l.description || null,
                quantity: l.quantity || 1, uom: l.uom || 'pcs',
                unit_price: l.unitPrice ?? 0,
                discount_percent: l.discountPercent ?? 0,
                tax_percent: l.taxPercent ?? 0,
                line_total: l.lineTotal ?? (l.quantity || 1) * (l.unitPrice ?? 0),
                notes: l.notes || null,
                sort_order: i,
            }));
            await this.db.from('inv_po_lines').insert(lines);
        }
        // Mark PR as converted if linked
        if (input.prId) {
            await this.db.from('inv_purchase_requisitions')
                .update({ status: 'converted', updated_at: new Date().toISOString() })
                .eq('id', input.prId);
        }
        return data;
    }

    async updatePoStatus(id: string, status: string) {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'sent') updates.sent_at = new Date().toISOString();
        if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
        const { data, error } = await this.db.from('inv_purchase_orders').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deletePurchaseOrder(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_purchase_orders').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    private async generatePoNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const { count } = await this.db.from('inv_purchase_orders')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `PO-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
    }

    // ─── GOODS RECEIVED NOTES ────────────────────────────────

    async getGoodsReceivedNotes(tenantId: string, filters?: { status?: string; poId?: string }) {
        let query = this.db.from('inv_goods_received_notes').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.poId) query = query.eq('po_id', filters.poId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getGrnLines(grnId: string) {
        const { data, error } = await this.db.from('inv_grn_lines')
            .select('*').eq('grn_id', grnId).order('sort_order');
        if (error) throw error;
        return data;
    }

    async createGoodsReceivedNote(tenantId: string, input: Record<string, any>) {
        const grnNumber = await this.generateGrnNumber(tenantId);
        const { data, error } = await this.db.from('inv_goods_received_notes').insert({
            tenant_id: tenantId,
            grn_number: grnNumber,
            po_id: input.poId,
            supplier_id: input.supplierId,
            received_by: input.receivedBy || null,
            received_date: input.receivedDate || new Date().toISOString().slice(0, 10),
            warehouse_id: input.warehouseId || 'default',
            delivery_note_number: input.deliveryNoteNumber || null,
            invoice_number: input.invoiceNumber || null,
            quality_check: input.qualityCheck || 'passed',
            notes: input.notes || null,
            status: input.status || 'draft',
        }).select().single();
        if (error) throw error;

        if (input.lines?.length) {
            const lines = input.lines.map((l: any, i: number) => ({
                grn_id: data.id,
                po_line_id: l.poLineId || null,
                item_id: l.itemId || null,
                item_name: l.itemName,
                ordered_qty: l.orderedQty ?? 0,
                received_qty: l.receivedQty || 0,
                accepted_qty: l.acceptedQty ?? l.receivedQty ?? 0,
                rejected_qty: l.rejectedQty ?? 0,
                uom: l.uom || 'pcs',
                unit_cost: l.unitCost ?? 0,
                batch_number: l.batchNumber || null,
                serial_number: l.serialNumber || null,
                expiry_date: l.expiryDate || null,
                quality_status: l.qualityStatus || 'passed',
                rejection_reason: l.rejectionReason || null,
                notes: l.notes || null,
                sort_order: i,
            }));
            await this.db.from('inv_grn_lines').insert(lines);
        }
        return data;
    }

    async acceptGrn(id: string, tenantId: string) {
        // Accept GRN and create stock movements for received goods
        const { data: grn, error } = await this.db.from('inv_goods_received_notes')
            .update({ status: 'accepted', accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('id', id).select().single();
        if (error) throw error;

        // Get GRN lines and create stock IN movements
        const { data: lines } = await this.db.from('inv_grn_lines').select('*').eq('grn_id', id);
        if (lines) {
            for (const line of lines as any[]) {
                if (line.item_id && line.accepted_qty > 0) {
                    await this.createStockMovement(tenantId, {
                        itemId: line.item_id,
                        warehouseId: grn.warehouse_id || 'default',
                        movementType: 'IN',
                        quantity: line.accepted_qty,
                        unitCost: line.unit_cost,
                        reference: grn.grn_number,
                        referenceType: 'goods_received_note',
                        referenceId: grn.id,
                        batchNumber: line.batch_number,
                        serialNumber: line.serial_number,
                        expiryDate: line.expiry_date,
                        notes: `GRN ${grn.grn_number}: Received ${line.accepted_qty} ${line.uom}`,
                    });
                }
            }
        }

        // Update PO status
        const poId = grn.po_id;
        if (poId) {
            // Check if all PO lines are fully received
            const { data: poLines } = await this.db.from('inv_po_lines').select('*').eq('po_id', poId);
            const { data: allGrns } = await this.db.from('inv_goods_received_notes')
                .select('id').eq('po_id', poId).eq('status', 'accepted');
            const grnIds = (allGrns || []).map((g: any) => g.id);
            if (grnIds.length > 0) {
                const { data: allGrnLines } = await this.db.from('inv_grn_lines')
                    .select('*').in('grn_id', grnIds);

                const receivedMap = new Map<string, number>();
                for (const gl of (allGrnLines || []) as any[]) {
                    const key = gl.po_line_id || gl.item_id;
                    receivedMap.set(key, (receivedMap.get(key) || 0) + (gl.accepted_qty || 0));
                }

                const allReceived = (poLines || []).every((pl: any) => {
                    const received = receivedMap.get(pl.id) || receivedMap.get(pl.item_id) || 0;
                    return received >= pl.quantity;
                });

                await this.db.from('inv_purchase_orders').update({
                    status: allReceived ? 'received' : 'partial_received',
                    updated_at: new Date().toISOString(),
                }).eq('id', poId);
            }
        }
        return grn;
    }

    async deleteGoodsReceivedNote(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_goods_received_notes').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    private async generateGrnNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const { count } = await this.db.from('inv_goods_received_notes')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `GRN-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
    }

    // ─── PROCUREMENT STATS ───────────────────────────────────

    async getProcurementStats(tenantId: string) {
        const { count: totalSuppliers } = await this.db.from('inv_suppliers')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        const { count: totalPRs } = await this.db.from('inv_purchase_requisitions')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        const { count: pendingPRs } = await this.db.from('inv_purchase_requisitions')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending_approval');
        const { count: totalPOs } = await this.db.from('inv_purchase_orders')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        const { count: activePOs } = await this.db.from('inv_purchase_orders')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)
            .in('status', ['sent', 'confirmed', 'partial_received']);
        const { count: totalGRNs } = await this.db.from('inv_goods_received_notes')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);

        // Total PO value
        const { data: poValues } = await this.db.from('inv_purchase_orders')
            .select('total_amount').eq('tenant_id', tenantId)
            .in('status', ['sent', 'confirmed', 'partial_received', 'received']);
        const totalPoValue = (poValues || []).reduce((sum: number, po: any) => sum + (po.total_amount || 0), 0);

        return {
            totalSuppliers: totalSuppliers || 0,
            totalPRs: totalPRs || 0,
            pendingPRs: pendingPRs || 0,
            totalPOs: totalPOs || 0,
            activePOs: activePOs || 0,
            totalGRNs: totalGRNs || 0,
            totalPoValue,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ─── WAREHOUSE MANAGEMENT MODULE ──────────────────────────
    // ═══════════════════════════════════════════════════════════

    // ─── WAREHOUSES ──────────────────────────────────────────

    async getWarehouses(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('inv_warehouses').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,city.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('code');
        if (error) throw error;
        return data;
    }

    async getWarehouse(id: string) {
        const { data, error } = await this.db.from('inv_warehouses').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createWarehouse(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('inv_warehouses').insert({
            tenant_id: tenantId,
            code: input.code, name: input.name,
            warehouse_type: input.warehouseType || 'general',
            address: input.address || null, city: input.city || null,
            country: input.country || 'Indonesia',
            latitude: input.latitude || null, longitude: input.longitude || null,
            total_capacity: input.totalCapacity ?? 0,
            manager: input.manager || null, phone: input.phone || null,
            email: input.email || null,
            operating_hours: input.operatingHours || null,
            tags: input.tags || [], notes: input.notes || null,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateWarehouse(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            code: 'code', name: 'name', warehouseType: 'warehouse_type',
            address: 'address', city: 'city', country: 'country',
            latitude: 'latitude', longitude: 'longitude',
            totalCapacity: 'total_capacity', usedCapacity: 'used_capacity',
            manager: 'manager', phone: 'phone', email: 'email',
            operatingHours: 'operating_hours', tags: 'tags',
            notes: 'notes', status: 'status',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('inv_warehouses').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteWarehouse(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_warehouses').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── ZONES ───────────────────────────────────────────────

    async getZones(warehouseId?: string) {
        let query = this.db.from('inv_zones').select('*');
        if (warehouseId) query = query.eq('warehouse_id', warehouseId);
        const { data, error } = await query.order('sort_order').order('code');
        if (error) throw error;
        return data;
    }

    async createZone(warehouseId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('inv_zones').insert({
            warehouse_id: warehouseId,
            code: input.code, name: input.name,
            zone_type: input.zoneType || 'storage',
            description: input.description || null,
            capacity: input.capacity ?? 0,
            temperature_min: input.temperatureMin || null,
            temperature_max: input.temperatureMax || null,
            is_restricted: input.isRestricted ?? false,
            sort_order: input.sortOrder ?? 0,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateZone(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            code: 'code', name: 'name', zoneType: 'zone_type',
            description: 'description', capacity: 'capacity',
            temperatureMin: 'temperature_min', temperatureMax: 'temperature_max',
            isRestricted: 'is_restricted', sortOrder: 'sort_order', status: 'status',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('inv_zones').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteZone(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_zones').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── BINS ────────────────────────────────────────────────

    async getBins(zoneId?: string) {
        let query = this.db.from('inv_bins').select('*');
        if (zoneId) query = query.eq('zone_id', zoneId);
        const { data, error } = await query.order('sort_order').order('code');
        if (error) throw error;
        return data;
    }

    async createBin(zoneId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('inv_bins').insert({
            zone_id: zoneId,
            code: input.code,
            aisle: input.aisle || null, rack: input.rack || null,
            level: input.level || null, position: input.position || null,
            bin_type: input.binType || 'standard',
            max_weight: input.maxWeight || null,
            max_volume: input.maxVolume || null,
            barcode: input.barcode || null,
            sort_order: input.sortOrder ?? 0,
            status: input.status || 'available',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateBin(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            code: 'code', aisle: 'aisle', rack: 'rack',
            level: 'level', position: 'position', binType: 'bin_type',
            maxWeight: 'max_weight', maxVolume: 'max_volume',
            currentItemCount: 'current_item_count', isOccupied: 'is_occupied',
            barcode: 'barcode', sortOrder: 'sort_order', status: 'status',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('inv_bins').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteBin(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_bins').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async bulkCreateBins(zoneId: string, input: {
        aisleStart: string; aisleEnd: string;
        rackStart: number; rackEnd: number;
        levelStart: number; levelEnd: number;
        positionStart?: number; positionEnd?: number;
        binType?: string; maxWeight?: number; maxVolume?: number;
        codePrefix?: string;
    }): Promise<{ created: number; bins: any[] }> {
        const aisles: string[] = [];
        const startChar = input.aisleStart.charCodeAt(0);
        const endChar = input.aisleEnd.charCodeAt(0);
        for (let c = startChar; c <= endChar; c++) aisles.push(String.fromCharCode(c));

        const bins: any[] = [];
        let sortOrder = 0;
        const prefix = input.codePrefix || '';

        for (const aisle of aisles) {
            for (let rack = input.rackStart; rack <= input.rackEnd; rack++) {
                for (let level = input.levelStart; level <= input.levelEnd; level++) {
                    const posStart = input.positionStart ?? 1;
                    const posEnd = input.positionEnd ?? 1;
                    for (let pos = posStart; pos <= posEnd; pos++) {
                        const rackStr = String(rack).padStart(2, '0');
                        const code = `${prefix}${aisle}-${rackStr}-L${level}-P${pos}`;
                        bins.push({
                            zone_id: zoneId,
                            code,
                            aisle,
                            rack: rackStr,
                            level: String(level),
                            position: String(pos),
                            bin_type: input.binType || 'standard',
                            max_weight: input.maxWeight || null,
                            max_volume: input.maxVolume || null,
                            sort_order: sortOrder++,
                            status: 'available',
                        });
                    }
                }
            }
        }

        if (bins.length === 0) return { created: 0, bins: [] };

        // Insert in batches of 100
        const allCreated: any[] = [];
        for (let i = 0; i < bins.length; i += 100) {
            const batch = bins.slice(i, i + 100);
            const { data, error } = await this.db.from('inv_bins').insert(batch).select();
            if (error) throw error;
            if (data) allCreated.push(...data);
        }
        return { created: allCreated.length, bins: allCreated };
    }

    // ─── STOCK TRANSFERS ─────────────────────────────────────

    async getStockTransfers(tenantId: string, filters?: { status?: string }) {
        let query = this.db.from('inv_stock_transfers').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createStockTransfer(tenantId: string, input: Record<string, any>) {
        const transferNumber = await this.generateTransferNumber(tenantId);
        const { data, error } = await this.db.from('inv_stock_transfers').insert({
            tenant_id: tenantId,
            transfer_number: transferNumber,
            from_warehouse_id: input.fromWarehouseId,
            to_warehouse_id: input.toWarehouseId,
            from_bin_id: input.fromBinId || null,
            to_bin_id: input.toBinId || null,
            item_id: input.itemId || null,
            item_name: input.itemName || null,
            quantity: input.quantity || 0,
            uom: input.uom || 'pcs',
            reason: input.reason || null,
            requested_by: input.requestedBy || null,
            notes: input.notes || null,
            status: 'pending',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async approveStockTransfer(id: string, tenantId: string, approvedBy?: string) {
        const { data, error } = await this.db.from('inv_stock_transfers').update({
            status: 'approved',
            approved_by: approvedBy || 'Admin',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;

        // Execute stock movement
        if (data.item_id && data.quantity > 0) {
            // OUT from source
            await this.createStockMovement(tenantId, {
                itemId: data.item_id,
                warehouseId: data.from_warehouse_id,
                movementType: 'TRANSFER',
                quantity: data.quantity,
                reference: data.transfer_number,
                referenceType: 'stock_transfer',
                referenceId: data.id,
                notes: `Transfer OUT to ${data.to_warehouse_id}`,
            });
            // IN to destination
            await this.createStockMovement(tenantId, {
                itemId: data.item_id,
                warehouseId: data.to_warehouse_id,
                movementType: 'IN',
                quantity: data.quantity,
                reference: data.transfer_number,
                referenceType: 'stock_transfer',
                referenceId: data.id,
                notes: `Transfer IN from ${data.from_warehouse_id}`,
            });
        }
        return data;
    }

    async completeStockTransfer(id: string) {
        const { data, error } = await this.db.from('inv_stock_transfers').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteStockTransfer(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_stock_transfers').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    private async generateTransferNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const { count } = await this.db.from('inv_stock_transfers')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `TRF-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
    }

    // ─── WAREHOUSE STATS ─────────────────────────────────────

    async getWarehouseStats(tenantId: string) {
        const { count: totalWarehouses } = await this.db.from('inv_warehouses')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        const { count: totalZones } = await this.db.from('inv_zones')
            .select('*, inv_warehouses!inner(tenant_id)', { count: 'exact', head: true })
            .eq('inv_warehouses.tenant_id', tenantId);
        const { count: totalBins } = await this.db.from('inv_bins')
            .select('*, inv_zones!inner(inv_warehouses!inner(tenant_id))', { count: 'exact', head: true });
        const { count: activeTransfers } = await this.db.from('inv_stock_transfers')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId)
            .in('status', ['pending', 'approved', 'in_transit']);
        const { count: totalTransfers } = await this.db.from('inv_stock_transfers')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);

        // Sum capacity
        const { data: whData } = await this.db.from('inv_warehouses')
            .select('total_capacity, used_capacity').eq('tenant_id', tenantId);
        const totalCapacity = (whData || []).reduce((s: number, w: any) => s + (w.total_capacity || 0), 0);
        const usedCapacity = (whData || []).reduce((s: number, w: any) => s + (w.used_capacity || 0), 0);

        return {
            totalWarehouses: totalWarehouses || 0,
            totalZones: totalZones || 0,
            totalBins: totalBins || 0,
            activeTransfers: activeTransfers || 0,
            totalTransfers: totalTransfers || 0,
            totalCapacity,
            usedCapacity,
        };
    }

    // ─── WAREHOUSE LAYOUTS (3D Builder Persistence) ────────────

    async getWarehouseLayouts(tenantId: string, warehouseId?: string) {
        let query = this.db.from('inv_warehouse_layouts').select('*').eq('tenant_id', tenantId);
        if (warehouseId) query = query.eq('warehouse_id', warehouseId);
        const { data, error } = await query.order('updated_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getWarehouseLayout(id: string) {
        const { data, error } = await this.db.from('inv_warehouse_layouts').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async saveWarehouseLayout(tenantId: string, input: Record<string, any>) {
        const objects = input.objects || [];
        const row: any = {
            tenant_id: tenantId,
            warehouse_id: input.warehouseId || null,
            name: input.name || 'Untitled Layout',
            objects,
            object_count: objects.length,
            zone_count: objects.filter((o: any) => o.type === 'zone').length,
            rack_count: objects.filter((o: any) => o.type === 'rack').length,
            is_active: input.isActive ?? false,
            created_by: input.createdBy || null,
            updated_at: new Date().toISOString(),
        };

        // Upsert: if id provided, update; else insert
        if (input.id) {
            const { data, error } = await this.db.from('inv_warehouse_layouts')
                .update(row).eq('id', input.id).select().single();
            if (error) throw error;
            return data;
        } else {
            const { data, error } = await this.db.from('inv_warehouse_layouts')
                .insert(row).select().single();
            if (error) throw error;
            return data;
        }
    }

    async deleteWarehouseLayout(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_warehouse_layouts').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async setActiveWarehouseLayout(id: string, tenantId: string) {
        // Unset all active for this tenant
        await this.db.from('inv_warehouse_layouts')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('tenant_id', tenantId).eq('is_active', true);
        // Set this one active
        const { data, error } = await this.db.from('inv_warehouse_layouts')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ═══════════════════════════════════════════════════════
    // ─── MANUFACTURING ────────────────────────────────────
    // ═══════════════════════════════════════════════════════

    async getBoms(tenantId: string) {
        const { data, error } = await this.db.from('mfg_boms')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createBom(tenantId: string, input: Record<string, any>) {
        const row: any = {
            tenant_id: tenantId, code: input.code, name: input.name,
            version: input.version || '1.0', product_name: input.productName,
            product_sku: input.productSku, description: input.description,
            uom: input.uom || 'unit', yield_qty: input.yieldQty ?? 1,
            labor_hours: input.laborHours ?? 0, labor_cost: input.laborCost ?? 0,
            overhead_cost: input.overheadCost ?? 0, notes: input.notes,
            status: input.status || 'draft',
        };
        const { data, error } = await this.db.from('mfg_boms').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateBom(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            code: 'code', name: 'name', version: 'version',
            productName: 'product_name', productSku: 'product_sku',
            description: 'description', uom: 'uom', yieldQty: 'yield_qty',
            laborHours: 'labor_hours', laborCost: 'labor_cost',
            overheadCost: 'overhead_cost', totalMaterialCost: 'total_material_cost',
            totalCost: 'total_cost', notes: 'notes', status: 'status',
        };
        for (const [k, col] of Object.entries(map)) {
            if (input[k] !== undefined) updates[col] = input[k];
        }
        const { data, error } = await this.db.from('mfg_boms').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteBom(id: string) {
        const { error } = await this.db.from('mfg_boms').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getBomLines(bomId: string) {
        const { data, error } = await this.db.from('mfg_bom_lines')
            .select('*').eq('bom_id', bomId).order('sort_order');
        if (error) throw error;
        return data;
    }

    async addBomLine(bomId: string, input: Record<string, any>) {
        const row: any = {
            bom_id: bomId, item_id: input.itemId || null,
            item_name: input.itemName, item_sku: input.itemSku,
            quantity: input.quantity ?? 1, uom: input.uom || 'pcs',
            unit_cost: input.unitCost ?? 0, total_cost: input.totalCost ?? 0,
            scrap_pct: input.scrapPct ?? 0, notes: input.notes,
            sort_order: input.sortOrder ?? 0,
        };
        const { data, error } = await this.db.from('mfg_bom_lines').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateBomLine(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            itemName: 'item_name', itemSku: 'item_sku', quantity: 'quantity',
            uom: 'uom', unitCost: 'unit_cost', totalCost: 'total_cost',
            scrapPct: 'scrap_pct', notes: 'notes', sortOrder: 'sort_order',
        };
        for (const [k, col] of Object.entries(map)) {
            if (input[k] !== undefined) updates[col] = input[k];
        }
        const { data, error } = await this.db.from('mfg_bom_lines').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteBomLine(id: string) {
        const { error } = await this.db.from('mfg_bom_lines').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getWorkOrders(tenantId: string, status?: string) {
        let q = this.db.from('mfg_work_orders').select('*').eq('tenant_id', tenantId);
        if (status) q = q.eq('status', status);
        const { data, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createWorkOrder(tenantId: string, input: Record<string, any>) {
        const row: any = {
            tenant_id: tenantId, wo_number: input.woNumber,
            bom_id: input.bomId || null, bom_name: input.bomName,
            warehouse_id: input.warehouseId || null, warehouse_name: input.warehouseName,
            planned_qty: input.plannedQty ?? 1, uom: input.uom || 'unit',
            priority: input.priority || 'normal', assigned_to: input.assignedTo,
            planned_start: input.plannedStart || null, planned_end: input.plannedEnd || null,
            estimated_cost: input.estimatedCost ?? 0, notes: input.notes,
            status: input.status || 'draft',
        };
        const { data, error } = await this.db.from('mfg_work_orders').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateWorkOrder(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            woNumber: 'wo_number', bomId: 'bom_id', bomName: 'bom_name',
            warehouseId: 'warehouse_id', warehouseName: 'warehouse_name',
            plannedQty: 'planned_qty', completedQty: 'completed_qty',
            uom: 'uom', priority: 'priority', assignedTo: 'assigned_to',
            plannedStart: 'planned_start', plannedEnd: 'planned_end',
            actualStart: 'actual_start', actualEnd: 'actual_end',
            estimatedCost: 'estimated_cost', actualCost: 'actual_cost',
            notes: 'notes', status: 'status',
        };
        for (const [k, col] of Object.entries(map)) {
            if (input[k] !== undefined) updates[col] = input[k];
        }
        const { data, error } = await this.db.from('mfg_work_orders').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async updateWorkOrderStatus(id: string, status: string) {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'in_progress') updates.actual_start = new Date().toISOString();
        if (status === 'completed') updates.actual_end = new Date().toISOString();
        const { data, error } = await this.db.from('mfg_work_orders').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteWorkOrder(id: string) {
        const { error } = await this.db.from('mfg_work_orders').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getManufacturingStats(tenantId: string) {
        const [bomsRes, woRes] = await Promise.all([
            this.db.from('mfg_boms').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
            this.db.from('mfg_work_orders').select('status').eq('tenant_id', tenantId),
        ]);
        const totalBoms = bomsRes.count || 0;
        const wos = woRes.data || [];
        const draftWos = wos.filter(w => w.status === 'draft').length;
        const plannedWos = wos.filter(w => w.status === 'planned').length;
        const inProgressWos = wos.filter(w => w.status === 'in_progress').length;
        const completedWos = wos.filter(w => w.status === 'completed').length;
        return { totalBoms, totalWorkOrders: wos.length, draftWos, plannedWos, inProgressWos, completedWos };
    }

    // ═══════════════════════════════════════════════════════
    // ─── STOCK OPNAME ─────────────────────────────────────
    // ═══════════════════════════════════════════════════════

    async getOpnameSessions(tenantId: string) {
        const { data, error } = await this.db.from('inv_opname_sessions')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createOpnameSession(tenantId: string, input: Record<string, any>) {
        const row: any = {
            tenant_id: tenantId, session_code: input.sessionCode, title: input.title,
            warehouse_id: input.warehouseId || null, warehouse_name: input.warehouseName,
            counted_by: input.countedBy, scheduled_date: input.scheduledDate || null,
            notes: input.notes, status: input.status || 'draft',
        };
        const { data, error } = await this.db.from('inv_opname_sessions').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateOpnameSession(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            sessionCode: 'session_code', title: 'title',
            warehouseId: 'warehouse_id', warehouseName: 'warehouse_name',
            countedBy: 'counted_by', reviewedBy: 'reviewed_by',
            scheduledDate: 'scheduled_date', notes: 'notes', status: 'status',
            totalItems: 'total_items', itemsCounted: 'items_counted',
            totalVarianceQty: 'total_variance_qty', totalVarianceValue: 'total_variance_value',
        };
        for (const [k, col] of Object.entries(map)) {
            if (input[k] !== undefined) updates[col] = input[k];
        }
        const { data, error } = await this.db.from('inv_opname_sessions').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async updateOpnameSessionStatus(id: string, status: string) {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'counting') updates.started_at = new Date().toISOString();
        if (status === 'completed') updates.completed_at = new Date().toISOString();
        const { data, error } = await this.db.from('inv_opname_sessions').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteOpnameSession(id: string) {
        const { error } = await this.db.from('inv_opname_sessions').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getOpnameLines(sessionId: string) {
        const { data, error } = await this.db.from('inv_opname_lines')
            .select('*').eq('session_id', sessionId).order('sort_order');
        if (error) throw error;
        return data;
    }

    async addOpnameLine(sessionId: string, input: Record<string, any>) {
        const row: any = {
            session_id: sessionId, item_id: input.itemId || null,
            item_name: input.itemName, item_sku: input.itemSku,
            zone_name: input.zoneName, bin_code: input.binCode,
            uom: input.uom || 'pcs', system_qty: input.systemQty ?? 0,
            unit_cost: input.unitCost ?? 0, notes: input.notes,
            status: 'pending', sort_order: input.sortOrder ?? 0,
        };
        const { data, error } = await this.db.from('inv_opname_lines').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateOpnameLine(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            itemName: 'item_name', itemSku: 'item_sku', zoneName: 'zone_name',
            binCode: 'bin_code', uom: 'uom', systemQty: 'system_qty',
            actualQty: 'actual_qty', unitCost: 'unit_cost',
            countedAt: 'counted_at', countedBy: 'counted_by',
            notes: 'notes', status: 'status', sortOrder: 'sort_order',
        };
        for (const [k, col] of Object.entries(map)) {
            if (input[k] !== undefined) updates[col] = input[k];
        }
        const { data, error } = await this.db.from('inv_opname_lines').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteOpnameLine(id: string) {
        const { error } = await this.db.from('inv_opname_lines').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getOpnameStats(tenantId: string) {
        const { data, error } = await this.db.from('inv_opname_sessions')
            .select('status, total_variance_value').eq('tenant_id', tenantId);
        if (error) throw error;
        const sessions = data || [];
        const total = sessions.length;
        const draft = sessions.filter(s => s.status === 'draft').length;
        const counting = sessions.filter(s => s.status === 'counting').length;
        const review = sessions.filter(s => s.status === 'review').length;
        const completed = sessions.filter(s => s.status === 'completed').length;
        const totalVariance = sessions.reduce((sum, s) => sum + (Number(s.total_variance_value) || 0), 0);
        return { totalSessions: total, draft, counting, review, completed, totalVariance };
    }

    // ═══════════════════════════════════════════════════════
    // ─── BOOKING & TICKETING ─────────────────────────────
    // ═══════════════════════════════════════════════════════

    async getSchedules(tenantId: string) {
        const { data, error } = await this.db.from('booking_schedules')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createSchedule(tenantId: string, input: Record<string, any>) {
        const row: any = {
            tenant_id: tenantId, item_id: input.itemId || null, schedule_code: input.scheduleCode, route_name: input.routeName,
            origin: input.origin, destination: input.destination,
            departure_time: input.departureTime, arrival_time: input.arrivalTime,
            duration_minutes: input.durationMinutes, capacity: input.capacity || 100,
            vehicle_name: input.vehicleName, vessel_type: input.vesselType,
            price_economy: input.priceEconomy || 0, price_business: input.priceBusiness || 0,
            price_vip: input.priceVip || 0,
            operating_days: input.operatingDays || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
            auto_generate_days: input.autoGenerateDays || 14,
            notes: input.notes, status: input.status || 'active',
        };
        const { data, error } = await this.db.from('booking_schedules').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateSchedule(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            itemId: 'item_id', scheduleCode: 'schedule_code', routeName: 'route_name', origin: 'origin',
            destination: 'destination', departureTime: 'departure_time', arrivalTime: 'arrival_time',
            durationMinutes: 'duration_minutes', capacity: 'capacity',
            vehicleName: 'vehicle_name', vesselType: 'vessel_type',
            priceEconomy: 'price_economy', priceBusiness: 'price_business', priceVip: 'price_vip',
            operatingDays: 'operating_days', autoGenerateDays: 'auto_generate_days',
            notes: 'notes', status: 'status',
        };
        for (const [k, col] of Object.entries(map)) { if (input[k] !== undefined) updates[col] = input[k]; }
        const { data, error } = await this.db.from('booking_schedules').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteSchedule(id: string) {
        const { error } = await this.db.from('booking_schedules').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── Auto-generate future occurrences ─────────────────────────────
    async autoGenerateOccurrences(tenantId: string) {
        const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const { data: schedules, error: sErr } = await this.db.from('booking_schedules')
            .select('id, capacity, departure_time, operating_days, auto_generate_days')
            .eq('tenant_id', tenantId).eq('status', 'active');
        if (sErr || !schedules?.length) return;

        for (const sched of schedules) {
            const days: string[] = sched.operating_days || DAY_NAMES;
            const lookAhead: number = sched.auto_generate_days || 14;
            const { data: existing } = await this.db.from('booking_occurrences')
                .select('departure_date').eq('schedule_id', sched.id);
            const existingDates = new Set((existing || []).map((r: any) => r.departure_date));

            const today = new Date();
            const rows: any[] = [];
            for (let i = 0; i <= lookAhead; i++) {
                const dt = new Date(today);
                dt.setDate(today.getDate() + i);
                const dayName = DAY_NAMES[dt.getDay()];
                const dateStr = dt.toISOString().split('T')[0];
                if (days.includes(dayName) && !existingDates.has(dateStr)) {
                    rows.push({
                        schedule_id: sched.id,
                        departure_date: dateStr,
                        departure_time: sched.departure_time,
                        total_capacity: sched.capacity || 100,
                        booked_count: 0,
                        checked_in_count: 0,
                        status: 'scheduled',
                    });
                }
            }
            if (rows.length > 0) {
                await this.db.from('booking_occurrences').insert(rows);
            }
        }
    }

    async getOccurrences(scheduleId?: string, tenantId?: string) {
        // Lazy auto-generate future occurrences
        if (tenantId) {
            await this.autoGenerateOccurrences(tenantId);
        }
        let query = this.db.from('booking_occurrences').select('*').order('departure_date');
        if (scheduleId) query = query.eq('schedule_id', scheduleId);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async createOccurrence(scheduleId: string, input: Record<string, any>) {
        const row: any = { schedule_id: scheduleId, departure_date: input.departureDate,
            departure_time: input.departureTime, total_capacity: input.totalCapacity || 100,
            notes: input.notes, status: input.status || 'scheduled' };
        const { data, error } = await this.db.from('booking_occurrences').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateOccurrenceStatus(id: string, status: string) {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'departed') updates.actual_departure = new Date().toISOString();
        if (status === 'completed') updates.actual_arrival = new Date().toISOString();
        const { data, error } = await this.db.from('booking_occurrences').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async getBookings(tenantId: string, occurrenceId?: string) {
        let query = this.db.from('bookings').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (occurrenceId) query = query.eq('occurrence_id', occurrenceId);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async createBooking(tenantId: string, input: Record<string, any>) {
        const passengerCount = input.passengerCount || 1;

        // ── Capacity check ──
        if (input.occurrenceId) {
            const { data: occ, error: occErr } = await this.db.from('booking_occurrences')
                .select('total_capacity, booked_count').eq('id', input.occurrenceId).single();
            if (occErr) throw occErr;
            if (occ && (occ.booked_count || 0) + passengerCount > (occ.total_capacity || 0)) {
                throw new Error(`This departure is sold out. Only ${(occ.total_capacity || 0) - (occ.booked_count || 0)} seats remaining.`);
            }
        }

        const row: any = {
            tenant_id: tenantId, booking_code: input.bookingCode,
            schedule_id: input.scheduleId, occurrence_id: input.occurrenceId,
            customer_name: input.customerName, customer_email: input.customerEmail,
            customer_phone: input.customerPhone, passenger_count: passengerCount,
            class: input.class || 'economy', total_amount: input.totalAmount || 0,
            paid_amount: input.paidAmount || 0, notes: input.notes, status: input.status || 'pending',
        };
        const { data, error } = await this.db.from('bookings').insert(row).select().single();
        if (error) throw error;

        // ── Increment booked_count on occurrence ──
        if (input.occurrenceId) {
            const { data: cur } = await this.db.from('booking_occurrences')
                .select('booked_count').eq('id', input.occurrenceId).single();
            const newCount = (cur?.booked_count || 0) + passengerCount;
            await this.db.from('booking_occurrences').update({
                booked_count: newCount,
                updated_at: new Date().toISOString(),
            }).eq('id', input.occurrenceId);
        }

        return data;
    }

    async updateBookingStatus(id: string, status: string) {
        // Fetch the booking first to get passenger count and occurrence
        const { data: booking, error: bErr } = await this.db.from('bookings')
            .select('passenger_count, occurrence_id, status').eq('id', id).single();
        if (bErr) throw bErr;

        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'checked_in') updates.check_in_time = new Date().toISOString();
        const { data, error } = await this.db.from('bookings').update(updates).eq('id', id).select().single();
        if (error) throw error;

        // ── Update occurrence counts ──
        if (booking?.occurrence_id) {
            const { data: occ } = await this.db.from('booking_occurrences')
                .select('booked_count, checked_in_count').eq('id', booking.occurrence_id).single();
            if (occ) {
                const occUpdates: any = { updated_at: new Date().toISOString() };
                if (status === 'cancelled' && booking.status !== 'cancelled') {
                    occUpdates.booked_count = Math.max(0, (occ.booked_count || 0) - (booking.passenger_count || 1));
                }
                if (status === 'checked_in') {
                    occUpdates.checked_in_count = (occ.checked_in_count || 0) + (booking.passenger_count || 1);
                }
                if (Object.keys(occUpdates).length > 1) {
                    await this.db.from('booking_occurrences').update(occUpdates).eq('id', booking.occurrence_id);
                }
            }
        }

        return data;
    }

    async getPassengers(bookingId: string) {
        const { data, error } = await this.db.from('booking_passengers')
            .select('*').eq('booking_id', bookingId).order('created_at');
        if (error) throw error;
        return data;
    }

    async addPassenger(bookingId: string, input: Record<string, any>) {
        const row: any = { booking_id: bookingId, name: input.name,
            id_number: input.idNumber, nationality: input.nationality,
            seat_label: input.seatLabel, class: input.class || 'economy', notes: input.notes };
        const { data, error } = await this.db.from('booking_passengers').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async getBookingStats(tenantId: string) {
        const [schedRes, bookRes, occRes] = await Promise.all([
            this.db.from('booking_schedules').select('status', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('bookings').select('status, total_amount', { count: 'exact' }).eq('tenant_id', tenantId),
            this.db.from('booking_occurrences').select('status, booked_count, checked_in_count'),
        ]);
        const schedules = schedRes.data || [];
        const bookings = bookRes.data || [];
        const occurrences = occRes.data || [];
        const totalRevenue = bookings.reduce((s, b) => s + (Number(b.total_amount) || 0), 0);
        const confirmed = bookings.filter(b => b.status === 'confirmed').length;
        const checkedIn = bookings.filter(b => b.status === 'checked_in').length;
        const upcoming = occurrences.filter(o => o.status === 'scheduled').length;
        return {
            totalSchedules: schedules.length, totalBookings: bookings.length,
            confirmedBookings: confirmed, checkedInBookings: checkedIn,
            totalOccurrences: occurrences.length, upcomingDepartures: upcoming,
            totalRevenue,
        };
    }

    // ═══════════════════════════════════════════════════════
    // ─── RENTAL ENGINE ───────────────────────────────────
    // ═══════════════════════════════════════════════════════

    async getRentalAssets(tenantId: string) {
        const { data, error } = await this.db.from('rental_assets')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createRentalAsset(tenantId: string, input: Record<string, any>) {
        const row: any = {
            tenant_id: tenantId, asset_code: input.assetCode, asset_name: input.assetName,
            serial_number: input.serialNumber, category: input.category,
            condition: input.condition || 'excellent',
            purchase_date: input.purchaseDate, purchase_cost: input.purchaseCost,
            current_location: input.currentLocation,
            daily_rate: input.dailyRate || 0, deposit_amount: input.depositAmount || 0,
            notes: input.notes, status: input.status || 'available',
        };
        const { data, error } = await this.db.from('rental_assets').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateRentalAsset(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            assetCode: 'asset_code', assetName: 'asset_name', serialNumber: 'serial_number',
            category: 'category', condition: 'condition', currentLocation: 'current_location',
            dailyRate: 'daily_rate', depositAmount: 'deposit_amount',
            lastMaintenanceDate: 'last_maintenance_date', nextMaintenanceDate: 'next_maintenance_date',
            notes: 'notes', status: 'status',
        };
        for (const [k, col] of Object.entries(map)) { if (input[k] !== undefined) updates[col] = input[k]; }
        const { data, error } = await this.db.from('rental_assets').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteRentalAsset(id: string) {
        const { error } = await this.db.from('rental_assets').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getRentalContracts(tenantId: string) {
        const { data, error } = await this.db.from('rental_contracts')
            .select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createRentalContract(tenantId: string, input: Record<string, any>) {
        const row: any = {
            tenant_id: tenantId, contract_code: input.contractCode,
            asset_id: input.assetId, asset_name: input.assetName,
            customer_name: input.customerName, customer_email: input.customerEmail,
            customer_phone: input.customerPhone, customer_id_number: input.customerIdNumber,
            checkout_date: input.checkoutDate, expected_return_date: input.expectedReturnDate,
            daily_rate: input.dailyRate || 0, deposit_amount: input.depositAmount || 0,
            subtotal: input.subtotal || 0, total_charge: input.totalCharge || 0,
            checkout_condition: input.checkoutCondition, checkout_notes: input.checkoutNotes,
            status: 'active',
        };
        const { data, error } = await this.db.from('rental_contracts').insert(row).select().single();
        if (error) throw error;
        // Also update asset status to rented
        await this.db.from('rental_assets').update({ status: 'rented', updated_at: new Date().toISOString() }).eq('id', input.assetId);
        return data;
    }

    async returnRentalAsset(contractId: string, input: Record<string, any>) {
        const updates: any = {
            actual_return_date: input.actualReturnDate || new Date().toISOString().split('T')[0],
            return_condition: input.returnCondition, return_notes: input.returnNotes,
            returned_by: input.returnedBy, late_fee: input.lateFee || 0,
            damage_fee: input.damageFee || 0, deposit_returned: input.depositReturned || 0,
            total_charge: input.totalCharge || 0, status: 'returned',
            updated_at: new Date().toISOString(),
        };
        const { data, error } = await this.db.from('rental_contracts').update(updates).eq('id', contractId).select().single();
        if (error) throw error;
        // Release the asset
        if (data?.asset_id) {
            await this.db.from('rental_assets').update({
                status: 'available', condition: input.returnCondition || 'good',
                updated_at: new Date().toISOString(),
            }).eq('id', data.asset_id);
        }
        return data;
    }

    async deleteRentalContract(id: string) {
        const { error } = await this.db.from('rental_contracts').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async cancelRentalContract(contractId: string) {
        const { data: contract, error: fetchErr } = await this.db.from('rental_contracts')
            .select('asset_id, status').eq('id', contractId).single();
        if (fetchErr) throw fetchErr;
        if (contract.status === 'returned' || contract.status === 'cancelled') {
            throw new Error(`Contract is already ${contract.status}`);
        }
        const { data, error } = await this.db.from('rental_contracts').update({
            status: 'cancelled', updated_at: new Date().toISOString(),
        }).eq('id', contractId).select().single();
        if (error) throw error;
        // Release the asset back to available
        if (contract.asset_id) {
            await this.db.from('rental_assets').update({
                status: 'available', updated_at: new Date().toISOString(),
            }).eq('id', contract.asset_id);
        }
        return data;
    }

    async getRentalStats(tenantId: string) {
        const [assetRes, contractRes] = await Promise.all([
            this.db.from('rental_assets').select('status, daily_rate, total_revenue').eq('tenant_id', tenantId),
            this.db.from('rental_contracts').select('status, total_charge, late_fee').eq('tenant_id', tenantId),
        ]);
        const assets = assetRes.data || [];
        const contracts = contractRes.data || [];
        const available = assets.filter(a => a.status === 'available').length;
        const rented = assets.filter(a => a.status === 'rented').length;
        const maintenance = assets.filter(a => a.status === 'maintenance').length;
        const totalRevenue = contracts.reduce((s, c) => s + (Number(c.total_charge) || 0), 0);
        const activeContracts = contracts.filter(c => c.status === 'active').length;
        const overdue = contracts.filter(c => c.status === 'overdue').length;
        return {
            totalAssets: assets.length, available, rented, maintenance,
            totalContracts: contracts.length, activeContracts, overdue, totalRevenue,
        };
    }

    // ═══════════════════════════════════════════════════════
    // E-COMMERCE MODULE
    // ═══════════════════════════════════════════════════════

    // ─── Customers ─────────────────────────────────────────
    async getEcomCustomers(tenantId: string, filters?: { search?: string; customerType?: string; status?: string }) {
        let query = this.db.from('ecom_customers').select('*').eq('tenant_id', tenantId);
        if (filters?.customerType) query = query.eq('customer_type', filters.customerType);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,customer_code.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createEcomCustomer(tenantId: string, input: {
        customerCode: string; firstName: string; lastName?: string;
        email?: string; phone?: string; company?: string; address?: string;
        city?: string; province?: string; postalCode?: string;
        idNumber?: string; customerType?: string; notes?: string; tags?: any;
        accountId?: string; contactId?: string;
    }) {
        const { data, error } = await this.db.from('ecom_customers').insert({
            tenant_id: tenantId, customer_code: input.customerCode,
            first_name: input.firstName, last_name: input.lastName,
            email: input.email, phone: input.phone, company: input.company,
            address: input.address, city: input.city, province: input.province,
            postal_code: input.postalCode, id_number: input.idNumber,
            customer_type: input.customerType || 'individual',
            notes: input.notes, tags: input.tags,
            account_id: input.accountId || null,
            contact_id: input.contactId || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateEcomCustomer(id: string, input: Record<string, any>) {
        const mapped: Record<string, any> = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            customerCode: 'customer_code', firstName: 'first_name', lastName: 'last_name',
            email: 'email', phone: 'phone', company: 'company', address: 'address',
            city: 'city', province: 'province', postalCode: 'postal_code',
            idNumber: 'id_number', customerType: 'customer_type', status: 'status',
            notes: 'notes', tags: 'tags',
            accountId: 'account_id', contactId: 'contact_id',
        };
        for (const [k, v] of Object.entries(input)) { if (map[k] && v !== undefined) mapped[map[k]] = v; }
        const { data, error } = await this.db.from('ecom_customers').update(mapped).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteEcomCustomer(id: string) {
        const { error } = await this.db.from('ecom_customers').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── Orders ────────────────────────────────────────────
    async getEcomOrders(tenantId: string, filters?: { status?: string; paymentStatus?: string; search?: string }) {
        let query = this.db.from('ecom_orders').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);
        if (filters?.search) query = query.or(
            `order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getEcomOrder(id: string) {
        const { data, error } = await this.db.from('ecom_orders').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createEcomOrder(tenantId: string, input: {
        orderNumber: string; customerId?: string; customerName?: string;
        customerEmail?: string; customerPhone?: string;
        shippingAddress?: string; shippingCity?: string; shippingProvince?: string;
        shippingPostalCode?: string; shippingMethod?: string; shippingCost?: number;
        subtotal?: number; taxAmount?: number; discountAmount?: number;
        totalAmount?: number; paymentMethod?: string; notes?: string; source?: string;
    }) {
        const { data, error } = await this.db.from('ecom_orders').insert({
            tenant_id: tenantId, order_number: input.orderNumber,
            customer_id: input.customerId, customer_name: input.customerName,
            customer_email: input.customerEmail, customer_phone: input.customerPhone,
            shipping_address: input.shippingAddress, shipping_city: input.shippingCity,
            shipping_province: input.shippingProvince, shipping_postal_code: input.shippingPostalCode,
            shipping_method: input.shippingMethod, shipping_cost: input.shippingCost || 0,
            subtotal: input.subtotal || 0, tax_amount: input.taxAmount || 0,
            discount_amount: input.discountAmount || 0, total_amount: input.totalAmount || 0,
            payment_method: input.paymentMethod, notes: input.notes,
            source: input.source || 'admin',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateEcomOrderStatus(id: string, newStatus: string) {
        // Capture previous status BEFORE updating
        const { data: prev } = await this.db.from('ecom_orders').select('status').eq('id', id).single();
        const oldStatus = prev?.status || '';

        const ts: Record<string, any> = { status: newStatus, updated_at: new Date().toISOString() };
        if (newStatus === 'confirmed') ts.confirmed_at = new Date().toISOString();
        if (newStatus === 'shipped') ts.shipped_at = new Date().toISOString();
        if (newStatus === 'delivered') ts.delivered_at = new Date().toISOString();
        if (newStatus === 'completed') ts.completed_at = new Date().toISOString();
        if (newStatus === 'cancelled') ts.cancelled_at = new Date().toISOString();
        const { data, error } = await this.db.from('ecom_orders').update(ts).eq('id', id).select().single();
        if (error) throw error;

        // ─── Fulfillment: deduct stock on processing ───
        if (newStatus === 'processing') {
            try {
                const { data: items } = await this.db.from('ecom_order_items').select('*').eq('order_id', id);
                if (items) {
                    for (const item of items as any[]) {
                        if (item.item_id && ['physical', 'consumable'].includes(item.fulfillment_type || 'physical')) {
                            await this.createStockMovement(data.tenant_id, {
                                itemId: item.item_id,
                                movementType: 'SALE_OUT',
                                quantity: item.quantity || 1,
                                unitCost: item.unit_price || 0,
                                reference: data.order_number,
                                referenceType: 'ecom_order',
                                referenceId: id,
                                notes: `Order ${data.order_number}: Released ${item.quantity} × ${item.item_name}`,
                            });
                        }
                    }
                }
            } catch (e) {
                this.logger.warn(`Failed to create stock movements for order ${id}`, e);
            }
        }

        // ─── Stock restoration on cancel (if stock was already deducted) ───
        if (newStatus === 'cancelled' && ['processing', 'shipped'].includes(oldStatus)) {
            try {
                const { data: items } = await this.db.from('ecom_order_items').select('*').eq('order_id', id);
                if (items) {
                    for (const item of items as any[]) {
                        if (item.item_id && ['physical', 'consumable'].includes(item.fulfillment_type || 'physical')) {
                            await this.createStockMovement(data.tenant_id, {
                                itemId: item.item_id,
                                movementType: 'RETURN_IN',
                                quantity: item.quantity || 1,
                                unitCost: item.unit_price || 0,
                                reference: data.order_number,
                                referenceType: 'ecom_order_cancel',
                                referenceId: id,
                                notes: `Order ${data.order_number} CANCELLED: Restored ${item.quantity} × ${item.item_name}`,
                            });
                        }
                    }
                }
                this.logger.log(`Stock restored for cancelled order ${data.order_number}`);
            } catch (e) {
                this.logger.warn(`Failed to restore stock for cancelled order ${id}`, e);
            }
        }

        return data;
    }

    async deleteEcomOrder(id: string) {
        const { error } = await this.db.from('ecom_orders').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── Order Items ───────────────────────────────────────
    async getEcomOrderItems(orderId: string) {
        const { data, error } = await this.db.from('ecom_order_items').select('*').eq('order_id', orderId).order('created_at');
        if (error) throw error;
        return data;
    }

    async addEcomOrderItem(orderId: string, input: {
        itemId?: string; itemName: string; itemSku?: string;
        fulfillmentType?: string; fulfillmentRef?: string;
        quantity?: number; unitPrice?: number; discount?: number;
        tax?: number; subtotal?: number; variantInfo?: any; notes?: string;
    }) {
        const { data, error } = await this.db.from('ecom_order_items').insert({
            order_id: orderId, item_id: input.itemId,
            item_name: input.itemName, item_sku: input.itemSku,
            fulfillment_type: input.fulfillmentType || 'physical',
            fulfillment_ref: input.fulfillmentRef,
            quantity: input.quantity || 1, unit_price: input.unitPrice || 0,
            discount: input.discount || 0, tax: input.tax || 0,
            subtotal: input.subtotal || 0, variant_info: input.variantInfo,
            notes: input.notes,
        }).select().single();
        if (error) throw error;
        return data;
    }

    // ─── Store Settings ────────────────────────────────────
    async getStoreSettings(tenantId: string) {
        const { data, error } = await this.db.from('ecom_store_settings').select('*').eq('tenant_id', tenantId).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async updateStoreSettings(tenantId: string, input: Record<string, any>) {
        const mapped: Record<string, any> = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            storeName: 'store_name', storeEmail: 'store_email', storePhone: 'store_phone',
            storeAddress: 'store_address', defaultCurrency: 'default_currency',
            taxRate: 'tax_rate', taxIncluded: 'tax_included',
            shippingEnabled: 'shipping_enabled', defaultShippingCost: 'default_shipping_cost',
            freeShippingThreshold: 'free_shipping_threshold', paymentMethods: 'payment_methods',
            fulfillmentPhysical: 'fulfillment_physical', fulfillmentTicket: 'fulfillment_ticket',
            fulfillmentScheduled: 'fulfillment_scheduled', fulfillmentRental: 'fulfillment_rental',
            lowStockAlert: 'low_stock_alert', orderPrefix: 'order_prefix', invoicePrefix: 'invoice_prefix',
            notes: 'notes',
        };
        for (const [k, v] of Object.entries(input)) { if (map[k] && v !== undefined) mapped[map[k]] = v; }
        const { data, error } = await this.db.from('ecom_store_settings').update(mapped).eq('tenant_id', tenantId).select().single();
        if (error) throw error;
        return data;
    }

    // ─── E-Commerce Stats ──────────────────────────────────
    async getEcomStats(tenantId: string) {
        const [ordersResult, customersResult] = await Promise.all([
            this.db.from('ecom_orders').select('*').eq('tenant_id', tenantId),
            this.db.from('ecom_customers').select('*').eq('tenant_id', tenantId),
        ]);
        if (ordersResult.error) throw ordersResult.error;
        if (customersResult.error) throw customersResult.error;
        const orders = ordersResult.data || [];
        const customers = customersResult.data || [];

        const totalOrders = orders.length;
        const pending = orders.filter((o: any) => o.status === 'pending').length;
        const confirmed = orders.filter((o: any) => o.status === 'confirmed').length;
        const processing = orders.filter((o: any) => o.status === 'processing').length;
        const shipped = orders.filter((o: any) => o.status === 'shipped').length;
        const delivered = orders.filter((o: any) => o.status === 'delivered').length;
        const completed = orders.filter((o: any) => o.status === 'completed').length;
        const cancelled = orders.filter((o: any) => o.status === 'cancelled').length;
        const totalRevenue = orders.filter((o: any) => o.payment_status === 'paid')
            .reduce((s: number, o: any) => s + (parseFloat(o.total_amount) || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / Math.max(1, orders.filter((o: any) => o.payment_status === 'paid').length) : 0;
        const totalCustomers = customers.length;
        const activeCustomers = customers.filter((c: any) => c.status === 'active').length;

        return {
            totalOrders, pending, confirmed, processing, shipped, delivered, completed, cancelled,
            totalRevenue, avgOrderValue, totalCustomers, activeCustomers,
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ─── RETURNS & REFUNDS ────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getReturns(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('ecom_returns').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `return_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,order_number.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getReturn(id: string) {
        const { data, error } = await this.db.from('ecom_returns').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createReturn(tenantId: string, input: Record<string, any>) {
        const returnNumber = await this.generateReturnNumber(tenantId);
        const { data, error } = await this.db.from('ecom_returns').insert({
            tenant_id: tenantId,
            return_number: returnNumber,
            order_id: input.orderId,
            order_number: input.orderNumber,
            customer_name: input.customerName,
            customer_email: input.customerEmail,
            reason: input.reason || 'changed_mind',
            resolution: input.resolution || 'refund',
            subtotal: input.subtotal || 0,
            refund_amount: input.refundAmount || 0,
            restocking_fee: input.restockingFee || 0,
            refund_method: input.refundMethod || 'original_payment',
            notes: input.notes,
            internal_notes: input.internalNotes,
        }).select().single();
        if (error) throw error;

        if (input.items?.length) {
            const items = input.items.map((item: any) => ({
                return_id: data.id,
                order_item_id: item.orderItemId || null,
                item_id: item.itemId || null,
                item_name: item.itemName,
                item_sku: item.itemSku || null,
                quantity: item.quantity || 1,
                unit_price: item.unitPrice || 0,
                subtotal: (item.quantity || 1) * (item.unitPrice || 0),
                condition: item.condition || 'unopened',
                restock: item.restock !== false,
                reason: item.reason || null,
                notes: item.notes || null,
            }));
            await this.db.from('ecom_return_items').insert(items);
        }
        return data;
    }

    async updateReturnStatus(id: string, status: string) {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'approved') updates.approved_at = new Date().toISOString();
        if (status === 'received') updates.received_at = new Date().toISOString();
        if (status === 'completed') updates.completed_at = new Date().toISOString();

        const { data, error } = await this.db.from('ecom_returns').update(updates).eq('id', id).select().single();
        if (error) throw error;

        // On completion: restock items and update refund status
        if (status === 'completed') {
            try {
                const { data: items } = await this.db.from('ecom_return_items').select('*').eq('return_id', id);
                if (items) {
                    for (const item of items as any[]) {
                        if (item.item_id && item.restock) {
                            await this.createStockMovement(data.tenant_id, {
                                itemId: item.item_id,
                                movementType: 'RETURN_IN',
                                quantity: item.quantity || 1,
                                unitCost: item.unit_price || 0,
                                reference: data.return_number,
                                referenceType: 'ecom_return',
                                referenceId: id,
                                notes: `Return ${data.return_number}: Restocked ${item.quantity} × ${item.item_name}`,
                            });
                        }
                    }
                }
                // Mark refund as processed
                await this.db.from('ecom_returns').update({
                    refund_status: 'refunded',
                    updated_at: new Date().toISOString(),
                }).eq('id', id);
            } catch (e) {
                this.logger.warn(`Failed to process return restock for ${id}`, e);
            }
        }
        return data;
    }

    async deleteReturn(id: string) {
        const { error } = await this.db.from('ecom_returns').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getReturnItems(returnId: string) {
        const { data, error } = await this.db.from('ecom_return_items').select('*').eq('return_id', returnId).order('created_at');
        if (error) throw error;
        return data;
    }

    async getReturnStats(tenantId: string) {
        const { data: returns } = await this.db.from('ecom_returns').select('*').eq('tenant_id', tenantId);
        const all = returns || [];
        return {
            totalReturns: all.length,
            requested: all.filter((r: any) => r.status === 'requested').length,
            approved: all.filter((r: any) => r.status === 'approved').length,
            received: all.filter((r: any) => r.status === 'received').length,
            completed: all.filter((r: any) => r.status === 'completed').length,
            rejected: all.filter((r: any) => r.status === 'rejected').length,
            totalRefunded: all.filter((r: any) => r.refund_status === 'refunded')
                .reduce((s: number, r: any) => s + (parseFloat(r.refund_amount) || 0), 0),
        };
    }

    private async generateReturnNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const { count } = await this.db.from('ecom_returns')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `RET-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── PRODUCT PACKAGES ─────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getPackages(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('ecom_packages').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createPackage(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('ecom_packages').insert({
            tenant_id: tenantId,
            name: input.name,
            sku: input.sku || null,
            description: input.description || null,
            package_price: input.packagePrice || 0,
            regular_price: input.regularPrice || 0,
            savings: input.savings || 0,
            media_ids: input.mediaIds || [],
            tags: input.tags || [],
            max_quantity: input.maxQuantity || 0,
            notes: input.notes || null,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;

        if (input.items?.length) {
            const items = input.items.map((item: any, i: number) => ({
                package_id: data.id,
                item_id: item.itemId || null,
                item_name: item.itemName,
                item_sku: item.itemSku || null,
                quantity: item.quantity || 1,
                unit_price: item.unitPrice || 0,
                sort_order: i,
            }));
            await this.db.from('ecom_package_items').insert(items);
        }
        return data;
    }

    async updatePackage(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            name: 'name', sku: 'sku', description: 'description',
            packagePrice: 'package_price', regularPrice: 'regular_price', savings: 'savings',
            mediaIds: 'media_ids', tags: 'tags', maxQuantity: 'max_quantity',
            notes: 'notes', status: 'status',
        };
        for (const [k, v] of Object.entries(map)) {
            if (input[k] !== undefined) updates[v] = input[k];
        }
        const { data, error } = await this.db.from('ecom_packages').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deletePackage(id: string) {
        const { error } = await this.db.from('ecom_packages').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getPackageItems(packageId: string) {
        const { data, error } = await this.db.from('ecom_package_items').select('*').eq('package_id', packageId).order('sort_order');
        if (error) throw error;
        return data;
    }

    async addPackageItem(packageId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('ecom_package_items').insert({
            package_id: packageId,
            item_id: input.itemId || null,
            item_name: input.itemName,
            item_sku: input.itemSku || null,
            quantity: input.quantity || 1,
            unit_price: input.unitPrice || 0,
            sort_order: input.sortOrder || 0,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async deletePackageItem(id: string) {
        const { error } = await this.db.from('ecom_package_items').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getPackageStats(tenantId: string) {
        const { data } = await this.db.from('ecom_packages').select('*').eq('tenant_id', tenantId);
        const all = data || [];
        return {
            totalPackages: all.length,
            active: all.filter((p: any) => p.status === 'active').length,
            inactive: all.filter((p: any) => p.status === 'inactive').length,
            totalSold: all.reduce((s: number, p: any) => s + (p.times_sold || 0), 0),
            totalSavings: all.reduce((s: number, p: any) => s + (parseFloat(p.savings) || 0), 0),
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ─── OFFERS & PROMOTIONS ──────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getOffers(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('ecom_offers').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createOffer(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('ecom_offers').insert({
            tenant_id: tenantId,
            name: input.name,
            description: input.description || null,
            offer_type: input.offerType || 'flash_sale',
            discount_type: input.discountType || 'percentage',
            discount_value: input.discountValue || 0,
            min_order_amount: input.minOrderAmount || 0,
            max_uses: input.maxUses || 0,
            start_date: input.startDate || null,
            end_date: input.endDate || null,
            applies_to: input.appliesTo || 'all_products',
            target_ids: input.targetIds || [],
            banner_text: input.bannerText || null,
            badge_text: input.badgeText || null,
            notes: input.notes || null,
            status: input.status || 'draft',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateOffer(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            name: 'name', description: 'description', offerType: 'offer_type',
            discountType: 'discount_type', discountValue: 'discount_value',
            minOrderAmount: 'min_order_amount', maxUses: 'max_uses',
            startDate: 'start_date', endDate: 'end_date',
            appliesTo: 'applies_to', targetIds: 'target_ids',
            bannerText: 'banner_text', badgeText: 'badge_text',
            notes: 'notes', status: 'status',
        };
        for (const [k, v] of Object.entries(map)) {
            if (input[k] !== undefined) updates[v] = input[k];
        }
        const { data, error } = await this.db.from('ecom_offers').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteOffer(id: string) {
        const { error } = await this.db.from('ecom_offers').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getOfferStats(tenantId: string) {
        const { data } = await this.db.from('ecom_offers').select('*').eq('tenant_id', tenantId);
        const all = data || [];
        const now = new Date();
        return {
            totalOffers: all.length,
            active: all.filter((o: any) => o.status === 'active').length,
            draft: all.filter((o: any) => o.status === 'draft').length,
            expired: all.filter((o: any) => o.end_date && new Date(o.end_date) < now).length,
            totalUses: all.reduce((s: number, o: any) => s + (o.current_uses || 0), 0),
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ─── DISCOUNT SYSTEM ──────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getDiscounts(tenantId: string, filters?: { status?: string; search?: string }) {
        let query = this.db.from('ecom_discounts').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createDiscount(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('ecom_discounts').insert({
            tenant_id: tenantId,
            code: input.code || null,
            name: input.name,
            description: input.description || null,
            discount_type: input.discountType || 'percentage',
            discount_value: input.discountValue || 0,
            min_order_amount: input.minOrderAmount || 0,
            max_discount_amount: input.maxDiscountAmount || 0,
            usage_limit: input.usageLimit || 0,
            valid_from: input.validFrom || null,
            valid_until: input.validUntil || null,
            auto_apply: input.autoApply || false,
            applies_to: input.appliesTo || 'order',
            target_ids: input.targetIds || [],
            stackable: input.stackable || false,
            notes: input.notes || null,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateDiscount(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            code: 'code', name: 'name', description: 'description',
            discountType: 'discount_type', discountValue: 'discount_value',
            minOrderAmount: 'min_order_amount', maxDiscountAmount: 'max_discount_amount',
            usageLimit: 'usage_limit', validFrom: 'valid_from', validUntil: 'valid_until',
            autoApply: 'auto_apply', appliesTo: 'applies_to', targetIds: 'target_ids',
            stackable: 'stackable', notes: 'notes', status: 'status',
        };
        for (const [k, v] of Object.entries(map)) {
            if (input[k] !== undefined) updates[v] = input[k];
        }
        const { data, error } = await this.db.from('ecom_discounts').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteDiscount(id: string) {
        const { error } = await this.db.from('ecom_discounts').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getDiscountStats(tenantId: string) {
        const { data } = await this.db.from('ecom_discounts').select('*').eq('tenant_id', tenantId);
        const all = data || [];
        const now = new Date();
        return {
            totalDiscounts: all.length,
            active: all.filter((d: any) => d.status === 'active').length,
            expired: all.filter((d: any) => d.valid_until && new Date(d.valid_until) < now).length,
            coupons: all.filter((d: any) => d.code).length,
            autoApply: all.filter((d: any) => d.auto_apply).length,
            totalUsed: all.reduce((s: number, d: any) => s + (d.times_used || 0), 0),
        };
    }

    // ═══════════════════════════════════════════════════════════
    // ─── STOCK OPERATIONS (Manual Release/Receive) ────────────
    // ═══════════════════════════════════════════════════════════

    async getStockOperations(tenantId: string, filters?: {
        operationType?: string; status?: string; search?: string;
    }) {
        let query = this.db.from('inv_stock_operations').select('*').eq('tenant_id', tenantId);
        if (filters?.operationType) query = query.eq('operation_type', filters.operationType);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `operation_number.ilike.%${filters.search}%,item_name.ilike.%${filters.search}%,reason.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createStockOperation(tenantId: string, input: Record<string, any>) {
        const opNumber = await this.generateStockOpNumber(tenantId);
        // Look up item name if not provided
        let itemName = input.itemName;
        if (!itemName && input.itemId) {
            const { data: item } = await this.db.from('inv_items').select('name').eq('id', input.itemId).single();
            itemName = item?.name || 'Unknown';
        }

        const { data, error } = await this.db.from('inv_stock_operations').insert({
            tenant_id: tenantId,
            operation_number: opNumber,
            operation_type: input.operationType,
            item_id: input.itemId,
            item_name: itemName,
            warehouse_id: input.warehouseId || 'default',
            quantity: input.quantity,
            unit_cost: input.unitCost ?? 0,
            reason: input.reason || null,
            reference: input.reference || null,
            batch_number: input.batchNumber || null,
            expiry_date: input.expiryDate || null,
            approved_by: input.approvedBy || null,
            notes: input.notes || null,
            status: 'completed',
            created_by: input.createdBy || null,
        }).select().single();
        if (error) throw error;

        // Auto-create stock movement
        const movementType = ['receive', 'adjust_in'].includes(input.operationType)
            ? 'MANUAL_IN' : 'MANUAL_OUT';
        await this.createStockMovement(tenantId, {
            itemId: input.itemId,
            warehouseId: input.warehouseId || 'default',
            movementType,
            quantity: input.quantity,
            unitCost: input.unitCost ?? 0,
            reference: opNumber,
            referenceType: 'stock_operation',
            referenceId: data.id,
            batchNumber: input.batchNumber,
            expiryDate: input.expiryDate,
            notes: `${input.operationType}: ${input.reason || ''} ${input.notes || ''}`.trim(),
        });

        return data;
    }

    async deleteStockOperation(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_stock_operations').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async getStockOperationStats(tenantId: string) {
        const { data: all } = await this.db.from('inv_stock_operations')
            .select('*').eq('tenant_id', tenantId);
        const ops = all || [];
        return {
            totalOperations: ops.length,
            receives: ops.filter((o: any) => o.operation_type === 'receive').length,
            releases: ops.filter((o: any) => o.operation_type === 'release').length,
            adjustments: ops.filter((o: any) => ['adjust_in', 'adjust_out'].includes(o.operation_type)).length,
            writeOffs: ops.filter((o: any) => o.operation_type === 'write_off').length,
            donations: ops.filter((o: any) => o.operation_type === 'donate').length,
        };
    }

    private async generateStockOpNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const { count } = await this.db.from('inv_stock_operations')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `SOP-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
    }

    // ═══════════════════════════════════════════════════════════
    // ─── FIXED ASSETS ─────────────────────────────────────────
    // ═══════════════════════════════════════════════════════════

    async getFixedAssets(tenantId: string, filters?: {
        assetCategory?: string; status?: string; search?: string;
    }) {
        let query = this.db.from('inv_fixed_assets').select('*').eq('tenant_id', tenantId);
        if (filters?.assetCategory) query = query.eq('asset_category', filters.assetCategory);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.or(
            `asset_number.ilike.%${filters.search}%,asset_name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`
        );
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getFixedAsset(id: string) {
        const { data, error } = await this.db.from('inv_fixed_assets').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }

    async createFixedAsset(tenantId: string, input: Record<string, any>) {
        const assetNumber = await this.generateAssetNumber(tenantId);
        const purchasePrice = input.purchasePrice ?? 0;
        const { data, error } = await this.db.from('inv_fixed_assets').insert({
            tenant_id: tenantId,
            item_id: input.itemId || null,
            asset_number: assetNumber,
            asset_name: input.assetName,
            asset_category: input.assetCategory || null,
            serial_number: input.serialNumber || null,
            purchase_date: input.purchaseDate || null,
            purchase_price: purchasePrice,
            current_value: input.currentValue ?? purchasePrice,
            salvage_value: input.salvageValue ?? 0,
            depreciation_method: input.depreciationMethod || 'straight_line',
            useful_life_months: input.usefulLifeMonths ?? 60,
            accumulated_depreciation: 0,
            warranty_expiry: input.warrantyExpiry || null,
            location: input.location || null,
            warehouse_id: input.warehouseId || null,
            assigned_to: input.assignedTo || null,
            condition: input.condition || 'good',
            insurance_policy: input.insurancePolicy || null,
            insurance_expiry: input.insuranceExpiry || null,
            maintenance_schedule: input.maintenanceSchedule || null,
            last_maintenance_date: input.lastMaintenanceDate || null,
            next_maintenance_date: input.nextMaintenanceDate || null,
            notes: input.notes || null,
            status: input.status || 'active',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateFixedAsset(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const fieldMap: Record<string, string> = {
            itemId: 'item_id', assetName: 'asset_name', assetCategory: 'asset_category',
            serialNumber: 'serial_number', purchaseDate: 'purchase_date',
            purchasePrice: 'purchase_price', currentValue: 'current_value',
            salvageValue: 'salvage_value', depreciationMethod: 'depreciation_method',
            usefulLifeMonths: 'useful_life_months',
            warrantyExpiry: 'warranty_expiry', location: 'location',
            warehouseId: 'warehouse_id', assignedTo: 'assigned_to',
            condition: 'condition', insurancePolicy: 'insurance_policy',
            insuranceExpiry: 'insurance_expiry',
            maintenanceSchedule: 'maintenance_schedule',
            lastMaintenanceDate: 'last_maintenance_date',
            nextMaintenanceDate: 'next_maintenance_date',
            notes: 'notes', status: 'status',
        };
        for (const [key, col] of Object.entries(fieldMap)) {
            if (input[key] !== undefined) updates[col] = input[key];
        }
        const { data, error } = await this.db.from('inv_fixed_assets').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async deleteFixedAsset(id: string): Promise<boolean> {
        const { error } = await this.db.from('inv_fixed_assets').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    async disposeFixedAsset(id: string, input: { disposalMethod: string; disposalValue?: number }) {
        const { data, error } = await this.db.from('inv_fixed_assets').update({
            status: 'disposed',
            disposed_date: new Date().toISOString().slice(0, 10),
            disposal_method: input.disposalMethod,
            disposal_value: input.disposalValue ?? 0,
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async runDepreciation(tenantId: string) {
        const { data: assets } = await this.db.from('inv_fixed_assets')
            .select('*').eq('tenant_id', tenantId).eq('status', 'active');
        if (!assets || assets.length === 0) return { processed: 0, totalDepreciation: 0 };

        let processed = 0;
        let totalDep = 0;
        const today = new Date();

        for (const asset of assets as any[]) {
            if (asset.depreciation_method === 'none' || !asset.purchase_date) continue;

            const purchasePrice = asset.purchase_price || 0;
            const salvageValue = asset.salvage_value || 0;
            const usefulMonths = asset.useful_life_months || 60;
            const depreciableAmount = purchasePrice - salvageValue;
            if (depreciableAmount <= 0) continue;

            let monthlyDep = 0;
            if (asset.depreciation_method === 'straight_line') {
                monthlyDep = depreciableAmount / usefulMonths;
            } else if (asset.depreciation_method === 'declining_balance') {
                const rate = 2 / usefulMonths;
                const currentVal = asset.current_value || purchasePrice;
                monthlyDep = Math.max(0, (currentVal - salvageValue) * rate);
            }

            if (monthlyDep <= 0) continue;

            const accumulatedDep = (asset.accumulated_depreciation || 0) + monthlyDep;
            const currentValue = Math.max(salvageValue, purchasePrice - accumulatedDep);

            await this.db.from('inv_fixed_assets').update({
                accumulated_depreciation: accumulatedDep,
                current_value: currentValue,
                last_depreciation_date: today.toISOString().slice(0, 10),
                updated_at: today.toISOString(),
            }).eq('id', asset.id);

            processed++;
            totalDep += monthlyDep;
        }

        return { processed, totalDepreciation: totalDep };
    }

    async getFixedAssetStats(tenantId: string) {
        const { data: all } = await this.db.from('inv_fixed_assets')
            .select('*').eq('tenant_id', tenantId);
        const assets = all || [];
        return {
            totalAssets: assets.length,
            active: assets.filter((a: any) => a.status === 'active').length,
            maintenance: assets.filter((a: any) => a.status === 'maintenance').length,
            disposed: assets.filter((a: any) => a.status === 'disposed').length,
            totalPurchaseValue: assets.reduce((s: number, a: any) => s + (a.purchase_price || 0), 0),
            totalCurrentValue: assets.reduce((s: number, a: any) => s + (a.current_value || 0), 0),
            totalAccumulatedDep: assets.reduce((s: number, a: any) => s + (a.accumulated_depreciation || 0), 0),
        };
    }

    // ─── EXPIRY ALERTS ─────────────────────────────────────────

    async getExpiryAlerts(tenantId: string, daysAhead: number = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + daysAhead);
        const { data, error } = await this.db.from('inv_stock_movements')
            .select('*, inv_items(name, sku)')
            .eq('tenant_id', tenantId)
            .not('expiry_date', 'is', null)
            .lte('expiry_date', cutoff.toISOString().slice(0, 10))
            .order('expiry_date');
        if (error) throw error;
        return (data || []).map((m: any) => ({
            itemId: m.item_id,
            itemName: m.inv_items?.name || 'Unknown',
            itemSku: m.inv_items?.sku,
            batchNumber: m.batch_number,
            expiryDate: m.expiry_date,
            quantity: m.quantity,
            warehouseId: m.warehouse_id,
            isExpired: new Date(m.expiry_date) < new Date(),
            daysUntilExpiry: Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000),
        }));
    }

    private async generateAssetNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const { count } = await this.db.from('inv_fixed_assets')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `AST-${year}-${String((count || 0) + 1).padStart(3, '0')}`;
    }

    // ═══════════════════════════════════════════════════════
    // ─── PUT-AWAY & PICK OPERATIONS ──────────────────────
    // ═══════════════════════════════════════════════════════

    // ─── Bin Contents ───────────────────────────────────────
    async getBinContents(tenantId: string, binId?: string) {
        let query = this.db.from('inv_bin_contents').select('*').eq('tenant_id', tenantId);
        if (binId) query = query.eq('bin_id', binId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async addBinContent(tenantId: string, input: Record<string, any>) {
        const { data, error } = await this.db.from('inv_bin_contents').insert({
            tenant_id: tenantId,
            bin_id: input.binId,
            item_id: input.itemId,
            variant_id: input.variantId || null,
            quantity: input.quantity,
            uom: input.uom || 'pcs',
            lot_number: input.lotNumber || null,
            batch_number: input.batchNumber || null,
            serial_number: input.serialNumber || null,
            expiry_date: input.expiryDate || null,
            notes: input.notes || null,
        }).select().single();
        if (error) throw error;
        return data;
    }

    async updateBinContent(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (input.quantity !== undefined) updates.quantity = input.quantity;
        if (input.notes !== undefined) updates.notes = input.notes;
        const { data, error } = await this.db.from('inv_bin_contents').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async removeBinContent(id: string) {
        const { error } = await this.db.from('inv_bin_contents').delete().eq('id', id);
        if (error) throw error;
        return true;
    }

    // ─── Put-Away Tasks ───────────────────────────────────
    private async generatePutawayNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const { count } = await this.db.from('inv_putaway_tasks')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `PA-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
    }

    async getPutawayTasks(tenantId: string, filters?: { status?: string; warehouseId?: string }) {
        let query = this.db.from('inv_putaway_tasks').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createPutawayTask(tenantId: string, input: Record<string, any>) {
        const taskNumber = await this.generatePutawayNumber(tenantId);
        // Try to suggest a bin if not provided
        let suggestedBinId = input.suggestedBinId || null;
        let suggestedBinCode = input.suggestedBinCode || null;
        if (!suggestedBinId && input.warehouseId) {
            const suggestion = await this.suggestBin(tenantId, input.warehouseId);
            if (suggestion) {
                suggestedBinId = suggestion.id;
                suggestedBinCode = suggestion.code;
            }
        }
        const { data, error } = await this.db.from('inv_putaway_tasks').insert({
            tenant_id: tenantId,
            task_number: taskNumber,
            item_id: input.itemId,
            item_name: input.itemName || null,
            item_sku: input.itemSku || null,
            quantity: input.quantity,
            uom: input.uom || 'pcs',
            source_reference: input.sourceReference || null,
            source_type: input.sourceType || null,
            source_id: input.sourceId || null,
            warehouse_id: input.warehouseId || 'default',
            suggested_bin_id: suggestedBinId,
            suggested_bin_code: suggestedBinCode,
            assigned_to: input.assignedTo || null,
            priority: input.priority || 'normal',
            lot_number: input.lotNumber || null,
            batch_number: input.batchNumber || null,
            expiry_date: input.expiryDate || null,
            notes: input.notes || null,
            status: 'pending',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async confirmPutaway(id: string, actualBinId: string) {
        // Get the bin code
        const { data: bin } = await this.db.from('inv_bins').select('code').eq('id', actualBinId).single();
        const { data, error } = await this.db.from('inv_putaway_tasks').update({
            actual_bin_id: actualBinId,
            actual_bin_code: bin?.code || null,
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;

        // Add to bin contents
        if (data) {
            await this.addBinContent(data.tenant_id, {
                binId: actualBinId,
                itemId: data.item_id,
                quantity: data.quantity,
                uom: data.uom,
                lotNumber: data.lot_number,
                batchNumber: data.batch_number,
                expiryDate: data.expiry_date,
            });
            // Update bin status to occupied
            await this.db.from('inv_bins').update({
                is_occupied: true,
                current_item_count: this.db.rpc ? 1 : 1,
                updated_at: new Date().toISOString(),
            }).eq('id', actualBinId);

            // Create stock IN movement for ledger tracking
            try {
                await this.createStockMovement(data.tenant_id, {
                    itemId: data.item_id,
                    warehouseId: data.warehouse_id || 'default',
                    movementType: 'IN',
                    quantity: data.quantity,
                    reference: data.task_number,
                    referenceType: 'putaway',
                    batchNumber: data.batch_number,
                    expiryDate: data.expiry_date,
                    notes: `Put-away to bin ${bin?.code || actualBinId}`,
                });
            } catch (e) {
                this.logger.warn('Failed to create stock movement for putaway', e);
            }
        }
        return data;
    }

    async cancelPutawayTask(id: string) {
        const { data, error } = await this.db.from('inv_putaway_tasks').update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async startPutawayTask(id: string) {
        const { data, error } = await this.db.from('inv_putaway_tasks').update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ─── Bin Suggestion Algorithm ────────────────────────
    async suggestBin(tenantId: string, warehouseId?: string): Promise<any | null> {
        // Find available bins not already full, prioritizing empty bins
        const zonesQuery = this.db.from('inv_zones').select('id');
        if (warehouseId && warehouseId !== 'default') {
            zonesQuery.eq('warehouse_id', warehouseId);
        }
        const { data: zones } = await zonesQuery;
        if (!zones || zones.length === 0) return null;

        const zoneIds = zones.map((z: any) => z.id);
        const { data: bins } = await this.db.from('inv_bins')
            .select('*')
            .in('zone_id', zoneIds)
            .eq('status', 'available')
            .order('sort_order')
            .limit(1);
        return bins && bins.length > 0 ? bins[0] : null;
    }

    // ─── Pick Tasks ──────────────────────────────────────
    private async generatePickNumber(tenantId: string) {
        const year = new Date().getFullYear();
        const { count } = await this.db.from('inv_pick_tasks')
            .select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);
        return `PK-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
    }

    async getPickTasks(tenantId: string, filters?: { status?: string; warehouseId?: string }) {
        let query = this.db.from('inv_pick_tasks').select('*').eq('tenant_id', tenantId);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.warehouseId) query = query.eq('warehouse_id', filters.warehouseId);
        const { data, error } = await query.order('pick_sequence').order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createPickTask(tenantId: string, input: Record<string, any>) {
        const taskNumber = await this.generatePickNumber(tenantId);
        const { data, error } = await this.db.from('inv_pick_tasks').insert({
            tenant_id: tenantId,
            task_number: taskNumber,
            item_id: input.itemId,
            item_name: input.itemName || null,
            item_sku: input.itemSku || null,
            quantity: input.quantity,
            uom: input.uom || 'pcs',
            order_reference: input.orderReference || null,
            order_type: input.orderType || null,
            order_id: input.orderId || null,
            warehouse_id: input.warehouseId || 'default',
            from_bin_id: input.fromBinId || null,
            from_bin_code: input.fromBinCode || null,
            assigned_to: input.assignedTo || null,
            priority: input.priority || 'normal',
            pick_sequence: input.pickSequence || 0,
            lot_number: input.lotNumber || null,
            batch_number: input.batchNumber || null,
            notes: input.notes || null,
            status: 'pending',
        }).select().single();
        if (error) throw error;
        return data;
    }

    async confirmPick(id: string, pickedQuantity: number) {
        const { data: task } = await this.db.from('inv_pick_tasks').select('*').eq('id', id).single();
        if (!task) throw new Error('Pick task not found');

        const isShort = pickedQuantity < task.quantity;
        const { data, error } = await this.db.from('inv_pick_tasks').update({
            picked_quantity: pickedQuantity,
            status: isShort ? 'short_picked' : 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;

        // Decrement bin contents if we have a from_bin_id
        if (task.from_bin_id) {
            const { data: contents } = await this.db.from('inv_bin_contents')
                .select('*')
                .eq('bin_id', task.from_bin_id)
                .eq('item_id', task.item_id)
                .limit(1);
            if (contents && contents.length > 0) {
                const newQty = Math.max(0, (contents[0].quantity || 0) - pickedQuantity);
                if (newQty <= 0) {
                    await this.db.from('inv_bin_contents').delete().eq('id', contents[0].id);
                } else {
                    await this.db.from('inv_bin_contents').update({
                        quantity: newQty,
                        updated_at: new Date().toISOString(),
                    }).eq('id', contents[0].id);
                }
            }
        }

        // Create stock OUT movement for ledger tracking
        if (task && pickedQuantity > 0) {
            try {
                await this.createStockMovement(task.tenant_id, {
                    itemId: task.item_id,
                    warehouseId: task.warehouse_id || 'default',
                    movementType: 'OUT',
                    quantity: pickedQuantity,
                    reference: task.task_number,
                    referenceType: 'pick',
                    batchNumber: task.batch_number,
                    notes: `Picked from bin ${task.from_bin_code || task.from_bin_id || 'unknown'}${isShort ? ' (short pick)' : ''}`,
                });
            } catch (e) {
                this.logger.warn('Failed to create stock movement for pick', e);
            }
        }
        return data;
    }

    async cancelPickTask(id: string) {
        const { data, error } = await this.db.from('inv_pick_tasks').update({
            status: 'cancelled',
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    async startPickTask(id: string) {
        const { data, error } = await this.db.from('inv_pick_tasks').update({
            status: 'in_progress',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', id).select().single();
        if (error) throw error;
        return data;
    }

    // ─── WMS Stats ──────────────────────────────────────
    async getWmsStats(tenantId: string) {
        const [pa, pk, bc] = await Promise.all([
            this.db.from('inv_putaway_tasks').select('status').eq('tenant_id', tenantId),
            this.db.from('inv_pick_tasks').select('status').eq('tenant_id', tenantId),
            this.db.from('inv_bin_contents').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        ]);
        const paTasks = pa.data || [];
        const pkTasks = pk.data || [];
        return {
            pendingPutaway: paTasks.filter((t: any) => t.status === 'pending').length,
            inProgressPutaway: paTasks.filter((t: any) => t.status === 'in_progress').length,
            completedPutaway: paTasks.filter((t: any) => t.status === 'completed').length,
            pendingPick: pkTasks.filter((t: any) => t.status === 'pending').length,
            inProgressPick: pkTasks.filter((t: any) => t.status === 'in_progress').length,
            completedPick: pkTasks.filter((t: any) => t.status === 'completed').length,
            totalBinContents: bc.count || 0,
        };
    }
}

