import type { GuideFlowDefinition, GuideFlowNode } from './guide-flow.definition';
import type { QueryUnderstandingResult } from './query-understanding';
import {
    detectUmkmConfirmReply,
    detectUmkmIntent,
    looksLikeUmkmDirectDataQuery,
    looksLikeUmkmOpenQuestion,
} from './studio-umkm.util';

export type FlowContext = Record<string, unknown> & {
    lastUserMessage?: string;
    /** Set after query-understanding; used for {{rewrittenQuery}} and preferred {{lastUserMessage}} substitution. */
    rewrittenQuery?: string;
    queryUnderstanding?: QueryUnderstandingResult;
    /** User lines since last successful RAG (for multi-turn clarification). */
    guidedUserTurns?: string[];
    /** Clarifications asked this listen→rag cycle. */
    clarificationCount?: number;
    /** UMKM AIDLC: draft sale awaiting ya/batal before DB commit. */
    pendingUmkmSale?: {
        sale: {
            items: { name: string; quantity: number; unitPrice: number }[];
            totalAmount: number;
            customerName?: string;
            paymentMethod?: string;
            notes?: string;
        };
        resolved: {
            name: string;
            quantity: number;
            unitPrice: number;
            itemId?: string;
            itemSku?: string;
            catalogMatched: boolean;
            catalogName?: string;
        }[];
        phone?: string;
        createdAt: number;
    };
};

export function getNode(def: GuideFlowDefinition, nodeId: string): GuideFlowNode | undefined {
    return def.nodes.find((n) => n.id === nodeId);
}

export function substituteInstruction(template: string, ctx: FlowContext): string {
    const original = typeof ctx.lastUserMessage === 'string' ? ctx.lastUserMessage : '';
    const rewritten =
        typeof ctx.rewrittenQuery === 'string' && ctx.rewrittenQuery.length > 0 ? ctx.rewrittenQuery : original;
    const forLastUserPlaceholder = rewritten;
    let out = template;
    out = out.replace(/\{\{originalUserMessage\}\}/g, original);
    out = out.replace(/\{\{rewrittenQuery\}\}/g, typeof ctx.rewrittenQuery === 'string' ? ctx.rewrittenQuery : '');
    out = out.replace(/\{\{lastUserMessage\}\}/g, forLastUserPlaceholder);
    return out;
}

/** Pick listen branch: keyword and regex first, then default (must exist per validateGuideFlowGraph). */
export function resolveListenTarget(node: Extract<GuideFlowNode, { type: 'listen' }>, userText: string): string {
    const text = userText.toLowerCase();
    let fallback: string | null = null;
    for (const t of node.transitions) {
        if (t.when === 'default') {
            fallback = t.target;
            continue;
        }
        if (t.when === 'keyword' && text.includes(t.value.toLowerCase())) {
            return t.target;
        }
        if (t.when === 'regex') {
            try {
                const re = new RegExp(t.pattern, 'i');
                if (re.test(userText)) return t.target;
            } catch {
                /* invalid regex — skip */
            }
        }
    }
    if (fallback) return fallback;
    throw new Error(`listen node "${node.id}" has no default transition`);
}

/** True when the flow definition is UMKM sales (meta.flowKind or legacy do_list branch). */
export function isUmkmFlow(def: GuideFlowDefinition): boolean {
    if (def.meta?.flowKind === 'umkm') return true;
    if (def.meta?.flowKind === 'rag_qa' || def.meta?.flowKind === 'custom') return false;
    return def.nodes.some(
        (n) => n.type === 'listen' && n.transitions.some((t) => t.target === 'do_list'),
    );
}

/** True when listen node belongs to the UMKM sales guide flow (has do_list branch). */
export function isUmkmSalesListenNode(node: Extract<GuideFlowNode, { type: 'listen' }>): boolean {
    return node.transitions.some((t) => t.target === 'do_list');
}

/**
 * UMKM listen routing: keyword/regex first, then intent detection before blind record_sale.
 * When a pending sale exists, ya/batal (or digit 1/0) route to confirm/cancel even if flow transitions differ.
 */
export function resolveUmkmListenTarget(
    node: Extract<GuideFlowNode, { type: 'listen' }>,
    userText: string,
    opts?: { hasPendingSale?: boolean; commands?: unknown },
): string {
    const confirm = detectUmkmConfirmReply(userText, opts?.commands);
    if (opts?.hasPendingSale && confirm === 'confirm') {
        return node.transitions.some((t) => t.target === 'do_confirm') ? 'do_confirm' : 'do_record';
    }
    if (opts?.hasPendingSale && confirm === 'cancel') {
        return node.transitions.some((t) => t.target === 'do_cancel') ? 'do_cancel' : 'help';
    }

    // Before baked regex/keywords (published flows may still have bare omzet→do_report).
    if (looksLikeUmkmOpenQuestion(userText) && !looksLikeUmkmDirectDataQuery(userText)) {
        return node.transitions.some((t) => t.target === 'do_ask') ? 'do_ask' : 'help';
    }

    const text = userText.toLowerCase();
    for (const t of node.transitions) {
        if (t.when === 'default') continue;
        if (t.when === 'keyword' && text.includes(t.value.toLowerCase())) {
            return t.target;
        }
        if (t.when === 'regex') {
            try {
                const re = new RegExp(t.pattern, 'i');
                if (re.test(userText)) return t.target;
            } catch {
                /* invalid regex — skip */
            }
        }
    }
    switch (detectUmkmIntent(userText, opts?.commands)) {
        case 'ask':
            return node.transitions.some((t) => t.target === 'do_ask') ? 'do_ask' : 'help';
        case 'menu_hub':
            return 'do_menu_hub';
        case 'purchase_hub':
            return 'do_purchase_hub';
        case 'report_hub':
            return 'do_report_hub';
        case 'add_product':
            return 'do_add_product';
        case 'add_stock':
            return node.transitions.some((t) => t.target === 'do_add_stock')
                ? 'do_add_stock'
                : 'do_stock';
        case 'check_stock':
            return node.transitions.some((t) => t.target === 'do_stock') ? 'do_stock' : 'do_list';
        case 'list_purchases':
            return 'do_list_purchases';
        case 'record_purchase':
            return 'do_record_purchase';
        case 'list_sales':
            return 'do_list_sales';
        case 'list_products':
            return 'do_list';
        case 'sales_report':
            return 'do_report';
        case 'help':
            return 'help';
        case 'record_sale':
            return 'do_record';
        default:
            return node.transitions.some((t) => t.target === 'do_ask') ? 'do_ask' : 'help';
    }
}
