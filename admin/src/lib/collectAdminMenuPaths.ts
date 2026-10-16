import menuConfig from '@/config/menuConfig';
import { MODULES } from '@/app/admin/virtual-office/lib/modules';

export type MenuTreeNode = {
    path?: string;
    routes?: MenuTreeNode[];
    children?: MenuTreeNode[];
};

/** Collect unique `/admin/*` paths from a ProLayout-style menu tree. */
export function collectMenuPaths(items: MenuTreeNode[] | undefined, out = new Set<string>()): string[] {
    if (!items?.length) return [...out].sort();
    for (const item of items) {
        if (item.path?.startsWith('/admin')) out.add(item.path);
        collectMenuPaths(item.routes, out);
        collectMenuPaths(item.children, out);
    }
    return [...out].sort();
}

/** Menu + Virtual Office module deep links for admin route QA crawls. */
export function allAdminCrawlPaths(): string[] {
    const paths = new Set(collectMenuPaths(menuConfig.route.routes as MenuTreeNode[]));
    paths.add('/admin/virtual-office');
    for (const mod of Object.values(MODULES)) {
        if (mod.route?.startsWith('/admin')) paths.add(mod.route);
    }
    return [...paths].sort();
}
