import { describe, expect, it } from "vitest";
import { RECRUIT_POST_SUCCESS_LINKS } from "./recruitPostSuccessLinks";

describe("recruit post-success deep links", () => {
    it("points each live SKU at an /admin route", () => {
        for (const entry of Object.values(RECRUIT_POST_SUCCESS_LINKS)) {
            expect(entry.href.startsWith("/admin/")).toBe(true);
            expect(entry.label.length).toBeGreaterThan(3);
            expect(entry.templateId.length).toBeGreaterThan(0);
        }
    });

    it("matches wedge modules from F3 recruit queue", () => {
        const ids = Object.values(RECRUIT_POST_SUCCESS_LINKS).map((e) => e.templateId);
        expect(ids).toEqual([
            "umkm-kasir",
            "service-desk",
            "finance",
            "sales",
            "devops",
            "security",
            "facilities",
        ]);
    });
});
