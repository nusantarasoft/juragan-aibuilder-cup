/**
 * Pure helpers for server-side text-to-speech of Audio Overview scripts.
 * Network/IO (the actual synthesis call) lives in the service; these helpers
 * shape the text and are unit-tested.
 */

/**
 * Remove leading speaker labels like "Host A:", "Pembawa 1:", "**Andi:**" so the
 * narration reads naturally. Keeps the spoken content, drops the attribution.
 */
export function stripSpeakerLabels(text: string): string {
    return text
        .split(/\r?\n/)
        .map((line) => {
            const m = /^\s*(?:\*\*|__)?\s*[A-Za-z][\w .'-]{0,30}?\s*(?:\*\*|__)?\s*[:：]\s*(.*)$/.exec(line);
            // Only strip when the label is short (a name/role), not a full sentence.
            if (m && line.slice(0, line.indexOf(':')).trim().split(/\s+/).length <= 3) {
                return m[1].replace(/^[*_\s]+/, '');
            }
            return line;
        })
        .join('\n');
}

/** Collapse markdown emphasis and excess whitespace into clean prose for TTS. */
export function cleanForTts(text: string): string {
    return text
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/[*_#`>]+/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
}

/**
 * Split text into chunks no larger than `maxChars`, preferring sentence
 * boundaries (falling back to hard slicing for very long sentences). Returns an
 * empty array for empty input.
 */
export function chunkForTts(text: string, maxChars = 4500): string[] {
    const clean = text.trim();
    if (!clean) return [];
    if (clean.length <= maxChars) return [clean];

    const sentences = clean.match(/[^.!?\n]+[.!?]*\s*|\n+/g) ?? [clean];
    const chunks: string[] = [];
    let current = '';

    const pushHard = (s: string) => {
        for (let i = 0; i < s.length; i += maxChars) {
            chunks.push(s.slice(i, i + maxChars).trim());
        }
    };

    for (const sentence of sentences) {
        if (sentence.length > maxChars) {
            if (current.trim()) {
                chunks.push(current.trim());
                current = '';
            }
            pushHard(sentence);
            continue;
        }
        if ((current + sentence).length > maxChars) {
            if (current.trim()) chunks.push(current.trim());
            current = sentence;
        } else {
            current += sentence;
        }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.filter(Boolean);
}

/** Map a UI language code to a Google TTS BCP-47 language code. */
export function ttsLanguageCode(language?: string): string {
    switch ((language || '').toLowerCase()) {
        case 'en':
            return 'en-US';
        case 'jv':
            return 'jv-ID';
        case 'ms':
            return 'ms-MY';
        case 'ar':
            return 'ar-XA';
        case 'zh':
            return 'cmn-CN';
        case 'id':
        default:
            return 'id-ID';
    }
}
