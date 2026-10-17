import { describe, expect, it } from "vitest";
import { isKasirOfficeAgent, rosterKindForAgent } from "./firstEmployee";

describe("rosterKindForAgent", () => {
    it("marks DB agents Live when ui demo mode is off", () => {
        expect(rosterKindForAgent("uuid-arjuna", "arjuna", { uiDemoMode: false })).toBe("live");
    });

    it("marks agents Demo only when ui demo mode is on", () => {
        expect(rosterKindForAgent("uuid-arjuna", "arjuna", { uiDemoMode: true })).toBe("demo");
    });
});

describe("isKasirOfficeAgent", () => {
    it("detects Kasir roster ids", () => {
        expect(isKasirOfficeAgent("umkm-kasir")).toBe(true);
        expect(isKasirOfficeAgent("umkm-kasir-tenant-1")).toBe(true);
        expect(isKasirOfficeAgent("service-desk")).toBe(false);
    });
});
