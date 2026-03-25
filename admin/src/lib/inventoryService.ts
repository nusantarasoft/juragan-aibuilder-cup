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
                    createdAt updatedAt
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
