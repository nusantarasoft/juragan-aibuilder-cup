import { describe, expect, it } from "vitest";
import {
    DEFAULT_NOTEBOOK_ICON,
    isValidNotebookIcon,
    normalizeNotebookIcon,
} from "./notebookIcon";

describe("normalizeNotebookIcon", () => {
    it("keeps a real emoji", () => {
        expect(normalizeNotebookIcon("🚀")).toBe("🚀");
        expect(normalizeNotebookIcon(" 📕 ")).toBe("📕");
    });

    it("falls back for empty / nullish", () => {
        expect(normalizeNotebookIcon(null)).toBe(DEFAULT_NOTEBOOK_ICON);
        expect(normalizeNotebookIcon(undefined)).toBe(DEFAULT_NOTEBOOK_ICON);
        expect(normalizeNotebookIcon("")).toBe(DEFAULT_NOTEBOOK_ICON);
        expect(normalizeNotebookIcon("   ")).toBe(DEFAULT_NOTEBOOK_ICON);
    });

    it("falls back for corrupted encoding markers", () => {
        expect(normalizeNotebookIcon("????")).toBe(DEFAULT_NOTEBOOK_ICON);
        expect(normalizeNotebookIcon("?")).toBe(DEFAULT_NOTEBOOK_ICON);
        expect(normalizeNotebookIcon("\uFFFD\uFFFD")).toBe(DEFAULT_NOTEBOOK_ICON);
    });

    it("isValidNotebookIcon rejects garbage", () => {
        expect(isValidNotebookIcon("????")).toBe(false);
        expect(isValidNotebookIcon("📓")).toBe(true);
    });
});
