import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BookmarkItem {
    path: string;
    name: string;
    icon?: string;
}

interface PreferencesState {
    pinnedItems: BookmarkItem[];
    starredItems: BookmarkItem[];
    // Pinning uses encrypted localStorage
    addPinned: (item: BookmarkItem) => void;
    removePinned: (path: string) => void;
    togglePinned: (item: BookmarkItem) => void;
    isPinned: (path: string) => boolean;
    
    // Starring logic will be linked to backend later (for now UI state)
    setStarred: (items: BookmarkItem[]) => void;
    toggleStarred: (item: BookmarkItem) => void;
    isStarred: (path: string) => boolean;

    // Sidebar state persistence
    selectedSegment: string;
    setSelectedSegment: (segment: string) => void;
}

// Simple base64 obfuscation as requested ("encrypted" in local storage)
const encrypt = (str: string) => btoa(str);
const decrypt = (str: string) => atob(str);

const encryptedStorage = {
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
                // This will be superseded by GraphQL mutations in the component
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
        }),
        {
            name: 'cms-preferences',
            storage: createJSONStorage(() => encryptedStorage),
            partialize: (state) => ({ 
                pinnedItems: state.pinnedItems,
                selectedSegment: state.selectedSegment
            }), // Persist pinned and sidebar state
        }
    )
);
