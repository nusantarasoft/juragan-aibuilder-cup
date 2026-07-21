import { describe, expect, it } from "vitest";
import { parseQuiz } from "./quiz";

describe("parseQuiz — JSON", () => {
    it("parses structured JSON questions", () => {
        const content = JSON.stringify({
            questions: [
                { question: "Ibu kota Indonesia?", options: ["Bandung", "Jakarta", "Medan", "Surabaya"], answerIndex: 1, explanation: "Jakarta." },
            ],
        });
        const q = parseQuiz(content)!;
        expect(q).toHaveLength(1);
        expect(q[0].answerIndex).toBe(1);
        expect(q[0].explanation).toBe("Jakarta.");
    });

    it("handles code fences and letter answers", () => {
        const content = "```json\n" + JSON.stringify({
            questions: [{ question: "2+2?", options: ["3", "4", "5"], answer: "B" }],
        }) + "\n```";
        const q = parseQuiz(content)!;
        expect(q[0].answerIndex).toBe(1);
    });

    it("clamps out-of-range answerIndex to 0 and drops invalid rows", () => {
        const content = JSON.stringify({
            questions: [
                { question: "A?", options: ["x", "y"], answerIndex: 9 },
                { question: "", options: ["x", "y"], answerIndex: 0 },
                { question: "B?", options: ["only-one"], answerIndex: 0 },
            ],
        });
        const q = parseQuiz(content)!;
        expect(q).toHaveLength(1);
        expect(q[0].answerIndex).toBe(0);
    });
});

describe("parseQuiz — legacy markdown", () => {
    it("parses numbered questions with A-D options and Jawaban", () => {
        const md = [
            "1. Apa warna langit?",
            "A. Merah",
            "B. Biru",
            "C. Hijau",
            "D. Kuning",
            "**Jawaban:** B",
            "",
            "2. 1+1 = ?",
            "A. 1",
            "B. 2",
            "**Jawaban:** B",
        ].join("\n");
        const q = parseQuiz(md)!;
        expect(q).toHaveLength(2);
        expect(q[0].question).toBe("Apa warna langit?");
        expect(q[0].options).toHaveLength(4);
        expect(q[0].answerIndex).toBe(1);
        expect(q[1].answerIndex).toBe(1);
    });

    it("returns null for unparseable content", () => {
        expect(parseQuiz("just some prose without questions")).toBeNull();
    });

    it("returns null for empty content", () => {
        expect(parseQuiz("")).toBeNull();
    });
});
