import { describe, expect, it } from "vitest";
import { DEFAULT_ADMIN_PATH, safeAdminPath } from "./safeAdminPath";

describe("safeAdminPath", () => {
    it("defaults empty / nullish", () => {
        expect(safeAdminPath(null)).toBe(DEFAULT_ADMIN_PATH);
        expect(safeAdminPath(undefined)).toBe(DEFAULT_ADMIN_PATH);
        expect(safeAdminPath("")).toBe(DEFAULT_ADMIN_PATH);
        expect(safeAdminPath("   ")).toBe(DEFAULT_ADMIN_PATH);
    });

    it("allows deep admin paths", () => {
        expect(safeAdminPath("/admin/ai-studio/umkm")).toBe("/admin/ai-studio/umkm");
        expect(safeAdminPath("/admin")).toBe("/admin");
        expect(safeAdminPath("/admin/dashboard")).toBe("/admin/dashboard");
    });

    it("rejects open-redirect class payloads", () => {
        expect(safeAdminPath("//evil.com")).toBe(DEFAULT_ADMIN_PATH);
        expect(safeAdminPath("https://evil.com")).toBe(DEFAULT_ADMIN_PATH);
        expect(safeAdminPath("/\\evil")).toBe(DEFAULT_ADMIN_PATH);
        expect(safeAdminPath("/%2f%2fevil.com")).toBe(DEFAULT_ADMIN_PATH);
        expect(safeAdminPath("/admin/../login")).toBe(DEFAULT_ADMIN_PATH);
        expect(safeAdminPath("/adminish")).toBe(DEFAULT_ADMIN_PATH);
        expect(safeAdminPath("/login")).toBe(DEFAULT_ADMIN_PATH);
    });

    it("rejects overlong input", () => {
        expect(safeAdminPath(`/admin/${"a".repeat(600)}`)).toBe(DEFAULT_ADMIN_PATH);
    });
});
