"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Command } from "cmdk";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { gql, DEFAULT_TENANT_ID } from "@/lib/graphql";

interface CommandPaletteProps {
    isDark: boolean;
    themeColor: string;
}

interface PageItem {
    name: string;
    path: string;
    icon: string;
    group: string;
    keywords: string;
}

interface ActionItem {
    name: string;
    action: string;
    icon: string;
    group: string;
    keywords: string;
}

const PAGES: PageItem[] = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: '📊', group: 'Business', keywords: 'home overview' },
    { name: 'My Work', path: '/admin/pm/my-work', icon: '📋', group: 'Project Management', keywords: 'tasks personal' },
    { name: 'Projects', path: '/admin/pm/projects', icon: '📁', group: 'Project Management', keywords: 'project list' },
    { name: 'Backlog', path: '/admin/pm/backlog', icon: '📝', group: 'Project Management', keywords: 'tasks all' },
    { name: 'Roadmap', path: '/admin/pm/roadmap', icon: '🗺️', group: 'Project Management', keywords: 'gantt plan' },
    { name: 'Workload', path: '/admin/pm/workload', icon: '👥', group: 'Project Management', keywords: 'team capacity' },
    { name: 'Reports', path: '/admin/pm/reports', icon: '📈', group: 'Project Management', keywords: 'analytics ai' },
    { name: 'Templates', path: '/admin/pm/templates', icon: '📐', group: 'Project Management', keywords: 'template preset' },
    { name: 'Knowledge Base', path: '/admin/pm/knowledge-base', icon: '📚', group: 'Project Management', keywords: 'lessons learned' },
    { name: 'Tickets', path: '/admin/itsm/tickets', icon: '🎫', group: 'ITSM', keywords: 'ticket incident' },
    { name: 'CMDB', path: '/admin/itsm/cmdb', icon: '🗄️', group: 'ITSM', keywords: 'configuration database assets' },
    { name: 'SLA Monitor', path: '/admin/itsm/sla-monitor', icon: '⏱️', group: 'ITSM', keywords: 'service level' },
    { name: 'Changes', path: '/admin/itsm/changes', icon: '🔄', group: 'ITSM', keywords: 'change management' },
    { name: 'Knowledge', path: '/admin/itsm/knowledge', icon: '📖', group: 'ITSM', keywords: 'knowledge base articles' },
    { name: 'CRM Pipeline', path: '/admin/crm/pipeline', icon: '💰', group: 'CRM', keywords: 'sales deals' },
    { name: 'CRM Accounts', path: '/admin/crm/accounts', icon: '🏢', group: 'CRM', keywords: 'companies clients' },
    { name: 'Sales Analytics', path: '/admin/crm/analytics', icon: '📊', group: 'CRM', keywords: 'revenue forecast' },
    { name: 'Employees', path: '/admin/hr/employees', icon: '👤', group: 'HR', keywords: 'people staff' },
    { name: 'Org Chart', path: '/admin/hr/org-chart', icon: '🏛️', group: 'HR', keywords: 'organization hierarchy' },
    { name: 'Team Calendar', path: '/admin/hr/team-calendar', icon: '📅', group: 'HR', keywords: 'leave pto' },
    { name: 'Products', path: '/admin/ecommerce/products', icon: '🛍️', group: 'E-Commerce', keywords: 'product catalog' },
    { name: 'Orders', path: '/admin/ecommerce/orders', icon: '📦', group: 'E-Commerce', keywords: 'order purchase' },
    { name: 'Inventory Items', path: '/admin/inventory/items', icon: '📦', group: 'Inventory', keywords: 'stock items' },
    { name: 'Warehouses', path: '/admin/inventory/warehouses', icon: '🏭', group: 'Inventory', keywords: 'warehouse location' },
    { name: 'Supply Chain', path: '/admin/inventory/supply-chain', icon: '🔗', group: 'Inventory', keywords: 'procurement logistics' },
    { name: 'Docker', path: '/admin/infrastructure/docker', icon: '🐳', group: 'Infrastructure', keywords: 'containers' },
    { name: 'Infra Monitoring', path: '/admin/infrastructure/monitoring', icon: '📡', group: 'Infrastructure', keywords: 'topology health' },
    { name: 'CI/CD Pipeline', path: '/admin/devops/pipelines', icon: '🚀', group: 'DevOps', keywords: 'build deploy' },
    { name: 'Command Center', path: '/admin/analytics/command-center', icon: '🎯', group: 'Analytics', keywords: 'real-time traffic' },
    { name: 'Executive Dashboard', path: '/admin/reports/executive', icon: '👔', group: 'Reports', keywords: 'c-suite kpi' },
    { name: 'Flow Designer', path: '/admin/notifications/flow-designer', icon: '🔔', group: 'Notifications', keywords: 'workflow automation' },
    { name: 'Audit Trail', path: '/admin/security/audit-trail', icon: '🔒', group: 'Security', keywords: 'compliance soc2' },
    { name: 'Settings', path: '/admin/settings/general', icon: '⚙️', group: 'System', keywords: 'configuration preferences' },
    { name: 'Users', path: '/admin/users/list', icon: '👥', group: 'System', keywords: 'user management' },
    { name: 'Permissions', path: '/admin/permissions/roles', icon: '🔐', group: 'System', keywords: 'roles access control' },
];

const ACTIONS: ActionItem[] = [
    { name: 'Create New Project', action: '/admin/pm/projects', icon: '➕', group: 'Quick Actions', keywords: 'new project create' },
    { name: 'Create Ticket', action: '/admin/itsm/tickets', icon: '🎫', group: 'Quick Actions', keywords: 'new ticket incident' },
    { name: 'View My Tasks', action: '/admin/pm/my-work', icon: '✅', group: 'Quick Actions', keywords: 'my work tasks' },
    { name: 'Toggle Dark Mode', action: 'toggle-theme', icon: '🌙', group: 'Quick Actions', keywords: 'dark light theme' },
    { name: 'Open AI Studio', action: 'open-ai', icon: '🤖', group: 'Quick Actions', keywords: 'ai assistant' },
];

const STORAGE_KEY = 'nusantarasoft-recent-pages';

function getRecentPages(): PageItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function addRecentPage(page: PageItem) {
    const recent = getRecentPages().filter(p => p.path !== page.path);
    recent.unshift(page);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 5)));
}

/** Group pages by their group field, preserving insertion order */
function groupPages(pages: PageItem[]): Record<string, PageItem[]> {
    const groups: Record<string, PageItem[]> = {};
    for (const page of pages) {
        if (!groups[page.group]) groups[page.group] = [];
        groups[page.group].push(page);
    }
    return groups;
}

// ─── Live Search Queries ─────────────────────────────────────
const SEARCH_TASKS = `
  query SearchTasks($tenantId: String!) {
    pmTasks(tenantId: $tenantId) {
      id title status priority type
      assignee { firstName lastName }
    }
  }
`;

const SEARCH_PROJECTS = `
  query SearchProjects($tenantId: String!) {
    pmProjects(tenantId: $tenantId) { id name projectNumber status }
  }
`;

const SEARCH_TICKETS = `
  query SearchTickets($tenantId: String!) {
    itsmTickets(tenantId: $tenantId) {
      id title status priority ticketNumber
    }
  }
`;

interface LiveResult {
    id: string;
    title: string;
    subtitle: string;
    path: string;
    icon: string;
    group: string;
}

export default function CommandPalette({ isDark, themeColor }: CommandPaletteProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
    const liveDataCacheRef = useRef<{ tasks: any[]; projects: any[]; tickets: any[] } | null>(null);

    // Keyboard shortcut to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                e.stopPropagation();
                setOpen(prev => !prev);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Reset search on open; prefetch live data
    useEffect(() => {
        if (open) {
            setSearch("");
            setLiveResults([]);
            // Prefetch data on first open
            if (!liveDataCacheRef.current) {
                Promise.all([
                    gql(SEARCH_TASKS, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({ pmTasks: [] })),
                    gql(SEARCH_PROJECTS, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({ pmProjects: [] })),
                    gql(SEARCH_TICKETS, { tenantId: DEFAULT_TENANT_ID }).catch(() => ({ itsmTickets: [] })),
                ]).then(([taskData, projData, ticketData]) => {
                    liveDataCacheRef.current = {
                        tasks: taskData.pmTasks || [],
                        projects: projData.pmProjects || [],
                        tickets: ticketData.itsmTickets || [],
                    };
                });
            }
        }
    }, [open]);

    // Debounced live search against cached data
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

        if (search.length < 2) {
            setLiveResults([]);
            setLiveLoading(false);
            return;
        }

        setLiveLoading(true);
        searchTimerRef.current = setTimeout(() => {
            const cache = liveDataCacheRef.current;
            if (!cache) {
                setLiveLoading(false);
                return;
            }

            const q = search.toLowerCase();
            const results: LiveResult[] = [];

            // Search tasks
            cache.tasks
                .filter((t: any) => t.title?.toLowerCase().includes(q) || t.id?.toLowerCase().includes(q))
                .slice(0, 5)
                .forEach((t: any) => {
                    const assigneeName = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned';
                    results.push({
                        id: `task-${t.id}`,
                        title: t.title,
                        subtitle: `${t.status?.replace('_', ' ')} · ${t.priority} · ${assigneeName}`,
                        path: `/admin/pm/tasks/${t.id}`,
                        icon: t.type === 'bug' ? '🐛' : t.type === 'story' ? '📖' : t.type === 'epic' ? '🏔️' : '✅',
                        group: 'Tasks',
                    });
                });

            // Search projects
            cache.projects
                .filter((p: any) => p.name?.toLowerCase().includes(q) || p.projectNumber?.toLowerCase().includes(q))
                .slice(0, 3)
                .forEach((p: any) => {
                    results.push({
                        id: `proj-${p.id}`,
                        title: p.name,
                        subtitle: `${p.projectNumber || ''} · ${p.status}`,
                        path: `/admin/pm/dashboard?projectId=${p.id}`,
                        icon: '📁',
                        group: 'Projects',
                    });
                });

            // Search tickets
            cache.tickets
                .filter((t: any) => t.title?.toLowerCase().includes(q) || t.ticketNumber?.toLowerCase().includes(q))
                .slice(0, 5)
                .forEach((t: any) => {
                    results.push({
                        id: `ticket-${t.id}`,
                        title: t.title,
                        subtitle: `${t.ticketNumber || ''} · ${t.status} · ${t.priority}`,
                        path: `/admin/itsm/tickets/${t.id}`,
                        icon: '🎫',
                        group: 'Tickets',
                    });
                });

            setLiveResults(results);
            setLiveLoading(false);
        }, 150);

        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, [search]);

    const handleSelect = useCallback((path: string) => {
        const page = PAGES.find(p => p.path === path);
        if (page) addRecentPage(page);
        router.push(path);
        setOpen(false);
    }, [router]);

    const handleAction = useCallback((action: string) => {
        if (action === 'toggle-theme') {
            // Dispatch custom event for theme toggle
            window.dispatchEvent(new CustomEvent('toggle-dark-mode'));
            setOpen(false);
            return;
        }
        if (action === 'open-ai') {
            window.dispatchEvent(new CustomEvent('open-ai-studio'));
            setOpen(false);
            return;
        }
        // Navigation actions
        const page = PAGES.find(p => p.path === action);
        if (page) addRecentPage(page);
        router.push(action);
        setOpen(false);
    }, [router]);

    const recentPages = getRecentPages();
    const grouped = groupPages(PAGES);
    const showRecent = !search && recentPages.length > 0;

    if (!open) return null;

    // Style tokens
    const overlayBg = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.35)';
    const modalBg = isDark
        ? 'rgba(30, 30, 40, 0.92)'
        : 'rgba(255, 255, 255, 0.92)';
    const modalBorder = isDark
        ? '1px solid rgba(255, 255, 255, 0.1)'
        : '1px solid rgba(0, 0, 0, 0.08)';
    const inputColor = isDark ? '#f0f0f0' : '#1a1a1a';
    const placeholderColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
    const groupColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
    const itemColor = isDark ? '#e0e0e0' : '#1a1a1a';
    const separatorBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const footerColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
    const kbdBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const kbdBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';

    const palette = (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: '15vh',
                background: overlayBg,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                animation: 'cmdkOverlayIn 0.15s ease-out',
            }}
            onClick={() => setOpen(false)}
        >
            <div
                ref={containerRef}
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 640,
                    margin: '0 16px',
                    background: modalBg,
                    border: modalBorder,
                    borderRadius: 16,
                    boxShadow: isDark
                        ? '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
                        : '0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.03)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    overflow: 'hidden',
                    animation: 'cmdkModalIn 0.15s ease-out',
                }}
            >
                <Command
                    label="Global Command Palette"
                    loop
                    style={{ width: '100%' }}
                >
                    {/* Search input */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '14px 16px',
                        borderBottom: `1px solid ${separatorBg}`,
                        gap: 10,
                    }}>
                        <svg
                            width="18" height="18" viewBox="0 0 24 24" fill="none"
                            stroke={placeholderColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <Command.Input
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Search tasks, projects, tickets, pages..."
                            autoFocus
                            style={{
                                flex: 1,
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                fontSize: 15,
                                color: inputColor,
                                caretColor: themeColor,
                            }}
                        />
                        <kbd style={{
                            fontSize: 11,
                            padding: '2px 6px',
                            borderRadius: 5,
                            background: kbdBg,
                            border: `1px solid ${kbdBorder}`,
                            color: footerColor,
                            fontFamily: 'inherit',
                            flexShrink: 0,
                        }}>
                            ⌘K
                        </kbd>
                    </div>

                    {/* Results list */}
                    <Command.List style={{
                        maxHeight: 360,
                        overflowY: 'auto',
                        padding: '8px',
                    }}>
                        <Command.Empty style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px 16px',
                            color: placeholderColor,
                            fontSize: 14,
                        }}>
                            {liveLoading ? 'Searching...' : 'No matching results'}
                        </Command.Empty>

                        {/* Live Search Results */}
                        {liveResults.length > 0 && (() => {
                            const liveGroups: Record<string, LiveResult[]> = {};
                            liveResults.forEach(r => {
                                if (!liveGroups[r.group]) liveGroups[r.group] = [];
                                liveGroups[r.group].push(r);
                            });
                            return Object.entries(liveGroups).map(([group, results]) => (
                                <Command.Group key={`live-${group}`} heading={group} style={{ marginBottom: 4 }}>
                                    {results.map(result => (
                                        <Command.Item
                                            key={result.id}
                                            value={`${result.title} ${result.subtitle} ${result.group}`}
                                            onSelect={() => { router.push(result.path); setOpen(false); }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                fontSize: 14,
                                                color: itemColor,
                                                transition: 'background 0.12s',
                                            }}
                                            data-theme-color={themeColor}
                                        >
                                            <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{result.icon}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title}</div>
                                                <div style={{ fontSize: 11, color: groupColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.subtitle}</div>
                                            </div>
                                            <span style={{ fontSize: 11, color: groupColor, flexShrink: 0 }}>{result.group}</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            ));
                        })()}

                        {/* Recent */}
                        {showRecent && (
                            <Command.Group
                                heading="Recent"
                                style={{ marginBottom: 4 }}
                            >
                                {recentPages.map(page => (
                                    <Command.Item
                                        key={`recent-${page.path}`}
                                        value={`${page.name} ${page.keywords} recent`}
                                        onSelect={() => handleSelect(page.path)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            fontSize: 14,
                                            color: itemColor,
                                            transition: 'background 0.12s',
                                        }}
                                        data-theme-color={themeColor}
                                    >
                                        <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{page.icon}</span>
                                        <span style={{ flex: 1 }}>{page.name}</span>
                                        <span style={{ fontSize: 11, color: groupColor }}>{page.group}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}

                        {/* Quick Actions */}
                        <Command.Group
                            heading="Quick Actions"
                            style={{ marginBottom: 4 }}
                        >
                            {ACTIONS.map(action => (
                                <Command.Item
                                    key={action.action}
                                    value={`${action.name} ${action.keywords}`}
                                    onSelect={() => handleAction(action.action)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        color: itemColor,
                                        transition: 'background 0.12s',
                                    }}
                                    data-theme-color={themeColor}
                                >
                                    <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{action.icon}</span>
                                    <span style={{ flex: 1 }}>{action.name}</span>
                                </Command.Item>
                            ))}
                        </Command.Group>

                        {/* Navigation pages grouped by module */}
                        {Object.entries(grouped).map(([group, pages]) => (
                            <Command.Group
                                key={group}
                                heading={group}
                                style={{ marginBottom: 4 }}
                            >
                                {pages.map(page => (
                                    <Command.Item
                                        key={page.path}
                                        value={`${page.name} ${page.keywords} ${page.group}`}
                                        onSelect={() => handleSelect(page.path)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            fontSize: 14,
                                            color: itemColor,
                                            transition: 'background 0.12s',
                                        }}
                                        data-theme-color={themeColor}
                                    >
                                        <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{page.icon}</span>
                                        <span style={{ flex: 1 }}>{page.name}</span>
                                        <span style={{ fontSize: 11, color: groupColor }}>{page.group}</span>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        ))}
                    </Command.List>

                    {/* Footer */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 16,
                        padding: '10px 16px',
                        borderTop: `1px solid ${separatorBg}`,
                        fontSize: 11,
                        color: footerColor,
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <kbd style={{ padding: '1px 5px', borderRadius: 4, background: kbdBg, border: `1px solid ${kbdBorder}`, fontFamily: 'inherit', fontSize: 10 }}>↑</kbd>
                            <kbd style={{ padding: '1px 5px', borderRadius: 4, background: kbdBg, border: `1px solid ${kbdBorder}`, fontFamily: 'inherit', fontSize: 10 }}>↓</kbd>
                            Navigate
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <kbd style={{ padding: '1px 5px', borderRadius: 4, background: kbdBg, border: `1px solid ${kbdBorder}`, fontFamily: 'inherit', fontSize: 10 }}>↵</kbd>
                            Open
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <kbd style={{ padding: '1px 5px', borderRadius: 4, background: kbdBg, border: `1px solid ${kbdBorder}`, fontFamily: 'inherit', fontSize: 10 }}>Esc</kbd>
                            Close
                        </span>
                    </div>
                </Command>
            </div>

            {/* Dynamic styles for cmdk + animations */}
            <style>{`
                @keyframes cmdkOverlayIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes cmdkModalIn {
                    from { opacity: 0; transform: scale(0.96) translateY(-8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                [cmdk-group-heading] {
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 8px 10px 4px;
                    color: ${groupColor};
                    user-select: none;
                }
                [cmdk-item] {
                    content-visibility: auto;
                }
                [cmdk-item][data-selected="true"] {
                    background: ${isDark
                        ? `rgba(${hexToRgbStr(themeColor)}, 0.18)`
                        : `rgba(${hexToRgbStr(themeColor)}, 0.1)`} !important;
                }
                [cmdk-item]:hover {
                    background: ${isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.04)'};
                }
                [cmdk-input]::placeholder {
                    color: ${placeholderColor};
                }
                [cmdk-list]::-webkit-scrollbar {
                    width: 6px;
                }
                [cmdk-list]::-webkit-scrollbar-track {
                    background: transparent;
                }
                [cmdk-list]::-webkit-scrollbar-thumb {
                    background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
                    border-radius: 3px;
                }
            `}</style>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(palette, document.body);
}

/** Convert hex color to "r, g, b" string for rgba() usage */
function hexToRgbStr(hex: string): string {
    const sanitized = hex.replace('#', '');
    const bigint = parseInt(sanitized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}
