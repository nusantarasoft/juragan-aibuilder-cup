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
}


