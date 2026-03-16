/**
 * Dremio Service — All operations via GraphQL Middleware
 * Proxies Dremio REST API through the NestJS middleware
 */

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';

async function graphqlRequest<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) throw new Error(json.errors[0].message);
    return json.data;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CatalogItem {
    id: string;
    path: string[];
    type: string;
    containerType?: string;
    datasetType?: string;
    tag?: string;
    children?: CatalogItem[];
}

export interface CatalogDetail extends CatalogItem {
    entityType?: string;
    config?: Record<string, any>;
    fields?: { name: string; type: { name: string } }[];
    sql?: string;
    sqlContext?: string[];
}

export interface QueryColumn {
    name: string;
    type: string;
}

export interface QueryResult {
    jobId: string;
    rowCount: number;
    columns: QueryColumn[];
    rows: Record<string, any>[];
    status: string;
}

export interface DremioSource {
    id: string;
    name: string;
    type: string;
    tag: string;
    config?: Record<string, any>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const dremioService = {

    // ═══════════════ CATALOG ═══════════════

    async getCatalog(): Promise<CatalogItem[]> {
        const data = await graphqlRequest<{ dremioCatalog: CatalogItem[] }>(`
            query { dremioCatalog { id path type containerType datasetType tag } }
        `);
        return data.dremioCatalog;
    },

    async getCatalogByPath(path: string[]): Promise<CatalogDetail> {
        const data = await graphqlRequest<{ dremioCatalogByPath: CatalogDetail }>(`
            query($path: [String!]!) {
                dremioCatalogByPath(path: $path) {
                    id path type entityType containerType datasetType tag
                    config fields sql sqlContext
                    children { id path type containerType datasetType tag }
                }
            }
        `, { path });
        return data.dremioCatalogByPath;
    },

    async getCatalogById(id: string): Promise<CatalogDetail> {
        const data = await graphqlRequest<{ dremioCatalogById: CatalogDetail }>(`
            query($id: String!) {
                dremioCatalogById(id: $id) {
                    id path type entityType containerType datasetType tag
                    config fields sql sqlContext
                    children { id path type containerType datasetType tag }
                }
            }
        `, { id });
        return data.dremioCatalogById;
    },

    async getCatalogChildren(id: string): Promise<CatalogItem[]> {
        const data = await graphqlRequest<{ dremioCatalogChildren: CatalogItem[] }>(`
            query($id: String!) {
                dremioCatalogChildren(id: $id) { id path type containerType datasetType tag }
            }
        `, { id });
        return data.dremioCatalogChildren;
    },

    // ═══════════════ SQL ═══════════════

    async runSQL(sql: string, context?: string[]): Promise<QueryResult> {
        const data = await graphqlRequest<{ dremioRunSQL: QueryResult }>(`
            mutation($sql: String!, $context: [String!]) {
                dremioRunSQL(sql: $sql, context: $context) {
                    jobId rowCount status
                    columns { name type }
                    rows
                }
            }
        `, { sql, context });
        return data.dremioRunSQL;
    },

    async getDatasetPreview(path: string[], limit = 100): Promise<QueryResult> {
        const data = await graphqlRequest<{ dremioDatasetPreview: QueryResult }>(`
            query($path: [String!]!, $limit: Int) {
                dremioDatasetPreview(path: $path, limit: $limit) {
                    jobId rowCount status
                    columns { name type }
                    rows
                }
            }
        `, { path, limit });
        return data.dremioDatasetPreview;
    },

    // ═══════════════ SOURCES ═══════════════

    async getSources(): Promise<DremioSource[]> {
        const data = await graphqlRequest<{ dremioSources: DremioSource[] }>(`
            query { dremioSources { id name type tag } }
        `);
        return data.dremioSources;
    },

    async getSourceDetail(id: string): Promise<DremioSource> {
        const data = await graphqlRequest<{ dremioSourceDetail: DremioSource }>(`
            query($id: String!) {
                dremioSourceDetail(id: $id) { id name type tag config }
            }
        `, { id });
        return data.dremioSourceDetail;
    },

    async createSource(name: string, type: string, config: Record<string, any>): Promise<DremioSource> {
        const data = await graphqlRequest<{ dremioCreateSource: DremioSource }>(`
            mutation($input: DremioCreateSourceInput!) {
                dremioCreateSource(input: $input) { id name type tag config }
            }
        `, { input: { name, type, config } });
        return data.dremioCreateSource;
    },

    async updateSource(id: string, tag: string, input: { name?: string; type?: string; config?: Record<string, any> }): Promise<DremioSource> {
        const data = await graphqlRequest<{ dremioUpdateSource: DremioSource }>(`
            mutation($input: DremioUpdateSourceInput!) {
                dremioUpdateSource(input: $input) { id name type tag config }
            }
        `, { input: { id, tag, ...input } });
        return data.dremioUpdateSource;
    },

    async deleteSource(id: string, tag: string): Promise<boolean> {
        const data = await graphqlRequest<{ dremioDeleteSource: { success: boolean } }>(`
            mutation($id: String!, $tag: String!) {
                dremioDeleteSource(id: $id, tag: $tag) { success }
            }
        `, { id, tag });
        return data.dremioDeleteSource.success;
    },

    // ═══════════════ VDS & SPACES ═══════════════

    async createVDS(path: string[], sql: string, sqlContext?: string[]): Promise<CatalogDetail> {
        const data = await graphqlRequest<{ dremioCreateVDS: CatalogDetail }>(`
            mutation($path: [String!]!, $sql: String!, $sqlContext: [String!]) {
                dremioCreateVDS(path: $path, sql: $sql, sqlContext: $sqlContext) {
                    id path type entityType tag
                }
            }
        `, { path, sql, sqlContext });
        return data.dremioCreateVDS;
    },

    async createSpace(name: string): Promise<CatalogItem> {
        const data = await graphqlRequest<{ dremioCreateSpace: CatalogItem }>(`
            mutation($name: String!) {
                dremioCreateSpace(name: $name) { id path type tag }
            }
        `, { name });
        return data.dremioCreateSpace;
    },

    // ═══════════════ EXPORT ═══════════════

    async exportCsv(sql: string): Promise<string> {
        const data = await graphqlRequest<{ dremioExportCsv: { csv: string } }>(`
            mutation($sql: String!) {
                dremioExportCsv(sql: $sql) { csv }
            }
        `, { sql });
        return data.dremioExportCsv.csv;
    },

    downloadCsv(csv: string, filename = 'export.csv') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    },

    async downloadExcel(result: QueryResult, filename = 'export.xlsx') {
        try {
            const XLSX = await import('xlsx');

            // Format rows for XLSX
            const formattedRows = result.rows.map(row => {
                const newRow: any = {};
                result.columns.forEach(c => {
                    newRow[c.name] = row[c.name];
                });
                return newRow;
            });

            // Create workbook and worksheet
            const worksheet = XLSX.utils.json_to_sheet(formattedRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

            // Write and download
            XLSX.writeFile(workbook, filename);
        } catch (error) {
            console.error("Failed to generate Excel file:", error);
            // Re-throw or handle without this.resultsToCsv which doesn't exist here
            throw new Error("Failed to generate Excel file. Ensure 'xlsx' library is installed.");
        }
    },

    // ═══════════════ CONNECTION ═══════════════

    async testConnection(): Promise<{ success: boolean; message: string }> {
        const data = await graphqlRequest<{ dremioTestConnection: { success: boolean; message: string } }>(`
            query { dremioTestConnection { success message } }
        `);
        return data.dremioTestConnection;
    },
};
