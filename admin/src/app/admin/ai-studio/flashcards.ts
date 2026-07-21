/**
 * Parse a Studio `flashcards` output into front/back card pairs.
 *
 * Supported shapes:
 *  1. JSON (preferred): `{ "cards": [ { "front": "...", "back": "..." } ] }` (also accepts `term`/`definition`).
 *  2. Legacy markdown lines: `Front :: Back`, `**Term:** Definition`, or `Q: ... / A: ...` pairs.
 * Returns `null` when nothing parseable is found.
 */

export interface Flashcard {
    front: string;
    back: string;
}

function stripFences(s: string): string {
    return s.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function fromJson(content: string): Flashcard[] | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(stripFences(content));
    } catch {
        return null;
    }
    const raw = Array.isArray(parsed) ? parsed : (parsed as { cards?: unknown[] })?.cards;
    if (!Array.isArray(raw)) return null;

    const cards: Flashcard[] = [];
    for (const item of raw) {
        const c = item as Record<string, unknown>;
        const front = String(c.front ?? c.term ?? c.question ?? "").trim();
        const back = String(c.back ?? c.definition ?? c.answer ?? "").trim();
        if (front && back) cards.push({ front, back });
    }
    return cards.length ? cards : null;
}

function fromMarkdown(content: string): Flashcard[] | null {
    const lines = content.split(/\r?\n/);
    const cards: Flashcard[] = [];
    let pendingFront: string | null = null;

    const clean = (s: string) => s.replace(/\*\*/g, "").replace(/^[-*]\s+/, "").trim();

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;

        // Inline "front :: back" or "front | back".
        const inline = /^(.+?)\s*(?:::|\|)\s*(.+)$/.exec(line);
        if (inline) {
            const front = clean(inline[1]);
            const back = clean(inline[2]);
            if (front && back) cards.push({ front, back });
            continue;
        }

        // Q:/A: (or Front:/Back:) pairs across lines.
        const qMatch = /^(?:\*\*)?\s*(?:Q|Front|Depan|Istilah)\s*[:：]\s*(.+)$/i.exec(line);
        const aMatch = /^(?:\*\*)?\s*(?:A|Back|Belakang|Definisi|Jawaban)\s*[:：]\s*(.+)$/i.exec(line);
        if (qMatch) {
            pendingFront = clean(qMatch[1]);
            continue;
        }
        if (aMatch && pendingFront) {
            cards.push({ front: pendingFront, back: clean(aMatch[1]) });
            pendingFront = null;
            continue;
        }
    }
    return cards.length ? cards : null;
}

export function parseFlashcards(content: string): Flashcard[] | null {
    if (!content?.trim()) return null;
    return fromJson(content) ?? fromMarkdown(content);
}
