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
}
