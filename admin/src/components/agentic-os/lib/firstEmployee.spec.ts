import { describe, expect, it } from "vitest";
import { rosterKindForAgent } from "./firstEmployee";

describe("rosterKindForAgent", () => {
    it("marks DB agents Live when ui demo mode is off", () => {
        expect(rosterKindForAgent("uuid-arjuna", "arjuna", { uiDemoMode: false })).toBe("live");
    });

    it("marks agents Demo only when ui demo mode is on", () => {
        expect(rosterKindForAgent("uuid-arjuna", "arjuna", { uiDemoMode: true })).toBe("demo");
    });
});
