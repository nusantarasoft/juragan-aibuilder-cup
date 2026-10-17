import type { ScadaTagValuePoint } from '@/lib/scadaService';

export type TrendChartRow = {
    time: string;
    [seriesKey: string]: string | number;
};

/** Merge historian points into Recharts rows keyed by tag id. */
export function buildTrendChartRows(points: ScadaTagValuePoint[]): TrendChartRow[] {
    const byTime = new Map<string, TrendChartRow>();
    for (const p of points) {
        const label = new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const row = byTime.get(label) ?? { time: label };
        row[p.tagId] = p.valueNumeric ?? 0;
        byTime.set(label, row);
    }
    return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export function scadaTrendsUsingLiveHistory(pointCount: number): boolean {
    return pointCount > 0;
}
