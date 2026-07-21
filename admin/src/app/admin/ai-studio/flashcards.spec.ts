import { describe, expect, it } from "vitest";
import { parseFlashcards } from "./flashcards";

describe("parseFlashcards — JSON", () => {
    it("parses cards array", () => {
        const content = JSON.stringify({
            cards: [
                { front: "HTTP", back: "HyperText Transfer Protocol" },
                { term: "CPU", definition: "Central Processing Unit" },
            ],
        });
        const c = parseFlashcards(content)!;
        expect(c).toHaveLength(2);
        expect(c[0]).toEqual({ front: "HTTP", back: "HyperText Transfer Protocol" });
        expect(c[1].front).toBe("CPU");
    });

    it("handles fences and top-level array, drops incomplete", () => {
        const content = "```json\n" + JSON.stringify([
            { front: "A", back: "B" },
            { front: "onlyfront" },
        ]) + "\n```";
        const c = parseFlashcards(content)!;
        expect(c).toHaveLength(1);
    });
});

describe("parseFlashcards — legacy markdown", () => {
    it("parses inline :: and | separators", () => {
        const c = parseFlashcards("Fotosintesis :: Proses tumbuhan membuat makanan\nMitokondria | Pembangkit energi sel")!;
        expect(c).toHaveLength(2);
        expect(c[0].front).toBe("Fotosintesis");
        expect(c[1].back).toBe("Pembangkit energi sel");
    });

    it("parses Q:/A: pairs across lines", () => {
        const md = ["Q: Apa itu RAM?", "A: Memori sementara komputer", "Front: ROM", "Back: Memori permanen"].join("\n");
        const c = parseFlashcards(md)!;
        expect(c).toHaveLength(2);
        expect(c[0]).toEqual({ front: "Apa itu RAM?", back: "Memori sementara komputer" });
        expect(c[1]).toEqual({ front: "ROM", back: "Memori permanen" });
    });

    it("returns null for unparseable / empty", () => {
        expect(parseFlashcards("prosa biasa tanpa pola")).toBeNull();
        expect(parseFlashcards("")).toBeNull();
    });
});
