/**
 * Parse a Studio `video_overview` output into narrated slides.
 *
 * Preferred shape is JSON:
 *   { "title": "...", "slides": [ { "heading": "...", "bullets": ["..."], "narration": "..." } ] }
 * A lightweight markdown fallback maps `## heading` + bullet lines into slides,
 * using the joined bullets as narration when none is supplied.
 * Returns `null` when nothing parseable is found.
 */

export interface VideoSlide {
    heading: string;
    bullets: string[];
    narration: string;
}

export interface VideoOverview {
    title: string;
    slides: VideoSlide[];
}

function stripFences(s: string): string {
    return s.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => String(v ?? "").trim()).filter(Boolean);
}

function fromJson(content: string): VideoOverview | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(stripFences(content));
    } catch {
        return null;
    }
    const obj = parsed as { title?: unknown; slides?: unknown };
    const rawSlides = Array.isArray(parsed) ? parsed : obj?.slides;
    if (!Array.isArray(rawSlides)) return null;

    const slides: VideoSlide[] = [];
    for (const item of rawSlides) {
        const s = item as Record<string, unknown>;
        const heading = String(s.heading ?? s.title ?? "").trim();
        const bullets = toStringArray(s.bullets ?? s.points);
        const narration = String(s.narration ?? s.script ?? "").trim() || bullets.join(". ");
        if (heading || bullets.length || narration) {
            slides.push({ heading: heading || "Slide", bullets, narration });
        }
    }
    if (!slides.length) return null;
    return { title: String(obj?.title ?? "Video Overview").trim() || "Video Overview", slides };
}

function fromMarkdown(content: string): VideoOverview | null {
    const lines = content.split(/\r?\n/);
    const slides: VideoSlide[] = [];
    let current: VideoSlide | null = null;
    let title = "Video Overview";

    const push = () => {
        if (current && (current.heading || current.bullets.length)) {
            if (!current.narration) current.narration = current.bullets.join(". ");
            slides.push(current);
        }
    };

    for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        const h1 = /^#\s+(.+)$/.exec(line);
        const h2 = /^#{2,3}\s+(.+)$/.exec(line);
        const bullet = /^[-*]\s+(.+)$/.exec(line);
        if (h1 && slides.length === 0 && !current) {
            title = h1[1].trim();
            continue;
        }
        if (h2 || (h1 && current)) {
            push();
            current = { heading: (h2 ?? h1)![1].trim(), bullets: [], narration: "" };
            continue;
        }
        if (bullet) {
            if (!current) current = { heading: "Slide", bullets: [], narration: "" };
            current.bullets.push(bullet[1].replace(/\*\*/g, "").trim());
            continue;
        }
        // Plain paragraph → treat as narration for the current slide.
        if (current) {
            current.narration = current.narration ? `${current.narration} ${line}` : line;
        }
    }
    push();
    return slides.length ? { title, slides } : null;
}

export function parseVideoOverview(content: string): VideoOverview | null {
    if (!content?.trim()) return null;
    return fromJson(content) ?? fromMarkdown(content);
}
