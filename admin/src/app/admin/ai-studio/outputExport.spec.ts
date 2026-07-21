import { describe, expect, it } from "vitest";
import { buildPrintHtml, escapeHtml, slugifyFilename } from "./outputExport";

describe("slugifyFilename", () => {
    it("lowercases and hyphenates", () => {
        expect(slugifyFilename("Study Guide — Toko Budi")).toBe("study-guide-toko-budi");
    });

    it("strips diacritics and symbols", () => {
        expect(slugifyFilename("Ringkasan #1: Café & Co.")).toBe("ringkasan-1-cafe-co");
    });

    it("falls back when empty", () => {
        expect(slugifyFilename("")).toBe("studio-output");
        expect(slugifyFilename("!!!", "x")).toBe("x");
    });

    it("caps length at 80 chars", () => {
        expect(slugifyFilename("a".repeat(200)).length).toBe(80);
    });
});

describe("escapeHtml", () => {
    it("escapes html-sensitive chars", () => {
        expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe("&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;");
    });
});

describe("buildPrintHtml", () => {
    it("embeds escaped title and content", () => {
        const html = buildPrintHtml("A <title>", "line1\n<script>");
        expect(html).toContain("<title>A &lt;title&gt;</title>");
        expect(html).toContain("&lt;script&gt;");
        expect(html.startsWith("<!doctype html>")).toBe(true);
    });
});
