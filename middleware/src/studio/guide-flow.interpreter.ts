import type { GuideFlowDefinition, GuideFlowNode } from './guide-flow.definition';

export type FlowContext = Record<string, unknown> & { lastUserMessage?: string };

export function getNode(def: GuideFlowDefinition, nodeId: string): GuideFlowNode | undefined {
    return def.nodes.find((n) => n.id === nodeId);
}

export function substituteInstruction(template: string, ctx: FlowContext): string {
    let out = template;
    const last = typeof ctx.lastUserMessage === 'string' ? ctx.lastUserMessage : '';
    out = out.replace(/\{\{lastUserMessage\}\}/g, last);
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
