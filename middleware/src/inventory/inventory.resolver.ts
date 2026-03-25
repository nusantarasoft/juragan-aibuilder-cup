import {
    Resolver, Query, Mutation, Args,
    ObjectType, Field, ID, InputType, Float, Int,
} from '@nestjs/graphql';
import { InventoryService } from './inventory.service';
import GraphQLJSON from 'graphql-type-json';

// ─── GraphQL Types ──────────────────────────────────────

@ObjectType()
class InvCategory {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) color?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class InvItem {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) sku?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) itemType?: string;
    @Field({ nullable: true }) fulfillmentType?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) brand?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => Float, { nullable: true }) costPrice?: number;
    @Field(() => Float, { nullable: true }) sellingPrice?: number;
    @Field({ nullable: true }) currency?: string;
    @Field(() => Float, { nullable: true }) taxRate?: number;
    @Field({ nullable: true }) barcode?: string;
    @Field({ nullable: true }) qrCode?: string;
    @Field(() => GraphQLJSON, { nullable: true }) mediaIds?: any;
    @Field({ nullable: true }) primaryUom?: string;
    @Field(() => Float, { nullable: true }) weight?: number;
    @Field({ nullable: true }) weightUnit?: string;
    @Field(() => GraphQLJSON, { nullable: true }) dimensions?: any;
    @Field(() => Int, { nullable: true }) minStock?: number;
    @Field(() => Int, { nullable: true }) maxStock?: number;
    @Field(() => Int, { nullable: true }) reorderPoint?: number;
    @Field(() => Int, { nullable: true }) reorderQty?: number;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class InvItemVariant {
    @Field(() => ID) id: string;
    @Field() itemId: string;
    @Field() name: string;
    @Field({ nullable: true }) sku?: string;
    @Field(() => GraphQLJSON, { nullable: true }) attributes?: any;
    @Field(() => Float, { nullable: true }) costPrice?: number;
    @Field(() => Float, { nullable: true }) sellingPrice?: number;
    @Field({ nullable: true }) barcode?: string;
    @Field(() => GraphQLJSON, { nullable: true }) mediaIds?: any;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
}

@ObjectType()
class StockLedgerEntry {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() itemId: string;
    @Field({ nullable: true }) variantId?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field(() => Float) onHand: number;
    @Field(() => Float) reserved: number;
    @Field(() => Float) committed: number;
    @Field(() => Float) available: number;
    @Field() updatedAt: string;
}

@ObjectType()
class StockMovement {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() itemId: string;
    @Field({ nullable: true }) variantId?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field() movementType: string;
    @Field(() => Float) quantity: number;
    @Field(() => Float, { nullable: true }) unitCost?: number;
    @Field(() => Float, { nullable: true }) totalCost?: number;
    @Field({ nullable: true }) reference?: string;
    @Field({ nullable: true }) referenceType?: string;
    @Field({ nullable: true }) referenceId?: string;
    @Field({ nullable: true }) batchNumber?: string;
    @Field({ nullable: true }) serialNumber?: string;
    @Field({ nullable: true }) expiryDate?: string;
    @Field({ nullable: true }) notes?: string;
    @Field() createdAt: string;
}

@ObjectType()
class InvStockStats {
    @Field(() => Int) totalItems: number;
    @Field(() => Int) activeItems: number;
    @Field(() => Float) totalOnHand: number;
    @Field(() => Float) totalReserved: number;
    @Field(() => Int) lowStockCount: number;
    @Field(() => Int) totalMovements: number;
    @Field(() => Int) physicalCount: number;
    @Field(() => Int) ticketCount: number;
    @Field(() => Int) scheduledCount: number;
    @Field(() => Int) rentalCount: number;
}

@ObjectType()
class AiClassification {
    @Field() suggestedCategory: string;
    @Field(() => [String]) suggestedTags: string[];
    @Field() suggestedItemType: string;
    @Field() suggestedFulfillmentType: string;
    @Field(() => Int) confidence: number;
}

@ObjectType()
class AiAnomaly {
    @Field({ nullable: true }) itemName?: string;
    @Field({ nullable: true }) movementType?: string;
    @Field(() => Float, { nullable: true }) quantity?: number;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) riskLevel?: string;
}

@ObjectType()
class AiAnomalyResult {
    @Field(() => [AiAnomaly]) anomalies: AiAnomaly[];
    @Field({ nullable: true }) message?: string;
    @Field({ nullable: true }) summary?: string;
}

// ─── Input Types ────────────────────────────────────────

@InputType()
class CreateCategoryInput {
    @Field() name: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) color?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

@InputType()
class UpdateCategoryInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) parentId?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) icon?: string;
    @Field({ nullable: true }) color?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

@InputType()
class CreateItemInput {
    @Field() name: string;
    @Field({ nullable: true }) sku?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) itemType?: string;
    @Field({ nullable: true }) fulfillmentType?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) brand?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => Float, { nullable: true }) costPrice?: number;
    @Field(() => Float, { nullable: true }) sellingPrice?: number;
    @Field({ nullable: true }) currency?: string;
    @Field(() => Float, { nullable: true }) taxRate?: number;
    @Field({ nullable: true }) barcode?: string;
    @Field({ nullable: true }) qrCode?: string;
    @Field(() => GraphQLJSON, { nullable: true }) mediaIds?: any;
    @Field({ nullable: true }) primaryUom?: string;
    @Field(() => Float, { nullable: true }) weight?: number;
    @Field({ nullable: true }) weightUnit?: string;
    @Field(() => GraphQLJSON, { nullable: true }) dimensions?: any;
    @Field(() => Int, { nullable: true }) minStock?: number;
    @Field(() => Int, { nullable: true }) maxStock?: number;
    @Field(() => Int, { nullable: true }) reorderPoint?: number;
    @Field(() => Int, { nullable: true }) reorderQty?: number;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class UpdateItemInput {
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) sku?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) itemType?: string;
    @Field({ nullable: true }) fulfillmentType?: string;
    @Field({ nullable: true }) categoryId?: string;
    @Field({ nullable: true }) brand?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => Float, { nullable: true }) costPrice?: number;
    @Field(() => Float, { nullable: true }) sellingPrice?: number;
    @Field({ nullable: true }) currency?: string;
    @Field(() => Float, { nullable: true }) taxRate?: number;
    @Field({ nullable: true }) barcode?: string;
    @Field({ nullable: true }) qrCode?: string;
    @Field(() => GraphQLJSON, { nullable: true }) mediaIds?: any;
    @Field({ nullable: true }) primaryUom?: string;
    @Field(() => Float, { nullable: true }) weight?: number;
    @Field({ nullable: true }) weightUnit?: string;
    @Field(() => GraphQLJSON, { nullable: true }) dimensions?: any;
    @Field(() => Int, { nullable: true }) minStock?: number;
    @Field(() => Int, { nullable: true }) maxStock?: number;
    @Field(() => Int, { nullable: true }) reorderPoint?: number;
    @Field(() => Int, { nullable: true }) reorderQty?: number;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreateVariantInput {
    @Field() name: string;
    @Field({ nullable: true }) sku?: string;
    @Field(() => GraphQLJSON, { nullable: true }) attributes?: any;
    @Field(() => Float, { nullable: true }) costPrice?: number;
    @Field(() => Float, { nullable: true }) sellingPrice?: number;
    @Field({ nullable: true }) barcode?: string;
    @Field(() => GraphQLJSON, { nullable: true }) mediaIds?: any;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreateStockMovementInput {
    @Field() itemId: string;
    @Field({ nullable: true }) variantId?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field() movementType: string;
    @Field(() => Float) quantity: number;
    @Field(() => Float, { nullable: true }) unitCost?: number;
    @Field({ nullable: true }) reference?: string;
    @Field({ nullable: true }) referenceType?: string;
    @Field({ nullable: true }) referenceId?: string;
    @Field({ nullable: true }) batchNumber?: string;
    @Field({ nullable: true }) serialNumber?: string;
    @Field({ nullable: true }) expiryDate?: string;
    @Field({ nullable: true }) notes?: string;
}

// ─── Mappers ────────────────────────────────────────────

function mapCategory(r: any): InvCategory {
    return {
        id: r.id, tenantId: r.tenant_id, name: r.name,
        parentId: r.parent_id, description: r.description,
        icon: r.icon, color: r.color, sortOrder: r.sort_order,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapItem(r: any): InvItem {
    return {
        id: r.id, tenantId: r.tenant_id, name: r.name, sku: r.sku,
        description: r.description, itemType: r.item_type,
        fulfillmentType: r.fulfillment_type, categoryId: r.category_id,
        brand: r.brand, tags: r.tags,
        costPrice: r.cost_price, sellingPrice: r.selling_price,
        currency: r.currency, taxRate: r.tax_rate,
        barcode: r.barcode, qrCode: r.qr_code, mediaIds: r.media_ids,
        primaryUom: r.primary_uom, weight: r.weight, weightUnit: r.weight_unit,
        dimensions: r.dimensions,
        minStock: r.min_stock, maxStock: r.max_stock,
        reorderPoint: r.reorder_point, reorderQty: r.reorder_qty,
        metadata: r.metadata, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapVariant(r: any): InvItemVariant {
    return {
        id: r.id, itemId: r.item_id, name: r.name, sku: r.sku,
        attributes: r.attributes,
        costPrice: r.cost_price, sellingPrice: r.selling_price,
        barcode: r.barcode, mediaIds: r.media_ids, status: r.status,
        createdAt: r.created_at,
    };
}

function mapLedger(r: any): StockLedgerEntry {
    return {
        id: r.id, tenantId: r.tenant_id, itemId: r.item_id,
        variantId: r.variant_id, warehouseId: r.warehouse_id,
        onHand: r.on_hand || 0, reserved: r.reserved || 0,
        committed: r.committed || 0,
        available: (r.on_hand || 0) - (r.reserved || 0) - (r.committed || 0),
        updatedAt: r.updated_at,
    };
}

function mapMovement(r: any): StockMovement {
    return {
        id: r.id, tenantId: r.tenant_id, itemId: r.item_id,
        variantId: r.variant_id, warehouseId: r.warehouse_id,
        movementType: r.movement_type, quantity: r.quantity,
        unitCost: r.unit_cost, totalCost: r.total_cost,
        reference: r.reference, referenceType: r.reference_type,
        referenceId: r.reference_id,
        batchNumber: r.batch_number, serialNumber: r.serial_number,
        expiryDate: r.expiry_date, notes: r.notes,
        createdAt: r.created_at,
    };
}

// ─── Procurement Types ──────────────────────────────────


@ObjectType()
class InvSupplier {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() code: string;
    @Field() name: string;
    @Field({ nullable: true }) contactPerson?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) address?: string;
    @Field({ nullable: true }) city?: string;
    @Field({ nullable: true }) country?: string;
    @Field({ nullable: true }) taxId?: string;
    @Field({ nullable: true }) paymentTerms?: string;
    @Field({ nullable: true }) currency?: string;
    @Field(() => Float, { nullable: true }) rating?: number;
    @Field(() => Int, { nullable: true }) leadTimeDays?: number;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class InvPurchaseRequisition {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() prNumber: string;
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) requiredDate?: string;
    @Field(() => Float, { nullable: true }) totalEstimated?: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) approvedBy?: string;
    @Field({ nullable: true }) approvedAt?: string;
    @Field({ nullable: true }) rejectionReason?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class InvPrLine {
    @Field(() => ID) id: string;
    @Field() prId: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float) quantity: number;
    @Field({ nullable: true }) uom?: string;
    @Field(() => Float, { nullable: true }) estimatedUnitPrice?: number;
    @Field(() => Float, { nullable: true }) estimatedTotal?: number;
    @Field({ nullable: true }) preferredSupplierId?: string;
    @Field({ nullable: true }) notes?: string;
    @Field() createdAt: string;
}

@ObjectType()
class InvPurchaseOrder {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() poNumber: string;
    @Field({ nullable: true }) prId?: string;
    @Field() supplierId: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) shippingAddress?: string;
    @Field({ nullable: true }) paymentTerms?: string;
    @Field({ nullable: true }) expectedDelivery?: string;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => Float, { nullable: true }) taxAmount?: number;
    @Field(() => Float, { nullable: true }) discountAmount?: number;
    @Field(() => Float, { nullable: true }) totalAmount?: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) sentAt?: string;
    @Field({ nullable: true }) confirmedAt?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class InvPoLine {
    @Field(() => ID) id: string;
    @Field() poId: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float) quantity: number;
    @Field(() => Float, { nullable: true }) receivedQty?: number;
    @Field({ nullable: true }) uom?: string;
    @Field(() => Float, { nullable: true }) unitPrice?: number;
    @Field(() => Float, { nullable: true }) discountPercent?: number;
    @Field(() => Float, { nullable: true }) taxPercent?: number;
    @Field(() => Float, { nullable: true }) lineTotal?: number;
    @Field({ nullable: true }) notes?: string;
    @Field() createdAt: string;
}

@ObjectType()
class InvGoodsReceivedNote {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() grnNumber: string;
    @Field() poId: string;
    @Field() supplierId: string;
    @Field({ nullable: true }) receivedBy?: string;
    @Field({ nullable: true }) receivedDate?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field({ nullable: true }) deliveryNoteNumber?: string;
    @Field({ nullable: true }) invoiceNumber?: string;
    @Field({ nullable: true }) qualityCheck?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) acceptedAt?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class InvGrnLine {
    @Field(() => ID) id: string;
    @Field() grnId: string;
    @Field({ nullable: true }) poLineId?: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field(() => Float, { nullable: true }) orderedQty?: number;
    @Field(() => Float) receivedQty: number;
    @Field(() => Float, { nullable: true }) acceptedQty?: number;
    @Field(() => Float, { nullable: true }) rejectedQty?: number;
    @Field({ nullable: true }) uom?: string;
    @Field(() => Float, { nullable: true }) unitCost?: number;
    @Field({ nullable: true }) batchNumber?: string;
    @Field({ nullable: true }) qualityStatus?: string;
    @Field({ nullable: true }) rejectionReason?: string;
    @Field({ nullable: true }) notes?: string;
    @Field() createdAt: string;
}

@ObjectType()
class ProcurementStats {
    @Field(() => Int) totalSuppliers: number;
    @Field(() => Int) totalPRs: number;
    @Field(() => Int) pendingPRs: number;
    @Field(() => Int) totalPOs: number;
    @Field(() => Int) activePOs: number;
    @Field(() => Int) totalGRNs: number;
    @Field(() => Float) totalPoValue: number;
}

// ─── Procurement Input Types ────────────────────────────

@InputType()
class CreateSupplierInput {
    @Field() code: string;
    @Field() name: string;
    @Field({ nullable: true }) contactPerson?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) address?: string;
    @Field({ nullable: true }) city?: string;
    @Field({ nullable: true }) country?: string;
    @Field({ nullable: true }) taxId?: string;
    @Field({ nullable: true }) paymentTerms?: string;
    @Field({ nullable: true }) currency?: string;
    @Field(() => Float, { nullable: true }) rating?: number;
    @Field(() => Int, { nullable: true }) leadTimeDays?: number;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreatePrInput {
    @Field() title: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) department?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) requiredDate?: string;
    @Field(() => Float, { nullable: true }) totalEstimated?: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) notes?: string;
    @Field(() => GraphQLJSON, { nullable: true }) lines?: any;
}

@InputType()
class CreatePoInput {
    @Field({ nullable: true }) prId?: string;
    @Field() supplierId: string;
    @Field({ nullable: true }) title?: string;
    @Field({ nullable: true }) shippingAddress?: string;
    @Field({ nullable: true }) paymentTerms?: string;
    @Field({ nullable: true }) expectedDelivery?: string;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => Float, { nullable: true }) taxAmount?: number;
    @Field(() => Float, { nullable: true }) discountAmount?: number;
    @Field(() => Float, { nullable: true }) totalAmount?: number;
    @Field({ nullable: true }) currency?: string;
    @Field({ nullable: true }) notes?: string;
    @Field(() => GraphQLJSON, { nullable: true }) lines?: any;
}

@InputType()
class CreateGrnInput {
    @Field() poId: string;
    @Field() supplierId: string;
    @Field({ nullable: true }) receivedBy?: string;
    @Field({ nullable: true }) receivedDate?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field({ nullable: true }) deliveryNoteNumber?: string;
    @Field({ nullable: true }) invoiceNumber?: string;
    @Field({ nullable: true }) qualityCheck?: string;
    @Field({ nullable: true }) notes?: string;
    @Field(() => GraphQLJSON, { nullable: true }) lines?: any;
}

// ─── Procurement Mappers ────────────────────────────────

function mapSupplier(r: any): InvSupplier {
    return {
        id: r.id, tenantId: r.tenant_id, code: r.code, name: r.name,
        contactPerson: r.contact_person, email: r.email, phone: r.phone,
        address: r.address, city: r.city, country: r.country,
        taxId: r.tax_id, paymentTerms: r.payment_terms, currency: r.currency,
        rating: r.rating, leadTimeDays: r.lead_time_days, tags: r.tags,
        notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapPR(r: any): InvPurchaseRequisition {
    return {
        id: r.id, tenantId: r.tenant_id, prNumber: r.pr_number, title: r.title,
        description: r.description, requestedBy: r.requested_by,
        department: r.department, priority: r.priority,
        requiredDate: r.required_date, totalEstimated: r.total_estimated,
        currency: r.currency, notes: r.notes, status: r.status,
        approvedBy: r.approved_by, approvedAt: r.approved_at,
        rejectionReason: r.rejection_reason,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapPrLine(r: any): InvPrLine {
    return {
        id: r.id, prId: r.pr_id, itemId: r.item_id, itemName: r.item_name,
        description: r.description, quantity: r.quantity, uom: r.uom,
        estimatedUnitPrice: r.estimated_unit_price, estimatedTotal: r.estimated_total,
        preferredSupplierId: r.preferred_supplier_id, notes: r.notes,
        createdAt: r.created_at,
    };
}

function mapPO(r: any): InvPurchaseOrder {
    return {
        id: r.id, tenantId: r.tenant_id, poNumber: r.po_number,
        prId: r.pr_id, supplierId: r.supplier_id, title: r.title,
        shippingAddress: r.shipping_address, paymentTerms: r.payment_terms,
        expectedDelivery: r.expected_delivery,
        subtotal: r.subtotal, taxAmount: r.tax_amount,
        discountAmount: r.discount_amount, totalAmount: r.total_amount,
        currency: r.currency, notes: r.notes, status: r.status,
        sentAt: r.sent_at, confirmedAt: r.confirmed_at,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapPoLine(r: any): InvPoLine {
    return {
        id: r.id, poId: r.po_id, itemId: r.item_id, itemName: r.item_name,
        description: r.description, quantity: r.quantity,
        receivedQty: r.received_qty, uom: r.uom,
        unitPrice: r.unit_price, discountPercent: r.discount_percent,
        taxPercent: r.tax_percent, lineTotal: r.line_total,
        notes: r.notes, createdAt: r.created_at,
    };
}

function mapGRN(r: any): InvGoodsReceivedNote {
    return {
        id: r.id, tenantId: r.tenant_id, grnNumber: r.grn_number,
        poId: r.po_id, supplierId: r.supplier_id,
        receivedBy: r.received_by, receivedDate: r.received_date,
        warehouseId: r.warehouse_id,
        deliveryNoteNumber: r.delivery_note_number,
        invoiceNumber: r.invoice_number,
        qualityCheck: r.quality_check, notes: r.notes,
        status: r.status, acceptedAt: r.accepted_at,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapGrnLine(r: any): InvGrnLine {
    return {
        id: r.id, grnId: r.grn_id, poLineId: r.po_line_id,
        itemId: r.item_id, itemName: r.item_name,
        orderedQty: r.ordered_qty, receivedQty: r.received_qty,
        acceptedQty: r.accepted_qty, rejectedQty: r.rejected_qty,
        uom: r.uom, unitCost: r.unit_cost,
        batchNumber: r.batch_number, qualityStatus: r.quality_status,
        rejectionReason: r.rejection_reason, notes: r.notes,
        createdAt: r.created_at,
    };
}

// ═══════════════════════════════════════════════════════════
// ─── WAREHOUSE Types, Inputs, Mappers ─────────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class InvWarehouseType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() code: string;
    @Field() name: string;
    @Field({ nullable: true }) warehouseType?: string;
    @Field({ nullable: true }) address?: string;
    @Field({ nullable: true }) city?: string;
    @Field({ nullable: true }) country?: string;
    @Field(() => Float, { nullable: true }) latitude?: number;
    @Field(() => Float, { nullable: true }) longitude?: number;
    @Field(() => Int, { nullable: true }) totalCapacity?: number;
    @Field(() => Int, { nullable: true }) usedCapacity?: number;
    @Field({ nullable: true }) manager?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) operatingHours?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class InvZoneType {
    @Field(() => ID) id: string;
    @Field() warehouseId: string;
    @Field() code: string;
    @Field() name: string;
    @Field({ nullable: true }) zoneType?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Int, { nullable: true }) capacity?: number;
    @Field(() => Float, { nullable: true }) temperatureMin?: number;
    @Field(() => Float, { nullable: true }) temperatureMax?: number;
    @Field({ nullable: true }) isRestricted?: boolean;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class InvBinType {
    @Field(() => ID) id: string;
    @Field() zoneId: string;
    @Field() code: string;
    @Field({ nullable: true }) aisle?: string;
    @Field({ nullable: true }) rack?: string;
    @Field({ nullable: true }) level?: string;
    @Field({ nullable: true }) position?: string;
    @Field({ nullable: true }) binType?: string;
    @Field(() => Float, { nullable: true }) maxWeight?: number;
    @Field(() => Float, { nullable: true }) maxVolume?: number;
    @Field(() => Int, { nullable: true }) currentItemCount?: number;
    @Field({ nullable: true }) isOccupied?: boolean;
    @Field({ nullable: true }) barcode?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class InvStockTransferType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() transferNumber: string;
    @Field({ nullable: true }) fromWarehouseId?: string;
    @Field({ nullable: true }) toWarehouseId?: string;
    @Field({ nullable: true }) fromBinId?: string;
    @Field({ nullable: true }) toBinId?: string;
    @Field({ nullable: true }) itemId?: string;
    @Field({ nullable: true }) itemName?: string;
    @Field(() => Float) quantity: number;
    @Field({ nullable: true }) uom?: string;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) approvedBy?: string;
    @Field({ nullable: true }) requestedAt?: string;
    @Field({ nullable: true }) approvedAt?: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class WarehouseStats {
    @Field(() => Int) totalWarehouses: number;
    @Field(() => Int) totalZones: number;
    @Field(() => Int) totalBins: number;
    @Field(() => Int) activeTransfers: number;
    @Field(() => Int) totalTransfers: number;
    @Field(() => Int) totalCapacity: number;
    @Field(() => Int) usedCapacity: number;
}

// ─── Warehouse Input Types ──────────────────────────────

@InputType()
class CreateWarehouseInput {
    @Field() code: string;
    @Field() name: string;
    @Field({ nullable: true }) warehouseType?: string;
    @Field({ nullable: true }) address?: string;
    @Field({ nullable: true }) city?: string;
    @Field({ nullable: true }) country?: string;
    @Field(() => Float, { nullable: true }) latitude?: number;
    @Field(() => Float, { nullable: true }) longitude?: number;
    @Field(() => Int, { nullable: true }) totalCapacity?: number;
    @Field({ nullable: true }) manager?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) operatingHours?: string;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreateZoneInput {
    @Field() code: string;
    @Field() name: string;
    @Field({ nullable: true }) zoneType?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Int, { nullable: true }) capacity?: number;
    @Field(() => Float, { nullable: true }) temperatureMin?: number;
    @Field(() => Float, { nullable: true }) temperatureMax?: number;
    @Field({ nullable: true }) isRestricted?: boolean;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreateBinInput {
    @Field() code: string;
    @Field({ nullable: true }) aisle?: string;
    @Field({ nullable: true }) rack?: string;
    @Field({ nullable: true }) level?: string;
    @Field({ nullable: true }) position?: string;
    @Field({ nullable: true }) binType?: string;
    @Field(() => Float, { nullable: true }) maxWeight?: number;
    @Field(() => Float, { nullable: true }) maxVolume?: number;
    @Field({ nullable: true }) barcode?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreateStockTransferInput {
    @Field() fromWarehouseId: string;
    @Field() toWarehouseId: string;
    @Field({ nullable: true }) fromBinId?: string;
    @Field({ nullable: true }) toBinId?: string;
    @Field({ nullable: true }) itemId?: string;
    @Field({ nullable: true }) itemName?: string;
    @Field(() => Float) quantity: number;
    @Field({ nullable: true }) uom?: string;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) requestedBy?: string;
    @Field({ nullable: true }) notes?: string;
}

// ─── Warehouse Mappers ──────────────────────────────────

function mapWarehouse(r: any): InvWarehouseType {
    return {
        id: r.id, tenantId: r.tenant_id, code: r.code, name: r.name,
        warehouseType: r.warehouse_type, address: r.address,
        city: r.city, country: r.country,
        latitude: r.latitude, longitude: r.longitude,
        totalCapacity: r.total_capacity, usedCapacity: r.used_capacity,
        manager: r.manager, phone: r.phone, email: r.email,
        operatingHours: r.operating_hours, tags: r.tags,
        notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapZone(r: any): InvZoneType {
    return {
        id: r.id, warehouseId: r.warehouse_id,
        code: r.code, name: r.name, zoneType: r.zone_type,
        description: r.description, capacity: r.capacity,
        temperatureMin: r.temperature_min, temperatureMax: r.temperature_max,
        isRestricted: r.is_restricted, sortOrder: r.sort_order,
        status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapBin(r: any): InvBinType {
    return {
        id: r.id, zoneId: r.zone_id, code: r.code,
        aisle: r.aisle, rack: r.rack, level: r.level, position: r.position,
        binType: r.bin_type, maxWeight: r.max_weight, maxVolume: r.max_volume,
        currentItemCount: r.current_item_count, isOccupied: r.is_occupied,
        barcode: r.barcode, sortOrder: r.sort_order, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapTransfer(r: any): InvStockTransferType {
    return {
        id: r.id, tenantId: r.tenant_id, transferNumber: r.transfer_number,
        fromWarehouseId: r.from_warehouse_id, toWarehouseId: r.to_warehouse_id,
        fromBinId: r.from_bin_id, toBinId: r.to_bin_id,
        itemId: r.item_id, itemName: r.item_name,
        quantity: r.quantity, uom: r.uom, reason: r.reason,
        requestedBy: r.requested_by, approvedBy: r.approved_by,
        requestedAt: r.requested_at, approvedAt: r.approved_at,
        completedAt: r.completed_at, notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

// ─── Resolver ───────────────────────────────────────────

@Resolver()
export class InventoryResolver {
    constructor(private inventoryService: InventoryService) { }

    // Categories
    @Query(() => [InvCategory])
    async invCategories(@Args('tenantId') tenantId: string) {
        const data = await this.inventoryService.getCategories(tenantId);
        return data.map(mapCategory);
    }

    @Mutation(() => InvCategory)
    async createInvCategory(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateCategoryInput,
    ) {
        const data = await this.inventoryService.createCategory(tenantId, input);
        return mapCategory(data);
    }

    @Mutation(() => InvCategory)
    async updateInvCategory(
        @Args('id') id: string,
        @Args('input') input: UpdateCategoryInput,
    ) {
        const data = await this.inventoryService.updateCategory(id, input);
        return mapCategory(data);
    }

    @Mutation(() => Boolean)
    async deleteInvCategory(@Args('id') id: string) {
        return this.inventoryService.deleteCategory(id);
    }

    // Items
    @Query(() => [InvItem])
    async invItems(
        @Args('tenantId') tenantId: string,
        @Args('fulfillmentType', { nullable: true }) fulfillmentType?: string,
        @Args('itemType', { nullable: true }) itemType?: string,
        @Args('categoryId', { nullable: true }) categoryId?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getItems(tenantId, {
            fulfillmentType, itemType, categoryId, status, search,
        });
        return data.map(mapItem);
    }

    @Query(() => InvItem)
    async invItem(@Args('id') id: string) {
        const data = await this.inventoryService.getItem(id);
        return mapItem(data);
    }

    @Mutation(() => InvItem)
    async createInvItem(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateItemInput,
    ) {
        const data = await this.inventoryService.createItem(tenantId, input);
        return mapItem(data);
    }

    @Mutation(() => InvItem)
    async updateInvItem(
        @Args('id') id: string,
        @Args('input') input: UpdateItemInput,
    ) {
        const data = await this.inventoryService.updateItem(id, input);
        return mapItem(data);
    }

    @Mutation(() => Boolean)
    async deleteInvItem(@Args('id') id: string) {
        return this.inventoryService.deleteItem(id);
    }

    // Variants
    @Query(() => [InvItemVariant])
    async invItemVariants(@Args('itemId') itemId: string) {
        const data = await this.inventoryService.getVariants(itemId);
        return data.map(mapVariant);
    }

    @Mutation(() => InvItemVariant)
    async createInvVariant(
        @Args('itemId') itemId: string,
        @Args('input') input: CreateVariantInput,
    ) {
        const data = await this.inventoryService.createVariant(itemId, input);
        return mapVariant(data);
    }

    @Mutation(() => Boolean)
    async deleteInvVariant(@Args('id') id: string) {
        return this.inventoryService.deleteVariant(id);
    }

    // Stock
    @Query(() => [StockLedgerEntry])
    async invStockLedger(
        @Args('tenantId') tenantId: string,
        @Args('itemId', { nullable: true }) itemId?: string,
        @Args('warehouseId', { nullable: true }) warehouseId?: string,
    ) {
        const data = await this.inventoryService.getStockSummary(tenantId, { itemId, warehouseId });
        return data.map(mapLedger);
    }

    @Query(() => [StockMovement])
    async invStockMovements(
        @Args('tenantId') tenantId: string,
        @Args('itemId', { nullable: true }) itemId?: string,
        @Args('movementType', { nullable: true }) movementType?: string,
        @Args('limit', { type: () => Int, nullable: true }) limit?: number,
    ) {
        const data = await this.inventoryService.getStockMovements(tenantId, { itemId, movementType, limit });
        return data.map(mapMovement);
    }

    @Mutation(() => StockMovement)
    async createStockMovement(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateStockMovementInput,
    ) {
        const data = await this.inventoryService.createStockMovement(tenantId, input);
        return mapMovement(data);
    }

    @Query(() => InvStockStats)
    async invStockStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getStockStats(tenantId);
    }

    // AI
    @Query(() => AiClassification)
    async aiClassifyItem(
        @Args('name') name: string,
        @Args('description', { nullable: true }) description?: string,
    ) {
        return this.inventoryService.aiClassifyItem(name, description || '');
    }

    @Query(() => AiAnomalyResult)
    async aiDetectStockAnomalies(@Args('tenantId') tenantId: string) {
        return this.inventoryService.aiDetectAnomalies(tenantId);
    }

    // ═══════════════════════════════════════════════════════
    // ─── PROCUREMENT ──────────────────────────────────────
    // ═══════════════════════════════════════════════════════

    // Suppliers
    @Query(() => [InvSupplier])
    async invSuppliers(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getSuppliers(tenantId, { status, search });
        return data.map(mapSupplier);
    }

    @Mutation(() => InvSupplier)
    async createInvSupplier(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateSupplierInput,
    ) {
        const data = await this.inventoryService.createSupplier(tenantId, input);
        return mapSupplier(data);
    }

    @Mutation(() => InvSupplier)
    async updateInvSupplier(
        @Args('id') id: string,
        @Args('input') input: CreateSupplierInput,
    ) {
        const data = await this.inventoryService.updateSupplier(id, input);
        return mapSupplier(data);
    }

    @Mutation(() => Boolean)
    async deleteInvSupplier(@Args('id') id: string) {
        return this.inventoryService.deleteSupplier(id);
    }

    // Purchase Requisitions
    @Query(() => [InvPurchaseRequisition])
    async invPurchaseRequisitions(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getPurchaseRequisitions(tenantId, { status, search });
        return data.map(mapPR);
    }

    @Query(() => [InvPrLine])
    async invPrLines(@Args('prId') prId: string) {
        const data = await this.inventoryService.getPrLines(prId);
        return data.map(mapPrLine);
    }

    @Mutation(() => InvPurchaseRequisition)
    async createPurchaseRequisition(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreatePrInput,
    ) {
        const data = await this.inventoryService.createPurchaseRequisition(tenantId, input);
        return mapPR(data);
    }

    @Mutation(() => InvPurchaseRequisition)
    async updatePrStatus(
        @Args('id') id: string,
        @Args('status') status: string,
        @Args('approvedBy', { nullable: true }) approvedBy?: string,
        @Args('rejectionReason', { nullable: true }) rejectionReason?: string,
    ) {
        const data = await this.inventoryService.updatePrStatus(id, status, { approvedBy, rejectionReason });
        return mapPR(data);
    }

    @Mutation(() => Boolean)
    async deletePurchaseRequisition(@Args('id') id: string) {
        return this.inventoryService.deletePurchaseRequisition(id);
    }

    // Purchase Orders
    @Query(() => [InvPurchaseOrder])
    async invPurchaseOrders(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('supplierId', { nullable: true }) supplierId?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getPurchaseOrders(tenantId, { status, supplierId, search });
        return data.map(mapPO);
    }

    @Query(() => [InvPoLine])
    async invPoLines(@Args('poId') poId: string) {
        const data = await this.inventoryService.getPoLines(poId);
        return data.map(mapPoLine);
    }

    @Mutation(() => InvPurchaseOrder)
    async createPurchaseOrder(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreatePoInput,
    ) {
        const data = await this.inventoryService.createPurchaseOrder(tenantId, input);
        return mapPO(data);
    }

    @Mutation(() => InvPurchaseOrder)
    async updatePoStatus(
        @Args('id') id: string,
        @Args('status') status: string,
    ) {
        const data = await this.inventoryService.updatePoStatus(id, status);
        return mapPO(data);
    }

    @Mutation(() => Boolean)
    async deletePurchaseOrder(@Args('id') id: string) {
        return this.inventoryService.deletePurchaseOrder(id);
    }

    // Goods Received Notes
    @Query(() => [InvGoodsReceivedNote])
    async invGoodsReceivedNotes(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('poId', { nullable: true }) poId?: string,
    ) {
        const data = await this.inventoryService.getGoodsReceivedNotes(tenantId, { status, poId });
        return data.map(mapGRN);
    }

    @Query(() => [InvGrnLine])
    async invGrnLines(@Args('grnId') grnId: string) {
        const data = await this.inventoryService.getGrnLines(grnId);
        return data.map(mapGrnLine);
    }

    @Mutation(() => InvGoodsReceivedNote)
    async createGoodsReceivedNote(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateGrnInput,
    ) {
        const data = await this.inventoryService.createGoodsReceivedNote(tenantId, input);
        return mapGRN(data);
    }

    @Mutation(() => InvGoodsReceivedNote)
    async acceptGrn(
        @Args('id') id: string,
        @Args('tenantId') tenantId: string,
    ) {
        const data = await this.inventoryService.acceptGrn(id, tenantId);
        return mapGRN(data);
    }

    @Mutation(() => Boolean)
    async deleteGoodsReceivedNote(@Args('id') id: string) {
        return this.inventoryService.deleteGoodsReceivedNote(id);
    }

    // Procurement Stats
    @Query(() => ProcurementStats)
    async procurementStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getProcurementStats(tenantId);
    }

    // ═══════════════════════════════════════════════════════
    // ─── WAREHOUSE MANAGEMENT ─────────────────────────────
    // ═══════════════════════════════════════════════════════

    // Warehouses
    @Query(() => [InvWarehouseType])
    async invWarehouses(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getWarehouses(tenantId, { status, search });
        return data.map(mapWarehouse);
    }

    @Query(() => InvWarehouseType)
    async invWarehouse(@Args('id') id: string) {
        const data = await this.inventoryService.getWarehouse(id);
        return mapWarehouse(data);
    }

    @Mutation(() => InvWarehouseType)
    async createWarehouse(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateWarehouseInput,
    ) {
        const data = await this.inventoryService.createWarehouse(tenantId, input);
        return mapWarehouse(data);
    }

    @Mutation(() => InvWarehouseType)
    async updateWarehouse(
        @Args('id') id: string,
        @Args('input') input: CreateWarehouseInput,
    ) {
        const data = await this.inventoryService.updateWarehouse(id, input);
        return mapWarehouse(data);
    }

    @Mutation(() => Boolean)
    async deleteWarehouse(@Args('id') id: string) {
        return this.inventoryService.deleteWarehouse(id);
    }

    // Zones
    @Query(() => [InvZoneType])
    async invZones(@Args('warehouseId', { nullable: true }) warehouseId?: string) {
        const data = await this.inventoryService.getZones(warehouseId);
        return data.map(mapZone);
    }

    @Mutation(() => InvZoneType)
    async createZone(
        @Args('warehouseId') warehouseId: string,
        @Args('input') input: CreateZoneInput,
    ) {
        const data = await this.inventoryService.createZone(warehouseId, input);
        return mapZone(data);
    }

    @Mutation(() => InvZoneType)
    async updateZone(
        @Args('id') id: string,
        @Args('input') input: CreateZoneInput,
    ) {
        const data = await this.inventoryService.updateZone(id, input);
        return mapZone(data);
    }

    @Mutation(() => Boolean)
    async deleteZone(@Args('id') id: string) {
        return this.inventoryService.deleteZone(id);
    }

    // Bins
    @Query(() => [InvBinType])
    async invBins(@Args('zoneId', { nullable: true }) zoneId?: string) {
        const data = await this.inventoryService.getBins(zoneId);
        return data.map(mapBin);
    }

    @Mutation(() => InvBinType)
    async createBin(
        @Args('zoneId') zoneId: string,
        @Args('input') input: CreateBinInput,
    ) {
        const data = await this.inventoryService.createBin(zoneId, input);
        return mapBin(data);
    }

    @Mutation(() => InvBinType)
    async updateBin(
        @Args('id') id: string,
        @Args('input') input: CreateBinInput,
    ) {
        const data = await this.inventoryService.updateBin(id, input);
        return mapBin(data);
    }

    @Mutation(() => Boolean)
    async deleteBin(@Args('id') id: string) {
        return this.inventoryService.deleteBin(id);
    }

    // Stock Transfers
    @Query(() => [InvStockTransferType])
    async invStockTransfers(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
    ) {
        const data = await this.inventoryService.getStockTransfers(tenantId, { status });
        return data.map(mapTransfer);
    }

    @Mutation(() => InvStockTransferType)
    async createStockTransfer(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateStockTransferInput,
    ) {
        const data = await this.inventoryService.createStockTransfer(tenantId, input);
        return mapTransfer(data);
    }

    @Mutation(() => InvStockTransferType)
    async approveStockTransfer(
        @Args('id') id: string,
        @Args('tenantId') tenantId: string,
        @Args('approvedBy', { nullable: true }) approvedBy?: string,
    ) {
        const data = await this.inventoryService.approveStockTransfer(id, tenantId, approvedBy);
        return mapTransfer(data);
    }

    @Mutation(() => InvStockTransferType)
    async completeStockTransfer(@Args('id') id: string) {
        const data = await this.inventoryService.completeStockTransfer(id);
        return mapTransfer(data);
    }

    @Mutation(() => Boolean)
    async deleteStockTransfer(@Args('id') id: string) {
        return this.inventoryService.deleteStockTransfer(id);
    }

    // Warehouse Stats
    @Query(() => WarehouseStats)
    async warehouseStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getWarehouseStats(tenantId);
    }
}


