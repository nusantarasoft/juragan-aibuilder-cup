import type { GuideFlowDefinition, GuideFlowNode } from './guide-flow.definition';
import type { QueryUnderstandingResult } from './query-understanding';
import { detectUmkmIntent } from './studio-umkm.util';

export type FlowContext = Record<string, unknown> & {
    lastUserMessage?: string;
    /** Set after query-understanding; used for {{rewrittenQuery}} and preferred {{lastUserMessage}} substitution. */
    rewrittenQuery?: string;
    queryUnderstanding?: QueryUnderstandingResult;
    /** User lines since last successful RAG (for multi-turn clarification). */
    guidedUserTurns?: string[];
    /** Clarifications asked this listen→rag cycle. */
    clarificationCount?: number;
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
 */
export function resolveUmkmListenTarget(
    node: Extract<GuideFlowNode, { type: 'listen' }>,
    userText: string,
): string {
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
    switch (detectUmkmIntent(userText)) {
        case 'list_products':
            return 'do_list';
        case 'sales_report':
            return 'do_report';
        case 'help':
            return 'help';
        case 'record_sale':
            return 'do_record';
        default:
            return 'help';
    }
}
