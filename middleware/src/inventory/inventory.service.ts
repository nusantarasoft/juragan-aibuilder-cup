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
            tenant_id: tenantId, schedule_code: input.scheduleCode, route_name: input.routeName,
            origin: input.origin, destination: input.destination,
            departure_time: input.departureTime, arrival_time: input.arrivalTime,
            duration_minutes: input.durationMinutes, capacity: input.capacity || 100,
            vehicle_name: input.vehicleName, vessel_type: input.vesselType,
            price_economy: input.priceEconomy || 0, price_business: input.priceBusiness || 0,
            price_vip: input.priceVip || 0, notes: input.notes, status: input.status || 'active',
        };
        const { data, error } = await this.db.from('booking_schedules').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateSchedule(id: string, input: Record<string, any>) {
        const updates: any = { updated_at: new Date().toISOString() };
        const map: Record<string, string> = {
            scheduleCode: 'schedule_code', routeName: 'route_name', origin: 'origin',
            destination: 'destination', departureTime: 'departure_time', arrivalTime: 'arrival_time',
            durationMinutes: 'duration_minutes', capacity: 'capacity',
            vehicleName: 'vehicle_name', vesselType: 'vessel_type',
            priceEconomy: 'price_economy', priceBusiness: 'price_business', priceVip: 'price_vip',
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

    async getOccurrences(scheduleId?: string) {
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
        const row: any = {
            tenant_id: tenantId, booking_code: input.bookingCode,
            schedule_id: input.scheduleId, occurrence_id: input.occurrenceId,
            customer_name: input.customerName, customer_email: input.customerEmail,
            customer_phone: input.customerPhone, passenger_count: input.passengerCount || 1,
            class: input.class || 'economy', total_amount: input.totalAmount || 0,
            paid_amount: input.paidAmount || 0, notes: input.notes, status: input.status || 'pending',
        };
        const { data, error } = await this.db.from('bookings').insert(row).select().single();
        if (error) throw error;
        return data;
    }

    async updateBookingStatus(id: string, status: string) {
        const updates: any = { status, updated_at: new Date().toISOString() };
        if (status === 'checked_in') updates.check_in_time = new Date().toISOString();
        const { data, error } = await this.db.from('bookings').update(updates).eq('id', id).select().single();
        if (error) throw error;
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
}


