/**
 * Export helpers for Studio outputs: copy to clipboard, download as Markdown,
 * and print-to-PDF via the browser. Pure string helpers are separated from the
 * DOM/browser calls so they can be unit-tested.
 */

/** Turn an output title into a safe, lowercase filename stem (no extension). */
export function slugifyFilename(title: string, fallback = "studio-output"): string {
    const slug = (title || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "") // strip diacritics
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
    return slug || fallback;
}

/** Escape a string for safe insertion into HTML text nodes. */
export function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Build a printable standalone HTML document for an output (content is markdown/plain). */
export function buildPrintHtml(title: string, content: string): string {
    return [
        "<!doctype html>",
        '<html><head><meta charset="utf-8" />',
        `<title>${escapeHtml(title)}</title>`,
        "<style>",
        "body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}",
        "h1{font-size:22px;margin:0 0 16px;border-bottom:1px solid #eee;padding-bottom:8px}",
        "pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:14px;margin:0}",
        "@media print{body{margin:0}}",
        "</style></head><body>",
        `<h1>${escapeHtml(title)}</h1>`,
        `<pre>${escapeHtml(content)}</pre>`,
        "</body></html>",
    ].join("");
}

export async function copyText(text: string): Promise<void> {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    throw new Error("Clipboard tidak tersedia");
}

export function downloadMarkdown(title: string, content: string): void {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugifyFilename(title)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function printAsPdf(title: string, content: string): void {
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!win) throw new Error("Popup diblokir — izinkan popup untuk cetak/PDF");
    win.document.write(buildPrintHtml(title, content));
    win.document.close();
    win.focus();
    // Give the new window a tick to render before invoking print.
    setTimeout(() => win.print(), 300);
}
