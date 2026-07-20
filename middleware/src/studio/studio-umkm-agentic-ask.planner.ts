/**
 * Pure planner for UMKM Agentic Ask — no Nest/IO.
 * Easy to unit-test and change without touching the orchestrator.
 */
import { detectReportPeriod, type UmkmReportPeriod } from './studio-umkm-ops.util';
import { extractStockProductQuery } from './studio-umkm.util';
import {
    AGENTIC_ASK_MAX_TOOLS,
    AGENTIC_ASK_TOOLS,
    type AgenticAskPlan,
    type AgenticAskToolCall,
    type AgenticAskToolName,
} from './studio-umkm-agentic-ask.types';

function pushUnique(out: AgenticAskToolCall[], call: AgenticAskToolCall) {
    if (out.some((c) => c.name === call.name)) return;
    if (out.length >= AGENTIC_ASK_MAX_TOOLS) return;
    out.push(call);
}

function looksLikeWriteAction(q: string): boolean {
    return /^(jual|catat\s+penjualan|tambah\s+penjualan|tambah\s+menu|tambah\s+stok|tambah\s+belanja|catat\s+belanja)\b/i.test(
        q.trim(),
    );
}

function periodFromQuestion(q: string): UmkmReportPeriod {
    return detectReportPeriod(q) || 'today';
}

/**
 * Heuristic multi-tool plan (phase 1–2).
 * Prefer specific operational tools; always allow docs for soft questions.
 */
export function planAgenticAskTools(question: string): AgenticAskPlan {
    const q = (question || '').trim();
    if (!q) {
        return { tools: [{ name: 'suggest_menu_action' }], reason: 'empty_question' };
    }

    // User seems to want to *do* something — don't fake a write; point to menu.
    if (looksLikeWriteAction(q)) {
        return {
            tools: [{ name: 'suggest_menu_action' }],
            reason: 'write_action_redirect',
        };
    }

    const tools: AgenticAskToolCall[] = [];
    const reasons: string[] = [];
    const lower = q.toLowerCase();

    const wantsStock =
        /\b(stok|stock|sisa\s+barang|berapa\s+stok|cek\s+stok)\b/i.test(q) ||
        !!extractStockProductQuery(q);
    const wantsSales =
        /\b(penjualan|omzet|omset|laku|order|transaksi\s+jual|pendapatan)\b/i.test(q);
    const wantsPurchase = /\b(belanja|pembelian|modal\s+beli|hpp\s+beli)\b/i.test(q);
    const wantsReport =
        /\b(laporan|rekap|ringkasan|selisih|profit|laba)\b/i.test(q) ||
        (wantsSales && wantsPurchase);
    const wantsCatalog =
        /\b(daftar\s+menu|daftar\s+barang|daftar\s+produk|katalog|menu\s+apa|produk\s+apa)\b/i.test(
            q,
        );
    const wantsHowTo =
        /\b(cara\s+pakai|bagaimana\s+cara|gimana\s+cara|petunjuk|bantuan|panduan)\b/i.test(q) ||
        /\b(bagaimana|gimana)\b.*\b(jual|catat|stok|laporan|belanja)\b/i.test(q);
    const wantsAdvice =
        /\b(tingkatkan|naikkan|strategi|tips|saran|rekomendasi|ide)\b/i.test(q);

    const period = periodFromQuestion(q);

    if (wantsStock) {
        const productQuery = extractStockProductQuery(q) || undefined;
        pushUnique(tools, { name: 'get_stock', productQuery });
        reasons.push('stock');
    }
    if (wantsReport) {
        pushUnique(tools, { name: 'get_combined_report', period });
        reasons.push('combined_report');
    } else {
        if (wantsSales) {
            pushUnique(tools, { name: 'get_sales_summary', period });
            reasons.push('sales');
        }
        if (wantsPurchase) {
            pushUnique(tools, { name: 'get_purchases_summary', period });
            reasons.push('purchases');
        }
    }
    if (wantsCatalog) {
        pushUnique(tools, { name: 'list_products' });
        reasons.push('catalog');
    }
    if (wantsHowTo) {
        pushUnique(tools, { name: 'suggest_menu_action' });
        pushUnique(tools, { name: 'search_docs' });
        reasons.push('howto');
    }
    if (wantsAdvice) {
        pushUnique(tools, { name: 'get_combined_report', period });
        pushUnique(tools, { name: 'search_docs' });
        pushUnique(tools, { name: 'list_products' });
        reasons.push('advice');
    }

    // Soft / general Q&A — docs + light ops context
    if (tools.length === 0) {
        pushUnique(tools, { name: 'search_docs' });
        // Give a little live context so answers aren't doc-only when notebook empty
        if (/\b(toko|umkm|bisnis|hari\s+ini|sekarang)\b/i.test(lower)) {
            pushUnique(tools, { name: 'get_combined_report', period: 'today' });
        }
        pushUnique(tools, { name: 'suggest_menu_action' });
        reasons.push('general');
    } else if (!tools.some((t) => t.name === 'search_docs') && (wantsAdvice || wantsHowTo)) {
        pushUnique(tools, { name: 'search_docs' });
    }

    return {
        tools: tools.slice(0, AGENTIC_ASK_MAX_TOOLS),
        reason: reasons.join('+') || 'default',
    };
}

export function isAgenticAskToolName(name: string): name is AgenticAskToolName {
    return (AGENTIC_ASK_TOOLS as readonly string[]).includes(name);
}