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
    @Field({ nullable: true }) hasExpiry?: boolean;
    @Field(() => Int, { nullable: true }) defaultShelfLifeDays?: number;
    @Field({ nullable: true }) hasDepreciation?: boolean;
    @Field({ nullable: true }) depreciationMethod?: string;
    @Field(() => Int, { nullable: true }) usefulLifeMonths?: number;
    @Field(() => Float, { nullable: true }) salvageValue?: number;
    @Field({ nullable: true }) isFixedAsset?: boolean;
    @Field({ nullable: true }) assetCategory?: string;
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
    @Field({ nullable: true }) hasExpiry?: boolean;
    @Field(() => Int, { nullable: true }) defaultShelfLifeDays?: number;
    @Field({ nullable: true }) hasDepreciation?: boolean;
    @Field({ nullable: true }) depreciationMethod?: string;
    @Field(() => Int, { nullable: true }) usefulLifeMonths?: number;
    @Field(() => Float, { nullable: true }) salvageValue?: number;
    @Field({ nullable: true }) isFixedAsset?: boolean;
    @Field({ nullable: true }) assetCategory?: string;
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
    @Field({ nullable: true }) hasExpiry?: boolean;
    @Field(() => Int, { nullable: true }) defaultShelfLifeDays?: number;
    @Field({ nullable: true }) hasDepreciation?: boolean;
    @Field({ nullable: true }) depreciationMethod?: string;
    @Field(() => Int, { nullable: true }) usefulLifeMonths?: number;
    @Field(() => Float, { nullable: true }) salvageValue?: number;
    @Field({ nullable: true }) isFixedAsset?: boolean;
    @Field({ nullable: true }) assetCategory?: string;
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
        hasExpiry: r.has_expiry, defaultShelfLifeDays: r.default_shelf_life_days,
        hasDepreciation: r.has_depreciation, depreciationMethod: r.depreciation_method,
        usefulLifeMonths: r.useful_life_months, salvageValue: r.salvage_value,
        isFixedAsset: r.is_fixed_asset, assetCategory: r.asset_category,
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
    @Field({ nullable: true }) accountId?: string;
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
    @Field({ nullable: true }) accountId?: string;
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
        accountId: r.account_id,
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

// ═══════════════════════════════════════════════════════════
// ─── MANUFACTURING Types, Inputs, Mappers ─────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class MfgBomType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() code: string;
    @Field() name: string;
    @Field({ nullable: true }) version?: string;
    @Field({ nullable: true }) productName?: string;
    @Field({ nullable: true }) productSku?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) uom?: string;
    @Field(() => Float, { nullable: true }) yieldQty?: number;
    @Field(() => Float, { nullable: true }) laborHours?: number;
    @Field(() => Float, { nullable: true }) laborCost?: number;
    @Field(() => Float, { nullable: true }) overheadCost?: number;
    @Field(() => Float, { nullable: true }) totalMaterialCost?: number;
    @Field(() => Float, { nullable: true }) totalCost?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class MfgBomLineType {
    @Field(() => ID) id: string;
    @Field() bomId: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field(() => Float) quantity: number;
    @Field({ nullable: true }) uom?: string;
    @Field(() => Float, { nullable: true }) unitCost?: number;
    @Field(() => Float, { nullable: true }) totalCost?: number;
    @Field(() => Float, { nullable: true }) scrapPct?: number;
    @Field({ nullable: true }) notes?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class MfgWorkOrderType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() woNumber: string;
    @Field({ nullable: true }) bomId?: string;
    @Field({ nullable: true }) bomName?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field({ nullable: true }) warehouseName?: string;
    @Field(() => Float) plannedQty: number;
    @Field(() => Float, { nullable: true }) completedQty?: number;
    @Field({ nullable: true }) uom?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) plannedStart?: string;
    @Field({ nullable: true }) plannedEnd?: string;
    @Field({ nullable: true }) actualStart?: string;
    @Field({ nullable: true }) actualEnd?: string;
    @Field(() => Float, { nullable: true }) estimatedCost?: number;
    @Field(() => Float, { nullable: true }) actualCost?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class ManufacturingStats {
    @Field(() => Int) totalBoms: number;
    @Field(() => Int) totalWorkOrders: number;
    @Field(() => Int) draftWos: number;
    @Field(() => Int) plannedWos: number;
    @Field(() => Int) inProgressWos: number;
    @Field(() => Int) completedWos: number;
}

@InputType()
class CreateBomInput {
    @Field() code: string;
    @Field() name: string;
    @Field({ nullable: true }) version?: string;
    @Field({ nullable: true }) productName?: string;
    @Field({ nullable: true }) productSku?: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) uom?: string;
    @Field(() => Float, { nullable: true }) yieldQty?: number;
    @Field(() => Float, { nullable: true }) laborHours?: number;
    @Field(() => Float, { nullable: true }) laborCost?: number;
    @Field(() => Float, { nullable: true }) overheadCost?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreateBomLineInput {
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field(() => Float) quantity: number;
    @Field({ nullable: true }) uom?: string;
    @Field(() => Float, { nullable: true }) unitCost?: number;
    @Field(() => Float, { nullable: true }) totalCost?: number;
    @Field(() => Float, { nullable: true }) scrapPct?: number;
    @Field({ nullable: true }) notes?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

@InputType()
class CreateWorkOrderInput {
    @Field() woNumber: string;
    @Field({ nullable: true }) bomId?: string;
    @Field({ nullable: true }) bomName?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field({ nullable: true }) warehouseName?: string;
    @Field(() => Float, { nullable: true }) plannedQty?: number;
    @Field({ nullable: true }) uom?: string;
    @Field({ nullable: true }) priority?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) plannedStart?: string;
    @Field({ nullable: true }) plannedEnd?: string;
    @Field(() => Float, { nullable: true }) estimatedCost?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

function mapBom(r: any): MfgBomType {
    return {
        id: r.id, tenantId: r.tenant_id, code: r.code, name: r.name,
        version: r.version, productName: r.product_name, productSku: r.product_sku,
        description: r.description, uom: r.uom, yieldQty: r.yield_qty,
        laborHours: r.labor_hours, laborCost: r.labor_cost,
        overheadCost: r.overhead_cost, totalMaterialCost: r.total_material_cost,
        totalCost: r.total_cost, notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapBomLine(r: any): MfgBomLineType {
    return {
        id: r.id, bomId: r.bom_id, itemId: r.item_id,
        itemName: r.item_name, itemSku: r.item_sku,
        quantity: r.quantity, uom: r.uom, unitCost: r.unit_cost,
        totalCost: r.total_cost, scrapPct: r.scrap_pct,
        notes: r.notes, sortOrder: r.sort_order,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapWorkOrder(r: any): MfgWorkOrderType {
    return {
        id: r.id, tenantId: r.tenant_id, woNumber: r.wo_number,
        bomId: r.bom_id, bomName: r.bom_name,
        warehouseId: r.warehouse_id, warehouseName: r.warehouse_name,
        plannedQty: r.planned_qty, completedQty: r.completed_qty,
        uom: r.uom, priority: r.priority, assignedTo: r.assigned_to,
        plannedStart: r.planned_start, plannedEnd: r.planned_end,
        actualStart: r.actual_start, actualEnd: r.actual_end,
        estimatedCost: r.estimated_cost, actualCost: r.actual_cost,
        notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

// ─── Resolver ───────────────────────────────────────────

// ═══════════════════════════════════════════════════════════
// ─── STOCK OPNAME Types, Inputs, Mappers ──────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class OpnameSessionType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() sessionCode: string;
    @Field() title: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field({ nullable: true }) warehouseName?: string;
    @Field({ nullable: true }) countedBy?: string;
    @Field({ nullable: true }) reviewedBy?: string;
    @Field({ nullable: true }) scheduledDate?: string;
    @Field({ nullable: true }) startedAt?: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field(() => Int, { nullable: true }) totalItems?: number;
    @Field(() => Int, { nullable: true }) itemsCounted?: number;
    @Field(() => Float, { nullable: true }) totalVarianceQty?: number;
    @Field(() => Float, { nullable: true }) totalVarianceValue?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class OpnameLineType {
    @Field(() => ID) id: string;
    @Field() sessionId: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field({ nullable: true }) zoneName?: string;
    @Field({ nullable: true }) binCode?: string;
    @Field({ nullable: true }) uom?: string;
    @Field(() => Float) systemQty: number;
    @Field(() => Float, { nullable: true }) actualQty?: number;
    @Field(() => Float, { nullable: true }) varianceQty?: number;
    @Field(() => Float, { nullable: true }) unitCost?: number;
    @Field(() => Float, { nullable: true }) varianceValue?: number;
    @Field({ nullable: true }) countedAt?: string;
    @Field({ nullable: true }) countedBy?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class OpnameStats {
    @Field(() => Int) totalSessions: number;
    @Field(() => Int) draft: number;
    @Field(() => Int) counting: number;
    @Field(() => Int) review: number;
    @Field(() => Int) completed: number;
    @Field(() => Float) totalVariance: number;
}

@InputType()
class CreateOpnameSessionInput {
    @Field() sessionCode: string;
    @Field() title: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field({ nullable: true }) warehouseName?: string;
    @Field({ nullable: true }) countedBy?: string;
    @Field({ nullable: true }) scheduledDate?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreateOpnameLineInput {
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field({ nullable: true }) zoneName?: string;
    @Field({ nullable: true }) binCode?: string;
    @Field({ nullable: true }) uom?: string;
    @Field(() => Float) systemQty: number;
    @Field(() => Float, { nullable: true }) actualQty?: number;
    @Field(() => Float, { nullable: true }) unitCost?: number;
    @Field({ nullable: true }) countedBy?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

function mapOpnameSession(r: any): OpnameSessionType {
    return {
        id: r.id, tenantId: r.tenant_id, sessionCode: r.session_code, title: r.title,
        warehouseId: r.warehouse_id, warehouseName: r.warehouse_name,
        countedBy: r.counted_by, reviewedBy: r.reviewed_by,
        scheduledDate: r.scheduled_date, startedAt: r.started_at, completedAt: r.completed_at,
        totalItems: r.total_items, itemsCounted: r.items_counted,
        totalVarianceQty: r.total_variance_qty, totalVarianceValue: r.total_variance_value,
        notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapOpnameLine(r: any): OpnameLineType {
    return {
        id: r.id, sessionId: r.session_id, itemId: r.item_id,
        itemName: r.item_name, itemSku: r.item_sku,
        zoneName: r.zone_name, binCode: r.bin_code, uom: r.uom,
        systemQty: r.system_qty, actualQty: r.actual_qty,
        varianceQty: r.variance_qty, unitCost: r.unit_cost,
        varianceValue: r.variance_value, countedAt: r.counted_at,
        countedBy: r.counted_by, notes: r.notes, status: r.status,
        sortOrder: r.sort_order, createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

// ═══════════════════════════════════════════════════════════
// ─── E-COMMERCE Types, Inputs, Mappers ────────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class EcomCustomerType {
    @Field() id: string;
    @Field({ nullable: true }) tenantId?: string;
    @Field({ nullable: true }) customerCode?: string;
    @Field() firstName: string;
    @Field({ nullable: true }) lastName?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) company?: string;
    @Field({ nullable: true }) address?: string;
    @Field({ nullable: true }) city?: string;
    @Field({ nullable: true }) province?: string;
    @Field({ nullable: true }) postalCode?: string;
    @Field({ nullable: true }) idNumber?: string;
    @Field({ nullable: true }) customerType?: string;
    @Field(() => Int, { nullable: true }) totalOrders?: number;
    @Field(() => Float, { nullable: true }) totalSpent?: number;
    @Field(() => Int, { nullable: true }) loyaltyPoints?: number;
    @Field({ nullable: true }) notes?: string;
    @Field(() => [String], { nullable: true }) tags?: string[];
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) contactId?: string;
    @Field({ nullable: true }) createdAt?: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
class EcomOrderType {
    @Field() id: string;
    @Field({ nullable: true }) tenantId?: string;
    @Field() orderNumber: string;
    @Field({ nullable: true }) customerId?: string;
    @Field({ nullable: true }) customerName?: string;
    @Field({ nullable: true }) customerEmail?: string;
    @Field({ nullable: true }) customerPhone?: string;
    @Field({ nullable: true }) shippingAddress?: string;
    @Field({ nullable: true }) shippingCity?: string;
    @Field({ nullable: true }) shippingProvince?: string;
    @Field({ nullable: true }) shippingPostalCode?: string;
    @Field({ nullable: true }) shippingMethod?: string;
    @Field(() => Float, { nullable: true }) shippingCost?: number;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => Float, { nullable: true }) taxAmount?: number;
    @Field(() => Float, { nullable: true }) discountAmount?: number;
    @Field(() => Float, { nullable: true }) totalAmount?: number;
    @Field(() => Float, { nullable: true }) paidAmount?: number;
    @Field({ nullable: true }) paymentMethod?: string;
    @Field({ nullable: true }) paymentStatus?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) internalNotes?: string;
    @Field({ nullable: true }) source?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) confirmedAt?: string;
    @Field({ nullable: true }) shippedAt?: string;
    @Field({ nullable: true }) deliveredAt?: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field({ nullable: true }) cancelledAt?: string;
    @Field({ nullable: true }) createdAt?: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
class EcomOrderItemType {
    @Field() id: string;
    @Field() orderId: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field({ nullable: true }) fulfillmentType?: string;
    @Field({ nullable: true }) fulfillmentRef?: string;
    @Field(() => Int) quantity: number;
    @Field(() => Float) unitPrice: number;
    @Field(() => Float, { nullable: true }) discount?: number;
    @Field(() => Float, { nullable: true }) tax?: number;
    @Field(() => Float) subtotal: number;
    @Field(() => GraphQLJSON, { nullable: true }) variantInfo?: any;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) createdAt?: string;
}

@ObjectType()
class EcomStoreSettingsType {
    @Field() id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) storeName?: string;
    @Field({ nullable: true }) storeEmail?: string;
    @Field({ nullable: true }) storePhone?: string;
    @Field({ nullable: true }) storeAddress?: string;
    @Field({ nullable: true }) defaultCurrency?: string;
    @Field(() => Float, { nullable: true }) taxRate?: number;
    @Field({ nullable: true }) taxIncluded?: boolean;
    @Field({ nullable: true }) shippingEnabled?: boolean;
    @Field(() => Float, { nullable: true }) defaultShippingCost?: number;
    @Field(() => Float, { nullable: true }) freeShippingThreshold?: number;
    @Field(() => GraphQLJSON, { nullable: true }) paymentMethods?: any;
    @Field(() => GraphQLJSON, { nullable: true }) fulfillmentPhysical?: any;
    @Field(() => GraphQLJSON, { nullable: true }) fulfillmentTicket?: any;
    @Field(() => GraphQLJSON, { nullable: true }) fulfillmentScheduled?: any;
    @Field(() => GraphQLJSON, { nullable: true }) fulfillmentRental?: any;
    @Field({ nullable: true }) lowStockAlert?: boolean;
    @Field({ nullable: true }) orderPrefix?: string;
    @Field({ nullable: true }) invoicePrefix?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) createdAt?: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
class EcomStats {
    @Field(() => Int) totalOrders: number;
    @Field(() => Int) pending: number;
    @Field(() => Int) confirmed: number;
    @Field(() => Int) processing: number;
    @Field(() => Int) shipped: number;
    @Field(() => Int) delivered: number;
    @Field(() => Int) completed: number;
    @Field(() => Int) cancelled: number;
    @Field(() => Float) totalRevenue: number;
    @Field(() => Float) avgOrderValue: number;
    @Field(() => Int) totalCustomers: number;
    @Field(() => Int) activeCustomers: number;
}

@InputType()
class EcomCustomerInput {
    @Field() customerCode: string;
    @Field() firstName: string;
    @Field({ nullable: true }) lastName?: string;
    @Field({ nullable: true }) email?: string;
    @Field({ nullable: true }) phone?: string;
    @Field({ nullable: true }) company?: string;
    @Field({ nullable: true }) address?: string;
    @Field({ nullable: true }) city?: string;
    @Field({ nullable: true }) province?: string;
    @Field({ nullable: true }) postalCode?: string;
    @Field({ nullable: true }) idNumber?: string;
    @Field({ nullable: true }) customerType?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) accountId?: string;
    @Field({ nullable: true }) contactId?: string;
}

@InputType()
class EcomOrderInput {
    @Field() orderNumber: string;
    @Field({ nullable: true }) customerId?: string;
    @Field({ nullable: true }) customerName?: string;
    @Field({ nullable: true }) customerEmail?: string;
    @Field({ nullable: true }) customerPhone?: string;
    @Field({ nullable: true }) shippingAddress?: string;
    @Field({ nullable: true }) shippingCity?: string;
    @Field({ nullable: true }) shippingProvince?: string;
    @Field({ nullable: true }) shippingPostalCode?: string;
    @Field({ nullable: true }) shippingMethod?: string;
    @Field(() => Float, { nullable: true }) shippingCost?: number;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => Float, { nullable: true }) taxAmount?: number;
    @Field(() => Float, { nullable: true }) discountAmount?: number;
    @Field(() => Float, { nullable: true }) totalAmount?: number;
    @Field({ nullable: true }) paymentMethod?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) source?: string;
}

@InputType()
class EcomOrderItemInput {
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field({ nullable: true }) fulfillmentType?: string;
    @Field({ nullable: true }) fulfillmentRef?: string;
    @Field(() => Int, { nullable: true }) quantity?: number;
    @Field(() => Float, { nullable: true }) unitPrice?: number;
    @Field(() => Float, { nullable: true }) discount?: number;
    @Field(() => Float, { nullable: true }) tax?: number;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => GraphQLJSON, { nullable: true }) variantInfo?: any;
    @Field({ nullable: true }) notes?: string;
}

@InputType()
class EcomStoreSettingsInput {
    @Field({ nullable: true }) storeName?: string;
    @Field({ nullable: true }) storeEmail?: string;
    @Field({ nullable: true }) storePhone?: string;
    @Field({ nullable: true }) storeAddress?: string;
    @Field({ nullable: true }) defaultCurrency?: string;
    @Field(() => Float, { nullable: true }) taxRate?: number;
    @Field({ nullable: true }) taxIncluded?: boolean;
    @Field({ nullable: true }) shippingEnabled?: boolean;
    @Field(() => Float, { nullable: true }) defaultShippingCost?: number;
    @Field(() => Float, { nullable: true }) freeShippingThreshold?: number;
    @Field(() => GraphQLJSON, { nullable: true }) paymentMethods?: any;
    @Field(() => GraphQLJSON, { nullable: true }) fulfillmentPhysical?: any;
    @Field(() => GraphQLJSON, { nullable: true }) fulfillmentTicket?: any;
    @Field(() => GraphQLJSON, { nullable: true }) fulfillmentScheduled?: any;
    @Field(() => GraphQLJSON, { nullable: true }) fulfillmentRental?: any;
    @Field({ nullable: true }) lowStockAlert?: boolean;
    @Field({ nullable: true }) orderPrefix?: string;
    @Field({ nullable: true }) invoicePrefix?: string;
    @Field({ nullable: true }) notes?: string;
}

const mapEcomCustomer = (r: any): any => ({
    id: r.id, tenantId: r.tenant_id, customerCode: r.customer_code,
    firstName: r.first_name, lastName: r.last_name, email: r.email,
    phone: r.phone, company: r.company, address: r.address,
    city: r.city, province: r.province, postalCode: r.postal_code,
    idNumber: r.id_number, customerType: r.customer_type,
    totalOrders: r.total_orders, totalSpent: parseFloat(r.total_spent) || 0,
    loyaltyPoints: r.loyalty_points, notes: r.notes, tags: r.tags,
    status: r.status, createdAt: r.created_at, updatedAt: r.updated_at,
    accountId: r.account_id, contactId: r.contact_id,
});

const mapEcomOrder = (r: any): any => ({
    id: r.id, tenantId: r.tenant_id, orderNumber: r.order_number,
    customerId: r.customer_id, customerName: r.customer_name,
    customerEmail: r.customer_email, customerPhone: r.customer_phone,
    shippingAddress: r.shipping_address, shippingCity: r.shipping_city,
    shippingProvince: r.shipping_province, shippingPostalCode: r.shipping_postal_code,
    shippingMethod: r.shipping_method, shippingCost: parseFloat(r.shipping_cost) || 0,
    subtotal: parseFloat(r.subtotal) || 0, taxAmount: parseFloat(r.tax_amount) || 0,
    discountAmount: parseFloat(r.discount_amount) || 0,
    totalAmount: parseFloat(r.total_amount) || 0,
    paidAmount: parseFloat(r.paid_amount) || 0,
    paymentMethod: r.payment_method, paymentStatus: r.payment_status,
    notes: r.notes, internalNotes: r.internal_notes, source: r.source,
    status: r.status, confirmedAt: r.confirmed_at, shippedAt: r.shipped_at,
    deliveredAt: r.delivered_at, completedAt: r.completed_at,
    cancelledAt: r.cancelled_at, createdAt: r.created_at, updatedAt: r.updated_at,
});

const mapEcomOrderItem = (r: any): any => ({
    id: r.id, orderId: r.order_id, itemId: r.item_id,
    itemName: r.item_name, itemSku: r.item_sku,
    fulfillmentType: r.fulfillment_type, fulfillmentRef: r.fulfillment_ref,
    quantity: r.quantity, unitPrice: parseFloat(r.unit_price) || 0,
    discount: parseFloat(r.discount) || 0, tax: parseFloat(r.tax) || 0,
    subtotal: parseFloat(r.subtotal) || 0, variantInfo: r.variant_info,
    notes: r.notes, status: r.status, createdAt: r.created_at,
});

const mapStoreSettings = (r: any): any => ({
    id: r.id, tenantId: r.tenant_id, storeName: r.store_name,
    storeEmail: r.store_email, storePhone: r.store_phone,
    storeAddress: r.store_address, defaultCurrency: r.default_currency,
    taxRate: parseFloat(r.tax_rate) || 0, taxIncluded: r.tax_included,
    shippingEnabled: r.shipping_enabled,
    defaultShippingCost: parseFloat(r.default_shipping_cost) || 0,
    freeShippingThreshold: parseFloat(r.free_shipping_threshold) || 0,
    paymentMethods: r.payment_methods, fulfillmentPhysical: r.fulfillment_physical,
    fulfillmentTicket: r.fulfillment_ticket, fulfillmentScheduled: r.fulfillment_scheduled,
    fulfillmentRental: r.fulfillment_rental, lowStockAlert: r.low_stock_alert,
    orderPrefix: r.order_prefix, invoicePrefix: r.invoice_prefix,
    notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at,
});

// ═══════════════════════════════════════════════════════════
// ─── BOOKING Types, Inputs, Mappers ───────────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class BookingScheduleType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() scheduleCode: string;
    @Field() routeName: string;
    @Field({ nullable: true }) origin?: string;
    @Field({ nullable: true }) destination?: string;
    @Field({ nullable: true }) departureTime?: string;
    @Field({ nullable: true }) arrivalTime?: string;
    @Field(() => Int, { nullable: true }) durationMinutes?: number;
    @Field(() => Int, { nullable: true }) capacity?: number;
    @Field({ nullable: true }) vehicleName?: string;
    @Field({ nullable: true }) vesselType?: string;
    @Field(() => Float, { nullable: true }) priceEconomy?: number;
    @Field(() => Float, { nullable: true }) priceBusiness?: number;
    @Field(() => Float, { nullable: true }) priceVip?: number;
    @Field(() => [String], { nullable: true }) operatingDays?: string[];
    @Field(() => Int, { nullable: true }) autoGenerateDays?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class BookingOccurrenceType {
    @Field(() => ID) id: string;
    @Field() scheduleId: string;
    @Field() departureDate: string;
    @Field({ nullable: true }) departureTime?: string;
    @Field(() => Int, { nullable: true }) totalCapacity?: number;
    @Field(() => Int, { nullable: true }) bookedCount?: number;
    @Field(() => Int, { nullable: true }) checkedInCount?: number;
    @Field({ nullable: true }) actualDeparture?: string;
    @Field({ nullable: true }) actualArrival?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
}

@ObjectType()
class BookingType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() bookingCode: string;
    @Field({ nullable: true }) scheduleId?: string;
    @Field({ nullable: true }) occurrenceId?: string;
    @Field({ nullable: true }) customerName?: string;
    @Field({ nullable: true }) customerEmail?: string;
    @Field({ nullable: true }) customerPhone?: string;
    @Field(() => Int, { nullable: true }) passengerCount?: number;
    @Field({ nullable: true }) class?: string;
    @Field(() => Float, { nullable: true }) totalAmount?: number;
    @Field(() => Float, { nullable: true }) paidAmount?: number;
    @Field({ nullable: true }) qrCode?: string;
    @Field({ nullable: true }) checkInTime?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class BookingPassengerType {
    @Field(() => ID) id: string;
    @Field() bookingId: string;
    @Field() name: string;
    @Field({ nullable: true }) idNumber?: string;
    @Field({ nullable: true }) nationality?: string;
    @Field({ nullable: true }) seatLabel?: string;
    @Field({ nullable: true }) class?: string;
    @Field({ nullable: true }) notes?: string;
    @Field() createdAt: string;
}

@ObjectType()
class BookingStats {
    @Field(() => Int) totalSchedules: number;
    @Field(() => Int) totalBookings: number;
    @Field(() => Int) confirmedBookings: number;
    @Field(() => Int) checkedInBookings: number;
    @Field(() => Int) totalOccurrences: number;
    @Field(() => Int) upcomingDepartures: number;
    @Field(() => Float) totalRevenue: number;
}

@InputType()
class CreateScheduleInput {
    @Field({ nullable: true }) itemId?: string;
    @Field() scheduleCode: string;
    @Field() routeName: string;
    @Field({ nullable: true }) origin?: string;
    @Field({ nullable: true }) destination?: string;
    @Field({ nullable: true }) departureTime?: string;
    @Field({ nullable: true }) arrivalTime?: string;
    @Field(() => Int, { nullable: true }) durationMinutes?: number;
    @Field(() => Int, { nullable: true }) capacity?: number;
    @Field({ nullable: true }) vehicleName?: string;
    @Field({ nullable: true }) vesselType?: string;
    @Field(() => Float, { nullable: true }) priceEconomy?: number;
    @Field(() => Float, { nullable: true }) priceBusiness?: number;
    @Field(() => Float, { nullable: true }) priceVip?: number;
    @Field(() => [String], { nullable: true }) operatingDays?: string[];
    @Field(() => Int, { nullable: true }) autoGenerateDays?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreateBookingInput {
    @Field() bookingCode: string;
    @Field({ nullable: true }) scheduleId?: string;
    @Field({ nullable: true }) occurrenceId?: string;
    @Field({ nullable: true }) customerName?: string;
    @Field({ nullable: true }) customerEmail?: string;
    @Field({ nullable: true }) customerPhone?: string;
    @Field(() => Int, { nullable: true }) passengerCount?: number;
    @Field({ nullable: true }) class?: string;
    @Field(() => Float, { nullable: true }) totalAmount?: number;
    @Field(() => Float, { nullable: true }) paidAmount?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

function mapSchedule(r: any): BookingScheduleType {
    return { id: r.id, tenantId: r.tenant_id, itemId: r.item_id || null, scheduleCode: r.schedule_code, routeName: r.route_name,
        origin: r.origin, destination: r.destination, departureTime: r.departure_time, arrivalTime: r.arrival_time,
        durationMinutes: r.duration_minutes, capacity: r.capacity, vehicleName: r.vehicle_name, vesselType: r.vessel_type,
        priceEconomy: r.price_economy, priceBusiness: r.price_business, priceVip: r.price_vip,
        operatingDays: r.operating_days, autoGenerateDays: r.auto_generate_days,
        notes: r.notes, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapOccurrence(r: any): BookingOccurrenceType {
    return { id: r.id, scheduleId: r.schedule_id, departureDate: r.departure_date, departureTime: r.departure_time,
        totalCapacity: r.total_capacity, bookedCount: r.booked_count, checkedInCount: r.checked_in_count,
        actualDeparture: r.actual_departure, actualArrival: r.actual_arrival,
        notes: r.notes, status: r.status, createdAt: r.created_at };
}
function mapBooking(r: any): BookingType {
    return { id: r.id, tenantId: r.tenant_id, bookingCode: r.booking_code,
        scheduleId: r.schedule_id, occurrenceId: r.occurrence_id,
        customerName: r.customer_name, customerEmail: r.customer_email, customerPhone: r.customer_phone,
        passengerCount: r.passenger_count, class: r.class, totalAmount: r.total_amount, paidAmount: r.paid_amount,
        qrCode: r.qr_code, checkInTime: r.check_in_time, notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapPassenger(r: any): BookingPassengerType {
    return { id: r.id, bookingId: r.booking_id, name: r.name, idNumber: r.id_number,
        nationality: r.nationality, seatLabel: r.seat_label, class: r.class, notes: r.notes, createdAt: r.created_at };
}

// ═══════════════════════════════════════════════════════════
// ─── RENTAL Types, Inputs, Mappers ────────────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class RentalAssetType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() assetCode: string;
    @Field() assetName: string;
    @Field({ nullable: true }) serialNumber?: string;
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) condition?: string;
    @Field({ nullable: true }) purchaseDate?: string;
    @Field(() => Float, { nullable: true }) purchaseCost?: number;
    @Field({ nullable: true }) currentLocation?: string;
    @Field(() => Float, { nullable: true }) dailyRate?: number;
    @Field(() => Float, { nullable: true }) depositAmount?: number;
    @Field({ nullable: true }) lastMaintenanceDate?: string;
    @Field({ nullable: true }) nextMaintenanceDate?: string;
    @Field(() => Int, { nullable: true }) totalRentals?: number;
    @Field(() => Float, { nullable: true }) totalRevenue?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class RentalContractType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() contractCode: string;
    @Field() assetId: string;
    @Field({ nullable: true }) assetName?: string;
    @Field() customerName: string;
    @Field({ nullable: true }) customerEmail?: string;
    @Field({ nullable: true }) customerPhone?: string;
    @Field({ nullable: true }) customerIdNumber?: string;
    @Field() checkoutDate: string;
    @Field() expectedReturnDate: string;
    @Field({ nullable: true }) actualReturnDate?: string;
    @Field(() => Float, { nullable: true }) dailyRate?: number;
    @Field(() => Float, { nullable: true }) depositAmount?: number;
    @Field(() => Float, { nullable: true }) depositReturned?: number;
    @Field(() => Int, { nullable: true }) rentalDays?: number;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => Float, { nullable: true }) lateFee?: number;
    @Field(() => Float, { nullable: true }) damageFee?: number;
    @Field(() => Float, { nullable: true }) totalCharge?: number;
    @Field({ nullable: true }) checkoutCondition?: string;
    @Field({ nullable: true }) returnCondition?: string;
    @Field({ nullable: true }) checkoutNotes?: string;
    @Field({ nullable: true }) returnNotes?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class RentalStats {
    @Field(() => Int) totalAssets: number;
    @Field(() => Int) available: number;
    @Field(() => Int) rented: number;
    @Field(() => Int) maintenance: number;
    @Field(() => Int) totalContracts: number;
    @Field(() => Int) activeContracts: number;
    @Field(() => Int) overdue: number;
    @Field(() => Float) totalRevenue: number;
}

@InputType()
class CreateRentalAssetInput {
    @Field() assetCode: string;
    @Field() assetName: string;
    @Field({ nullable: true }) serialNumber?: string;
    @Field({ nullable: true }) category?: string;
    @Field({ nullable: true }) condition?: string;
    @Field({ nullable: true }) purchaseDate?: string;
    @Field(() => Float, { nullable: true }) purchaseCost?: number;
    @Field({ nullable: true }) currentLocation?: string;
    @Field(() => Float, { nullable: true }) dailyRate?: number;
    @Field(() => Float, { nullable: true }) depositAmount?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class CreateRentalContractInput {
    @Field() contractCode: string;
    @Field() assetId: string;
    @Field({ nullable: true }) assetName?: string;
    @Field() customerName: string;
    @Field({ nullable: true }) customerEmail?: string;
    @Field({ nullable: true }) customerPhone?: string;
    @Field({ nullable: true }) customerIdNumber?: string;
    @Field() checkoutDate: string;
    @Field() expectedReturnDate: string;
    @Field(() => Float, { nullable: true }) dailyRate?: number;
    @Field(() => Float, { nullable: true }) depositAmount?: number;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => Float, { nullable: true }) totalCharge?: number;
    @Field({ nullable: true }) checkoutCondition?: string;
    @Field({ nullable: true }) checkoutNotes?: string;
}

function mapRentalAsset(r: any): RentalAssetType {
    return { id: r.id, tenantId: r.tenant_id, assetCode: r.asset_code, assetName: r.asset_name,
        serialNumber: r.serial_number, category: r.category, condition: r.condition,
        purchaseDate: r.purchase_date, purchaseCost: r.purchase_cost, currentLocation: r.current_location,
        dailyRate: r.daily_rate, depositAmount: r.deposit_amount,
        lastMaintenanceDate: r.last_maintenance_date, nextMaintenanceDate: r.next_maintenance_date,
        totalRentals: r.total_rentals, totalRevenue: r.total_revenue,
        notes: r.notes, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at };
}
function mapRentalContract(r: any): RentalContractType {
    return { id: r.id, tenantId: r.tenant_id, contractCode: r.contract_code,
        assetId: r.asset_id, assetName: r.asset_name,
        customerName: r.customer_name, customerEmail: r.customer_email,
        customerPhone: r.customer_phone, customerIdNumber: r.customer_id_number,
        checkoutDate: r.checkout_date, expectedReturnDate: r.expected_return_date,
        actualReturnDate: r.actual_return_date, dailyRate: r.daily_rate,
        depositAmount: r.deposit_amount, depositReturned: r.deposit_returned,
        rentalDays: r.rental_days, subtotal: r.subtotal, lateFee: r.late_fee,
        damageFee: r.damage_fee, totalCharge: r.total_charge,
        checkoutCondition: r.checkout_condition, returnCondition: r.return_condition,
        checkoutNotes: r.checkout_notes, returnNotes: r.return_notes,
        notes: r.notes, status: r.status, createdAt: r.created_at, updatedAt: r.updated_at };
}

// ═══════════════════════════════════════════════════════════
// ─── RETURNS Types, Inputs, Mappers ───────────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class EcomReturnType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() returnNumber: string;
    @Field({ nullable: true }) orderId?: string;
    @Field({ nullable: true }) orderNumber?: string;
    @Field({ nullable: true }) customerName?: string;
    @Field({ nullable: true }) customerEmail?: string;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) resolution?: string;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => Float, { nullable: true }) refundAmount?: number;
    @Field(() => Float, { nullable: true }) restockingFee?: number;
    @Field({ nullable: true }) refundMethod?: string;
    @Field({ nullable: true }) refundStatus?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) internalNotes?: string;
    @Field({ nullable: true }) processedBy?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) requestedAt?: string;
    @Field({ nullable: true }) approvedAt?: string;
    @Field({ nullable: true }) receivedAt?: string;
    @Field({ nullable: true }) completedAt?: string;
    @Field() createdAt: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
class EcomReturnItemType {
    @Field(() => ID) id: string;
    @Field() returnId: string;
    @Field({ nullable: true }) orderItemId?: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field(() => Int) quantity: number;
    @Field(() => Float) unitPrice: number;
    @Field(() => Float) subtotal: number;
    @Field({ nullable: true }) condition?: string;
    @Field({ nullable: true }) restock?: boolean;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) notes?: string;
    @Field() createdAt: string;
}

@ObjectType()
class EcomReturnStats {
    @Field(() => Int) totalReturns: number;
    @Field(() => Int) requested: number;
    @Field(() => Int) approved: number;
    @Field(() => Int) received: number;
    @Field(() => Int) completed: number;
    @Field(() => Int) rejected: number;
    @Field(() => Float) totalRefunded: number;
}

@InputType()
class CreateReturnInput {
    @Field() orderId: string;
    @Field({ nullable: true }) orderNumber?: string;
    @Field({ nullable: true }) customerName?: string;
    @Field({ nullable: true }) customerEmail?: string;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) resolution?: string;
    @Field(() => Float, { nullable: true }) subtotal?: number;
    @Field(() => Float, { nullable: true }) refundAmount?: number;
    @Field(() => Float, { nullable: true }) restockingFee?: number;
    @Field({ nullable: true }) refundMethod?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) internalNotes?: string;
    @Field(() => GraphQLJSON, { nullable: true }) items?: any;
}

function mapReturn(r: any): EcomReturnType {
    return {
        id: r.id, tenantId: r.tenant_id, returnNumber: r.return_number,
        orderId: r.order_id, orderNumber: r.order_number,
        customerName: r.customer_name, customerEmail: r.customer_email,
        reason: r.reason, resolution: r.resolution,
        subtotal: r.subtotal, refundAmount: r.refund_amount,
        restockingFee: r.restocking_fee, refundMethod: r.refund_method,
        refundStatus: r.refund_status, notes: r.notes,
        internalNotes: r.internal_notes, processedBy: r.processed_by,
        status: r.status, requestedAt: r.requested_at,
        approvedAt: r.approved_at, receivedAt: r.received_at,
        completedAt: r.completed_at,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapReturnItem(r: any): EcomReturnItemType {
    return {
        id: r.id, returnId: r.return_id, orderItemId: r.order_item_id,
        itemId: r.item_id, itemName: r.item_name, itemSku: r.item_sku,
        quantity: r.quantity, unitPrice: r.unit_price, subtotal: r.subtotal,
        condition: r.condition, restock: r.restock,
        reason: r.reason, notes: r.notes, createdAt: r.created_at,
    };
}

// ═══════════════════════════════════════════════════════════
// ─── PACKAGES Types, Inputs, Mappers ──────────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class EcomPackageType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) sku?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float) packagePrice: number;
    @Field(() => Float) regularPrice: number;
    @Field(() => Float) savings: number;
    @Field({ nullable: true }) currency?: string;
    @Field(() => GraphQLJSON, { nullable: true }) mediaIds?: any;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => Int, { nullable: true }) maxQuantity?: number;
    @Field(() => Int, { nullable: true }) timesSold?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
class EcomPackageItemType {
    @Field(() => ID) id: string;
    @Field() packageId: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field(() => Int) quantity: number;
    @Field(() => Float) unitPrice: number;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
    @Field() createdAt: string;
}

@ObjectType()
class EcomPackageStats {
    @Field(() => Int) totalPackages: number;
    @Field(() => Int) active: number;
    @Field(() => Int) inactive: number;
    @Field(() => Int) totalSold: number;
    @Field(() => Float) totalSavings: number;
}

@InputType()
class CreatePackageInput {
    @Field() name: string;
    @Field({ nullable: true }) sku?: string;
    @Field({ nullable: true }) description?: string;
    @Field(() => Float, { nullable: true }) packagePrice?: number;
    @Field(() => Float, { nullable: true }) regularPrice?: number;
    @Field(() => Float, { nullable: true }) savings?: number;
    @Field(() => GraphQLJSON, { nullable: true }) mediaIds?: any;
    @Field(() => GraphQLJSON, { nullable: true }) tags?: any;
    @Field(() => Int, { nullable: true }) maxQuantity?: number;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) items?: any;
}

@InputType()
class CreatePackageItemInput {
    @Field({ nullable: true }) itemId?: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field(() => Int, { nullable: true }) quantity?: number;
    @Field(() => Float, { nullable: true }) unitPrice?: number;
    @Field(() => Int, { nullable: true }) sortOrder?: number;
}

function mapPackage(r: any): EcomPackageType {
    return {
        id: r.id, tenantId: r.tenant_id, name: r.name, sku: r.sku,
        description: r.description, packagePrice: r.package_price,
        regularPrice: r.regular_price, savings: r.savings,
        currency: r.currency, mediaIds: r.media_ids, tags: r.tags,
        maxQuantity: r.max_quantity, timesSold: r.times_sold,
        notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

function mapPackageItem(r: any): EcomPackageItemType {
    return {
        id: r.id, packageId: r.package_id, itemId: r.item_id,
        itemName: r.item_name, itemSku: r.item_sku,
        quantity: r.quantity, unitPrice: r.unit_price,
        sortOrder: r.sort_order, createdAt: r.created_at,
    };
}

// ═══════════════════════════════════════════════════════════
// ─── OFFERS Types, Inputs, Mappers ────────────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class EcomOfferType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) offerType?: string;
    @Field({ nullable: true }) discountType?: string;
    @Field(() => Float, { nullable: true }) discountValue?: number;
    @Field(() => Float, { nullable: true }) minOrderAmount?: number;
    @Field(() => Int, { nullable: true }) maxUses?: number;
    @Field(() => Int, { nullable: true }) currentUses?: number;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field({ nullable: true }) appliesTo?: string;
    @Field(() => GraphQLJSON, { nullable: true }) targetIds?: any;
    @Field({ nullable: true }) bannerText?: string;
    @Field({ nullable: true }) badgeText?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
class EcomOfferStats {
    @Field(() => Int) totalOffers: number;
    @Field(() => Int) active: number;
    @Field(() => Int) draft: number;
    @Field(() => Int) expired: number;
    @Field(() => Int) totalUses: number;
}

@InputType()
class CreateOfferInput {
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) offerType?: string;
    @Field({ nullable: true }) discountType?: string;
    @Field(() => Float, { nullable: true }) discountValue?: number;
    @Field(() => Float, { nullable: true }) minOrderAmount?: number;
    @Field(() => Int, { nullable: true }) maxUses?: number;
    @Field({ nullable: true }) startDate?: string;
    @Field({ nullable: true }) endDate?: string;
    @Field({ nullable: true }) appliesTo?: string;
    @Field(() => GraphQLJSON, { nullable: true }) targetIds?: any;
    @Field({ nullable: true }) bannerText?: string;
    @Field({ nullable: true }) badgeText?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

function mapOffer(r: any): EcomOfferType {
    return {
        id: r.id, tenantId: r.tenant_id, name: r.name,
        description: r.description, offerType: r.offer_type,
        discountType: r.discount_type, discountValue: r.discount_value,
        minOrderAmount: r.min_order_amount, maxUses: r.max_uses,
        currentUses: r.current_uses, startDate: r.start_date,
        endDate: r.end_date, appliesTo: r.applies_to,
        targetIds: r.target_ids, bannerText: r.banner_text,
        badgeText: r.badge_text, notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

// ═══════════════════════════════════════════════════════════
// ─── DISCOUNTS Types, Inputs, Mappers ─────────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class EcomDiscountType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) code?: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) discountType?: string;
    @Field(() => Float, { nullable: true }) discountValue?: number;
    @Field(() => Float, { nullable: true }) minOrderAmount?: number;
    @Field(() => Float, { nullable: true }) maxDiscountAmount?: number;
    @Field(() => Int, { nullable: true }) usageLimit?: number;
    @Field(() => Int, { nullable: true }) timesUsed?: number;
    @Field({ nullable: true }) validFrom?: string;
    @Field({ nullable: true }) validUntil?: string;
    @Field({ nullable: true }) autoApply?: boolean;
    @Field({ nullable: true }) appliesTo?: string;
    @Field(() => GraphQLJSON, { nullable: true }) targetIds?: any;
    @Field({ nullable: true }) stackable?: boolean;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field() createdAt: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
class EcomDiscountStats {
    @Field(() => Int) totalDiscounts: number;
    @Field(() => Int) active: number;
    @Field(() => Int) expired: number;
    @Field(() => Int) coupons: number;
    @Field(() => Int) autoApply: number;
    @Field(() => Int) totalUsed: number;
}

@InputType()
class CreateDiscountInput {
    @Field({ nullable: true }) code?: string;
    @Field() name: string;
    @Field({ nullable: true }) description?: string;
    @Field({ nullable: true }) discountType?: string;
    @Field(() => Float, { nullable: true }) discountValue?: number;
    @Field(() => Float, { nullable: true }) minOrderAmount?: number;
    @Field(() => Float, { nullable: true }) maxDiscountAmount?: number;
    @Field(() => Int, { nullable: true }) usageLimit?: number;
    @Field({ nullable: true }) validFrom?: string;
    @Field({ nullable: true }) validUntil?: string;
    @Field({ nullable: true }) autoApply?: boolean;
    @Field({ nullable: true }) appliesTo?: string;
    @Field(() => GraphQLJSON, { nullable: true }) targetIds?: any;
    @Field({ nullable: true }) stackable?: boolean;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

function mapDiscount(r: any): EcomDiscountType {
    return {
        id: r.id, tenantId: r.tenant_id, code: r.code, name: r.name,
        description: r.description, discountType: r.discount_type,
        discountValue: r.discount_value, minOrderAmount: r.min_order_amount,
        maxDiscountAmount: r.max_discount_amount, usageLimit: r.usage_limit,
        timesUsed: r.times_used, validFrom: r.valid_from,
        validUntil: r.valid_until, autoApply: r.auto_apply,
        appliesTo: r.applies_to, targetIds: r.target_ids,
        stackable: r.stackable, notes: r.notes, status: r.status,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

// ═══════════════════════════════════════════════════════════
// ─── STOCK OPERATIONS Types, Inputs, Mappers ──────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class InvStockOperationType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() operationNumber: string;
    @Field() operationType: string;
    @Field() itemId: string;
    @Field({ nullable: true }) itemName?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field(() => Float) quantity: number;
    @Field(() => Float, { nullable: true }) unitCost?: number;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) reference?: string;
    @Field({ nullable: true }) batchNumber?: string;
    @Field({ nullable: true }) expiryDate?: string;
    @Field({ nullable: true }) approvedBy?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) createdBy?: string;
    @Field() createdAt: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
class StockOperationStats {
    @Field(() => Int) totalOperations: number;
    @Field(() => Int) receives: number;
    @Field(() => Int) releases: number;
    @Field(() => Int) adjustments: number;
    @Field(() => Int) writeOffs: number;
    @Field(() => Int) donations: number;
}

@InputType()
class CreateStockOperationInput {
    @Field() operationType: string;
    @Field() itemId: string;
    @Field({ nullable: true }) itemName?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field(() => Float) quantity: number;
    @Field(() => Float, { nullable: true }) unitCost?: number;
    @Field({ nullable: true }) reason?: string;
    @Field({ nullable: true }) reference?: string;
    @Field({ nullable: true }) batchNumber?: string;
    @Field({ nullable: true }) expiryDate?: string;
    @Field({ nullable: true }) approvedBy?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) createdBy?: string;
}

function mapStockOperation(r: any): InvStockOperationType {
    return {
        id: r.id, tenantId: r.tenant_id,
        operationNumber: r.operation_number, operationType: r.operation_type,
        itemId: r.item_id, itemName: r.item_name,
        warehouseId: r.warehouse_id, quantity: r.quantity,
        unitCost: r.unit_cost, reason: r.reason,
        reference: r.reference, batchNumber: r.batch_number,
        expiryDate: r.expiry_date, approvedBy: r.approved_by,
        notes: r.notes, status: r.status,
        createdBy: r.created_by,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

// ═══════════════════════════════════════════════════════════
// ─── FIXED ASSETS Types, Inputs, Mappers ──────────────────
// ═══════════════════════════════════════════════════════════

@ObjectType()
class InvFixedAssetType {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) itemId?: string;
    @Field() assetNumber: string;
    @Field() assetName: string;
    @Field({ nullable: true }) assetCategory?: string;
    @Field({ nullable: true }) serialNumber?: string;
    @Field({ nullable: true }) purchaseDate?: string;
    @Field(() => Float, { nullable: true }) purchasePrice?: number;
    @Field(() => Float, { nullable: true }) currentValue?: number;
    @Field(() => Float, { nullable: true }) salvageValue?: number;
    @Field({ nullable: true }) depreciationMethod?: string;
    @Field(() => Int, { nullable: true }) usefulLifeMonths?: number;
    @Field(() => Float, { nullable: true }) accumulatedDepreciation?: number;
    @Field({ nullable: true }) lastDepreciationDate?: string;
    @Field({ nullable: true }) warrantyExpiry?: string;
    @Field({ nullable: true }) location?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) condition?: string;
    @Field({ nullable: true }) insurancePolicy?: string;
    @Field({ nullable: true }) insuranceExpiry?: string;
    @Field({ nullable: true }) maintenanceSchedule?: string;
    @Field({ nullable: true }) lastMaintenanceDate?: string;
    @Field({ nullable: true }) nextMaintenanceDate?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) disposedDate?: string;
    @Field({ nullable: true }) disposalMethod?: string;
    @Field(() => Float, { nullable: true }) disposalValue?: number;
    @Field() createdAt: string;
    @Field({ nullable: true }) updatedAt?: string;
}

@ObjectType()
class FixedAssetStats {
    @Field(() => Int) totalAssets: number;
    @Field(() => Int) active: number;
    @Field(() => Int) maintenance: number;
    @Field(() => Int) disposed: number;
    @Field(() => Float) totalPurchaseValue: number;
    @Field(() => Float) totalCurrentValue: number;
    @Field(() => Float) totalAccumulatedDep: number;
}

@ObjectType()
class ExpiryAlertType {
    @Field() itemId: string;
    @Field() itemName: string;
    @Field({ nullable: true }) itemSku?: string;
    @Field({ nullable: true }) batchNumber?: string;
    @Field() expiryDate: string;
    @Field(() => Float) quantity: number;
    @Field({ nullable: true }) warehouseId?: string;
    @Field() isExpired: boolean;
    @Field(() => Int) daysUntilExpiry: number;
}

@InputType()
class CreateFixedAssetInput {
    @Field({ nullable: true }) itemId?: string;
    @Field() assetName: string;
    @Field({ nullable: true }) assetCategory?: string;
    @Field({ nullable: true }) serialNumber?: string;
    @Field({ nullable: true }) purchaseDate?: string;
    @Field(() => Float, { nullable: true }) purchasePrice?: number;
    @Field(() => Float, { nullable: true }) currentValue?: number;
    @Field(() => Float, { nullable: true }) salvageValue?: number;
    @Field({ nullable: true }) depreciationMethod?: string;
    @Field(() => Int, { nullable: true }) usefulLifeMonths?: number;
    @Field({ nullable: true }) warrantyExpiry?: string;
    @Field({ nullable: true }) location?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) condition?: string;
    @Field({ nullable: true }) insurancePolicy?: string;
    @Field({ nullable: true }) insuranceExpiry?: string;
    @Field({ nullable: true }) maintenanceSchedule?: string;
    @Field({ nullable: true }) lastMaintenanceDate?: string;
    @Field({ nullable: true }) nextMaintenanceDate?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

@InputType()
class UpdateFixedAssetInput {
    @Field({ nullable: true }) itemId?: string;
    @Field({ nullable: true }) assetName?: string;
    @Field({ nullable: true }) assetCategory?: string;
    @Field({ nullable: true }) serialNumber?: string;
    @Field({ nullable: true }) purchaseDate?: string;
    @Field(() => Float, { nullable: true }) purchasePrice?: number;
    @Field(() => Float, { nullable: true }) currentValue?: number;
    @Field(() => Float, { nullable: true }) salvageValue?: number;
    @Field({ nullable: true }) depreciationMethod?: string;
    @Field(() => Int, { nullable: true }) usefulLifeMonths?: number;
    @Field({ nullable: true }) warrantyExpiry?: string;
    @Field({ nullable: true }) location?: string;
    @Field({ nullable: true }) warehouseId?: string;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) condition?: string;
    @Field({ nullable: true }) insurancePolicy?: string;
    @Field({ nullable: true }) insuranceExpiry?: string;
    @Field({ nullable: true }) maintenanceSchedule?: string;
    @Field({ nullable: true }) lastMaintenanceDate?: string;
    @Field({ nullable: true }) nextMaintenanceDate?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) status?: string;
}

function mapFixedAsset(r: any): InvFixedAssetType {
    return {
        id: r.id, tenantId: r.tenant_id, itemId: r.item_id,
        assetNumber: r.asset_number, assetName: r.asset_name,
        assetCategory: r.asset_category, serialNumber: r.serial_number,
        purchaseDate: r.purchase_date, purchasePrice: r.purchase_price,
        currentValue: r.current_value, salvageValue: r.salvage_value,
        depreciationMethod: r.depreciation_method,
        usefulLifeMonths: r.useful_life_months,
        accumulatedDepreciation: r.accumulated_depreciation,
        lastDepreciationDate: r.last_depreciation_date,
        warrantyExpiry: r.warranty_expiry, location: r.location,
        warehouseId: r.warehouse_id, assignedTo: r.assigned_to,
        condition: r.condition, insurancePolicy: r.insurance_policy,
        insuranceExpiry: r.insurance_expiry,
        maintenanceSchedule: r.maintenance_schedule,
        lastMaintenanceDate: r.last_maintenance_date,
        nextMaintenanceDate: r.next_maintenance_date,
        notes: r.notes, status: r.status,
        disposedDate: r.disposed_date, disposalMethod: r.disposal_method,
        disposalValue: r.disposal_value,
        createdAt: r.created_at, updatedAt: r.updated_at,
    };
}

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

    // ═══════════════════════════════════════════════════════
    // ─── MANUFACTURING ────────────────────────────────────
    // ═══════════════════════════════════════════════════════

    // BOMs
    @Query(() => [MfgBomType])
    async mfgBoms(@Args('tenantId') tenantId: string) {
        const data = await this.inventoryService.getBoms(tenantId);
        return data.map(mapBom);
    }

    @Mutation(() => MfgBomType)
    async createBom(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateBomInput,
    ) {
        const data = await this.inventoryService.createBom(tenantId, input);
        return mapBom(data);
    }

    @Mutation(() => MfgBomType)
    async updateBom(
        @Args('id') id: string,
        @Args('input') input: CreateBomInput,
    ) {
        const data = await this.inventoryService.updateBom(id, input);
        return mapBom(data);
    }

    @Mutation(() => Boolean)
    async deleteBom(@Args('id') id: string) {
        return this.inventoryService.deleteBom(id);
    }

    // BOM Lines
    @Query(() => [MfgBomLineType])
    async mfgBomLines(@Args('bomId') bomId: string) {
        const data = await this.inventoryService.getBomLines(bomId);
        return data.map(mapBomLine);
    }

    @Mutation(() => MfgBomLineType)
    async addBomLine(
        @Args('bomId') bomId: string,
        @Args('input') input: CreateBomLineInput,
    ) {
        const data = await this.inventoryService.addBomLine(bomId, input);
        return mapBomLine(data);
    }

    @Mutation(() => MfgBomLineType)
    async updateBomLine(
        @Args('id') id: string,
        @Args('input') input: CreateBomLineInput,
    ) {
        const data = await this.inventoryService.updateBomLine(id, input);
        return mapBomLine(data);
    }

    @Mutation(() => Boolean)
    async deleteBomLine(@Args('id') id: string) {
        return this.inventoryService.deleteBomLine(id);
    }

    // Work Orders
    @Query(() => [MfgWorkOrderType])
    async mfgWorkOrders(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
    ) {
        const data = await this.inventoryService.getWorkOrders(tenantId, status);
        return data.map(mapWorkOrder);
    }

    @Mutation(() => MfgWorkOrderType)
    async createWorkOrder(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateWorkOrderInput,
    ) {
        const data = await this.inventoryService.createWorkOrder(tenantId, input);
        return mapWorkOrder(data);
    }

    @Mutation(() => MfgWorkOrderType)
    async updateWorkOrder(
        @Args('id') id: string,
        @Args('input') input: CreateWorkOrderInput,
    ) {
        const data = await this.inventoryService.updateWorkOrder(id, input);
        return mapWorkOrder(data);
    }

    @Mutation(() => MfgWorkOrderType)
    async updateWorkOrderStatus(
        @Args('id') id: string,
        @Args('status') status: string,
    ) {
        const data = await this.inventoryService.updateWorkOrderStatus(id, status);
        return mapWorkOrder(data);
    }

    @Mutation(() => Boolean)
    async deleteWorkOrder(@Args('id') id: string) {
        return this.inventoryService.deleteWorkOrder(id);
    }

    // Manufacturing Stats
    @Query(() => ManufacturingStats)
    async manufacturingStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getManufacturingStats(tenantId);
    }

    // ═══════════════════════════════════════════════════════
    // ─── STOCK OPNAME ─────────────────────────────────────
    // ═══════════════════════════════════════════════════════

    @Query(() => [OpnameSessionType])
    async opnameSessions(@Args('tenantId') tenantId: string) {
        const data = await this.inventoryService.getOpnameSessions(tenantId);
        return data.map(mapOpnameSession);
    }

    @Mutation(() => OpnameSessionType)
    async createOpnameSession(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateOpnameSessionInput,
    ) {
        const data = await this.inventoryService.createOpnameSession(tenantId, input);
        return mapOpnameSession(data);
    }

    @Mutation(() => OpnameSessionType)
    async updateOpnameSession(
        @Args('id') id: string,
        @Args('input') input: CreateOpnameSessionInput,
    ) {
        const data = await this.inventoryService.updateOpnameSession(id, input);
        return mapOpnameSession(data);
    }

    @Mutation(() => OpnameSessionType)
    async updateOpnameSessionStatus(
        @Args('id') id: string,
        @Args('status') status: string,
    ) {
        const data = await this.inventoryService.updateOpnameSessionStatus(id, status);
        return mapOpnameSession(data);
    }

    @Mutation(() => Boolean)
    async deleteOpnameSession(@Args('id') id: string) {
        return this.inventoryService.deleteOpnameSession(id);
    }

    @Query(() => [OpnameLineType])
    async opnameLines(@Args('sessionId') sessionId: string) {
        const data = await this.inventoryService.getOpnameLines(sessionId);
        return data.map(mapOpnameLine);
    }

    @Mutation(() => OpnameLineType)
    async addOpnameLine(
        @Args('sessionId') sessionId: string,
        @Args('input') input: CreateOpnameLineInput,
    ) {
        const data = await this.inventoryService.addOpnameLine(sessionId, input);
        return mapOpnameLine(data);
    }

    @Mutation(() => OpnameLineType)
    async updateOpnameLine(
        @Args('id') id: string,
        @Args('input') input: CreateOpnameLineInput,
    ) {
        const data = await this.inventoryService.updateOpnameLine(id, input);
        return mapOpnameLine(data);
    }

    @Mutation(() => Boolean)
    async deleteOpnameLine(@Args('id') id: string) {
        return this.inventoryService.deleteOpnameLine(id);
    }

    @Query(() => OpnameStats)
    async opnameStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getOpnameStats(tenantId);
    }

    // ═══════════════════════════════════════════════════════
    // ─── BOOKING & TICKETING ─────────────────────────────
    // ═══════════════════════════════════════════════════════

    @Query(() => [BookingScheduleType])
    async bookingSchedules(@Args('tenantId') tenantId: string) {
        const data = await this.inventoryService.getSchedules(tenantId);
        return data.map(mapSchedule);
    }

    @Mutation(() => BookingScheduleType)
    async createSchedule(@Args('tenantId') tenantId: string, @Args('input') input: CreateScheduleInput) {
        const data = await this.inventoryService.createSchedule(tenantId, input);
        return mapSchedule(data);
    }

    @Mutation(() => BookingScheduleType)
    async updateSchedule(@Args('id') id: string, @Args('input') input: CreateScheduleInput) {
        const data = await this.inventoryService.updateSchedule(id, input);
        return mapSchedule(data);
    }

    @Mutation(() => Boolean)
    async deleteSchedule(@Args('id') id: string) {
        return this.inventoryService.deleteSchedule(id);
    }

    @Query(() => [BookingOccurrenceType])
    async bookingOccurrences(
        @Args('scheduleId', { nullable: true }) scheduleId?: string,
        @Args('tenantId', { nullable: true }) tenantId?: string,
    ) {
        const data = await this.inventoryService.getOccurrences(scheduleId || undefined, tenantId || 'default');
        return data.map(mapOccurrence);
    }

    @Mutation(() => BookingOccurrenceType)
    async createOccurrence(@Args('scheduleId') scheduleId: string, @Args('departureDate') departureDate: string) {
        const data = await this.inventoryService.createOccurrence(scheduleId, { departureDate });
        return mapOccurrence(data);
    }

    @Mutation(() => BookingOccurrenceType)
    async updateOccurrenceStatus(@Args('id') id: string, @Args('status') status: string) {
        const data = await this.inventoryService.updateOccurrenceStatus(id, status);
        return mapOccurrence(data);
    }

    @Query(() => [BookingType])
    async bookings(@Args('tenantId') tenantId: string, @Args('occurrenceId', { nullable: true }) occurrenceId?: string) {
        const data = await this.inventoryService.getBookings(tenantId, occurrenceId || undefined);
        return data.map(mapBooking);
    }

    @Mutation(() => BookingType)
    async createBooking(@Args('tenantId') tenantId: string, @Args('input') input: CreateBookingInput) {
        const data = await this.inventoryService.createBooking(tenantId, input);
        return mapBooking(data);
    }

    @Mutation(() => BookingType)
    async updateBookingStatus(@Args('id') id: string, @Args('status') status: string) {
        const data = await this.inventoryService.updateBookingStatus(id, status);
        return mapBooking(data);
    }

    @Query(() => [BookingPassengerType])
    async bookingPassengers(@Args('bookingId') bookingId: string) {
        const data = await this.inventoryService.getPassengers(bookingId);
        return data.map(mapPassenger);
    }

    @Mutation(() => BookingPassengerType)
    async addPassenger(@Args('bookingId') bookingId: string, @Args('name') name: string, @Args('idNumber', { nullable: true }) idNumber?: string) {
        const data = await this.inventoryService.addPassenger(bookingId, { name, idNumber });
        return mapPassenger(data);
    }

    @Query(() => BookingStats)
    async bookingStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getBookingStats(tenantId);
    }

    // ═══════════════════════════════════════════════════════
    // ─── RENTAL ENGINE ───────────────────────────────────
    // ═══════════════════════════════════════════════════════

    @Query(() => [RentalAssetType])
    async rentalAssets(@Args('tenantId') tenantId: string) {
        const data = await this.inventoryService.getRentalAssets(tenantId);
        return data.map(mapRentalAsset);
    }

    @Mutation(() => RentalAssetType)
    async createRentalAsset(@Args('tenantId') tenantId: string, @Args('input') input: CreateRentalAssetInput) {
        const data = await this.inventoryService.createRentalAsset(tenantId, input);
        return mapRentalAsset(data);
    }

    @Mutation(() => RentalAssetType)
    async updateRentalAsset(@Args('id') id: string, @Args('input') input: CreateRentalAssetInput) {
        const data = await this.inventoryService.updateRentalAsset(id, input);
        return mapRentalAsset(data);
    }

    @Mutation(() => Boolean)
    async deleteRentalAsset(@Args('id') id: string) {
        return this.inventoryService.deleteRentalAsset(id);
    }

    @Query(() => [RentalContractType])
    async rentalContracts(@Args('tenantId') tenantId: string) {
        const data = await this.inventoryService.getRentalContracts(tenantId);
        return data.map(mapRentalContract);
    }

    @Mutation(() => RentalContractType)
    async createRentalContract(@Args('tenantId') tenantId: string, @Args('input') input: CreateRentalContractInput) {
        const data = await this.inventoryService.createRentalContract(tenantId, input);
        return mapRentalContract(data);
    }

    @Mutation(() => RentalContractType)
    async returnRentalAsset(@Args('contractId') contractId: string, @Args('returnCondition') returnCondition: string) {
        const data = await this.inventoryService.returnRentalAsset(contractId, { returnCondition });
        return mapRentalContract(data);
    }

    @Mutation(() => Boolean)
    async deleteRentalContract(@Args('id') id: string) {
        return this.inventoryService.deleteRentalContract(id);
    }

    @Mutation(() => RentalContractType)
    async cancelRentalContract(@Args('contractId') contractId: string) {
        const data = await this.inventoryService.cancelRentalContract(contractId);
        return mapRentalContract(data);
    }

    @Query(() => RentalStats)
    async rentalStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getRentalStats(tenantId);
    }

    // ═══════════════════════════════════════════════════════
    // E-COMMERCE
    // ═══════════════════════════════════════════════════════

    // ─── Customers ─────────────────────────────────────────
    @Query(() => [EcomCustomerType])
    async ecomCustomers(
        @Args('tenantId') tenantId: string,
        @Args('search', { nullable: true }) search?: string,
        @Args('customerType', { nullable: true }) customerType?: string,
        @Args('status', { nullable: true }) status?: string,
    ) {
        const data = await this.inventoryService.getEcomCustomers(tenantId, { search, customerType, status });
        return data.map(mapEcomCustomer);
    }

    @Mutation(() => EcomCustomerType)
    async createEcomCustomer(@Args('tenantId') tenantId: string, @Args('input') input: EcomCustomerInput) {
        const data = await this.inventoryService.createEcomCustomer(tenantId, input);
        return mapEcomCustomer(data);
    }

    @Mutation(() => EcomCustomerType)
    async updateEcomCustomer(@Args('id') id: string, @Args('input') input: EcomCustomerInput) {
        const data = await this.inventoryService.updateEcomCustomer(id, input);
        return mapEcomCustomer(data);
    }

    @Mutation(() => Boolean)
    async deleteEcomCustomer(@Args('id') id: string) {
        return this.inventoryService.deleteEcomCustomer(id);
    }

    // ─── Orders ────────────────────────────────────────────
    @Query(() => [EcomOrderType])
    async ecomOrders(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('paymentStatus', { nullable: true }) paymentStatus?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getEcomOrders(tenantId, { status, paymentStatus, search });
        return data.map(mapEcomOrder);
    }

    @Query(() => EcomOrderType)
    async ecomOrder(@Args('id') id: string) {
        const data = await this.inventoryService.getEcomOrder(id);
        return mapEcomOrder(data);
    }

    @Mutation(() => EcomOrderType)
    async createEcomOrder(@Args('tenantId') tenantId: string, @Args('input') input: EcomOrderInput) {
        const data = await this.inventoryService.createEcomOrder(tenantId, input);
        return mapEcomOrder(data);
    }

    @Mutation(() => EcomOrderType)
    async updateEcomOrderStatus(@Args('id') id: string, @Args('status') status: string) {
        const data = await this.inventoryService.updateEcomOrderStatus(id, status);
        return mapEcomOrder(data);
    }

    @Mutation(() => Boolean)
    async deleteEcomOrder(@Args('id') id: string) {
        return this.inventoryService.deleteEcomOrder(id);
    }

    // ─── Order Items ───────────────────────────────────────
    @Query(() => [EcomOrderItemType])
    async ecomOrderItems(@Args('orderId') orderId: string) {
        const data = await this.inventoryService.getEcomOrderItems(orderId);
        return data.map(mapEcomOrderItem);
    }

    @Mutation(() => EcomOrderItemType)
    async addEcomOrderItem(@Args('orderId') orderId: string, @Args('input') input: EcomOrderItemInput) {
        const data = await this.inventoryService.addEcomOrderItem(orderId, input);
        return mapEcomOrderItem(data);
    }

    // ─── Store Settings ────────────────────────────────────
    @Query(() => EcomStoreSettingsType, { nullable: true })
    async ecomStoreSettings(@Args('tenantId') tenantId: string) {
        const data = await this.inventoryService.getStoreSettings(tenantId);
        return data ? mapStoreSettings(data) : null;
    }

    @Mutation(() => EcomStoreSettingsType)
    async updateStoreSettings(@Args('tenantId') tenantId: string, @Args('input') input: EcomStoreSettingsInput) {
        const data = await this.inventoryService.updateStoreSettings(tenantId, input);
        return mapStoreSettings(data);
    }

    // ─── E-Commerce Stats ──────────────────────────────────
    @Query(() => EcomStats)
    async ecomStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getEcomStats(tenantId);
    }

    // ═══════════════════════════════════════════════════════
    // ─── RETURNS RESOLVERS ────────────────────────────────
    // ═══════════════════════════════════════════════════════

    @Query(() => [EcomReturnType])
    async ecomReturns(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getReturns(tenantId, { status, search });
        return data.map(mapReturn);
    }

    @Query(() => EcomReturnType)
    async ecomReturn(@Args('id') id: string) {
        const data = await this.inventoryService.getReturn(id);
        return mapReturn(data);
    }

    @Query(() => [EcomReturnItemType])
    async ecomReturnItems(@Args('returnId') returnId: string) {
        const data = await this.inventoryService.getReturnItems(returnId);
        return data.map(mapReturnItem);
    }

    @Query(() => EcomReturnStats)
    async ecomReturnStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getReturnStats(tenantId);
    }

    @Mutation(() => EcomReturnType)
    async createEcomReturn(@Args('tenantId') tenantId: string, @Args('input') input: CreateReturnInput) {
        const data = await this.inventoryService.createReturn(tenantId, input);
        return mapReturn(data);
    }

    @Mutation(() => EcomReturnType)
    async updateEcomReturnStatus(@Args('id') id: string, @Args('status') status: string) {
        const data = await this.inventoryService.updateReturnStatus(id, status);
        return mapReturn(data);
    }

    @Mutation(() => Boolean)
    async deleteEcomReturn(@Args('id') id: string) {
        return this.inventoryService.deleteReturn(id);
    }

    // ═══════════════════════════════════════════════════════
    // ─── PACKAGES RESOLVERS ──────────────────────────────
    // ═══════════════════════════════════════════════════════

    @Query(() => [EcomPackageType])
    async ecomPackages(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getPackages(tenantId, { status, search });
        return data.map(mapPackage);
    }

    @Query(() => [EcomPackageItemType])
    async ecomPackageItems(@Args('packageId') packageId: string) {
        const data = await this.inventoryService.getPackageItems(packageId);
        return data.map(mapPackageItem);
    }

    @Query(() => EcomPackageStats)
    async ecomPackageStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getPackageStats(tenantId);
    }

    @Mutation(() => EcomPackageType)
    async createEcomPackage(@Args('tenantId') tenantId: string, @Args('input') input: CreatePackageInput) {
        const data = await this.inventoryService.createPackage(tenantId, input);
        return mapPackage(data);
    }

    @Mutation(() => EcomPackageType)
    async updateEcomPackage(@Args('id') id: string, @Args('input') input: CreatePackageInput) {
        const data = await this.inventoryService.updatePackage(id, input);
        return mapPackage(data);
    }

    @Mutation(() => Boolean)
    async deleteEcomPackage(@Args('id') id: string) {
        return this.inventoryService.deletePackage(id);
    }

    @Mutation(() => EcomPackageItemType)
    async addEcomPackageItem(@Args('packageId') packageId: string, @Args('input') input: CreatePackageItemInput) {
        const data = await this.inventoryService.addPackageItem(packageId, input);
        return mapPackageItem(data);
    }

    @Mutation(() => Boolean)
    async deleteEcomPackageItem(@Args('id') id: string) {
        return this.inventoryService.deletePackageItem(id);
    }

    // ═══════════════════════════════════════════════════════
    // ─── OFFERS RESOLVERS ────────────────────────────────
    // ═══════════════════════════════════════════════════════

    @Query(() => [EcomOfferType])
    async ecomOffers(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getOffers(tenantId, { status, search });
        return data.map(mapOffer);
    }

    @Query(() => EcomOfferStats)
    async ecomOfferStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getOfferStats(tenantId);
    }

    @Mutation(() => EcomOfferType)
    async createEcomOffer(@Args('tenantId') tenantId: string, @Args('input') input: CreateOfferInput) {
        const data = await this.inventoryService.createOffer(tenantId, input);
        return mapOffer(data);
    }

    @Mutation(() => EcomOfferType)
    async updateEcomOffer(@Args('id') id: string, @Args('input') input: CreateOfferInput) {
        const data = await this.inventoryService.updateOffer(id, input);
        return mapOffer(data);
    }

    @Mutation(() => Boolean)
    async deleteEcomOffer(@Args('id') id: string) {
        return this.inventoryService.deleteOffer(id);
    }

    // ═══════════════════════════════════════════════════════
    // ─── DISCOUNTS RESOLVERS ─────────────────────────────
    // ═══════════════════════════════════════════════════════

    @Query(() => [EcomDiscountType])
    async ecomDiscounts(
        @Args('tenantId') tenantId: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getDiscounts(tenantId, { status, search });
        return data.map(mapDiscount);
    }

    @Query(() => EcomDiscountStats)
    async ecomDiscountStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getDiscountStats(tenantId);
    }

    @Mutation(() => EcomDiscountType)
    async createEcomDiscount(@Args('tenantId') tenantId: string, @Args('input') input: CreateDiscountInput) {
        const data = await this.inventoryService.createDiscount(tenantId, input);
        return mapDiscount(data);
    }

    @Mutation(() => EcomDiscountType)
    async updateEcomDiscount(@Args('id') id: string, @Args('input') input: CreateDiscountInput) {
        const data = await this.inventoryService.updateDiscount(id, input);
        return mapDiscount(data);
    }

    @Mutation(() => Boolean)
    async deleteEcomDiscount(@Args('id') id: string) {
        return this.inventoryService.deleteDiscount(id);
    }

    // ═══════════════════════════════════════════════════════════
    // ─── STOCK OPERATIONS Resolvers ───────────────────────────
    // ═══════════════════════════════════════════════════════════

    @Query(() => [InvStockOperationType])
    async stockOperations(
        @Args('tenantId') tenantId: string,
        @Args('operationType', { nullable: true }) operationType?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getStockOperations(tenantId, { operationType, status, search });
        return (data || []).map(mapStockOperation);
    }

    @Query(() => StockOperationStats)
    async stockOperationStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getStockOperationStats(tenantId);
    }

    @Mutation(() => InvStockOperationType)
    async createStockOperation(@Args('tenantId') tenantId: string, @Args('input') input: CreateStockOperationInput) {
        const data = await this.inventoryService.createStockOperation(tenantId, input);
        return mapStockOperation(data);
    }

    @Mutation(() => Boolean)
    async deleteStockOperation(@Args('id') id: string) {
        return this.inventoryService.deleteStockOperation(id);
    }

    // ═══════════════════════════════════════════════════════════
    // ─── FIXED ASSETS Resolvers ───────────────────────────────
    // ═══════════════════════════════════════════════════════════

    @Query(() => [InvFixedAssetType])
    async fixedAssets(
        @Args('tenantId') tenantId: string,
        @Args('assetCategory', { nullable: true }) assetCategory?: string,
        @Args('status', { nullable: true }) status?: string,
        @Args('search', { nullable: true }) search?: string,
    ) {
        const data = await this.inventoryService.getFixedAssets(tenantId, { assetCategory, status, search });
        return (data || []).map(mapFixedAsset);
    }

    @Query(() => InvFixedAssetType)
    async fixedAsset(@Args('id') id: string) {
        const data = await this.inventoryService.getFixedAsset(id);
        return mapFixedAsset(data);
    }

    @Query(() => FixedAssetStats)
    async fixedAssetStats(@Args('tenantId') tenantId: string) {
        return this.inventoryService.getFixedAssetStats(tenantId);
    }

    @Query(() => [ExpiryAlertType])
    async expiryAlerts(
        @Args('tenantId') tenantId: string,
        @Args('daysAhead', { type: () => Int, nullable: true }) daysAhead?: number,
    ) {
        return this.inventoryService.getExpiryAlerts(tenantId, daysAhead ?? 30);
    }

    @Mutation(() => InvFixedAssetType)
    async createFixedAsset(@Args('tenantId') tenantId: string, @Args('input') input: CreateFixedAssetInput) {
        const data = await this.inventoryService.createFixedAsset(tenantId, input);
        return mapFixedAsset(data);
    }

    @Mutation(() => InvFixedAssetType)
    async updateFixedAsset(@Args('id') id: string, @Args('input') input: UpdateFixedAssetInput) {
        const data = await this.inventoryService.updateFixedAsset(id, input);
        return mapFixedAsset(data);
    }

    @Mutation(() => Boolean)
    async deleteFixedAsset(@Args('id') id: string) {
        return this.inventoryService.deleteFixedAsset(id);
    }

    @Mutation(() => InvFixedAssetType)
    async disposeFixedAsset(
        @Args('id') id: string,
        @Args('disposalMethod') disposalMethod: string,
        @Args('disposalValue', { type: () => Float, nullable: true }) disposalValue?: number,
    ) {
        const data = await this.inventoryService.disposeFixedAsset(id, { disposalMethod, disposalValue });
        return mapFixedAsset(data);
    }

    @Mutation(() => GraphQLJSON)
    async runDepreciation(@Args('tenantId') tenantId: string) {
        return this.inventoryService.runDepreciation(tenantId);
    }
}


