/**
 * Parse a Studio `quiz` output into structured, interactive questions.
 *
 * Two content shapes are supported:
 *  1. JSON (preferred, new generator): `{ "questions": [ { question, options, answerIndex, explanation } ] }`.
 *  2. Legacy markdown: numbered questions with `A.`–`D.` options and `**Jawaban:** B`.
 * Returns `null` when nothing parseable is found (caller falls back to raw markdown).
 */

export interface QuizQuestion {
    question: string;
    options: string[];
    answerIndex: number;
    explanation?: string;
}

function stripFences(s: string): string {
    return s.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function fromJson(content: string): QuizQuestion[] | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(stripFences(content));
    } catch {
        return null;
    }
    const raw = Array.isArray(parsed)
        ? parsed
        : (parsed as { questions?: unknown[] })?.questions;
    if (!Array.isArray(raw)) return null;

    const questions: QuizQuestion[] = [];
    for (const item of raw) {
        const q = item as Record<string, unknown>;
        const question = typeof q.question === "string" ? q.question.trim() : "";
        const options = Array.isArray(q.options)
            ? q.options.map((o) => String(o).trim()).filter(Boolean)
            : [];
        let answerIndex =
            typeof q.answerIndex === "number"
                ? q.answerIndex
                : typeof q.answer === "number"
                  ? q.answer
                  : -1;
        // Accept letter answers ("B") too.
        if (answerIndex < 0 && typeof q.answer === "string" && /^[A-Za-z]$/.test(q.answer.trim())) {
            answerIndex = q.answer.trim().toUpperCase().charCodeAt(0) - 65;
        }
        if (!question || options.length < 2) continue;
        if (answerIndex < 0 || answerIndex >= options.length) answerIndex = 0;
        questions.push({
            question,
            options,
            answerIndex,
            explanation: typeof q.explanation === "string" ? q.explanation.trim() : undefined,
        });
    }
    return questions.length ? questions : null;
}

function fromMarkdown(content: string): QuizQuestion[] | null {
    const lines = content.split(/\r?\n/);
    const questions: QuizQuestion[] = [];
    let current: { question: string; options: string[]; answerIndex: number; explanation?: string } | null = null;

    const commit = () => {
        if (current && current.question && current.options.length >= 2) {
            if (current.answerIndex < 0 || current.answerIndex >= current.options.length) {
                current.answerIndex = 0;
            }
            questions.push(current as QuizQuestion);
        }
        current = null;
    };

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        const qMatch = /^(\d+)[.)]\s*(.+)$/.exec(line);
        const optMatch = /^([A-Da-d])[.)]\s*(.+)$/.exec(line);
        const ansMatch = /jawaban\s*[:：]?\s*\**\s*([A-Da-d])/i.exec(line);

        // A question header only if it is NOT an option line (A.–D.).
        if (qMatch && !optMatch) {
            commit();
            current = { question: qMatch[2].replace(/\*\*/g, "").trim(), options: [], answerIndex: -1 };
            continue;
        }
        if (optMatch && current) {
            current.options.push(optMatch[2].replace(/\*\*/g, "").trim());
            continue;
        }
        if (ansMatch && current) {
            current.answerIndex = ansMatch[1].toUpperCase().charCodeAt(0) - 65;
            const exp = /penjelasan\s*[:：]\s*(.+)$/i.exec(line);
            if (exp) current.explanation = exp[1].trim();
            continue;
        }
    }
    commit();
    return questions.length ? questions : null;
}

export function parseQuiz(content: string): QuizQuestion[] | null {
    if (!content?.trim()) return null;
    return fromJson(content) ?? fromMarkdown(content);
}
