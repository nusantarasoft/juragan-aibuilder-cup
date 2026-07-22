import { describe, expect, it } from "vitest";
import {
    citationIndexFromHref,
    dropTrailingAssistants,
    findLastUserContent,
    rewriteInlineCitations,
} from "./chatActions";

describe("rewriteInlineCitations", () => {
    const refs = [
        { content: "a", docName: "a.pdf", score: 0.9 },
        { content: "b", docName: "b.pdf", score: 0.8 },
    ];

    it("returns content unchanged when no references", () => {
        expect(rewriteInlineCitations("lihat [1]", null)).toBe("lihat [1]");
        expect(rewriteInlineCitations("lihat [1]", [])).toBe("lihat [1]");
    });

    it("rewrites in-range [n] to markdown cite links", () => {
        expect(rewriteInlineCitations("Fakta [1] dan [2].", refs)).toBe(
            "Fakta [1](#studio-cite-1) dan [2](#studio-cite-2).",
        );
    });

    it("leaves out-of-range markers alone", () => {
        expect(rewriteInlineCitations("lihat [3] dan [99]", refs)).toBe("lihat [3] dan [99]");
    });
});

describe("citationIndexFromHref", () => {
    it("parses cite anchors to 0-based indices", () => {
        expect(citationIndexFromHref("#studio-cite-1")).toBe(0);
        expect(citationIndexFromHref("#studio-cite-2")).toBe(1);
    });

    it("returns null for non-cite hrefs", () => {
        expect(citationIndexFromHref("https://x")).toBeNull();
        expect(citationIndexFromHref("#other")).toBeNull();
        expect(citationIndexFromHref(null)).toBeNull();
    });
});

describe("findLastUserContent / dropTrailingAssistants", () => {
    it("finds the last user message", () => {
        const history = [
            { role: "user", content: "pertama" },
            { role: "assistant", content: "jawab" },
            { role: "user", content: "kedua" },
            { role: "assistant", content: "jawab 2" },
        ];
        expect(findLastUserContent(history)).toBe("kedua");
    });

    it("returns null when no user message", () => {
        expect(findLastUserContent([{ role: "assistant", content: "x" }])).toBeNull();
        expect(findLastUserContent([])).toBeNull();
    });

    it("drops trailing assistant bubbles", () => {
        const history = [
            { role: "user", content: "q" },
            { role: "assistant", content: "a1" },
            { role: "assistant", content: "a2" },
        ];
        expect(dropTrailingAssistants(history)).toEqual([{ role: "user", content: "q" }]);
    });
});
