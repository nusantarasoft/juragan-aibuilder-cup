const DEFAULT_ADMIN_PATH = "/admin/ai-studio";
const MAX_LEN = 512;

/**
 * Allow only same-origin relative /admin paths for post-login redirects.
 */
export function safeAdminPath(raw: string | null | undefined): string {
    if (raw == null || String(raw).trim() === "") return DEFAULT_ADMIN_PATH;

    let path: string;
    try {
        path = decodeURIComponent(String(raw).trim());
    } catch {
        return DEFAULT_ADMIN_PATH;
    }

    if (path.length > MAX_LEN) return DEFAULT_ADMIN_PATH;
    if (
        path.includes("://") ||
        path.startsWith("//") ||
        path.includes("\\") ||
        path.startsWith("\\")
    ) {
        return DEFAULT_ADMIN_PATH;
    }

    if (path !== "/admin" && !path.startsWith("/admin/")) {
        return DEFAULT_ADMIN_PATH;
    }

    const parts = path.split("/").filter((p) => p.length > 0);
    const stack: string[] = [];
    for (const part of parts) {
        if (part === ".") continue;
        if (part === "..") {
            if (stack.length === 0) return DEFAULT_ADMIN_PATH;
            stack.pop();
            continue;
        }
        stack.push(part);
    }

    if (stack[0] !== "admin") return DEFAULT_ADMIN_PATH;
    return `/${stack.join("/")}`;
}

export { DEFAULT_ADMIN_PATH };
