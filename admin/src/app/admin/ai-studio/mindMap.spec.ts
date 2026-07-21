import { describe, expect, it } from "vitest";
import { mindMapToFlow, parseMindMapMarkdown } from "./mindMap";

describe("parseMindMapMarkdown", () => {
    it("builds a hierarchy from headings and bullets", () => {
        const md = [
            "# Root",
            "## Topik A",
            "- Poin 1",
            "- Poin 2",
            "  - Sub 2a",
            "## Topik B",
        ].join("\n");
        const nodes = parseMindMapMarkdown(md);
        const root = nodes.find((n) => n.label === "Root");
        const a = nodes.find((n) => n.label === "Topik A");
        const p1 = nodes.find((n) => n.label === "Poin 1");
        const sub = nodes.find((n) => n.label === "Sub 2a");
        const p2 = nodes.find((n) => n.label === "Poin 2");
        const b = nodes.find((n) => n.label === "Topik B");

        expect(root?.parentId).toBeNull();
        expect(a?.parentId).toBe(root?.id);
        expect(p1?.parentId).toBe(a?.id);
        expect(sub?.parentId).toBe(p2?.id);
        expect(b?.parentId).toBe(root?.id);
    });

    it("strips markdown emphasis and skips blank lines", () => {
        const nodes = parseMindMapMarkdown("# **Bold** Title\n\n- `code` item\n");
        expect(nodes[0].label).toBe("Bold Title");
        expect(nodes[1].label).toBe("code item");
    });

    it("returns empty for empty input", () => {
        expect(parseMindMapMarkdown("")).toEqual([]);
    });

    it("treats plain paragraphs as deeper children", () => {
        const nodes = parseMindMapMarkdown("# Root\nsome narration line");
        expect(nodes).toHaveLength(2);
        expect(nodes[1].parentId).toBe(nodes[0].id);
    });
});

describe("mindMapToFlow", () => {
    it("produces positioned nodes and parent-child edges", () => {
        const nodes = parseMindMapMarkdown("# Root\n## A\n## B");
        const { nodes: flowNodes, edges } = mindMapToFlow(nodes);
        expect(flowNodes).toHaveLength(3);
        expect(edges).toHaveLength(2);
        // Root at depth 0 → x=0; children deeper → x>0
        const root = flowNodes.find((n) => n.data.label === "Root")!;
        const child = flowNodes.find((n) => n.data.label === "A")!;
        expect(root.position.x).toBe(0);
        expect(child.position.x).toBeGreaterThan(root.position.x);
    });

    it("returns empty flow for no nodes", () => {
        expect(mindMapToFlow([])).toEqual({ nodes: [], edges: [] });
    });
});
