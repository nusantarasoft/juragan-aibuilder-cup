/**
 * Parse a Studio `audio_script` markdown document into ordered dialogue segments.
 * The generator produces a two-host podcast script; lines are typically shaped
 * like `**Host A:** ...`, `Andi: ...`, or plain narration. Headings, separators
 * and stage directions are ignored so the result is speakable text only.
 */

export interface DialogueSegment {
    speaker: string | null;
    text: string;
}

const SPEAKER_RE = /^\s*(?:[-*]\s*)?(?:\*\*|__)?\s*([A-Za-z][\w .'-]{0,40}?)\s*(?:\*\*|__)?\s*[:：]\s*(.+)$/;

function stripInline(s: string): string {
    return s
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/\[(.*?)\]\(.*?\)/g, "$1")
        .replace(/[\(\[]\s*(?:jeda|pause|musik|music|sfx|intro|outro)[^)\]]*[\)\]]/gi, "")
        .trim();
}

export function parseAudioScript(markdown: string): DialogueSegment[] {
    const lines = (markdown || "").split(/\r?\n/);
    const segments: DialogueSegment[] = [];

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (/^#{1,6}\s/.test(line)) continue; // heading
        if (/^[-=_*]{3,}$/.test(line)) continue; // horizontal rule / separator

        const m = SPEAKER_RE.exec(line);
        if (m) {
            const speaker = m[1].trim();
            const text = stripInline(m[2]);
            if (text) segments.push({ speaker, text });
            continue;
        }

        const text = stripInline(line.replace(/^[-*]\s+/, ""));
        if (text) segments.push({ speaker: null, text });
    }

    return segments;
}

/** Distinct speaker names in first-appearance order (for voice assignment). */
export function speakerOrder(segments: DialogueSegment[]): string[] {
    const seen: string[] = [];
    for (const s of segments) {
        if (s.speaker && !seen.includes(s.speaker)) seen.push(s.speaker);
    }
    return seen;
}
