import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from '../settings/settings.service';

interface DremioToken {
    token: string;
    expiresAt: number;
}

export interface CatalogItem {
    id: string;
    path: string[];
    type: string; // SOURCE, SPACE, FOLDER, DATASET_TABLE, DATASET_VIRTUAL
    containerType?: string;
    datasetType?: string;
    tag?: string;
    children?: CatalogItem[];
}

export interface CatalogDetail extends CatalogItem {
    entityType: string;
    config?: Record<string, any>;
    fields?: DatasetField[];
    sql?: string;
    sqlContext?: string[];
}

export interface DatasetField {
    name: string;
    type: { name: string };
}

export interface QueryResult {
    jobId: string;
    rowCount: number;
    columns: { name: string; type: string }[];
    rows: Record<string, any>[];
    status: string;
}

export interface DremioSource {
    id: string;
    name: string;
    type: string;
    tag: string;
    status?: { state: string };
    config?: Record<string, any>;
}

@Injectable()
export class DremioService {
    private readonly logger = new Logger(DremioService.name);
    private cachedToken: DremioToken | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly settingsService: SettingsService,
    ) { }

    // ─── Auth ────────────────────────────────────────────────────────────────

    private async getDremioUrl(): Promise<string> {
        const setting = await this.settingsService.findByKey('dremio.host');
        return setting?.value || this.configService.get('DREMIO_URL') || 'http://dremio:9047';
    }

    private async getCredentials(): Promise<{ userName: string; password: string }> {
        const userSetting = await this.settingsService.findByKey('dremio.username');
        const passSetting = await this.settingsService.findByKey('dremio.password');
        return {
            userName: userSetting?.value || 'admin',
            password: passSetting?.value || 'secret1234',
        };
    }

    private async getToken(): Promise<string> {
        if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
            return this.cachedToken.token;
        }

        const baseUrl = await this.getDremioUrl();
        const creds = await this.getCredentials();

        const res = await fetch(`${baseUrl}/apiv2/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Dremio login failed: ${res.status} ${text}`);
        }

        const data = await res.json();
        this.cachedToken = {
            token: data.token,
            expiresAt: Date.now() + 12 * 60 * 60 * 1000, // 12h
        };
        return data.token;
    }

    private async dremioFetch(path: string, options: RequestInit = {}): Promise<any> {
        const baseUrl = await this.getDremioUrl();
        const token = await this.getToken();

        const res = await fetch(`${baseUrl}${path}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `_dremio${token}`,
                ...options.headers,
            },
        });

        if (res.status === 401) {
            // Token expired, retry once
            this.cachedToken = null;
            const newToken = await this.getToken();
            const retry = await fetch(`${baseUrl}${path}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `_dremio${newToken}`,
                    ...options.headers,
                },
            });
            if (!retry.ok) throw new Error(`Dremio API error: ${retry.status}`);
            return retry.json();
        }

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Dremio API error: ${res.status} ${text}`);
        }

        // Some endpoints return empty body (204)
        const text = await res.text();
        return text ? JSON.parse(text) : {};
    }

    // ─── Catalog ─────────────────────────────────────────────────────────────

    async getCatalog(): Promise<CatalogItem[]> {
        const data = await this.dremioFetch('/api/v3/catalog');
        return (data.data || []).map(this.mapCatalogItem);
    }

    async getCatalogById(id: string): Promise<CatalogDetail> {
        const data = await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}`);
        return this.mapCatalogDetail(data);
    }

    async getCatalogByPath(pathParts: string[]): Promise<CatalogDetail> {
        const encodedPath = pathParts.map(p => encodeURIComponent(p)).join('/');
        const data = await this.dremioFetch(`/api/v3/catalog/by-path/${encodedPath}`);
        return this.mapCatalogDetail(data);
    }

    async getCatalogChildren(id: string): Promise<CatalogItem[]> {
        const data = await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}`);
        return (data.children || []).map(this.mapCatalogItem);
    }

    private mapCatalogItem = (item: any): CatalogItem => ({
        id: item.id,
        path: item.path,
        type: item.type || item.containerType || item.datasetType || 'UNKNOWN',
        containerType: item.containerType,
        datasetType: item.datasetType,
        tag: item.tag,
    });

    private mapCatalogDetail = (item: any): CatalogDetail => ({
        ...this.mapCatalogItem(item),
        entityType: item.entityType,
        config: item.config,
        fields: item.fields,
        sql: item.sql,
        sqlContext: item.sqlContext,
        children: item.children?.map(this.mapCatalogItem),
    });

    // ─── SQL Execution ───────────────────────────────────────────────────────

    async runSQL(sql: string, context?: string[]): Promise<QueryResult> {
        // Submit job
        const job = await this.dremioFetch('/api/v3/sql', {
            method: 'POST',
            body: JSON.stringify({ sql, context }),
        });

        const jobId = job.id;

        // Poll for completion
        let status = 'RUNNING';
        let attempts = 0;
        const maxAttempts = 120; // 2 min max

        while (['RUNNING', 'STARTING', 'ENQUEUED', 'PLANNING', 'PENDING', 'METADATA_RETRIEVAL', 'QUEUED', 'ENGINE_START', 'EXECUTION_PLANNING'].includes(status)) {
            if (attempts++ > maxAttempts) throw new Error('Query timeout');
            await new Promise(r => setTimeout(r, 500));

            const jobStatus = await this.dremioFetch(`/api/v3/job/${jobId}`);
            status = jobStatus.jobState;

            if (status === 'FAILED') {
                throw new Error(jobStatus.errorMessage || 'Query failed');
            }
            if (status === 'CANCELED' || status === 'CANCELLED') {
                throw new Error('Query was canceled');
            }
        }

        // Get results
        const results = await this.dremioFetch(`/api/v3/job/${jobId}/results?offset=0&limit=500`);

        return {
            jobId,
            rowCount: results.rowCount || 0,
            columns: (results.schema || []).map((col: any) => ({
                name: col.name,
                type: col.type?.name || 'VARCHAR',
            })),
            rows: results.rows || [],
            status: 'COMPLETED',
        };
    }

    async getDatasetPreview(pathParts: string[], limit = 100): Promise<QueryResult> {
        const quotedPath = pathParts.map(p => `"${p}"`).join('.');
        return this.runSQL(`SELECT * FROM ${quotedPath} LIMIT ${limit}`);
    }

    // ─── Sources ─────────────────────────────────────────────────────────────

    async getSources(): Promise<DremioSource[]> {
        const catalog = await this.dremioFetch('/api/v3/catalog');
        const sources = (catalog.data || []).filter((item: any) => item.containerType === 'SOURCE');

        // Fetch details to get specific type (e.g. "S3", "NESSIE") instead of generic "CONTAINER"
        return Promise.all(sources.map(async (item: any) => {
            try {
                const detail = await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(item.id)}`);
                return {
                    id: detail.id,
                    name: detail.path?.[0] || item.path?.[0] || '',
                    type: detail.type || item.type || 'UNKNOWN',
                    tag: detail.tag || item.tag || '',
                };
            } catch (error) {
                this.logger.warn(`Failed to fetch detail for source ${item.id}: ${error}`);
                return {
                    id: item.id,
                    name: item.path?.[0] || '',
                    type: item.type || 'UNKNOWN',
                    tag: item.tag || '',
                };
            }
        }));
    }

    async getSourceDetail(id: string): Promise<DremioSource> {
        const data = await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}`);
        return {
            id: data.id,
            name: data.name,
            type: data.type,
            tag: data.tag,
            status: data.status,
            config: data.config,
        };
    }

    async createSource(body: Record<string, any>): Promise<DremioSource> {
        const data = await this.dremioFetch('/api/v3/catalog', {
            method: 'POST',
            body: JSON.stringify({ entityType: 'source', ...body }),
        });
        return { id: data.id, name: data.name, type: data.type, tag: data.tag, config: data.config };
    }

    async updateSource(id: string, body: Record<string, any>): Promise<DremioSource> {
        // Dremio PUT /api/v3/catalog/{id} requires entityType, tag, and id in body
        const { tag, name, type, config } = body;
        const payload: Record<string, any> = {
            entityType: 'source',
            id,
            tag,
        };
        if (name !== undefined) payload.name = name;
        if (type !== undefined) payload.type = type;
        if (config !== undefined) payload.config = config;
        const data = await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        return { id: data.id, name: data.name, type: data.type, tag: data.tag, config: data.config };
    }

    async deleteSource(id: string, tag: string): Promise<boolean> {
        await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}?tag=${tag}`, {
            method: 'DELETE',
        });
        return true;
    }

    // ─── Virtual Dataset (View) ──────────────────────────────────────────────

    async createVDS(path: string[], sql: string, sqlContext?: string[]): Promise<CatalogDetail> {
        const data = await this.dremioFetch('/api/v3/catalog', {
            method: 'POST',
            body: JSON.stringify({
                entityType: 'dataset',
                type: 'VIRTUAL_DATASET',
                path,
                sql,
                sqlContext,
            }),
        });
        return this.mapCatalogDetail(data);
    }

    async updateVDS(id: string, tag: string, sql: string, sqlContext?: string[]): Promise<CatalogDetail> {
        const existing = await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}`);
        const data = await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify({ ...existing, tag, sql, sqlContext: sqlContext || existing.sqlContext }),
        });
        return this.mapCatalogDetail(data);
    }

    async deleteVDS(id: string, tag: string): Promise<boolean> {
        await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}?tag=${tag}`, { method: 'DELETE' });
        return true;
    }

    // ─── Spaces ──────────────────────────────────────────────────────────────

    async createSpace(name: string): Promise<CatalogItem> {
        const data = await this.dremioFetch('/api/v3/catalog', {
            method: 'POST',
            body: JSON.stringify({ entityType: 'space', name }),
        });
        return this.mapCatalogItem(data);
    }

    async deleteSpace(id: string, tag: string): Promise<boolean> {
        await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}?tag=${tag}`, { method: 'DELETE' });
        return true;
    }

    async renameSpace(id: string, tag: string, newName: string): Promise<CatalogItem> {
        const data = await this.dremioFetch(`/api/v3/catalog/${encodeURIComponent(id)}`, {
            method: 'PUT',
            body: JSON.stringify({ entityType: 'space', id, tag, name: newName }),
        });
        return this.mapCatalogItem(data);
    }

    // ─── Job Management ─────────────────────────────────────────────────────

    async cancelJob(jobId: string): Promise<boolean> {
        await this.dremioFetch(`/api/v3/job/${jobId}/cancel`, { method: 'POST' });
        return true;
    }

    async getJobResults(jobId: string, offset = 0, limit = 500): Promise<QueryResult> {
        const results = await this.dremioFetch(`/api/v3/job/${jobId}/results?offset=${offset}&limit=${limit}`);
        return {
            jobId,
            rowCount: results.rowCount || 0,
            columns: (results.schema || []).map((col: any) => ({ name: col.name, type: col.type?.name || 'VARCHAR' })),
            rows: results.rows || [],
            status: 'COMPLETED',
        };
    }

    // ─── Export ──────────────────────────────────────────────────────────────

    resultsToCsv(result: QueryResult): string {
        const header = result.columns.map(c => c.name).join(',');
        const rows = result.rows.map(row =>
            result.columns.map(c => {
                const val = row[c.name];
                if (val === null || val === undefined) return '';
                const str = String(val);
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(',')
        );
        return [header, ...rows].join('\n');
    }

    // ─── Connection Test ─────────────────────────────────────────────────────

    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            this.cachedToken = null; // Force re-auth
            await this.getToken();
            return { success: true, message: 'Connected to Dremio successfully' };
        } catch (error: any) {
            return { success: false, message: error.message || 'Connection failed' };
        }
    }
}
