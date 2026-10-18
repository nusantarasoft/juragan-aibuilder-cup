import { describe, expect, it } from "vitest";
import { filterMenuTreeForAppRole, TENANT_OWNER_MENU_PATHS } from "./tenantOwnerMenu";

describe("tenantOwnerMenu", () => {
    const sample = [
        { path: "/admin/recruit", name: "Recruit" },
        { path: "/admin/connect-wa", name: "WA" },
        { path: "/admin/ai-studio/partner", name: "Partner" },
        { path: "/admin/ai-studio/umkm", name: "UMKM" },
        { path: "/admin/dashboard", name: "Dashboard" },
    ];

    it("exposes wedge paths set", () => {
        expect(TENANT_OWNER_MENU_PATHS.has("/admin/connect-wa")).toBe(true);
    });

    it("hides wedge routes from platform admin", () => {
        const out = filterMenuTreeForAppRole(sample, "admin");
        expect(out.map((i) => i.path)).toEqual(["/admin/ai-studio/partner", "/admin/ai-studio/umkm", "/admin/dashboard"]);
    });

    it("shows wedge routes for tenant_owner but hides partner/umkm admin", () => {
        const out = filterMenuTreeForAppRole(sample, "tenant_owner");
        expect(out.map((i) => i.path)).toEqual(["/admin/recruit", "/admin/connect-wa", "/admin/dashboard"]);
    });
});
