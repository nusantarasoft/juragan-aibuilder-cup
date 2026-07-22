import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
    buildPrintHtml,
    copyText,
    downloadMarkdown,
    escapeHtml,
    printAsPdf,
    slugifyFilename,
} from "./outputExport";

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

describe("copyText", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("writes via navigator.clipboard", async () => {
        const writeText = vi.fn(async () => undefined);
        vi.stubGlobal("navigator", { clipboard: { writeText } });
        await copyText("halo");
        expect(writeText).toHaveBeenCalledWith("halo");
    });

    it("throws when clipboard unavailable", async () => {
        vi.stubGlobal("navigator", {});
        await expect(copyText("x")).rejects.toThrow(/Clipboard/);
    });
});

describe("downloadMarkdown", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("creates a blob download link", () => {
        const click = vi.fn();
        const remove = vi.fn();
        const a = { href: "", download: "", click, remove };
        const doc = {
            createElement: vi.fn(() => a),
            body: { appendChild: vi.fn((n: unknown) => n) },
        };
        vi.stubGlobal("document", doc);
        vi.stubGlobal("Blob", class {
            constructor(public parts: unknown[], public opts?: unknown) {}
        });
        vi.stubGlobal("URL", {
            createObjectURL: vi.fn(() => "blob:mock"),
            revokeObjectURL: vi.fn(),
        });

        downloadMarkdown("My Report", "# Hello");

        expect(doc.createElement).toHaveBeenCalledWith("a");
        expect(a.download).toBe("my-report.md");
        expect(click).toHaveBeenCalled();
        expect(remove).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    });
});

describe("printAsPdf", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("opens a print window with HTML content", () => {
        const print = vi.fn();
        const focus = vi.fn();
        const write = vi.fn();
        const close = vi.fn();
        const open = vi.fn(() => ({
            document: { write, close },
            focus,
            print,
        }));
        vi.stubGlobal("window", { open });

        printAsPdf("Title", "Body");
        expect(open).toHaveBeenCalled();
        expect(write).toHaveBeenCalled();
        expect(close).toHaveBeenCalled();
        expect(focus).toHaveBeenCalled();
        vi.advanceTimersByTime(300);
        expect(print).toHaveBeenCalled();
    });

    it("throws when popup is blocked", () => {
        vi.stubGlobal("window", { open: vi.fn(() => null) });
        expect(() => printAsPdf("T", "B")).toThrow(/Popup/);
    });
});
