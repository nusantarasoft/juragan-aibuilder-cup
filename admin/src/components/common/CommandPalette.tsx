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
    { name: 'Studio', path: '/admin/ai-studio', icon: '🤖', group: 'AI Studio', keywords: 'ai studio notebook home overview' },
    { name: 'Partner', path: '/admin/ai-studio/partner', icon: '🏪', group: 'AI Studio', keywords: 'partner umkm store' },
    { name: 'Knowledge Research', path: '/admin/ai-studio/knowledge-research', icon: '🔬', group: 'AI Studio', keywords: 'knowledge research riset' },
    { name: 'Showcase', path: '/admin/ai-studio/showcase', icon: '🎨', group: 'AI Studio', keywords: 'showcase generate material marketing content brochure' },
    { name: 'Messages', path: '/admin/ai-studio/messages', icon: '💭', group: 'AI Studio', keywords: 'messages percakapan wa whatsapp chat conversations' },
    { name: 'Settings', path: '/admin/ai-studio/settings', icon: '⚙️', group: 'AI Studio', keywords: 'settings models llm whatsapp gateway hermes' },
    { name: 'Virtual Office', path: '/admin/virtual-office', icon: '🏢', group: 'Surfaces', keywords: 'virtual office 3d hq' },
    { name: 'Agentic OS', path: '/admin/agentic-os', icon: '🖥️', group: 'Surfaces', keywords: 'agentic os command deck' },
];

const ACTIONS: ActionItem[] = [
    { name: 'Open AI Studio', action: '/admin/ai-studio', icon: '🤖', group: 'Quick Actions', keywords: 'ai studio notebook' },
    { name: 'Open Virtual Office', action: '/admin/virtual-office', icon: '🏢', group: 'Quick Actions', keywords: 'virtual office 3d' },
    { name: 'Open Agentic OS', action: '/admin/agentic-os', icon: '🖥️', group: 'Quick Actions', keywords: 'agentic os deck' },
    { name: 'Toggle Dark Mode', action: 'toggle-theme', icon: '🌙', group: 'Quick Actions', keywords: 'dark light theme' },
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
    const [liveLoading] = useState(false);

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

    // Reset search on open
    useEffect(() => {
        if (open) {
            setSearch("");
            setLiveResults([]);
        }
    }, [open]);

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
