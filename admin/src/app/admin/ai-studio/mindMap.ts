/**
 * Parse a mind-map markdown document (produced by the Studio `mind_map` output)
 * into a hierarchical node/edge graph laid out left-to-right for @xyflow/react.
 *
 * Supported markdown:
 *  - Headings `#`..`######` establish the primary hierarchy (depth = hash count).
 *  - Bullet lines (`-`, `*`, `+`) nest under the most recent heading; their depth
 *    is derived from indentation (2 spaces / 1 tab per level).
 */

export interface MindMapNode {
    id: string;
    label: string;
    depth: number;
    parentId: string | null;
}

export interface FlowNode {
    id: string;
    position: { x: number; y: number };
    data: { label: string; depth: number };
    type?: string;
    sourcePosition?: string;
    targetPosition?: string;
}

export interface FlowEdge {
    id: string;
    source: string;
    target: string;
}

const BULLET_RE = /^(\s*)([-*+])\s+(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;

function cleanLabel(raw: string): string {
    return raw
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .trim();
}

/** Parse markdown into a flat list of nodes with resolved parent links. */
export function parseMindMapMarkdown(markdown: string): MindMapNode[] {
    const lines = (markdown || "").split(/\r?\n/);
    const nodes: MindMapNode[] = [];
    // Stack of ancestors currently open, ordered by increasing depth.
    const stack: MindMapNode[] = [];
    let headingDepth = 0;
    let counter = 0;

    const push = (label: string, depth: number) => {
        const clean = cleanLabel(label);
        if (!clean) return;
        while (stack.length && stack[stack.length - 1].depth >= depth) {
            stack.pop();
        }
        const parent = stack.length ? stack[stack.length - 1] : null;
        const node: MindMapNode = {
            id: `mm-${counter++}`,
            label: clean,
            depth,
            parentId: parent ? parent.id : null,
        };
        nodes.push(node);
        stack.push(node);
    };

    for (const line of lines) {
        if (!line.trim()) continue;

        const heading = HEADING_RE.exec(line);
        if (heading) {
            headingDepth = heading[1].length;
            push(heading[2], headingDepth);
            continue;
        }

        const bullet = BULLET_RE.exec(line);
        if (bullet) {
            const indent = bullet[1].replace(/\t/g, "  ").length;
            const depth = headingDepth + 1 + Math.floor(indent / 2);
            push(bullet[3], depth);
            continue;
        }

        // Plain paragraph line → attach under the current node one level deeper.
        const depth = (stack.length ? stack[stack.length - 1].depth : 0) + 1;
        push(line, depth);
    }

    return nodes;
}

const X_GAP = 240;
const Y_GAP = 64;

/** Convert parsed nodes into positioned React Flow nodes + edges (tidy tree layout). */
export function mindMapToFlow(nodes: MindMapNode[]): { nodes: FlowNode[]; edges: FlowEdge[] } {
    if (nodes.length === 0) return { nodes: [], edges: [] };

    const childrenOf = new Map<string | null, MindMapNode[]>();
    for (const n of nodes) {
        const list = childrenOf.get(n.parentId) ?? [];
        list.push(n);
        childrenOf.set(n.parentId, list);
    }

    const minDepth = Math.min(...nodes.map((n) => n.depth));
    const yById = new Map<string, number>();
    let leafCursor = 0;

    const assignY = (node: MindMapNode): number => {
        const kids = childrenOf.get(node.id) ?? [];
        if (kids.length === 0) {
            const y = leafCursor * Y_GAP;
            leafCursor += 1;
            yById.set(node.id, y);
            return y;
        }
        const childYs = kids.map(assignY);
        const y = (childYs[0] + childYs[childYs.length - 1]) / 2;
        yById.set(node.id, y);
        return y;
    };

    const roots = childrenOf.get(null) ?? [];
    for (const root of roots) assignY(root);

    const flowNodes: FlowNode[] = nodes.map((n) => ({
        id: n.id,
        position: { x: (n.depth - minDepth) * X_GAP, y: yById.get(n.id) ?? 0 },
        data: { label: n.label, depth: n.depth },
        type: "mindmap",
        sourcePosition: "right",
        targetPosition: "left",
    }));

    const flowEdges: FlowEdge[] = nodes
        .filter((n) => n.parentId)
        .map((n) => ({ id: `e-${n.parentId}-${n.id}`, source: n.parentId as string, target: n.id }));

    return { nodes: flowNodes, edges: flowEdges };
}
