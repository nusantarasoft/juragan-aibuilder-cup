import { describe, expect, it } from 'vitest';
import { KASIR_EMPLOYEE_SLUG } from '@/components/agentic-os/lib/firstEmployee';
import type { OsKasirLiveSnapshot } from '@/components/agentic-os/lib/types';
import { buildKasirAgent, mergeKasirIntoRoster } from './kasirLive';
import type { Agent } from './types';

const unavailableSnap: OsKasirLiveSnapshot = {
    available: false,
    tenantId: 'default',
    slug: KASIR_EMPLOYEE_SLUG,
    name: 'Kasir UMKM',
    role: 'UMKM WhatsApp Kasir',
    source: 'ai_studio',
    unavailableReason: 'data tidak tersedia',
    waChatsToday: null,
    transactionsToday: null,
    lastActivityAt: null,
    waOnline: null,
};

const liveSnap: OsKasirLiveSnapshot = {
    available: true,
    tenantId: 'default',
    slug: KASIR_EMPLOYEE_SLUG,
    name: 'Warung Bu Ani',
    role: 'UMKM WhatsApp Kasir',
    source: 'ai_studio',
    unavailableReason: null,
    waChatsToday: 3,
    transactionsToday: 5,
    lastActivityAt: '2026-10-13T08:00:00.000Z',
    waOnline: true,
};

describe('buildKasirAgent', () => {
    it('surfaces data tidak tersedia without inventing live metrics', () => {
        const a = buildKasirAgent(unavailableSnap);
        expect(a.rosterKind).toBe('live');
        expect(a.liveUnavailable).toBe('data tidak tersedia');
        expect(a.liveMetrics).toBeUndefined();
        expect(a.task).toBeUndefined();
    });

    it('shows live metrics when snapshot is available', () => {
        const a = buildKasirAgent(liveSnap);
        expect(a.liveMetrics?.waChatsToday).toBe(3);
        expect(a.liveMetrics?.transactionsToday).toBe(5);
        expect(a.name).toBe('Warung Bu Ani');
    });
});

describe('mergeKasirIntoRoster', () => {
    it('tags demo agents and prepends live Kasir', () => {
        const demo: Agent[] = [
            {
                id: 'arjuna',
                name: 'Arjuna',
                role: 'DevOps',
                model: 'Large',
                color: '#38bdf8',
                zone: 'engineering',
                deskId: 'eng-1-a',
                status: 'working',
                location: 'desk',
                modules: ['whatsapp-gateway'],
                skills: [],
                stats: { tasksCompleted: 1, successRate: 1, avgLatencyMs: 1, tokensToday: 0 },
            },
        ];
        const merged = mergeKasirIntoRoster(demo, unavailableSnap);
        expect(merged[0].id).toBe(KASIR_EMPLOYEE_SLUG);
        expect(merged[0].rosterKind).toBe('live');
        expect(merged[1].rosterKind).toBe('demo');
    });

    it('preserves AOS task from existing Kasir row when merging live metrics', () => {
        const aosKasir: Agent = {
            id: KASIR_EMPLOYEE_SLUG,
            name: 'Kasir UMKM',
            role: 'UMKM WhatsApp Kasir',
            model: 'AI Studio',
            color: '#22c55e',
            zone: 'operations',
            deskId: 'ops-1',
            status: 'working',
            location: 'desk',
            modules: ['ai-studio'],
            skills: [],
            stats: { tasksCompleted: 0, successRate: 1, avgLatencyMs: 1, tokensToday: 0 },
            task: {
                id: 'task-wa-1',
                title: 'WA Kasir · konsultasi',
                progress: 0.5,
                startedAt: Date.now(),
                moduleId: 'wa-conversations',
                route: '/admin/ai-studio/messages',
                steps: ['Proses'],
            },
        };
        const merged = mergeKasirIntoRoster([aosKasir], liveSnap, { tagNonKasirAsDemo: false });
        expect(merged[0].task?.id).toBe('task-wa-1');
        expect(merged[0].status).toBe('working');
        expect(merged[0].liveMetrics?.waChatsToday).toBe(3);
    });

    it('preserves live rosterKind when not tagging demo agents', () => {
        const liveAgents: Agent[] = [
            {
                id: 'arjuna',
                name: 'Arjuna',
                role: 'DevOps',
                model: 'Large',
                color: '#38bdf8',
                zone: 'engineering',
                deskId: 'eng-1-a',
                status: 'working',
                location: 'desk',
                modules: ['whatsapp-gateway'],
                skills: [],
                stats: { tasksCompleted: 1, successRate: 1, avgLatencyMs: 1, tokensToday: 0 },
                rosterKind: 'live',
            },
        ];
        const merged = mergeKasirIntoRoster(liveAgents, unavailableSnap, { tagNonKasirAsDemo: false });
        expect(merged[1].rosterKind).toBe('live');
    });
});
