/**
 * Inventory Service - All operations via GraphQL Middleware
 */

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        cache: 'no-store',
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

// ─── Types ───────────────────────────────────────────────

export interface InvCategory {
    id: string;
    tenantId: string;
    name: string;
    parentId?: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
    createdAt: string;
    updatedAt: string;
}

export interface InvItem {
    id: string;
    tenantId: string;
    name: string;
    sku?: string;
    description?: string;
    itemType?: string;
    fulfillmentType?: string;
    categoryId?: string;
    brand?: string;
    tags?: string[];
    costPrice?: number;
    sellingPrice?: number;
    currency?: string;
    taxRate?: number;
    barcode?: string;
    qrCode?: string;
    mediaIds?: string[];
    primaryUom?: string;
    weight?: number;
    weightUnit?: string;
    dimensions?: any;
    minStock?: number;
    maxStock?: number;
    reorderPoint?: number;
    reorderQty?: number;
    metadata?: any;
    status?: string;
    createdAt: string;
    updatedAt: string;
}

export interface InvItemVariant {
    id: string;
    itemId: string;
    name: string;
    sku?: string;
    attributes?: any;
    costPrice?: number;
    sellingPrice?: number;
    barcode?: string;
    mediaIds?: string[];
    status?: string;
    createdAt: string;
}

export interface StockLedgerEntry {
    id: string;
    tenantId: string;
    itemId: string;
    variantId?: string;
    warehouseId?: string;
    onHand: number;
    reserved: number;
    committed: number;
    available: number;
    updatedAt: string;
}

export interface StockMovement {
    id: string;
    tenantId: string;
    itemId: string;
    variantId?: string;
    warehouseId?: string;
    movementType: string;
    quantity: number;
    unitCost?: number;
    totalCost?: number;
    reference?: string;
    referenceType?: string;
    referenceId?: string;
    batchNumber?: string;
    serialNumber?: string;
    expiryDate?: string;
    notes?: string;
    createdAt: string;
}

export interface InvStockStats {
    totalItems: number;
    activeItems: number;
    totalOnHand: number;
    totalReserved: number;
    lowStockCount: number;
    totalMovements: number;
    physicalCount: number;
    ticketCount: number;
    scheduledCount: number;
    rentalCount: number;
}

export interface AiClassification {
    suggestedCategory: string;
    suggestedTags: string[];
    suggestedItemType: string;
    suggestedFulfillmentType: string;
    confidence: number;
}

// ─── Fragment ────────────────────────────────────────────

const ITEM_FIELDS = `
    id tenantId name sku description itemType fulfillmentType
    categoryId brand tags costPrice sellingPrice currency taxRate
    barcode qrCode mediaIds primaryUom weight weightUnit dimensions
    minStock maxStock reorderPoint reorderQty metadata status
    createdAt updatedAt
`;

const CATEGORY_FIELDS = `id tenantId name parentId description icon color sortOrder createdAt updatedAt`;

// ─── Service ─────────────────────────────────────────────

export const inventoryService = {
    // ─── Categories ─────────────────────────────────────
    async getCategories(tenantId = 'default'): Promise<InvCategory[]> {
        const data = await graphqlRequest<{ invCategories: InvCategory[] }>(`
            query($tenantId: String!) { invCategories(tenantId: $tenantId) { ${CATEGORY_FIELDS} } }
        `, { tenantId });
        return data.invCategories || [];
    },

    async createCategory(tenantId = 'default', input: Partial<InvCategory>): Promise<InvCategory> {
        const data = await graphqlRequest<{ createInvCategory: InvCategory }>(`
            mutation($tenantId: String!, $input: CreateCategoryInput!) {
                createInvCategory(tenantId: $tenantId, input: $input) { ${CATEGORY_FIELDS} }
            }
        `, { tenantId, input });
        return data.createInvCategory;
    },

    async updateCategory(id: string, input: Partial<InvCategory>): Promise<InvCategory> {
        const data = await graphqlRequest<{ updateInvCategory: InvCategory }>(`
            mutation($id: String!, $input: UpdateCategoryInput!) {
                updateInvCategory(id: $id, input: $input) { ${CATEGORY_FIELDS} }
            }
        `, { id, input });
        return data.updateInvCategory;
    },

    async deleteCategory(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteInvCategory: boolean }>(`
            mutation($id: String!) { deleteInvCategory(id: $id) }
        `, { id });
        return data.deleteInvCategory;
    },

    // ─── Items ──────────────────────────────────────────
    async getItems(tenantId = 'default', filters?: {
        fulfillmentType?: string; itemType?: string; categoryId?: string;
        status?: string; search?: string;
    }): Promise<InvItem[]> {
        const data = await graphqlRequest<{ invItems: InvItem[] }>(`
            query($tenantId: String!, $fulfillmentType: String, $itemType: String, $categoryId: String, $status: String, $search: String) {
                invItems(tenantId: $tenantId, fulfillmentType: $fulfillmentType, itemType: $itemType, categoryId: $categoryId, status: $status, search: $search) { ${ITEM_FIELDS} }
            }
        `, { tenantId, ...filters });
        return data.invItems || [];
    },

    async getItem(id: string): Promise<InvItem> {
        const data = await graphqlRequest<{ invItem: InvItem }>(`
            query($id: String!) { invItem(id: $id) { ${ITEM_FIELDS} } }
        `, { id });
        return data.invItem;
    },

    async createItem(tenantId = 'default', input: Partial<InvItem>): Promise<InvItem> {
        const data = await graphqlRequest<{ createInvItem: InvItem }>(`
            mutation($tenantId: String!, $input: CreateItemInput!) {
                createInvItem(tenantId: $tenantId, input: $input) { ${ITEM_FIELDS} }
            }
        `, { tenantId, input });
        return data.createInvItem;
    },

    async updateItem(id: string, input: Partial<InvItem>): Promise<InvItem> {
        const data = await graphqlRequest<{ updateInvItem: InvItem }>(`
            mutation($id: String!, $input: UpdateItemInput!) {
                updateInvItem(id: $id, input: $input) { ${ITEM_FIELDS} }
            }
        `, { id, input });
        return data.updateInvItem;
    },

    async deleteItem(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteInvItem: boolean }>(`
            mutation($id: String!) { deleteInvItem(id: $id) }
        `, { id });
        return data.deleteInvItem;
    },

    // ─── Variants ───────────────────────────────────────
    async getVariants(itemId: string): Promise<InvItemVariant[]> {
        const data = await graphqlRequest<{ invItemVariants: InvItemVariant[] }>(`
            query($itemId: String!) {
                invItemVariants(itemId: $itemId) { id itemId name sku attributes costPrice sellingPrice barcode mediaIds status createdAt }
            }
        `, { itemId });
        return data.invItemVariants || [];
    },

    async createVariant(itemId: string, input: Partial<InvItemVariant>): Promise<InvItemVariant> {
        const data = await graphqlRequest<{ createInvVariant: InvItemVariant }>(`
            mutation($itemId: String!, $input: CreateVariantInput!) {
                createInvVariant(itemId: $itemId, input: $input) { id itemId name sku attributes costPrice sellingPrice barcode status createdAt }
            }
        `, { itemId, input });
        return data.createInvVariant;
    },

    async deleteVariant(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteInvVariant: boolean }>(`
            mutation($id: String!) { deleteInvVariant(id: $id) }
        `, { id });
        return data.deleteInvVariant;
    },

    // ─── Stock ──────────────────────────────────────────
    async getStockLedger(tenantId = 'default', filters?: {
        itemId?: string; warehouseId?: string;
    }): Promise<StockLedgerEntry[]> {
        const data = await graphqlRequest<{ invStockLedger: StockLedgerEntry[] }>(`
            query($tenantId: String!, $itemId: String, $warehouseId: String) {
                invStockLedger(tenantId: $tenantId, itemId: $itemId, warehouseId: $warehouseId) {
                    id tenantId itemId variantId warehouseId onHand reserved committed available updatedAt
                }
            }
        `, { tenantId, ...filters });
        return data.invStockLedger || [];
    },

    async getStockMovements(tenantId = 'default', filters?: {
        itemId?: string; movementType?: string; limit?: number;
    }): Promise<StockMovement[]> {
        const data = await graphqlRequest<{ invStockMovements: StockMovement[] }>(`
            query($tenantId: String!, $itemId: String, $movementType: String, $limit: Int) {
                invStockMovements(tenantId: $tenantId, itemId: $itemId, movementType: $movementType, limit: $limit) {
                    id tenantId itemId variantId warehouseId movementType quantity unitCost totalCost
                    reference referenceType referenceId batchNumber serialNumber expiryDate notes createdAt
                }
            }
        `, { tenantId, ...filters });
        return data.invStockMovements || [];
    },

    async createStockMovement(tenantId = 'default', input: {
        itemId: string; movementType: string; quantity: number;
        variantId?: string; warehouseId?: string; unitCost?: number;
        reference?: string; referenceType?: string; referenceId?: string;
        batchNumber?: string; serialNumber?: string; expiryDate?: string;
        notes?: string;
    }): Promise<StockMovement> {
        const data = await graphqlRequest<{ createStockMovement: StockMovement }>(`
            mutation($tenantId: String!, $input: CreateStockMovementInput!) {
                createStockMovement(tenantId: $tenantId, input: $input) {
                    id tenantId itemId movementType quantity unitCost totalCost reference notes createdAt
                }
            }
        `, { tenantId, input });
        return data.createStockMovement;
    },

    async getStockStats(tenantId = 'default'): Promise<InvStockStats> {
        const data = await graphqlRequest<{ invStockStats: InvStockStats }>(`
            query($tenantId: String!) {
                invStockStats(tenantId: $tenantId) {
                    totalItems activeItems totalOnHand totalReserved lowStockCount totalMovements
                    physicalCount ticketCount scheduledCount rentalCount
                }
            }
        `, { tenantId });
        return data.invStockStats;
    },

    // ─── AI ─────────────────────────────────────────────
    async aiClassifyItem(name: string, description?: string): Promise<AiClassification> {
        const data = await graphqlRequest<{ aiClassifyItem: AiClassification }>(`
            query($name: String!, $description: String) {
                aiClassifyItem(name: $name, description: $description) {
                    suggestedCategory suggestedTags suggestedItemType suggestedFulfillmentType confidence
                }
            }
        `, { name, description });
        return data.aiClassifyItem;
    },

    async aiDetectAnomalies(tenantId = 'default'): Promise<{ anomalies: any[]; summary?: string; message?: string }> {
        const data = await graphqlRequest<{ aiDetectStockAnomalies: any }>(`
            query($tenantId: String!) {
                aiDetectStockAnomalies(tenantId: $tenantId) {
                    anomalies { itemName movementType quantity reason riskLevel }
                    message summary
                }
            }
        `, { tenantId });
        return data.aiDetectStockAnomalies;
    },
};
