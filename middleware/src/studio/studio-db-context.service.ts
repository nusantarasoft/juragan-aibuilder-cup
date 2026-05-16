import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { DremioService } from '../dremio/dremio.service';
import type { QueryUnderstandingResult } from './query-understanding';

/** Notebook-level DB context configuration (stored in studio_notebooks.context_config). */
export type StudioContextConfig = {
    audience?: 'admin' | 'customer';
    supabase_views?: string[];
    dremio_context_paths?: string[][];
    /** Pre-approved SELECT templates; {{filter}} placeholders filled by LLM JSON output */
    dremio_sql_templates?: { id: string; sql: string; description?: string }[];
};

const DEFAULT_SUPABASE_VIEWS = [
    'v_studio_cs_orders',
    'v_studio_cs_customers',
];

@Injectable()
export class StudioDbContextService {
    private readonly logger = new Logger(StudioDbContextService.name);

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly dremioService: DremioService,
    ) { }

    parseConfig(raw: unknown): StudioContextConfig {
        if (!raw || typeof raw !== 'object') return {};
        return raw as StudioContextConfig;
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
            : DEFAULT_SUPABASE_VIEWS;

        const intent = (qu.main_intent || '').toLowerCase();
        const query = qu.rewritten_query || qu.normalized_text || '';
        const blocks: string[] = [];

        for (const view of views) {
            if (!this.isSafeIdentifier(view)) continue;
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

    private async queryAllowlistedView(
        view: string,
        intent: string,
        query: string,
    ): Promise<Record<string, unknown>[]> {
        const client = this.supabaseService.getAdminClient();
        let q = client.from(view).select('*').limit(25);

        const qLower = query.toLowerCase();
        const orderMatch = qLower.match(/\b(?:order|pesanan|invoice)\s*[#:]?\s*([a-z0-9-]+)/i);
        if (orderMatch && view.includes('order')) {
            const ref = orderMatch[1];
            q = q.or(`order_number.ilike.%${ref}%,id.ilike.%${ref}%`).limit(10);
        } else if (/customer|pelanggan|kontak/i.test(intent + query) && view.includes('customer')) {
            q = q.limit(15);
        } else if (!/order|pesanan|customer|pelanggan|status|stok|stock/i.test(intent + query)) {
            return [];
        }

        const { data, error } = await q;
        if (error) {
            if (error.code === '42P01') return [];
            throw error;
        }
        return (data as Record<string, unknown>[]) || [];
    }
}
