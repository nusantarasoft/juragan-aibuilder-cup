/**
 * Types for UMKM Agentic Ask (perintah Tanya).
 * Keep tool names stable — planner + executor + tests depend on them.
 */

import type { UmkmReportPeriod } from './studio-umkm-ops.util';

/** Read-only tools the ask agent may call. Never include write/mutate ops. */
export const AGENTIC_ASK_TOOLS = [
    'search_docs',
    'get_stock',
    'get_sales_summary',
    'get_purchases_summary',
    'get_combined_report',
    'list_products',
    'suggest_menu_action',
] as const;

export type AgenticAskToolName = (typeof AGENTIC_ASK_TOOLS)[number];

export type AgenticAskToolCall = {
    name: AgenticAskToolName;
    /** Free-text product hint for stock tools */
    productQuery?: string;
    period?: UmkmReportPeriod;
};

export type AgenticAskToolResult = {
    name: AgenticAskToolName;
    ok: boolean;
    /** Human-readable payload for the synthesizer */
    content: string;
};

export type AgenticAskPlan = {
    tools: AgenticAskToolCall[];
    /** Why these tools were chosen (debug / telemetry) */
    reason: string;
};

export type AgenticAskInput = {
    question: string;
    notebookId: string;
    conversationId: string;
    tenantId: string;
    notebookName?: string;
    conversationLines?: string[];
    /** Optional guide-flow instruction text */
    instruction?: string;
};

export type AgenticAskOutput = {
    answer: string;
    plan: AgenticAskPlan;
    toolResults: AgenticAskToolResult[];
    /** Doc chunk refs when search_docs ran */
    references?: { content: string; docName: string; score: number }[];
    rawChunks?: any[];
};

/** Hard cap — keeps latency & cost predictable. */
export const AGENTIC_ASK_MAX_TOOLS = 4;
