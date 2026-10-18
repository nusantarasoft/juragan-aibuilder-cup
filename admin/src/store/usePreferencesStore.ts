import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BookmarkItem {
    path: string;
    name: string;
    icon?: string;
}

// ─── Theme Palette ─────────────────────────────────────────────────────
export interface ThemePalette {
    primary: string;     // Main brand: buttons, active states, links
    secondary: string;   // Complementary: badges, accents
    accent: string;      // Emphasis: CTAs, important highlights, gradients
    sidebarBg: string;   // Sidebar background
    headerBg: string;    // Card header tint
}

export const DEFAULT_PALETTE: ThemePalette = {
    primary: '#fb923c',
    secondary: '#38bdf8',
    accent: '#fb923c',
    sidebarBg: '#0b0e13',
    headerBg: '#080a0f',
};

// ─── Color utilities ────────────────────────────────────────────────────
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const match = (hex || '').match(/#?([0-9a-fA-F]{6})/);
    const h = match ? match[1] : 'fb923c';
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
    };
}

export function darkenHex(hex: string, amount: number): string {
    const { r, g, b } = hexToRgb(hex);
    const dr = Math.max(0, r - amount);
    const dg = Math.max(0, g - amount);
    const db = Math.max(0, b - amount);
    return `#${(dr << 16 | dg << 8 | db).toString(16).padStart(6, '0')}`;
}

export function lightenHex(hex: string, amount: number): string {
    const { r, g, b } = hexToRgb(hex);
    const lr = Math.min(255, r + amount);
    const lg = Math.min(255, g + amount);
    const lb = Math.min(255, b + amount);
    return `#${(lr << 16 | lg << 8 | lb).toString(16).padStart(6, '0')}`;
}

export function contrastText(hex: string): string {
    const { r, g, b } = hexToRgb(hex);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? '#000000' : '#ffffff';
}

// ─── Store ─────────────────────────────────────────────────────────────
interface PreferencesState {
    pinnedItems: BookmarkItem[];
    starredItems: BookmarkItem[];
    addPinned: (item: BookmarkItem) => void;
    removePinned: (path: string) => void;
    togglePinned: (item: BookmarkItem) => void;
    isPinned: (path: string) => boolean;

    setStarred: (items: BookmarkItem[]) => void;
    toggleStarred: (item: BookmarkItem) => void;
    isStarred: (path: string) => boolean;

    selectedSegment: string;
    setSelectedSegment: (segment: string) => void;

    // Theme palette (5 user-chosen colors)
    themePalette: ThemePalette;
    setThemePalette: (palette: ThemePalette) => void;

    // Backward compat — reads palette.primary
    themeColor: string;
    setThemeColor: (color: string) => void;
}

// Simple base64 obfuscation as requested ("encrypted" in local storage)
const encrypt = (str: string) => btoa(str);
const decrypt = (str: string) => atob(str);

const noopStorage = {
    getItem: (_name: string): string | null => null,
    setItem: (_name: string, _value: string): void => {},
    removeItem: (_name: string): void => {},
};

const browserStorage = {
    getItem: (name: string): string | null => {
        const value = localStorage.getItem(name);
        if (!value) return null;
        try {
            return decrypt(value);
        } catch (e) {
            return null;
        }
    },
    setItem: (name: string, value: string): void => {
        localStorage.setItem(name, encrypt(value));
    },
    removeItem: (name: string): void => {
        localStorage.removeItem(name);
    }
};

const encryptedStorage = typeof window !== 'undefined' ? browserStorage : noopStorage;

export const usePreferencesStore = create<PreferencesState>()(
    persist(
        (set, get) => ({
            pinnedItems: [],
            starredItems: [],

            addPinned: (item) => set((state) => ({
                pinnedItems: [...state.pinnedItems, item]
            })),

            removePinned: (path) => set((state) => ({
                pinnedItems: state.pinnedItems.filter(i => i.path !== path)
            })),

            togglePinned: (item) => {
                const { isPinned, addPinned, removePinned } = get();
                // Ensure name is a string (React Nodes/Elements can't be serialized/rendered as children)
                const safeName = typeof item.name === 'string' ? item.name : 'Untitled Page';
                const safeItem = { ...item, name: safeName };
                if (isPinned(item.path)) {
                    removePinned(item.path);
                } else {
                    addPinned(item.path === '/admin/dashboard' ? { ...safeItem, name: 'Dashboard' } : safeItem);
                }
            },

            isPinned: (path) => get().pinnedItems.some(i => i.path === path),

            setStarred: (items) => set({ starredItems: items }),

            toggleStarred: (item) => {
                const { isStarred } = get();
                set((state) => ({
                    starredItems: isStarred(item.path)
                        ? state.starredItems.filter(i => i.path !== item.path)
                        : [...state.starredItems, item]
                }));
            },

            isStarred: (path) => get().starredItems.some(i => i.path === path),

            selectedSegment: 'recent',
            setSelectedSegment: (segment) => set({ selectedSegment: segment }),

            // ── Theme palette ──
            themePalette: DEFAULT_PALETTE,
            setThemePalette: (palette) => set({ themePalette: palette, themeColor: palette.primary }),

            // Backward compat: themeColor = palette.primary
            themeColor: DEFAULT_PALETTE.primary,
            setThemeColor: (color) => {
                const current = get().themePalette;
                const updated = { ...current, primary: color };
                set({ themePalette: updated, themeColor: color });
            },
        }),
        {
            name: 'cms-preferences',
            skipHydration: true,
            storage: createJSONStorage(() => encryptedStorage),
            partialize: (state) => ({
                pinnedItems: state.pinnedItems,
                selectedSegment: state.selectedSegment,
                themePalette: state.themePalette,
            }),
            onRehydrateStorage: () => (state) => {
                // After hydration, sync themeColor from persisted palette
                if (state && state.themePalette) {
                    state.themeColor = state.themePalette.primary;
                }
            },
            // Migrate old single-color store or v1 palette to Agentic OS DEFAULT_PALETTE
            migrate: (persisted: any, version: number) => {
                if (persisted) {
                    if (version < 2) {
                        persisted.themePalette = { ...DEFAULT_PALETTE };
                        persisted.themeColor = DEFAULT_PALETTE.primary;
                    } else if (persisted.themeColor && !persisted.themePalette) {
                        persisted.themePalette = { ...DEFAULT_PALETTE, primary: persisted.themeColor };
                        delete persisted.themeColor;
                    }
                }
                return persisted;
            },
            version: 2,
        }
    )
);
