import { describe, expect, it } from "vitest";
import { parseAudioScript, speakerOrder } from "./audioScript";

describe("parseAudioScript", () => {
    it("parses speaker-prefixed dialogue lines", () => {
        const md = [
            "# Podcast",
            "**Andi:** Halo semuanya!",
            "Budi: Senang bisa di sini.",
            "---",
            "Andi: Hari ini kita bahas laporan.",
        ].join("\n");
        const segs = parseAudioScript(md);
        expect(segs).toHaveLength(3);
        expect(segs[0]).toEqual({ speaker: "Andi", text: "Halo semuanya!" });
        expect(segs[1].speaker).toBe("Budi");
        expect(segs[2].speaker).toBe("Andi");
    });

    it("keeps narration without a speaker and strips stage directions", () => {
        const segs = parseAudioScript("(intro musik)\nSelamat datang di acara ini.");
        expect(segs).toHaveLength(1);
        expect(segs[0].speaker).toBeNull();
        expect(segs[0].text).toBe("Selamat datang di acara ini.");
    });

    it("ignores headings and separators", () => {
        const segs = parseAudioScript("## Bagian 1\n===\nHalo.");
        expect(segs).toHaveLength(1);
        expect(segs[0].text).toBe("Halo.");
    });

    it("returns empty for empty input", () => {
        expect(parseAudioScript("")).toEqual([]);
    });
});

describe("speakerOrder", () => {
    it("lists distinct speakers in first-appearance order", () => {
        const segs = parseAudioScript("Andi: satu\nBudi: dua\nAndi: tiga");
        expect(speakerOrder(segs)).toEqual(["Andi", "Budi"]);
    });

    it("ignores narration-only scripts", () => {
        const segs = parseAudioScript("hanya narasi tanpa nama");
        expect(speakerOrder(segs)).toEqual([]);
    });
});
