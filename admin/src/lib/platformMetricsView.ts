export type PrometheusTargetSummary = {
    job: string;
    health: 'up' | 'down' | 'unknown';
    lastScrape?: string;
};

export type PlatformMetricsLiveSummary = {
    available: true;
    targetsUp: number;
    targetsDown: number;
    targets: PrometheusTargetSummary[];
    requestsPerMinute?: number;
    errorRatePercent?: number;
};

export type PlatformMetricsUnavailable = {
    available: false;
    reason: string;
};

export type PlatformMetricsState = PlatformMetricsLiveSummary | PlatformMetricsUnavailable;

export function isPlatformMetricsLive(state: PlatformMetricsState | null | undefined): state is PlatformMetricsLiveSummary {
    return !!state && state.available === true;
}
