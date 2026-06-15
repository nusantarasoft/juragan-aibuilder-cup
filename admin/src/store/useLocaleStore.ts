import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Locale = 'en' | 'id';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

// Minimal dictionaries for the CMS Layout
const dictionaries = {
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.facility': 'Facility Management',
    'nav.settings': 'Settings',
    'action.search': 'Search tasks, projects, tickets...',
    'action.notifications': 'Notifications',
    'action.profile': 'Profile',
    'theme.dark': 'Dark Mode',
    'theme.light': 'Light Mode',
    'ai.studio': 'AI Studio',
  },
  id: {
    'nav.dashboard': 'Dasbor',
    'nav.projects': 'Proyek',
    'nav.facility': 'Manajemen Fasilitas',
    'nav.settings': 'Pengaturan',
    'action.search': 'Cari tugas, proyek, tiket...',
    'action.notifications': 'Notifikasi',
    'action.profile': 'Profil',
    'theme.dark': 'Mode Gelap',
    'theme.light': 'Mode Terang',
    'ai.studio': 'Studio AI',
  }
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (locale) => set({ locale }),
      t: (key) => {
        const { locale } = get();
        // @ts-ignore
        return dictionaries[locale][key] || key;
      },
    }),
    {
      name: 'nusantarasoft-locale',
    }
  )
);
