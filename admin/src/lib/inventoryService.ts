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
    hasExpiry?: boolean;
    defaultShelfLifeDays?: number;
    hasDepreciation?: boolean;
    depreciationMethod?: string;
    usefulLifeMonths?: number;
    salvageValue?: number;
    isFixedAsset?: boolean;
    assetCategory?: string;
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
    minStock maxStock reorderPoint reorderQty
    hasExpiry defaultShelfLifeDays hasDepreciation depreciationMethod
    usefulLifeMonths salvageValue isFixedAsset assetCategory
    metadata status createdAt updatedAt
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

    // ─── Media ──────────────────────────────────────────
    async getMediaByIds(ids: string[]): Promise<Record<string, { url: string; filename: string; mimeType?: string }>> {
        if (!ids.length) return {};
        const results: Record<string, { url: string; filename: string; mimeType?: string }> = {};
        await Promise.all(ids.map(async (id) => {
            try {
                const data = await graphqlRequest<{ mediaById: { id: string; url: string; filename: string; mimeType?: string } }>(`
                    query($id: ID!) { mediaById(id: $id) { id url filename mimeType } }
                `, { id });
                if (data.mediaById) results[id] = data.mediaById;
            } catch { /* skip missing media */ }
        }));
        return results;
    },

    async uploadItemMedia(file: File, folder = 'inventory'): Promise<{ id: string; url: string; filename: string; mimeType?: string } | null> {
        const GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
        const operations = JSON.stringify({
            query: `mutation($file: Upload!, $folder: String) {
                uploadMedia(file: $file, folder: $folder) { id url filename mimeType sizeBytes }
            }`,
            variables: { file: null, folder },
        });
        const map = JSON.stringify({ '0': ['variables.file'] });
        const formData = new FormData();
        formData.append('operations', operations);
        formData.append('map', map);
        formData.append('0', file, file.name);
        const response = await fetch(GRAPHQL_ENDPOINT, { method: 'POST', body: formData });
        const json = await response.json();
        if (json.errors) throw new Error(json.errors[0].message);
        return json.data.uploadMedia;
    },

    async deleteMedia(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteMedia: { success: boolean } }>(`
            mutation($id: ID!) { deleteMedia(id: $id) { success } }
        `, { id });
        return data.deleteMedia?.success ?? false;
    },

    // ═══════════════════════════════════════════════════════
    // ─── PROCUREMENT ──────────────────────────────────────
    // ═══════════════════════════════════════════════════════

    async getSuppliers(tenantId: string, status?: string, search?: string) {
        const data = await graphqlRequest<{ invSuppliers: any[] }>(`
            query($tenantId: String!, $status: String, $search: String) {
                invSuppliers(tenantId: $tenantId, status: $status, search: $search) {
                    id code name contactPerson email phone address city country
                    taxId paymentTerms currency rating leadTimeDays tags notes status
                    accountId createdAt updatedAt
                }
            }
        `, { tenantId, status, search });
        return data.invSuppliers;
    },

    async createSupplier(tenantId: string, input: Record<string, any>) {
        const data = await graphqlRequest<{ createInvSupplier: any }>(`
            mutation($tenantId: String!, $input: CreateSupplierInput!) {
                createInvSupplier(tenantId: $tenantId, input: $input) {
                    id code name status createdAt
                }
            }
        `, { tenantId, input });
        return data.createInvSupplier;
    },

    async updateSupplier(id: string, input: Record<string, any>) {
        const data = await graphqlRequest<{ updateInvSupplier: any }>(`
            mutation($id: String!, $input: CreateSupplierInput!) {
                updateInvSupplier(id: $id, input: $input) {
                    id code name status updatedAt
                }
            }
        `, { id, input });
        return data.updateInvSupplier;
    },

    async deleteSupplier(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteInvSupplier(id: $id) }`, { id });
    },

    async getPurchaseRequisitions(tenantId: string, status?: string, search?: string) {
        const data = await graphqlRequest<{ invPurchaseRequisitions: any[] }>(`
            query($tenantId: String!, $status: String, $search: String) {
                invPurchaseRequisitions(tenantId: $tenantId, status: $status, search: $search) {
                    id prNumber title description requestedBy department priority
                    requiredDate totalEstimated currency notes status
                    approvedBy approvedAt rejectionReason createdAt updatedAt
                }
            }
        `, { tenantId, status, search });
        return data.invPurchaseRequisitions;
    },

    async createPurchaseRequisition(tenantId: string, input: Record<string, any>) {
        const data = await graphqlRequest<{ createPurchaseRequisition: any }>(`
            mutation($tenantId: String!, $input: CreatePrInput!) {
                createPurchaseRequisition(tenantId: $tenantId, input: $input) {
                    id prNumber title status createdAt
                }
            }
        `, { tenantId, input });
        return data.createPurchaseRequisition;
    },

    async updatePrStatus(id: string, status: string, approvedBy?: string, rejectionReason?: string) {
        const data = await graphqlRequest<{ updatePrStatus: any }>(`
            mutation($id: String!, $status: String!, $approvedBy: String, $rejectionReason: String) {
                updatePrStatus(id: $id, status: $status, approvedBy: $approvedBy, rejectionReason: $rejectionReason) {
                    id prNumber status approvedBy approvedAt rejectionReason updatedAt
                }
            }
        `, { id, status, approvedBy, rejectionReason });
        return data.updatePrStatus;
    },

    async deletePurchaseRequisition(id: string) {
        await graphqlRequest(`mutation($id: String!) { deletePurchaseRequisition(id: $id) }`, { id });
    },

    async getPurchaseOrders(tenantId: string, status?: string, supplierId?: string, search?: string) {
        const data = await graphqlRequest<{ invPurchaseOrders: any[] }>(`
            query($tenantId: String!, $status: String, $supplierId: String, $search: String) {
                invPurchaseOrders(tenantId: $tenantId, status: $status, supplierId: $supplierId, search: $search) {
                    id poNumber prId supplierId title paymentTerms expectedDelivery
                    subtotal taxAmount discountAmount totalAmount currency notes status
                    sentAt confirmedAt createdAt updatedAt
                }
            }
        `, { tenantId, status, supplierId, search });
        return data.invPurchaseOrders;
    },

    async createPurchaseOrder(tenantId: string, input: Record<string, any>) {
        const data = await graphqlRequest<{ createPurchaseOrder: any }>(`
            mutation($tenantId: String!, $input: CreatePoInput!) {
                createPurchaseOrder(tenantId: $tenantId, input: $input) {
                    id poNumber status createdAt
                }
            }
        `, { tenantId, input });
        return data.createPurchaseOrder;
    },

    async updatePoStatus(id: string, status: string) {
        const data = await graphqlRequest<{ updatePoStatus: any }>(`
            mutation($id: String!, $status: String!) {
                updatePoStatus(id: $id, status: $status) {
                    id poNumber status updatedAt
                }
            }
        `, { id, status });
        return data.updatePoStatus;
    },

    async deletePurchaseOrder(id: string) {
        await graphqlRequest(`mutation($id: String!) { deletePurchaseOrder(id: $id) }`, { id });
    },

    async getGoodsReceivedNotes(tenantId: string, status?: string, poId?: string) {
        const data = await graphqlRequest<{ invGoodsReceivedNotes: any[] }>(`
            query($tenantId: String!, $status: String, $poId: String) {
                invGoodsReceivedNotes(tenantId: $tenantId, status: $status, poId: $poId) {
                    id grnNumber poId supplierId receivedBy receivedDate warehouseId
                    deliveryNoteNumber invoiceNumber qualityCheck notes status
                    acceptedAt createdAt updatedAt
                }
            }
        `, { tenantId, status, poId });
        return data.invGoodsReceivedNotes;
    },

    async acceptGrn(id: string, tenantId: string) {
        const data = await graphqlRequest<{ acceptGrn: any }>(`
            mutation($id: String!, $tenantId: String!) {
                acceptGrn(id: $id, tenantId: $tenantId) {
                    id grnNumber status acceptedAt
                }
            }
        `, { id, tenantId });
        return data.acceptGrn;
    },

    async deleteGoodsReceivedNote(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteGoodsReceivedNote(id: $id) }`, { id });
    },

    async getProcurementStats(tenantId: string) {
        const data = await graphqlRequest<{ procurementStats: any }>(`
            query($tenantId: String!) {
                procurementStats(tenantId: $tenantId) {
                    totalSuppliers totalPRs pendingPRs totalPOs activePOs totalGRNs totalPoValue
                }
            }
        `, { tenantId });
        return data.procurementStats;
    },

    // ═══════════════════════════════════════════════════════
    // ─── WAREHOUSE MANAGEMENT ─────────────────────────────
    // ═══════════════════════════════════════════════════════

    async getWarehouses(tenantId = 'default', status?: string, search?: string): Promise<InvWarehouse[]> {
        const data = await graphqlRequest<{ invWarehouses: InvWarehouse[] }>(`
            query($tenantId: String!, $status: String, $search: String) {
                invWarehouses(tenantId: $tenantId, status: $status, search: $search) {
                    id tenantId code name warehouseType address city country
                    latitude longitude totalCapacity usedCapacity
                    manager phone email operatingHours tags notes status
                    createdAt updatedAt
                }
            }
        `, { tenantId, status, search });
        return data.invWarehouses || [];
    },

    async createWarehouse(tenantId = 'default', input: Record<string, any>): Promise<InvWarehouse> {
        const data = await graphqlRequest<{ createWarehouse: InvWarehouse }>(`
            mutation($tenantId: String!, $input: CreateWarehouseInput!) {
                createWarehouse(tenantId: $tenantId, input: $input) {
                    id code name warehouseType status createdAt
                }
            }
        `, { tenantId, input });
        return data.createWarehouse;
    },

    async updateWarehouse(id: string, input: Record<string, any>): Promise<InvWarehouse> {
        const data = await graphqlRequest<{ updateWarehouse: InvWarehouse }>(`
            mutation($id: String!, $input: CreateWarehouseInput!) {
                updateWarehouse(id: $id, input: $input) {
                    id code name warehouseType status updatedAt
                }
            }
        `, { id, input });
        return data.updateWarehouse;
    },

    async deleteWarehouse(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteWarehouse(id: $id) }`, { id });
    },

    async getZones(warehouseId?: string): Promise<InvZone[]> {
        const data = await graphqlRequest<{ invZones: InvZone[] }>(`
            query($warehouseId: String) {
                invZones(warehouseId: $warehouseId) {
                    id warehouseId code name zoneType description capacity
                    temperatureMin temperatureMax isRestricted sortOrder status
                    createdAt updatedAt
                }
            }
        `, { warehouseId });
        return data.invZones || [];
    },

    async createZone(warehouseId: string, input: Record<string, any>): Promise<InvZone> {
        const data = await graphqlRequest<{ createZone: InvZone }>(`
            mutation($warehouseId: String!, $input: CreateZoneInput!) {
                createZone(warehouseId: $warehouseId, input: $input) {
                    id warehouseId code name zoneType status createdAt
                }
            }
        `, { warehouseId, input });
        return data.createZone;
    },

    async updateZone(id: string, input: Record<string, any>): Promise<InvZone> {
        const data = await graphqlRequest<{ updateZone: InvZone }>(`
            mutation($id: String!, $input: CreateZoneInput!) {
                updateZone(id: $id, input: $input) {
                    id code name zoneType status updatedAt
                }
            }
        `, { id, input });
        return data.updateZone;
    },

    async deleteZone(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteZone(id: $id) }`, { id });
    },

    async getBins(zoneId?: string): Promise<InvBin[]> {
        const data = await graphqlRequest<{ invBins: InvBin[] }>(`
            query($zoneId: String) {
                invBins(zoneId: $zoneId) {
                    id zoneId code aisle rack level position binType
                    maxWeight maxVolume currentItemCount isOccupied barcode
                    sortOrder status createdAt updatedAt
                }
            }
        `, { zoneId });
        return data.invBins || [];
    },

    async createBin(zoneId: string, input: Record<string, any>): Promise<InvBin> {
        const data = await graphqlRequest<{ createBin: InvBin }>(`
            mutation($zoneId: String!, $input: CreateBinInput!) {
                createBin(zoneId: $zoneId, input: $input) {
                    id zoneId code aisle rack level position status createdAt
                }
            }
        `, { zoneId, input });
        return data.createBin;
    },

    async updateBin(id: string, input: Record<string, any>): Promise<InvBin> {
        const data = await graphqlRequest<{ updateBin: InvBin }>(`
            mutation($id: String!, $input: CreateBinInput!) {
                updateBin(id: $id, input: $input) {
                    id code status updatedAt
                }
            }
        `, { id, input });
        return data.updateBin;
    },

    async deleteBin(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteBin(id: $id) }`, { id });
    },

    async getStockTransfers(tenantId = 'default', status?: string): Promise<InvStockTransfer[]> {
        const data = await graphqlRequest<{ invStockTransfers: InvStockTransfer[] }>(`
            query($tenantId: String!, $status: String) {
                invStockTransfers(tenantId: $tenantId, status: $status) {
                    id tenantId transferNumber fromWarehouseId toWarehouseId
                    fromBinId toBinId itemId itemName quantity uom
                    reason requestedBy approvedBy requestedAt approvedAt completedAt
                    notes status createdAt updatedAt
                }
            }
        `, { tenantId, status });
        return data.invStockTransfers || [];
    },

    async createStockTransfer(tenantId = 'default', input: Record<string, any>): Promise<InvStockTransfer> {
        const data = await graphqlRequest<{ createStockTransfer: InvStockTransfer }>(`
            mutation($tenantId: String!, $input: CreateStockTransferInput!) {
                createStockTransfer(tenantId: $tenantId, input: $input) {
                    id transferNumber status createdAt
                }
            }
        `, { tenantId, input });
        return data.createStockTransfer;
    },

    async approveStockTransfer(id: string, tenantId = 'default', approvedBy?: string): Promise<InvStockTransfer> {
        const data = await graphqlRequest<{ approveStockTransfer: InvStockTransfer }>(`
            mutation($id: String!, $tenantId: String!, $approvedBy: String) {
                approveStockTransfer(id: $id, tenantId: $tenantId, approvedBy: $approvedBy) {
                    id transferNumber status approvedAt
                }
            }
        `, { id, tenantId, approvedBy });
        return data.approveStockTransfer;
    },

    async completeStockTransfer(id: string): Promise<InvStockTransfer> {
        const data = await graphqlRequest<{ completeStockTransfer: InvStockTransfer }>(`
            mutation($id: String!) {
                completeStockTransfer(id: $id) {
                    id transferNumber status completedAt
                }
            }
        `, { id });
        return data.completeStockTransfer;
    },

    async deleteStockTransfer(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteStockTransfer(id: $id) }`, { id });
    },

    async getWarehouseStats(tenantId = 'default'): Promise<WarehouseStats> {
        const data = await graphqlRequest<{ warehouseStats: WarehouseStats }>(`
            query($tenantId: String!) {
                warehouseStats(tenantId: $tenantId) {
                    totalWarehouses totalZones totalBins activeTransfers totalTransfers
                    totalCapacity usedCapacity
                }
            }
        `, { tenantId });
        return data.warehouseStats;
    },

    // ═══════════════════════════════════════════════════════
    // ─── MANUFACTURING ────────────────────────────────────
    // ═══════════════════════════════════════════════════════

    async getBoms(tenantId = 'default'): Promise<MfgBom[]> {
        const data = await graphqlRequest<{ mfgBoms: MfgBom[] }>(`
            query($tenantId: String!) {
                mfgBoms(tenantId: $tenantId) {
                    id tenantId code name version productName productSku description
                    uom yieldQty laborHours laborCost overheadCost totalMaterialCost
                    totalCost notes status createdAt updatedAt
                }
            }
        `, { tenantId });
        return data.mfgBoms || [];
    },

    async createBom(tenantId = 'default', input: Record<string, any>): Promise<MfgBom> {
        const data = await graphqlRequest<{ createBom: MfgBom }>(`
            mutation($tenantId: String!, $input: CreateBomInput!) {
                createBom(tenantId: $tenantId, input: $input) {
                    id code name status createdAt
                }
            }
        `, { tenantId, input });
        return data.createBom;
    },

    async updateBom(id: string, input: Record<string, any>): Promise<MfgBom> {
        const data = await graphqlRequest<{ updateBom: MfgBom }>(`
            mutation($id: String!, $input: CreateBomInput!) {
                updateBom(id: $id, input: $input) { id code name status updatedAt }
            }
        `, { id, input });
        return data.updateBom;
    },

    async deleteBom(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteBom(id: $id) }`, { id });
    },

    async getBomLines(bomId: string): Promise<MfgBomLine[]> {
        const data = await graphqlRequest<{ mfgBomLines: MfgBomLine[] }>(`
            query($bomId: String!) {
                mfgBomLines(bomId: $bomId) {
                    id bomId itemId itemName itemSku quantity uom
                    unitCost totalCost scrapPct notes sortOrder createdAt updatedAt
                }
            }
        `, { bomId });
        return data.mfgBomLines || [];
    },

    async addBomLine(bomId: string, input: Record<string, any>): Promise<MfgBomLine> {
        const data = await graphqlRequest<{ addBomLine: MfgBomLine }>(`
            mutation($bomId: String!, $input: CreateBomLineInput!) {
                addBomLine(bomId: $bomId, input: $input) {
                    id bomId itemName quantity createdAt
                }
            }
        `, { bomId, input });
        return data.addBomLine;
    },

    async updateBomLine(id: string, input: Record<string, any>): Promise<MfgBomLine> {
        const data = await graphqlRequest<{ updateBomLine: MfgBomLine }>(`
            mutation($id: String!, $input: CreateBomLineInput!) {
                updateBomLine(id: $id, input: $input) { id itemName quantity updatedAt }
            }
        `, { id, input });
        return data.updateBomLine;
    },

    async deleteBomLine(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteBomLine(id: $id) }`, { id });
    },

    async getWorkOrders(tenantId = 'default', status?: string): Promise<MfgWorkOrder[]> {
        const data = await graphqlRequest<{ mfgWorkOrders: MfgWorkOrder[] }>(`
            query($tenantId: String!, $status: String) {
                mfgWorkOrders(tenantId: $tenantId, status: $status) {
                    id tenantId woNumber bomId bomName warehouseId warehouseName
                    plannedQty completedQty uom priority assignedTo
                    plannedStart plannedEnd actualStart actualEnd
                    estimatedCost actualCost notes status createdAt updatedAt
                }
            }
        `, { tenantId, status });
        return data.mfgWorkOrders || [];
    },

    async createWorkOrder(tenantId = 'default', input: Record<string, any>): Promise<MfgWorkOrder> {
        const data = await graphqlRequest<{ createWorkOrder: MfgWorkOrder }>(`
            mutation($tenantId: String!, $input: CreateWorkOrderInput!) {
                createWorkOrder(tenantId: $tenantId, input: $input) {
                    id woNumber status createdAt
                }
            }
        `, { tenantId, input });
        return data.createWorkOrder;
    },

    async updateWorkOrder(id: string, input: Record<string, any>): Promise<MfgWorkOrder> {
        const data = await graphqlRequest<{ updateWorkOrder: MfgWorkOrder }>(`
            mutation($id: String!, $input: CreateWorkOrderInput!) {
                updateWorkOrder(id: $id, input: $input) { id woNumber status updatedAt }
            }
        `, { id, input });
        return data.updateWorkOrder;
    },

    async updateWorkOrderStatus(id: string, status: string): Promise<MfgWorkOrder> {
        const data = await graphqlRequest<{ updateWorkOrderStatus: MfgWorkOrder }>(`
            mutation($id: String!, $status: String!) {
                updateWorkOrderStatus(id: $id, status: $status) {
                    id woNumber status actualStart actualEnd updatedAt
                }
            }
        `, { id, status });
        return data.updateWorkOrderStatus;
    },

    async deleteWorkOrder(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteWorkOrder(id: $id) }`, { id });
    },

    async getManufacturingStats(tenantId = 'default'): Promise<ManufacturingStats> {
        const data = await graphqlRequest<{ manufacturingStats: ManufacturingStats }>(`
            query($tenantId: String!) {
                manufacturingStats(tenantId: $tenantId) {
                    totalBoms totalWorkOrders draftWos plannedWos inProgressWos completedWos
                }
            }
        `, { tenantId });
        return data.manufacturingStats;
    },

    // ═════════════════════════════════════════════════════
    // ─── STOCK OPNAME ────────────────────────────────────
    // ═════════════════════════════════════════════════════

    async getOpnameSessions(tenantId = 'default'): Promise<OpnameSession[]> {
        const data = await graphqlRequest<{ opnameSessions: OpnameSession[] }>(`
            query($tenantId: String!) {
                opnameSessions(tenantId: $tenantId) {
                    id tenantId sessionCode title warehouseId warehouseName
                    countedBy reviewedBy scheduledDate startedAt completedAt
                    totalItems itemsCounted totalVarianceQty totalVarianceValue
                    notes status createdAt updatedAt
                }
            }
        `, { tenantId });
        return data.opnameSessions || [];
    },

    async createOpnameSession(tenantId = 'default', input: Record<string, any>): Promise<OpnameSession> {
        const data = await graphqlRequest<{ createOpnameSession: OpnameSession }>(`
            mutation($tenantId: String!, $input: CreateOpnameSessionInput!) {
                createOpnameSession(tenantId: $tenantId, input: $input) {
                    id sessionCode title status createdAt
                }
            }
        `, { tenantId, input });
        return data.createOpnameSession;
    },

    async updateOpnameSession(id: string, input: Record<string, any>): Promise<OpnameSession> {
        const data = await graphqlRequest<{ updateOpnameSession: OpnameSession }>(`
            mutation($id: String!, $input: CreateOpnameSessionInput!) {
                updateOpnameSession(id: $id, input: $input) { id sessionCode status updatedAt }
            }
        `, { id, input });
        return data.updateOpnameSession;
    },

    async updateOpnameSessionStatus(id: string, status: string): Promise<OpnameSession> {
        const data = await graphqlRequest<{ updateOpnameSessionStatus: OpnameSession }>(`
            mutation($id: String!, $status: String!) {
                updateOpnameSessionStatus(id: $id, status: $status) {
                    id sessionCode status startedAt completedAt updatedAt
                }
            }
        `, { id, status });
        return data.updateOpnameSessionStatus;
    },

    async deleteOpnameSession(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteOpnameSession(id: $id) }`, { id });
    },

    async getOpnameLines(sessionId: string): Promise<OpnameLine[]> {
        const data = await graphqlRequest<{ opnameLines: OpnameLine[] }>(`
            query($sessionId: String!) {
                opnameLines(sessionId: $sessionId) {
                    id sessionId itemId itemName itemSku zoneName binCode uom
                    systemQty actualQty varianceQty unitCost varianceValue
                    countedAt countedBy notes status sortOrder createdAt updatedAt
                }
            }
        `, { sessionId });
        return data.opnameLines || [];
    },

    async addOpnameLine(sessionId: string, input: Record<string, any>): Promise<OpnameLine> {
        const data = await graphqlRequest<{ addOpnameLine: OpnameLine }>(`
            mutation($sessionId: String!, $input: CreateOpnameLineInput!) {
                addOpnameLine(sessionId: $sessionId, input: $input) {
                    id sessionId itemName systemQty createdAt
                }
            }
        `, { sessionId, input });
        return data.addOpnameLine;
    },

    async updateOpnameLine(id: string, input: Record<string, any>): Promise<OpnameLine> {
        const data = await graphqlRequest<{ updateOpnameLine: OpnameLine }>(`
            mutation($id: String!, $input: CreateOpnameLineInput!) {
                updateOpnameLine(id: $id, input: $input) {
                    id itemName actualQty varianceQty varianceValue status updatedAt
                }
            }
        `, { id, input });
        return data.updateOpnameLine;
    },

    async deleteOpnameLine(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteOpnameLine(id: $id) }`, { id });
    },

    async getOpnameStats(tenantId = 'default'): Promise<OpnameStatsType> {
        const data = await graphqlRequest<{ opnameStats: OpnameStatsType }>(`
            query($tenantId: String!) {
                opnameStats(tenantId: $tenantId) {
                    totalSessions draft counting review completed totalVariance
                }
            }
        `, { tenantId });
        return data.opnameStats;
    },

    // ═════════════════════════════════════════════════════
    // ─── BOOKING & TICKETING ──────────────────────────────
    // ═════════════════════════════════════════════════════

    async getSchedules(tenantId = 'default'): Promise<BookingSchedule[]> {
        const data = await graphqlRequest<{ bookingSchedules: BookingSchedule[] }>(`
            query($tenantId: String!) {
                bookingSchedules(tenantId: $tenantId) {
                    id tenantId itemId scheduleCode routeName origin destination departureTime arrivalTime
                    durationMinutes capacity vehicleName vesselType priceEconomy priceBusiness priceVip
                    operatingDays autoGenerateDays notes status createdAt updatedAt
                }
            }
        `, { tenantId });
        return data.bookingSchedules || [];
    },

    async createSchedule(tenantId = 'default', input: Record<string, any>): Promise<BookingSchedule> {
        const data = await graphqlRequest<{ createSchedule: BookingSchedule }>(`
            mutation($tenantId: String!, $input: CreateScheduleInput!) {
                createSchedule(tenantId: $tenantId, input: $input) { id scheduleCode status createdAt }
            }
        `, { tenantId, input });
        return data.createSchedule;
    },

    async deleteSchedule(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteSchedule(id: $id) }`, { id });
    },

    async getOccurrences(scheduleId?: string, tenantId = 'default'): Promise<BookingOccurrence[]> {
        const data = await graphqlRequest<{ bookingOccurrences: BookingOccurrence[] }>(`
            query($scheduleId: String, $tenantId: String) {
                bookingOccurrences(scheduleId: $scheduleId, tenantId: $tenantId) {
                    id scheduleId departureDate departureTime totalCapacity bookedCount
                    checkedInCount actualDeparture actualArrival notes status createdAt
                }
            }
        `, { scheduleId: scheduleId || null, tenantId });
        return data.bookingOccurrences || [];
    },

    async updateOccurrenceStatus(id: string, status: string): Promise<BookingOccurrence> {
        const data = await graphqlRequest<{ updateOccurrenceStatus: BookingOccurrence }>(`
            mutation($id: String!, $status: String!) {
                updateOccurrenceStatus(id: $id, status: $status) { id status updatedAt }
            }
        `, { id, status });
        return data.updateOccurrenceStatus;
    },

    async getBookings(tenantId = 'default', occurrenceId?: string): Promise<Booking[]> {
        const data = await graphqlRequest<{ bookings: Booking[] }>(`
            query($tenantId: String!, $occurrenceId: String) {
                bookings(tenantId: $tenantId, occurrenceId: $occurrenceId) {
                    id tenantId bookingCode scheduleId occurrenceId customerName customerEmail
                    customerPhone passengerCount class totalAmount paidAmount qrCode checkInTime
                    notes status createdAt updatedAt
                }
            }
        `, { tenantId, occurrenceId: occurrenceId || null });
        return data.bookings || [];
    },

    async createBooking(tenantId = 'default', input: Record<string, any>): Promise<Booking> {
        const data = await graphqlRequest<{ createBooking: Booking }>(`
            mutation($tenantId: String!, $input: CreateBookingInput!) {
                createBooking(tenantId: $tenantId, input: $input) { id bookingCode status createdAt }
            }
        `, { tenantId, input });
        return data.createBooking;
    },

    async updateBookingStatus(id: string, status: string): Promise<Booking> {
        const data = await graphqlRequest<{ updateBookingStatus: Booking }>(`
            mutation($id: String!, $status: String!) {
                updateBookingStatus(id: $id, status: $status) { id bookingCode status checkInTime updatedAt }
            }
        `, { id, status });
        return data.updateBookingStatus;
    },

    async getPassengers(bookingId: string): Promise<BookingPassenger[]> {
        const data = await graphqlRequest<{ bookingPassengers: BookingPassenger[] }>(`
            query($bookingId: String!) {
                bookingPassengers(bookingId: $bookingId) { id bookingId name idNumber nationality seatLabel class notes createdAt }
            }
        `, { bookingId });
        return data.bookingPassengers || [];
    },

    async getBookingStats(tenantId = 'default'): Promise<BookingStatsType> {
        const data = await graphqlRequest<{ bookingStats: BookingStatsType }>(`
            query($tenantId: String!) {
                bookingStats(tenantId: $tenantId) {
                    totalSchedules totalBookings confirmedBookings checkedInBookings
                    totalOccurrences upcomingDepartures totalRevenue
                }
            }
        `, { tenantId });
        return data.bookingStats;
    },

    // ═════════════════════════════════════════════════════
    // ─── RENTAL ENGINE ───────────────────────────────────
    // ═════════════════════════════════════════════════════

    async getRentalAssets(tenantId = 'default'): Promise<RentalAsset[]> {
        const data = await graphqlRequest<{ rentalAssets: RentalAsset[] }>(`
            query($tenantId: String!) {
                rentalAssets(tenantId: $tenantId) {
                    id tenantId assetCode assetName serialNumber category condition
                    purchaseDate purchaseCost currentLocation dailyRate depositAmount
                    lastMaintenanceDate nextMaintenanceDate totalRentals totalRevenue
                    notes status createdAt updatedAt
                }
            }
        `, { tenantId });
        return data.rentalAssets || [];
    },

    async createRentalAsset(tenantId = 'default', input: Record<string, any>): Promise<RentalAsset> {
        const data = await graphqlRequest<{ createRentalAsset: RentalAsset }>(`
            mutation($tenantId: String!, $input: CreateRentalAssetInput!) {
                createRentalAsset(tenantId: $tenantId, input: $input) { id assetCode status createdAt }
            }
        `, { tenantId, input });
        return data.createRentalAsset;
    },

    async deleteRentalAsset(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteRentalAsset(id: $id) }`, { id });
    },

    async getRentalContracts(tenantId = 'default'): Promise<RentalContract[]> {
        const data = await graphqlRequest<{ rentalContracts: RentalContract[] }>(`
            query($tenantId: String!) {
                rentalContracts(tenantId: $tenantId) {
                    id tenantId contractCode assetId assetName customerName customerEmail
                    customerPhone customerIdNumber checkoutDate expectedReturnDate actualReturnDate
                    dailyRate depositAmount depositReturned rentalDays subtotal lateFee damageFee
                    totalCharge checkoutCondition returnCondition checkoutNotes returnNotes
                    notes status createdAt updatedAt
                }
            }
        `, { tenantId });
        return data.rentalContracts || [];
    },

    async createRentalContract(tenantId = 'default', input: Record<string, any>): Promise<RentalContract> {
        const data = await graphqlRequest<{ createRentalContract: RentalContract }>(`
            mutation($tenantId: String!, $input: CreateRentalContractInput!) {
                createRentalContract(tenantId: $tenantId, input: $input) { id contractCode status createdAt }
            }
        `, { tenantId, input });
        return data.createRentalContract;
    },

    async returnRentalAsset(contractId: string, returnCondition: string): Promise<RentalContract> {
        const data = await graphqlRequest<{ returnRentalAsset: RentalContract }>(`
            mutation($contractId: String!, $returnCondition: String!) {
                returnRentalAsset(contractId: $contractId, returnCondition: $returnCondition) {
                    id contractCode status actualReturnDate updatedAt
                }
            }
        `, { contractId, returnCondition });
        return data.returnRentalAsset;
    },

    async deleteRentalContract(id: string) {
        await graphqlRequest(`mutation($id: String!) { deleteRentalContract(id: $id) }`, { id });
    },

    async cancelRentalContract(contractId: string): Promise<RentalContract> {
        const data = await graphqlRequest<{ cancelRentalContract: RentalContract }>(`
            mutation($contractId: String!) {
                cancelRentalContract(contractId: $contractId) {
                    id contractCode status updatedAt
                }
            }
        `, { contractId });
        return data.cancelRentalContract;
    },

    async getRentalStats(tenantId = 'default'): Promise<RentalStatsType> {
        const data = await graphqlRequest<{ rentalStats: RentalStatsType }>(`
            query($tenantId: String!) {
                rentalStats(tenantId: $tenantId) {
                    totalAssets available rented maintenance totalContracts activeContracts overdue totalRevenue
                }
            }
        `, { tenantId });
        return data.rentalStats;
    },

    // ═══════════════════════════════════════════════════════
    // E-COMMERCE
    // ═══════════════════════════════════════════════════════

    // ─── Customers ─────────────────────────────────────────
    async getEcomCustomers(tenantId = 'default', filters?: { search?: string; customerType?: string; status?: string }): Promise<EcomCustomer[]> {
        const data = await graphqlRequest<{ ecomCustomers: EcomCustomer[] }>(`
            query($tenantId: String!, $search: String, $customerType: String, $status: String) {
                ecomCustomers(tenantId: $tenantId, search: $search, customerType: $customerType, status: $status) {
                    id customerCode firstName lastName email phone company address city province postalCode
                    idNumber customerType totalOrders totalSpent loyaltyPoints notes tags status accountId contactId createdAt
                }
            }
        `, { tenantId, ...filters });
        return data.ecomCustomers;
    },

    async createEcomCustomer(tenantId = 'default', input: Partial<EcomCustomer>): Promise<EcomCustomer> {
        const data = await graphqlRequest<{ createEcomCustomer: EcomCustomer }>(`
            mutation($tenantId: String!, $input: EcomCustomerInput!) {
                createEcomCustomer(tenantId: $tenantId, input: $input) {
                    id customerCode firstName lastName email phone company status createdAt
                }
            }
        `, { tenantId, input });
        return data.createEcomCustomer;
    },

    async updateEcomCustomer(id: string, input: Partial<EcomCustomer>): Promise<EcomCustomer> {
        const data = await graphqlRequest<{ updateEcomCustomer: EcomCustomer }>(`
            mutation($id: String!, $input: EcomCustomerInput!) {
                updateEcomCustomer(id: $id, input: $input) {
                    id customerCode firstName lastName email status
                }
            }
        `, { id, input });
        return data.updateEcomCustomer;
    },

    async deleteEcomCustomer(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteEcomCustomer: boolean }>(`
            mutation($id: String!) { deleteEcomCustomer(id: $id) }
        `, { id });
        return data.deleteEcomCustomer;
    },

    // ─── Orders ─────────────────────────────────────────────
    async getEcomOrders(tenantId = 'default', filters?: { status?: string; paymentStatus?: string; search?: string }): Promise<EcomOrder[]> {
        const data = await graphqlRequest<{ ecomOrders: EcomOrder[] }>(`
            query($tenantId: String!, $status: String, $paymentStatus: String, $search: String) {
                ecomOrders(tenantId: $tenantId, status: $status, paymentStatus: $paymentStatus, search: $search) {
                    id orderNumber customerId customerName customerEmail customerPhone
                    shippingAddress shippingCity shippingProvince shippingMethod shippingCost
                    subtotal taxAmount discountAmount totalAmount paidAmount
                    paymentMethod paymentStatus notes source status
                    confirmedAt shippedAt deliveredAt completedAt cancelledAt createdAt
                }
            }
        `, { tenantId, ...filters });
        return data.ecomOrders;
    },

    async getEcomOrder(id: string): Promise<EcomOrder> {
        const data = await graphqlRequest<{ ecomOrder: EcomOrder }>(`
            query($id: String!) {
                ecomOrder(id: $id) {
                    id orderNumber customerName customerEmail totalAmount paymentStatus status createdAt
                }
            }
        `, { id });
        return data.ecomOrder;
    },

    async createEcomOrder(tenantId = 'default', input: Partial<EcomOrder>): Promise<EcomOrder> {
        const data = await graphqlRequest<{ createEcomOrder: EcomOrder }>(`
            mutation($tenantId: String!, $input: EcomOrderInput!) {
                createEcomOrder(tenantId: $tenantId, input: $input) {
                    id orderNumber customerName totalAmount status createdAt
                }
            }
        `, { tenantId, input });
        return data.createEcomOrder;
    },

    async updateEcomOrderStatus(id: string, status: string): Promise<EcomOrder> {
        const data = await graphqlRequest<{ updateEcomOrderStatus: EcomOrder }>(`
            mutation($id: String!, $status: String!) {
                updateEcomOrderStatus(id: $id, status: $status) {
                    id orderNumber status confirmedAt shippedAt deliveredAt completedAt cancelledAt
                }
            }
        `, { id, status });
        return data.updateEcomOrderStatus;
    },

    async deleteEcomOrder(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteEcomOrder: boolean }>(`
            mutation($id: String!) { deleteEcomOrder(id: $id) }
        `, { id });
        return data.deleteEcomOrder;
    },

    // ─── Order Items ────────────────────────────────────────
    async getEcomOrderItems(orderId: string): Promise<EcomOrderItem[]> {
        const data = await graphqlRequest<{ ecomOrderItems: EcomOrderItem[] }>(`
            query($orderId: String!) {
                ecomOrderItems(orderId: $orderId) {
                    id orderId itemId itemName itemSku fulfillmentType fulfillmentRef
                    quantity unitPrice discount tax subtotal variantInfo notes status createdAt
                }
            }
        `, { orderId });
        return data.ecomOrderItems;
    },

    async addEcomOrderItem(orderId: string, input: Partial<EcomOrderItem>): Promise<EcomOrderItem> {
        const data = await graphqlRequest<{ addEcomOrderItem: EcomOrderItem }>(`
            mutation($orderId: String!, $input: EcomOrderItemInput!) {
                addEcomOrderItem(orderId: $orderId, input: $input) {
                    id itemName fulfillmentType quantity unitPrice subtotal status
                }
            }
        `, { orderId, input });
        return data.addEcomOrderItem;
    },

    // ─── Store Settings ─────────────────────────────────────
    async getStoreSettings(tenantId = 'default'): Promise<EcomStoreSettings | null> {
        const data = await graphqlRequest<{ ecomStoreSettings: EcomStoreSettings | null }>(`
            query($tenantId: String!) {
                ecomStoreSettings(tenantId: $tenantId) {
                    id tenantId storeName storeEmail storePhone storeAddress
                    defaultCurrency taxRate taxIncluded shippingEnabled
                    defaultShippingCost freeShippingThreshold paymentMethods
                    fulfillmentPhysical fulfillmentTicket fulfillmentScheduled fulfillmentRental
                    lowStockAlert orderPrefix invoicePrefix notes createdAt updatedAt
                }
            }
        `, { tenantId });
        return data.ecomStoreSettings;
    },

    async updateStoreSettings(tenantId = 'default', input: Partial<EcomStoreSettings>): Promise<EcomStoreSettings> {
        const data = await graphqlRequest<{ updateStoreSettings: EcomStoreSettings }>(`
            mutation($tenantId: String!, $input: EcomStoreSettingsInput!) {
                updateStoreSettings(tenantId: $tenantId, input: $input) {
                    id storeName storeEmail taxRate shippingEnabled updatedAt
                }
            }
        `, { tenantId, input });
        return data.updateStoreSettings;
    },

    // ─── E-Commerce Stats ───────────────────────────────────
    async getEcomStats(tenantId = 'default'): Promise<EcomStatsType> {
        const data = await graphqlRequest<{ ecomStats: EcomStatsType }>(`
            query($tenantId: String!) {
                ecomStats(tenantId: $tenantId) {
                    totalOrders pending confirmed processing shipped delivered completed cancelled
                    totalRevenue avgOrderValue totalCustomers activeCustomers
                }
            }
        `, { tenantId });
        return data.ecomStats;
    },

    // ═══════════════════════════════════════════════════════
    // RETURNS & REFUNDS
    // ═══════════════════════════════════════════════════════

    async getEcomReturns(tenantId = 'default', filters?: { status?: string; search?: string }): Promise<EcomReturn[]> {
        const data = await graphqlRequest<{ ecomReturns: EcomReturn[] }>(`
            query($tenantId: String!, $status: String, $search: String) {
                ecomReturns(tenantId: $tenantId, status: $status, search: $search) {
                    id returnNumber orderId orderNumber customerName customerEmail
                    reason resolution subtotal refundAmount restockingFee
                    refundMethod refundStatus notes internalNotes processedBy
                    status requestedAt approvedAt receivedAt completedAt createdAt
                }
            }
        `, { tenantId, ...filters });
        return data.ecomReturns;
    },

    async createEcomReturn(tenantId = 'default', input: Partial<EcomReturn> & { items?: any[] }): Promise<EcomReturn> {
        const data = await graphqlRequest<{ createEcomReturn: EcomReturn }>(`
            mutation($tenantId: String!, $input: CreateReturnInput!) {
                createEcomReturn(tenantId: $tenantId, input: $input) {
                    id returnNumber orderNumber customerName status createdAt
                }
            }
        `, { tenantId, input });
        return data.createEcomReturn;
    },

    async updateEcomReturnStatus(id: string, status: string): Promise<EcomReturn> {
        const data = await graphqlRequest<{ updateEcomReturnStatus: EcomReturn }>(`
            mutation($id: String!, $status: String!) {
                updateEcomReturnStatus(id: $id, status: $status) {
                    id returnNumber status approvedAt receivedAt completedAt
                }
            }
        `, { id, status });
        return data.updateEcomReturnStatus;
    },

    async deleteEcomReturn(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteEcomReturn: boolean }>(`
            mutation($id: String!) { deleteEcomReturn(id: $id) }
        `, { id });
        return data.deleteEcomReturn;
    },

    async getEcomReturnItems(returnId: string): Promise<EcomReturnItem[]> {
        const data = await graphqlRequest<{ ecomReturnItems: EcomReturnItem[] }>(`
            query($returnId: String!) {
                ecomReturnItems(returnId: $returnId) {
                    id returnId orderItemId itemId itemName itemSku
                    quantity unitPrice subtotal condition restock reason notes createdAt
                }
            }
        `, { returnId });
        return data.ecomReturnItems;
    },

    async getEcomReturnStats(tenantId = 'default'): Promise<EcomReturnStatsType> {
        const data = await graphqlRequest<{ ecomReturnStats: EcomReturnStatsType }>(`
            query($tenantId: String!) {
                ecomReturnStats(tenantId: $tenantId) {
                    totalReturns requested approved received completed rejected totalRefunded
                }
            }
        `, { tenantId });
        return data.ecomReturnStats;
    },

    // ═══════════════════════════════════════════════════════
    // PRODUCT PACKAGES
    // ═══════════════════════════════════════════════════════

    async getEcomPackages(tenantId = 'default', filters?: { status?: string; search?: string }): Promise<EcomPackage[]> {
        const data = await graphqlRequest<{ ecomPackages: EcomPackage[] }>(`
            query($tenantId: String!, $status: String, $search: String) {
                ecomPackages(tenantId: $tenantId, status: $status, search: $search) {
                    id name sku description packagePrice regularPrice savings
                    currency mediaIds tags maxQuantity timesSold notes status createdAt
                }
            }
        `, { tenantId, ...filters });
        return data.ecomPackages;
    },

    async createEcomPackage(tenantId = 'default', input: Partial<EcomPackage> & { items?: any[] }): Promise<EcomPackage> {
        const data = await graphqlRequest<{ createEcomPackage: EcomPackage }>(`
            mutation($tenantId: String!, $input: CreatePackageInput!) {
                createEcomPackage(tenantId: $tenantId, input: $input) {
                    id name sku packagePrice status createdAt
                }
            }
        `, { tenantId, input });
        return data.createEcomPackage;
    },

    async updateEcomPackage(id: string, input: Partial<EcomPackage>): Promise<EcomPackage> {
        const data = await graphqlRequest<{ updateEcomPackage: EcomPackage }>(`
            mutation($id: String!, $input: CreatePackageInput!) {
                updateEcomPackage(id: $id, input: $input) {
                    id name sku packagePrice status updatedAt
                }
            }
        `, { id, input });
        return data.updateEcomPackage;
    },

    async deleteEcomPackage(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteEcomPackage: boolean }>(`
            mutation($id: String!) { deleteEcomPackage(id: $id) }
        `, { id });
        return data.deleteEcomPackage;
    },

    async getEcomPackageItems(packageId: string): Promise<EcomPackageItem[]> {
        const data = await graphqlRequest<{ ecomPackageItems: EcomPackageItem[] }>(`
            query($packageId: String!) {
                ecomPackageItems(packageId: $packageId) {
                    id packageId itemId itemName itemSku quantity unitPrice sortOrder createdAt
                }
            }
        `, { packageId });
        return data.ecomPackageItems;
    },

    async addEcomPackageItem(packageId: string, input: Partial<EcomPackageItem>): Promise<EcomPackageItem> {
        const data = await graphqlRequest<{ addEcomPackageItem: EcomPackageItem }>(`
            mutation($packageId: String!, $input: CreatePackageItemInput!) {
                addEcomPackageItem(packageId: $packageId, input: $input) {
                    id itemName quantity unitPrice sortOrder
                }
            }
        `, { packageId, input });
        return data.addEcomPackageItem;
    },

    async deleteEcomPackageItem(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteEcomPackageItem: boolean }>(`
            mutation($id: String!) { deleteEcomPackageItem(id: $id) }
        `, { id });
        return data.deleteEcomPackageItem;
    },

    async getEcomPackageStats(tenantId = 'default'): Promise<EcomPackageStatsType> {
        const data = await graphqlRequest<{ ecomPackageStats: EcomPackageStatsType }>(`
            query($tenantId: String!) {
                ecomPackageStats(tenantId: $tenantId) {
                    totalPackages active inactive totalSold totalSavings
                }
            }
        `, { tenantId });
        return data.ecomPackageStats;
    },

    // ═══════════════════════════════════════════════════════
    // OFFERS & PROMOTIONS
    // ═══════════════════════════════════════════════════════

    async getEcomOffers(tenantId = 'default', filters?: { status?: string; search?: string }): Promise<EcomOffer[]> {
        const data = await graphqlRequest<{ ecomOffers: EcomOffer[] }>(`
            query($tenantId: String!, $status: String, $search: String) {
                ecomOffers(tenantId: $tenantId, status: $status, search: $search) {
                    id name description offerType discountType discountValue
                    minOrderAmount maxUses currentUses startDate endDate
                    appliesTo targetIds bannerText badgeText notes status createdAt
                }
            }
        `, { tenantId, ...filters });
        return data.ecomOffers;
    },

    async createEcomOffer(tenantId = 'default', input: Partial<EcomOffer>): Promise<EcomOffer> {
        const data = await graphqlRequest<{ createEcomOffer: EcomOffer }>(`
            mutation($tenantId: String!, $input: CreateOfferInput!) {
                createEcomOffer(tenantId: $tenantId, input: $input) {
                    id name offerType discountType discountValue status createdAt
                }
            }
        `, { tenantId, input });
        return data.createEcomOffer;
    },

    async updateEcomOffer(id: string, input: Partial<EcomOffer>): Promise<EcomOffer> {
        const data = await graphqlRequest<{ updateEcomOffer: EcomOffer }>(`
            mutation($id: String!, $input: CreateOfferInput!) {
                updateEcomOffer(id: $id, input: $input) {
                    id name status updatedAt
                }
            }
        `, { id, input });
        return data.updateEcomOffer;
    },

    async deleteEcomOffer(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteEcomOffer: boolean }>(`
            mutation($id: String!) { deleteEcomOffer(id: $id) }
        `, { id });
        return data.deleteEcomOffer;
    },

    async getEcomOfferStats(tenantId = 'default'): Promise<EcomOfferStatsType> {
        const data = await graphqlRequest<{ ecomOfferStats: EcomOfferStatsType }>(`
            query($tenantId: String!) {
                ecomOfferStats(tenantId: $tenantId) {
                    totalOffers active draft expired totalUses
                }
            }
        `, { tenantId });
        return data.ecomOfferStats;
    },

    // ═══════════════════════════════════════════════════════
    // DISCOUNT SYSTEM
    // ═══════════════════════════════════════════════════════

    async getEcomDiscounts(tenantId = 'default', filters?: { status?: string; search?: string }): Promise<EcomDiscount[]> {
        const data = await graphqlRequest<{ ecomDiscounts: EcomDiscount[] }>(`
            query($tenantId: String!, $status: String, $search: String) {
                ecomDiscounts(tenantId: $tenantId, status: $status, search: $search) {
                    id code name description discountType discountValue
                    minOrderAmount maxDiscountAmount usageLimit timesUsed
                    validFrom validUntil autoApply appliesTo targetIds
                    stackable notes status createdAt
                }
            }
        `, { tenantId, ...filters });
        return data.ecomDiscounts;
    },

    async createEcomDiscount(tenantId = 'default', input: Partial<EcomDiscount>): Promise<EcomDiscount> {
        const data = await graphqlRequest<{ createEcomDiscount: EcomDiscount }>(`
            mutation($tenantId: String!, $input: CreateDiscountInput!) {
                createEcomDiscount(tenantId: $tenantId, input: $input) {
                    id code name discountType discountValue status createdAt
                }
            }
        `, { tenantId, input });
        return data.createEcomDiscount;
    },

    async updateEcomDiscount(id: string, input: Partial<EcomDiscount>): Promise<EcomDiscount> {
        const data = await graphqlRequest<{ updateEcomDiscount: EcomDiscount }>(`
            mutation($id: String!, $input: CreateDiscountInput!) {
                updateEcomDiscount(id: $id, input: $input) {
                    id code name status updatedAt
                }
            }
        `, { id, input });
        return data.updateEcomDiscount;
    },

    async deleteEcomDiscount(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteEcomDiscount: boolean }>(`
            mutation($id: String!) { deleteEcomDiscount(id: $id) }
        `, { id });
        return data.deleteEcomDiscount;
    },

    async getEcomDiscountStats(tenantId = 'default'): Promise<EcomDiscountStatsType> {
        const data = await graphqlRequest<{ ecomDiscountStats: EcomDiscountStatsType }>(`
            query($tenantId: String!) {
                ecomDiscountStats(tenantId: $tenantId) {
                    totalDiscounts active expired coupons autoApply totalUsed
                }
            }
        `, { tenantId });
        return data.ecomDiscountStats;
    },

    // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    // \u2500\u2500\u2500 STOCK OPERATIONS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    async getStockOperations(tenantId = 'default', filters?: {
        operationType?: string; status?: string; search?: string;
    }): Promise<StockOperation[]> {
        const data = await graphqlRequest<{ stockOperations: StockOperation[] }>(`
            query($tenantId: String!, $operationType: String, $status: String, $search: String) {
                stockOperations(tenantId: $tenantId, operationType: $operationType, status: $status, search: $search) {
                    id tenantId operationNumber operationType itemId itemName
                    warehouseId quantity unitCost reason reference batchNumber
                    expiryDate approvedBy notes status createdBy createdAt updatedAt
                }
            }
        `, { tenantId, ...filters });
        return data.stockOperations || [];
    },

    async createStockOperation(tenantId = 'default', input: Partial<StockOperation>): Promise<StockOperation> {
        const data = await graphqlRequest<{ createStockOperation: StockOperation }>(`
            mutation($tenantId: String!, $input: CreateStockOperationInput!) {
                createStockOperation(tenantId: $tenantId, input: $input) {
                    id operationNumber operationType itemName quantity status createdAt
                }
            }
        `, { tenantId, input });
        return data.createStockOperation;
    },

    async deleteStockOperation(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteStockOperation: boolean }>(`
            mutation($id: String!) { deleteStockOperation(id: $id) }
        `, { id });
        return data.deleteStockOperation;
    },

    async getStockOperationStats(tenantId = 'default'): Promise<StockOperationStatsType> {
        const data = await graphqlRequest<{ stockOperationStats: StockOperationStatsType }>(`
            query($tenantId: String!) {
                stockOperationStats(tenantId: $tenantId) {
                    totalOperations receives releases adjustments writeOffs donations
                }
            }
        `, { tenantId });
        return data.stockOperationStats;
    },

    // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
    // \u2500\u2500\u2500 FIXED ASSETS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

    async getFixedAssets(tenantId = 'default', filters?: {
        assetCategory?: string; status?: string; search?: string;
    }): Promise<FixedAsset[]> {
        const data = await graphqlRequest<{ fixedAssets: FixedAsset[] }>(`
            query($tenantId: String!, $assetCategory: String, $status: String, $search: String) {
                fixedAssets(tenantId: $tenantId, assetCategory: $assetCategory, status: $status, search: $search) {
                    id tenantId itemId assetNumber assetName assetCategory serialNumber
                    purchaseDate purchasePrice currentValue salvageValue
                    depreciationMethod usefulLifeMonths accumulatedDepreciation
                    lastDepreciationDate warrantyExpiry location warehouseId assignedTo
                    condition insurancePolicy insuranceExpiry maintenanceSchedule
                    lastMaintenanceDate nextMaintenanceDate notes status
                    disposedDate disposalMethod disposalValue createdAt updatedAt
                }
            }
        `, { tenantId, ...filters });
        return data.fixedAssets || [];
    },

    async getFixedAsset(id: string): Promise<FixedAsset> {
        const data = await graphqlRequest<{ fixedAsset: FixedAsset }>(`
            query($id: String!) {
                fixedAsset(id: $id) {
                    id tenantId itemId assetNumber assetName assetCategory serialNumber
                    purchaseDate purchasePrice currentValue salvageValue
                    depreciationMethod usefulLifeMonths accumulatedDepreciation
                    lastDepreciationDate warrantyExpiry location warehouseId assignedTo
                    condition insurancePolicy insuranceExpiry maintenanceSchedule
                    lastMaintenanceDate nextMaintenanceDate notes status
                    disposedDate disposalMethod disposalValue createdAt updatedAt
                }
            }
        `, { id });
        return data.fixedAsset;
    },

    async createFixedAsset(tenantId = 'default', input: Partial<FixedAsset>): Promise<FixedAsset> {
        const data = await graphqlRequest<{ createFixedAsset: FixedAsset }>(`
            mutation($tenantId: String!, $input: CreateFixedAssetInput!) {
                createFixedAsset(tenantId: $tenantId, input: $input) {
                    id assetNumber assetName assetCategory status createdAt
                }
            }
        `, { tenantId, input });
        return data.createFixedAsset;
    },

    async updateFixedAsset(id: string, input: Partial<FixedAsset>): Promise<FixedAsset> {
        const data = await graphqlRequest<{ updateFixedAsset: FixedAsset }>(`
            mutation($id: String!, $input: UpdateFixedAssetInput!) {
                updateFixedAsset(id: $id, input: $input) {
                    id assetNumber assetName status updatedAt
                }
            }
        `, { id, input });
        return data.updateFixedAsset;
    },

    async deleteFixedAsset(id: string): Promise<boolean> {
        const data = await graphqlRequest<{ deleteFixedAsset: boolean }>(`
            mutation($id: String!) { deleteFixedAsset(id: $id) }
        `, { id });
        return data.deleteFixedAsset;
    },

    async disposeFixedAsset(id: string, disposalMethod: string, disposalValue?: number): Promise<FixedAsset> {
        const data = await graphqlRequest<{ disposeFixedAsset: FixedAsset }>(`
            mutation($id: String!, $disposalMethod: String!, $disposalValue: Float) {
                disposeFixedAsset(id: $id, disposalMethod: $disposalMethod, disposalValue: $disposalValue) {
                    id assetNumber status disposedDate disposalMethod disposalValue
                }
            }
        `, { id, disposalMethod, disposalValue });
        return data.disposeFixedAsset;
    },

    async runDepreciation(tenantId = 'default'): Promise<{ processed: number; totalDepreciation: number }> {
        const data = await graphqlRequest<{ runDepreciation: { processed: number; totalDepreciation: number } }>(`
            mutation($tenantId: String!) { runDepreciation(tenantId: $tenantId) }
        `, { tenantId });
        return data.runDepreciation;
    },

    async getFixedAssetStats(tenantId = 'default'): Promise<FixedAssetStatsType> {
        const data = await graphqlRequest<{ fixedAssetStats: FixedAssetStatsType }>(`
            query($tenantId: String!) {
                fixedAssetStats(tenantId: $tenantId) {
                    totalAssets active maintenance disposed
                    totalPurchaseValue totalCurrentValue totalAccumulatedDep
                }
            }
        `, { tenantId });
        return data.fixedAssetStats;
    },

    // \u2500\u2500\u2500 EXPIRY ALERTS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

    async getExpiryAlerts(tenantId = 'default', daysAhead = 30): Promise<ExpiryAlert[]> {
        const data = await graphqlRequest<{ expiryAlerts: ExpiryAlert[] }>(`
            query($tenantId: String!, $daysAhead: Int) {
                expiryAlerts(tenantId: $tenantId, daysAhead: $daysAhead) {
                    itemId itemName itemSku batchNumber expiryDate quantity
                    warehouseId isExpired daysUntilExpiry
                }
            }
        `, { tenantId, daysAhead });
        return data.expiryAlerts || [];
    },
};

// ─── Warehouse Types ────────────────────────────────────

export interface InvWarehouse {
    id: string; tenantId: string; code: string; name: string;
    warehouseType?: string; address?: string; city?: string; country?: string;
    latitude?: number; longitude?: number;
    totalCapacity?: number; usedCapacity?: number;
    manager?: string; phone?: string; email?: string;
    operatingHours?: string; tags?: any; notes?: string;
    status?: string; createdAt: string; updatedAt: string;
}

export interface InvZone {
    id: string; warehouseId: string; code: string; name: string;
    zoneType?: string; description?: string; capacity?: number;
    temperatureMin?: number; temperatureMax?: number;
    isRestricted?: boolean; sortOrder?: number;
    status?: string; createdAt: string; updatedAt: string;
}

export interface InvBin {
    id: string; zoneId: string; code: string;
    aisle?: string; rack?: string; level?: string; position?: string;
    binType?: string; maxWeight?: number; maxVolume?: number;
    currentItemCount?: number; isOccupied?: boolean; barcode?: string;
    sortOrder?: number; status?: string;
    createdAt: string; updatedAt: string;
}

export interface InvStockTransfer {
    id: string; tenantId: string; transferNumber: string;
    fromWarehouseId?: string; toWarehouseId?: string;
    fromBinId?: string; toBinId?: string;
    itemId?: string; itemName?: string;
    quantity: number; uom?: string; reason?: string;
    requestedBy?: string; approvedBy?: string;
    requestedAt?: string; approvedAt?: string; completedAt?: string;
    notes?: string; status?: string;
    createdAt: string; updatedAt: string;
}

export interface WarehouseStats {
    totalWarehouses: number; totalZones: number; totalBins: number;
    activeTransfers: number; totalTransfers: number;
    totalCapacity: number; usedCapacity: number;
}

// ─── Manufacturing Types ────────────────────────────────

export interface MfgBom {
    id: string; tenantId: string; code: string; name: string;
    version?: string; productName?: string; productSku?: string;
    description?: string; uom?: string; yieldQty?: number;
    laborHours?: number; laborCost?: number; overheadCost?: number;
    totalMaterialCost?: number; totalCost?: number;
    notes?: string; status?: string;
    createdAt: string; updatedAt: string;
}

export interface MfgBomLine {
    id: string; bomId: string; itemId?: string;
    itemName: string; itemSku?: string;
    quantity: number; uom?: string;
    unitCost?: number; totalCost?: number; scrapPct?: number;
    notes?: string; sortOrder?: number;
    createdAt: string; updatedAt: string;
}

export interface MfgWorkOrder {
    id: string; tenantId: string; woNumber: string;
    bomId?: string; bomName?: string;
    warehouseId?: string; warehouseName?: string;
    plannedQty: number; completedQty?: number;
    uom?: string; priority?: string; assignedTo?: string;
    plannedStart?: string; plannedEnd?: string;
    actualStart?: string; actualEnd?: string;
    estimatedCost?: number; actualCost?: number;
    notes?: string; status?: string;
    createdAt: string; updatedAt: string;
}

export interface ManufacturingStats {
    totalBoms: number; totalWorkOrders: number;
    draftWos: number; plannedWos: number;
    inProgressWos: number; completedWos: number;
}

// ─── Stock Opname Types ─────────────────────────────

export interface OpnameSession {
    id: string; tenantId: string; sessionCode: string; title: string;
    warehouseId?: string; warehouseName?: string;
    countedBy?: string; reviewedBy?: string;
    scheduledDate?: string; startedAt?: string; completedAt?: string;
    totalItems?: number; itemsCounted?: number;
    totalVarianceQty?: number; totalVarianceValue?: number;
    notes?: string; status?: string;
    createdAt: string; updatedAt: string;
}

export interface OpnameLine {
    id: string; sessionId: string; itemId?: string;
    itemName: string; itemSku?: string;
    zoneName?: string; binCode?: string; uom?: string;
    systemQty: number; actualQty?: number; varianceQty?: number;
    unitCost?: number; varianceValue?: number;
    countedAt?: string; countedBy?: string;
    notes?: string; status?: string; sortOrder?: number;
    createdAt: string; updatedAt: string;
}

export interface OpnameStatsType {
    totalSessions: number; draft: number;
    counting: number; review: number;
    completed: number; totalVariance: number;
}

// ─── Booking Types ─────────────────────────────────

export interface BookingSchedule {
    id: string; tenantId: string; itemId?: string; scheduleCode: string; routeName: string;
    origin?: string; destination?: string; departureTime?: string; arrivalTime?: string;
    durationMinutes?: number; capacity?: number; vehicleName?: string; vesselType?: string;
    priceEconomy?: number; priceBusiness?: number; priceVip?: number;
    operatingDays?: string[]; autoGenerateDays?: number;
    notes?: string; status?: string; createdAt: string; updatedAt: string;
}

export interface BookingOccurrence {
    id: string; scheduleId: string; departureDate: string; departureTime?: string;
    totalCapacity?: number; bookedCount?: number; checkedInCount?: number;
    actualDeparture?: string; actualArrival?: string;
    notes?: string; status?: string; createdAt: string;
}

export interface Booking {
    id: string; tenantId: string; bookingCode: string;
    scheduleId?: string; occurrenceId?: string;
    customerName?: string; customerEmail?: string; customerPhone?: string;
    passengerCount?: number; class?: string; totalAmount?: number; paidAmount?: number;
    qrCode?: string; checkInTime?: string; notes?: string; status?: string;
    createdAt: string; updatedAt: string;
}

export interface BookingPassenger {
    id: string; bookingId: string; name: string;
    idNumber?: string; nationality?: string; seatLabel?: string;
    class?: string; notes?: string; createdAt: string;
}

export interface BookingStatsType {
    totalSchedules: number; totalBookings: number;
    confirmedBookings: number; checkedInBookings: number;
    totalOccurrences: number; upcomingDepartures: number;
    totalRevenue: number;
}

// ─── Rental Types ──────────────────────────────────

export interface RentalAsset {
    id: string; tenantId: string; assetCode: string; assetName: string;
    serialNumber?: string; category?: string; condition?: string;
    purchaseDate?: string; purchaseCost?: number; currentLocation?: string;
    dailyRate?: number; depositAmount?: number;
    lastMaintenanceDate?: string; nextMaintenanceDate?: string;
    totalRentals?: number; totalRevenue?: number;
    notes?: string; status?: string; createdAt: string; updatedAt: string;
}

export interface RentalContract {
    id: string; tenantId: string; contractCode: string;
    assetId: string; assetName?: string; customerName: string;
    customerEmail?: string; customerPhone?: string; customerIdNumber?: string;
    checkoutDate: string; expectedReturnDate: string; actualReturnDate?: string;
    dailyRate?: number; depositAmount?: number; depositReturned?: number;
    rentalDays?: number; subtotal?: number; lateFee?: number;
    damageFee?: number; totalCharge?: number;
    checkoutCondition?: string; returnCondition?: string;
    checkoutNotes?: string; returnNotes?: string;
    notes?: string; status?: string; createdAt: string; updatedAt: string;
}

export interface RentalStatsType {
    totalAssets: number; available: number; rented: number; maintenance: number;
    totalContracts: number; activeContracts: number; overdue: number; totalRevenue: number;
}

// ─── E-Commerce Types ────────────────────────────────────

export interface EcomCustomer {
    id: string; customerCode: string; firstName: string; lastName?: string;
    email?: string; phone?: string; company?: string; address?: string;
    city?: string; province?: string; postalCode?: string;
    idNumber?: string; customerType?: string;
    totalOrders?: number; totalSpent?: number; loyaltyPoints?: number;
    notes?: string; tags?: string[]; status?: string;
    accountId?: string; contactId?: string;
    createdAt: string; updatedAt?: string;
}

export interface EcomOrder {
    id: string; orderNumber: string; customerId?: string;
    customerName?: string; customerEmail?: string; customerPhone?: string;
    shippingAddress?: string; shippingCity?: string; shippingProvince?: string;
    shippingPostalCode?: string; shippingMethod?: string; shippingCost?: number;
    subtotal?: number; taxAmount?: number; discountAmount?: number;
    totalAmount?: number; paidAmount?: number;
    paymentMethod?: string; paymentStatus?: string;
    notes?: string; internalNotes?: string; source?: string; status?: string;
    confirmedAt?: string; shippedAt?: string; deliveredAt?: string;
    completedAt?: string; cancelledAt?: string;
    createdAt: string; updatedAt?: string;
}

export interface EcomOrderItem {
    id: string; orderId: string; itemId?: string;
    itemName: string; itemSku?: string;
    fulfillmentType?: string; fulfillmentRef?: string;
    quantity: number; unitPrice: number; discount?: number;
    tax?: number; subtotal: number; variantInfo?: any;
    notes?: string; status?: string; createdAt?: string;
}

export interface EcomStoreSettings {
    id: string; tenantId: string; storeName?: string;
    storeEmail?: string; storePhone?: string; storeAddress?: string;
    defaultCurrency?: string; taxRate?: number; taxIncluded?: boolean;
    shippingEnabled?: boolean; defaultShippingCost?: number;
    freeShippingThreshold?: number; paymentMethods?: any;
    fulfillmentPhysical?: any; fulfillmentTicket?: any;
    fulfillmentScheduled?: any; fulfillmentRental?: any;
    lowStockAlert?: boolean; orderPrefix?: string; invoicePrefix?: string;
    notes?: string; createdAt?: string; updatedAt?: string;
}

export interface EcomStatsType {
    totalOrders: number; pending: number; confirmed: number;
    processing: number; shipped: number; delivered: number;
    completed: number; cancelled: number;
    totalRevenue: number; avgOrderValue: number;
    totalCustomers: number; activeCustomers: number;
}

// ─── Returns Types ──────────────────────────────────────

export interface EcomReturn {
    id: string; returnNumber: string; orderId?: string;
    orderNumber?: string; customerName?: string; customerEmail?: string;
    reason?: string; resolution?: string;
    subtotal?: number; refundAmount?: number; restockingFee?: number;
    refundMethod?: string; refundStatus?: string;
    notes?: string; internalNotes?: string; processedBy?: string;
    status?: string; requestedAt?: string; approvedAt?: string;
    receivedAt?: string; completedAt?: string;
    createdAt: string; updatedAt?: string;
}

export interface EcomReturnItem {
    id: string; returnId: string; orderItemId?: string;
    itemId?: string; itemName: string; itemSku?: string;
    quantity: number; unitPrice: number; subtotal: number;
    condition?: string; restock?: boolean;
    reason?: string; notes?: string; createdAt?: string;
}

export interface EcomReturnStatsType {
    totalReturns: number; requested: number;
    approved: number; received: number;
    completed: number; rejected: number;
    totalRefunded: number;
}

// ─── Package Types ──────────────────────────────────────

export interface EcomPackage {
    id: string; name: string; sku?: string;
    description?: string; packagePrice?: number;
    regularPrice?: number; savings?: number;
    currency?: string; mediaIds?: any; tags?: any;
    maxQuantity?: number; timesSold?: number;
    notes?: string; status?: string;
    createdAt: string; updatedAt?: string;
}

export interface EcomPackageItem {
    id: string; packageId: string; itemId?: string;
    itemName: string; itemSku?: string;
    quantity: number; unitPrice: number;
    sortOrder?: number; createdAt?: string;
}

export interface EcomPackageStatsType {
    totalPackages: number; active: number;
    inactive: number; totalSold: number;
    totalSavings: number;
}

// ─── Offer Types ────────────────────────────────────────

export interface EcomOffer {
    id: string; name: string; description?: string;
    offerType?: string; discountType?: string;
    discountValue?: number; minOrderAmount?: number;
    maxUses?: number; currentUses?: number;
    startDate?: string; endDate?: string;
    appliesTo?: string; targetIds?: any;
    bannerText?: string; badgeText?: string;
    notes?: string; status?: string;
    createdAt: string; updatedAt?: string;
}

export interface EcomOfferStatsType {
    totalOffers: number; active: number;
    draft: number; expired: number;
    totalUses: number;
}

// ─── Discount Types ─────────────────────────────────────

export interface EcomDiscount {
    id: string; code?: string; name: string;
    description?: string; discountType?: string;
    discountValue?: number; minOrderAmount?: number;
    maxDiscountAmount?: number; usageLimit?: number;
    timesUsed?: number; validFrom?: string;
    validUntil?: string; autoApply?: boolean;
    appliesTo?: string; targetIds?: any;
    stackable?: boolean; notes?: string;
    status?: string; createdAt: string; updatedAt?: string;
}

export interface EcomDiscountStatsType {
    totalDiscounts: number; active: number;
    expired: number; coupons: number;
    autoApply: number; totalUsed: number;
}

// ═══════════════════════════════════════════════════════════
// ─── STOCK OPERATIONS Types ──────────────────────────────
// ═══════════════════════════════════════════════════════════

export interface StockOperation {
    id: string; tenantId: string;
    operationNumber: string; operationType: string;
    itemId: string; itemName?: string;
    warehouseId?: string; quantity: number;
    unitCost?: number; reason?: string;
    reference?: string; batchNumber?: string;
    expiryDate?: string; approvedBy?: string;
    notes?: string; status?: string;
    createdBy?: string;
    createdAt: string; updatedAt?: string;
}

export interface StockOperationStatsType {
    totalOperations: number; receives: number;
    releases: number; adjustments: number;
    writeOffs: number; donations: number;
}

// ═══════════════════════════════════════════════════════════
// ─── FIXED ASSETS Types ──────────────────────────────────
// ═══════════════════════════════════════════════════════════

export interface FixedAsset {
    id: string; tenantId: string;
    itemId?: string; assetNumber: string;
    assetName: string; assetCategory?: string;
    serialNumber?: string; purchaseDate?: string;
    purchasePrice?: number; currentValue?: number;
    salvageValue?: number; depreciationMethod?: string;
    usefulLifeMonths?: number;
    accumulatedDepreciation?: number;
    lastDepreciationDate?: string;
    warrantyExpiry?: string; location?: string;
    warehouseId?: string; assignedTo?: string;
    condition?: string; insurancePolicy?: string;
    insuranceExpiry?: string;
    maintenanceSchedule?: string;
    lastMaintenanceDate?: string;
    nextMaintenanceDate?: string;
    notes?: string; status?: string;
    disposedDate?: string; disposalMethod?: string;
    disposalValue?: number;
    createdAt: string; updatedAt?: string;
}

export interface FixedAssetStatsType {
    totalAssets: number; active: number;
    maintenance: number; disposed: number;
    totalPurchaseValue: number; totalCurrentValue: number;
    totalAccumulatedDep: number;
}

export interface ExpiryAlert {
    itemId: string; itemName: string;
    itemSku?: string; batchNumber?: string;
    expiryDate: string; quantity: number;
    warehouseId?: string; isExpired: boolean;
    daysUntilExpiry: number;
}
