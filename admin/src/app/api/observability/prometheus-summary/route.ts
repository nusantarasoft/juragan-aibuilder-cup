import { NextResponse } from 'next/server';
import type { PlatformMetricsLiveSummary, PlatformMetricsUnavailable } from '@/lib/platformMetricsView';

const PROMETHEUS_URL = (process.env.PROMETHEUS_URL || process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://127.0.0.1:9091').replace(/\/$/, '');
const FETCH_MS = 4_000;

type PromTargetsPayload = {
    status?: string;
    data?: {
        activeTargets?: Array<{
            labels?: { job?: string };
            health?: string;
            lastScrape?: string;
        }>;
    };
};

type PromQueryPayload = {
    status?: string;
    data?: {
        result?: Array<{ value?: [number, string] }>;
    };
};

async function promGet<T>(path: string): Promise<T | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_MS);
    try {
        const res = await fetch(`${PROMETHEUS_URL}${path}`, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export async function GET() {
    const targetsJson = await promGet<PromTargetsPayload>('/api/v1/targets');
    if (!targetsJson?.data?.activeTargets?.length) {
        const unavailable: PlatformMetricsUnavailable = {
            available: false,
            reason: `Prometheus not reachable at ${PROMETHEUS_URL} (QA stack runs without Prometheus by default).`,
        };
        return NextResponse.json(unavailable);
    }

    const targets = targetsJson.data.activeTargets.map((t) => ({
        job: t.labels?.job ?? 'unknown',
        health: (t.health === 'up' ? 'up' : t.health === 'down' ? 'down' : 'unknown') as 'up' | 'down' | 'unknown',
        lastScrape: t.lastScrape,
    }));

    let requestsPerMinute: number | undefined;
    let errorRatePercent: number | undefined;

    const upQuery = await promGet<PromQueryPayload>('/api/v1/query?query=sum(rate(http_requests_total%5B1m%5D))');
    const upVal = upQuery?.data?.result?.[0]?.value?.[1];
    if (upVal != null && !Number.isNaN(Number(upVal))) {
        requestsPerMinute = Math.round(Number(upVal) * 60);
    }

    const errQuery = await promGet<PromQueryPayload>(
        '/api/v1/query?query=100%20*%20sum(rate(http_requests_total%7Bstatus%3D~%225..%22%7D%5B5m%5D))%20%2F%20clamp_min(sum(rate(http_requests_total%5B5m%5D))%2C%201)',
    );
    const errVal = errQuery?.data?.result?.[0]?.value?.[1];
    if (errVal != null && !Number.isNaN(Number(errVal))) {
        errorRatePercent = Math.round(Number(errVal) * 100) / 100;
    }

    const live: PlatformMetricsLiveSummary = {
        available: true,
        targetsUp: targets.filter((t) => t.health === 'up').length,
        targetsDown: targets.filter((t) => t.health === 'down').length,
        targets,
        requestsPerMinute,
        errorRatePercent,
    };
    return NextResponse.json(live);
}
