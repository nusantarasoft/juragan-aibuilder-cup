import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
dayjs.extend(quarterOfYear);

export type DateRangePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'custom';

interface DateRangeState {
    /** Active preset name */
    preset: DateRangePreset;
    /** Start date ISO string */
    startDate: string;
    /** End date ISO string */
    endDate: string;
    /** Set from a preset */
    setPreset: (preset: DateRangePreset) => void;
    /** Set custom range */
    setCustomRange: (start: string, end: string) => void;
}

function presetToDates(preset: DateRangePreset): { start: string; end: string } {
    const today = dayjs();
    switch (preset) {
        case 'today':       return { start: today.format('YYYY-MM-DD'), end: today.format('YYYY-MM-DD') };
        case 'yesterday':   return { start: today.subtract(1, 'day').format('YYYY-MM-DD'), end: today.subtract(1, 'day').format('YYYY-MM-DD') };
        case 'last7':       return { start: today.subtract(6, 'day').format('YYYY-MM-DD'), end: today.format('YYYY-MM-DD') };
        case 'last30':      return { start: today.subtract(29, 'day').format('YYYY-MM-DD'), end: today.format('YYYY-MM-DD') };
        case 'thisMonth':   return { start: today.startOf('month').format('YYYY-MM-DD'), end: today.endOf('month').format('YYYY-MM-DD') };
        case 'lastMonth':   return { start: today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD'), end: today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD') };
        case 'thisQuarter': return { start: today.startOf('quarter').format('YYYY-MM-DD'), end: today.endOf('quarter').format('YYYY-MM-DD') };
        case 'thisYear':    return { start: today.startOf('year').format('YYYY-MM-DD'), end: today.endOf('year').format('YYYY-MM-DD') };
        default:            return { start: today.subtract(29, 'day').format('YYYY-MM-DD'), end: today.format('YYYY-MM-DD') };
    }
}

// Simple localStorage wrapper (same pattern as preferences store)
const noopStorage = {
    getItem: (_name: string): string | null => null,
    setItem: (_name: string, _value: string): void => {},
    removeItem: (_name: string): void => {},
};

const storage = typeof window !== 'undefined' ? localStorage : noopStorage;

const defaultDates = presetToDates('last30');

export const useDateRangeStore = create<DateRangeState>()(
    persist(
        (set) => ({
            preset: 'last30',
            startDate: defaultDates.start,
            endDate: defaultDates.end,

            setPreset: (preset: DateRangePreset) => {
                const { start, end } = presetToDates(preset);
                set({ preset, startDate: start, endDate: end });
            },

            setCustomRange: (start: string, end: string) => {
                set({ preset: 'custom', startDate: start, endDate: end });
            },
        }),
        {
            name: 'cms-date-range',
            storage: createJSONStorage(() => storage),
            partialize: (state) => ({
                preset: state.preset,
                startDate: state.startDate,
                endDate: state.endDate,
            }),
        }
    )
);

export { presetToDates };
