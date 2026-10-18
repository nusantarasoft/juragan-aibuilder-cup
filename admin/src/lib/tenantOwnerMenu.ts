import type { AppRole } from "@/store/useAuthStore";

/** Sidebar entries visible only to pemilik toko (F2 wedge). */
export const TENANT_OWNER_MENU_PATHS = new Set([
    "/admin/recruit",
    "/admin/connect-wa",
    "/admin/my-agents",
    "/admin/usage",
]);

export type MenuTreeItem = {
    path?: string;
    children?: MenuTreeItem[];
    routes?: MenuTreeItem[];
    [key: string]: unknown;
};

/** Hide platform-only UMKM admin for tenants; show wedge routes only for tenant_owner. */
export function filterMenuTreeForAppRole(items: MenuTreeItem[], appRole: AppRole | null | undefined): MenuTreeItem[] {
    return items
        .filter((item) => {
            const path = item.path;
            if (appRole === "tenant_owner") {
                if (path === "/admin/ai-studio/partner" || path === "/admin/ai-studio/umkm") return false;
                if (path === "/admin/ai-studio/percakapan-wa") return false;
                return true;
            }
            if (path && TENANT_OWNER_MENU_PATHS.has(path)) return false;
            return true;
        })
        .map((item) => {
            const next = { ...item };
            if (next.children) next.children = filterMenuTreeForAppRole(next.children, appRole);
            if (next.routes) next.routes = filterMenuTreeForAppRole(next.routes, appRole);
            return next;
        });
}
