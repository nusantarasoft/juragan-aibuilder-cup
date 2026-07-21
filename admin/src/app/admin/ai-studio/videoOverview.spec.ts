import { describe, expect, it } from "vitest";
import { parseVideoOverview } from "./videoOverview";

describe("parseVideoOverview", () => {
    it("returns null for empty content", () => {
        expect(parseVideoOverview("")).toBeNull();
        expect(parseVideoOverview("   ")).toBeNull();
    });

    it("parses JSON with title and slides", () => {
        const json = JSON.stringify({
            title: "Ikhtisar",
            slides: [
                { heading: "Intro", bullets: ["a", "b"], narration: "Selamat datang." },
                { heading: "Detail", bullets: ["c"], narration: "Rincian." },
            ],
        });
        const res = parseVideoOverview(json);
        expect(res).not.toBeNull();
        expect(res!.title).toBe("Ikhtisar");
        expect(res!.slides).toHaveLength(2);
        expect(res!.slides[0]).toEqual({ heading: "Intro", bullets: ["a", "b"], narration: "Selamat datang." });
    });

    it("strips code fences and derives narration from bullets when missing", () => {
        const json = "```json\n" + JSON.stringify({ slides: [{ heading: "H", bullets: ["x", "y"] }] }) + "\n```";
        const res = parseVideoOverview(json);
        expect(res!.title).toBe("Video Overview");
        expect(res!.slides[0].narration).toBe("x. y");
    });

    it("accepts alternate keys (points/script/title)", () => {
        const json = JSON.stringify({ slides: [{ title: "T", points: ["p1"], script: "narasi" }] });
        const res = parseVideoOverview(json);
        expect(res!.slides[0]).toEqual({ heading: "T", bullets: ["p1"], narration: "narasi" });
    });

    it("accepts a bare JSON array of slides", () => {
        const json = JSON.stringify([{ heading: "Only", narration: "n" }]);
        const res = parseVideoOverview(json);
        expect(res!.slides).toHaveLength(1);
        expect(res!.slides[0].heading).toBe("Only");
    });

    it("falls back to markdown parsing", () => {
        const md = [
            "# My Title",
            "## Slide One",
            "- point a",
            "- point b",
            "Extra narration here.",
            "## Slide Two",
            "- solo",
        ].join("\n");
        const res = parseVideoOverview(md);
        expect(res!.title).toBe("My Title");
        expect(res!.slides).toHaveLength(2);
        expect(res!.slides[0].heading).toBe("Slide One");
        expect(res!.slides[0].bullets).toEqual(["point a", "point b"]);
        expect(res!.slides[0].narration).toBe("Extra narration here.");
        expect(res!.slides[1].narration).toBe("solo");
    });

    it("returns null when markdown has no headings or bullets", () => {
        expect(parseVideoOverview("just some text with no structure")).toBeNull();
    });

    it("treats a lone bullet list (no heading) as one slide", () => {
        const res = parseVideoOverview("- alpha\n- beta");
        expect(res!.slides).toHaveLength(1);
        expect(res!.slides[0].heading).toBe("Slide");
        expect(res!.slides[0].bullets).toEqual(["alpha", "beta"]);
    });
});
