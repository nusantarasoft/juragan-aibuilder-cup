import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DremioService } from '../dremio/dremio.service';
import type { QueryUnderstandingResult } from './query-understanding';

/** Notebook-level DB context configuration (stored in studio_notebooks.context_config). */
export type StudioContextConfig = {
    audience?: 'admin' | 'customer';
    /** UMKM mode: WhatsApp prioritizes record sale + daily report actions. */
    umkm_mode?: boolean;
    /** If true, reject sales when item name does not match inv_items catalog. */
    umkm_require_catalog_match?: boolean;
    /** Tenant for ecom_orders / sales views (default: default). */
    tenant_id?: string;
    supabase_views?: string[];
    dremio_context_paths?: string[][];
    /** Pre-approved SELECT templates; {{filter}} placeholders filled by LLM JSON output */
    dremio_sql_templates?: { id: string; sql: string; description?: string }[];
    /** Custom instruction prepended to every chat answer (NotebookLM Configure Chat). */
    chat_instruction?: string;
    /** Auto-generated notebook brief after sources indexed. */
    brief_summary?: string;
    brief_generated_at?: string;
};

/** Default views for new notebooks — e-commerce sales analytics. */
export const DEFAULT_STUDIO_SALES_CONTEXT: StudioContextConfig = {
    supabase_views: [
        'v_studio_sales_today',
        'v_studio_sales_summary',
        'v_studio_top_products',
        'v_studio_recent_orders',
    ],
};

const LEGACY_DEFAULT_VIEWS = ['v_studio_cs_orders', 'v_studio_cs_customers'];

/** Views that return few rows; safe to fetch when sales/analytics intent matches. */
const COMPACT_ANALYTICS_VIEWS = new Set([
    'v_studio_sales_today',
    'v_studio_sales_summary',
    'v_studio_top_products',
]);

@Injectable()
export class StudioDbContextService {
    private readonly logger = new Logger(StudioDbContextService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly dremioService: DremioService,
    ) { }

    parseConfig(raw: unknown): StudioContextConfig {
        if (!raw || typeof raw !== 'object') return {};
        const cfg = raw as StudioContextConfig;
        if (!cfg.supabase_views?.length && Object.keys(cfg).length === 0) {
            return { ...DEFAULT_STUDIO_SALES_CONTEXT };
        }
        return cfg;
    }

    /**
     * Fetch read-only rows from allowlisted Supabase views (max 25 rows per view).
     */
    async fetchSupabaseContext(
        config: StudioContextConfig,
        qu: QueryUnderstandingResult,
    ): Promise<string> {
        const views = config.supabase_views?.length
            ? config.supabase_views
            : DEFAULT_STUDIO_SALES_CONTEXT.supabase_views!;

        const intent = (qu.main_intent || '').toLowerCase();
        const query = qu.rewritten_query || qu.normalized_text || '';
        const blocks: string[] = [];

        const catalogHint = await this.fetchCatalogHint(views);
        if (catalogHint) {
            blocks.push(catalogHint);
        }

        for (const view of views) {
            if (!this.isSafeIdentifier(view)) continue;
            if (!this.shouldFetchView(view, intent, query)) continue;
            try {
                const rows = await this.queryAllowlistedView(view, intent, query);
                if (rows.length > 0) {
                    blocks.push(`### Supabase: ${view}\n${JSON.stringify(rows, null, 2)}`);
                }
            } catch (e: any) {
                this.logger.warn(`Supabase view ${view}: ${e?.message}`);
            }
        }

        return blocks.join('\n\n');
    }

    /**
     * Run a guarded Dremio query from notebook config (template or dataset preview).
     */
    async fetchDremioContext(
        config: StudioContextConfig,
        qu: QueryUnderstandingResult,
    ): Promise<string> {
        const paths = config.dremio_context_paths;
        if (!paths?.length) return '';

        const blocks: string[] = [];
        for (const path of paths.slice(0, 3)) {
            if (!Array.isArray(path) || path.length === 0) continue;
            try {
                const preview = await this.dremioService.getDatasetPreview(path, 20);
                if (preview?.rows?.length) {
                    blocks.push(
                        `### Dremio dataset: ${path.join('.')}\n` +
                        `Columns: ${preview.columns?.map((c: any) => c.name).join(', ')}\n` +
                        JSON.stringify(preview.rows.slice(0, 20), null, 2),
                    );
                }
            } catch (e: any) {
                this.logger.warn(`Dremio preview ${path.join('.')}: ${e?.message}`);
            }
        }

        const templates = config.dremio_sql_templates || [];
        const intent = (qu.main_intent || '').toLowerCase();
        if (templates.length > 0 && /analitik|laporan|report|trend|agregat|sql/i.test(intent + qu.rewritten_query)) {
            const tpl = templates[0];
            if (tpl?.sql && this.isReadOnlySql(tpl.sql)) {
                try {
                    const result = await this.dremioService.runSQL(tpl.sql, paths[0]);
                    if (result?.rows?.length) {
                        blocks.push(
                            `### Dremio SQL (${tpl.id})\n` +
                            JSON.stringify(result.rows.slice(0, 25), null, 2),
                        );
                    }
                } catch (e: any) {
                    this.logger.warn(`Dremio template ${tpl.id}: ${e?.message}`);
                }
            }
        }

        return blocks.join('\n\n');
    }

    private isSafeIdentifier(name: string): boolean {
        return /^[a-z_][a-z0-9_]*$/i.test(name);
    }

    private isReadOnlySql(sql: string): boolean {
        const s = sql.trim().toUpperCase();
        if (!s.startsWith('SELECT')) return false;
        if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT)\b/.test(s)) return false;
        return true;
    }

    /** Short metadata block from studio_data_catalog for listed views. */
    private async fetchCatalogHint(views: string[]): Promise<string> {
        try {
            const client = this.supabaseService.getAdminClient();
            const { data, error } = await client
                .from('studio_data_catalog')
                .select('object_name, description, example_questions')
                .in('object_name', views);
            if (error) {
                if (error.code === '42P01') return '';
                return '';
            }
            if (!data?.length) return '';
            const lines = data.map(
                (r: { object_name: string; description: string; example_questions?: string[] }) =>
                    `- **${r.object_name}**: ${r.description}` +
                    (r.example_questions?.length
                        ? ` (contoh: ${r.example_questions.slice(0, 2).join('; ')})`
                        : ''),
            );
            return `## Katalog data (ringkas)\n${lines.join('\n')}`;
        } catch {
            return '';
        }
    }

    private shouldFetchView(view: string, intent: string, query: string): boolean {
        const text = `${intent} ${query}`.toLowerCase();

        const wantsToday = /hari ini|today|tanggal ini|this day/.test(text);
        const wantsAllTime =
            /keseluruhan|seluruh|semua|total penjualan|all.?time|keseluruhan|omzet total|revenue total/.test(
                text,
            ) && !wantsToday;
        const wantsTop = /laris|best seller|top produk|produk terlaris|paling laris|terlaris|best selling/.test(
            text,
        );
        const wantsOrder =
            /order|pesanan|ord-|invoice|status pesanan/.test(text) ||
            /\b(?:order|pesanan)\s*[#:]?\s*[a-z0-9-]+/i.test(query);
        const wantsCustomer = /pelanggan|customer|kontak|pembeli/.test(text);
        const wantsSales = /penjualan|omzet|revenue|sales|transaksi|jual|earning/.test(text);

        if (view === 'v_studio_sales_today') {
            return wantsToday || (wantsSales && !wantsAllTime && !wantsTop) || (wantsSales && wantsToday);
        }
        if (view === 'v_studio_sales_summary') {
            return wantsAllTime || (wantsSales && !wantsToday && !wantsTop) || wantsSales;
        }
        if (view === 'v_studio_top_products') {
            return wantsTop || (wantsSales && /produk|product|item|barang/.test(text));
        }
        if (view === 'v_studio_recent_orders' || view === 'v_studio_cs_orders') {
            return wantsOrder || /terbaru|recent|latest/.test(text);
        }
        if (view === 'v_studio_cs_customers') {
            return wantsCustomer;
        }

        if (COMPACT_ANALYTICS_VIEWS.has(view) && wantsSales) {
            return true;
        }

        if (LEGACY_DEFAULT_VIEWS.includes(view)) {
            return wantsOrder || wantsCustomer || /status|stok|stock/.test(text);
        }

        return wantsSales || wantsOrder || wantsCustomer;
    }

    private async queryAllowlistedView(
        view: string,
        intent: string,
        query: string,
    ): Promise<Record<string, unknown>[]> {
        const client = this.supabaseService.getAdminClient();
        let q = client.from(view).select('*');

        const qLower = query.toLowerCase();
        const orderMatch = qLower.match(/\b(?:order|pesanan|invoice)\s*[#:]?\s*([a-z0-9-]+)/i);

        if (orderMatch && (view.includes('order') || view === 'v_studio_recent_orders')) {
            const ref = orderMatch[1];
            q = q.or(`order_number.ilike.%${ref}%,id.ilike.%${ref}%`).limit(10);
        } else if (COMPACT_ANALYTICS_VIEWS.has(view)) {
            q = q.limit(25);
        } else if (/customer|pelanggan|kontak/i.test(intent + query) && view.includes('customer')) {
            q = q.limit(15);
        } else if (view.includes('top_product')) {
            q = q.limit(15);
        } else {
            q = q.limit(25);
        }

        const { data, error } = await q;
        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return (data as Record<string, unknown>[]) || [];
    }
}
