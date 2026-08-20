/**
 * Shared read-only tool executor for Agentic Ask + Pendamping.
 * Operational tools only — search_docs stays in Ask (needs StudioContext).
 */
import { Logger } from '@nestjs/common';
import { formatSuggestMenuActionContent } from './studio-umkm-agentic-ask.prompts';
import type {
    AgenticAskToolCall,
    AgenticAskToolResult,
} from './studio-umkm-agentic-ask.types';
import type { UmkmReportPeriod } from './studio-umkm-ops.util';

/** Minimal UMKM surface needed by operational read tools. */
export type UmkmReadToolHost = {
    buildStockCheckMessage(text: string, tenantId?: string): Promise<string>;
    buildSalesListMessage(tenantId: string, period: UmkmReportPeriod): Promise<string>;
    buildPurchaseListMessage(tenantId: string, period: UmkmReportPeriod): Promise<string>;
    buildCombinedReportMessage(tenantId: string, period?: UmkmReportPeriod): Promise<string>;
    buildProductListMessage(tenantId?: string): Promise<string>;
};

export type ExecuteUmkmReadToolCtx = {
    question: string;
    tenantId: string;
    logger?: Logger;
};

/**
 * Run one operational read tool. Returns null for tools the caller must handle
 * (search_docs) or unknown names when unknownOk is false.
 */
export async function executeUmkmReadTool(
    umkm: UmkmReadToolHost,
    call: AgenticAskToolCall,
    ctx: ExecuteUmkmReadToolCtx,
): Promise<{
    result: AgenticAskToolResult;
} | null> {
    const log = ctx.logger;
    try {
        switch (call.name) {
            case 'search_docs':
                return null;
            case 'get_stock': {
                const text = call.productQuery
                    ? `cek stok ${call.productQuery}`
                    : ctx.question;
                const content = await umkm.buildStockCheckMessage(text, ctx.tenantId);
                return { result: { name: call.name, ok: true, content } };
            }
            case 'get_sales_summary': {
                const period = (call.period || 'today') as UmkmReportPeriod;
                const content = await umkm.buildSalesListMessage(ctx.tenantId, period);
                return { result: { name: call.name, ok: true, content } };
            }
            case 'get_purchases_summary': {
                const period = (call.period || 'month') as UmkmReportPeriod;
                const content = await umkm.buildPurchaseListMessage(ctx.tenantId, period);
                return { result: { name: call.name, ok: true, content } };
            }
            case 'get_combined_report': {
                const period = (call.period || 'today') as UmkmReportPeriod;
                const content = await umkm.buildCombinedReportMessage(ctx.tenantId, period);
                return { result: { name: call.name, ok: true, content } };
            }
            case 'list_products': {
                const content = await umkm.buildProductListMessage(ctx.tenantId);
                return { result: { name: call.name, ok: true, content } };
            }
            case 'suggest_menu_action':
                return {
                    result: {
                        name: call.name,
                        ok: true,
                        content: formatSuggestMenuActionContent(),
                    },
                };
            default:
                return {
                    result: {
                        name: call.name,
                        ok: false,
                        content: `Tool tidak dikenali: ${call.name}`,
                    },
                };
        }
    } catch (e: any) {
        log?.warn?.(`umkm-read-tool ${call.name}: ${e?.message}`);
        return {
            result: {
                name: call.name,
                ok: false,
                content: `Gagal menjalankan ${call.name}: ${e?.message || 'error'}`,
            },
        };
    }
}

/** Coach-only ketik: allowlist — do not use matchUmkmIntakeJob. */
const KETIK_ALLOW_RE =
    /^ketik:\s*(jual|belanja|cek\s+stok|laporan|daftar|tambah\s+stok|omzet)\b/i;

/**
 * Strip ketik: action lines that are not on the coach allowlist.
 * Matches whole-line `ketik:` or `Aksi: ketik: …`.
 * Returns cleaned text + count of stripped lines.
 */
export function stripDisallowedKetikActions(text: string): { text: string; stripped: number } {
    const lines = text.split('\n');
    let stripped = 0;
    const out: string[] = [];
    for (const line of lines) {
        const trimmed = line.trim();
        const ketikIdx = trimmed.toLowerCase().indexOf('ketik:');
        if (ketikIdx >= 0) {
            const fromKetik = trimmed.slice(ketikIdx);
            if (!KETIK_ALLOW_RE.test(fromKetik)) {
                stripped += 1;
                continue;
            }
        }
        out.push(line);
    }
    return { text: out.join('\n').replace(/\n{3,}/g, '\n\n').trim(), stripped };
}
