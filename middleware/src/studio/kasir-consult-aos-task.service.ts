/**
 * Fire-and-forget mirror: each kasir-consult hop → AOS task (queued → running → done/failed).
 * Failures are logged only; never thrown to the HTTP handler.
 */
import { Injectable, Logger } from '@nestjs/common';
import { AgenticOsService, must, Row, tenantOf } from '../agentic-os/agentic-os.service';
import { KASIR_EMPLOYEE_SLUG } from '../agentic-os/aos-kasir-live.service';
import { AOS_DEFAULT_TENANT } from '../agentic-os/agentic-os.types';
import { StudioUmkmService } from './studio-umkm.service';
import { normalizePhoneDigits } from './studio-whatsapp.util';
import {
    kasirWaTaskDescription,
    kasirWaTaskTitle,
    KASIR_WA_TASK_SOURCE,
    KasirWaMirrorKind,
    mapConsultOutcome,
} from './kasir-consult-aos-task.util';

const MODULE_ID = 'ai-studio';
const ROUTE = '/admin/ai-studio/umkm';
const STEPS = ['Terima permintaan WA', 'Proses kasir', 'Kirim balasan'];

export type KasirWaMirrorMeta = {
    kind: KasirWaMirrorKind;
    phone?: string;
    questionChars: number;
};

export type KasirWaMirrorHandle = {
    complete: (consultStatus: string) => void;
};

@Injectable()
export class KasirConsultAosTaskService {
    private readonly logger = new Logger(KasirConsultAosTaskService.name);

    constructor(
        private readonly aos: AgenticOsService,
        private readonly umkm: StudioUmkmService,
    ) {}

    /** Starts async queue writes; call `complete` when consult finishes (also async, non-throwing). */
    begin(meta: KasirWaMirrorMeta): KasirWaMirrorHandle {
        const taskRef: { id: string | null } = { id: null };
        const ready = this.bootstrapTask(meta, taskRef);
        return {
            complete: (consultStatus: string) => {
                void this.safeComplete(ready, taskRef, meta, consultStatus);
            },
        };
    }

    private async bootstrapTask(meta: KasirWaMirrorMeta, taskRef: { id: string | null }): Promise<void> {
        try {
            const tenantId = await this.resolveTenantId(meta.phone);
            const agentId = await this.ensureKasirAgentId(tenantId);
            const sortOrder = await this.aos.nextQueueSortOrder(tenantId, agentId);
            const title = kasirWaTaskTitle(meta.kind);
            const row: Row = {
                tenant_id: tenantId,
                agent_id: agentId,
                title,
                description: kasirWaTaskDescription({ kind: meta.kind, outcome: '…', questionChars: meta.questionChars }),
                module_id: MODULE_ID,
                route: ROUTE,
                steps: STEPS,
                status: 'queued',
                progress: 0,
                priority: 'normal',
                sort_order: sortOrder,
                source: KASIR_WA_TASK_SOURCE,
                requires_approval: false,
            };
            const created = must(await this.aos.db.from('aos_tasks').insert(row).select('id, tenant_id').single()) as Row;
            taskRef.id = String(created.id);
            const now = new Date().toISOString();
            must(
                await this.aos.db
                    .from('aos_tasks')
                    .update({ status: 'running', started_at: now, progress: 0.05 })
                    .eq('id', taskRef.id)
                    .eq('status', 'queued'),
            );
            void this.aos.notifyTaskQueue(String(created.tenant_id), 'running', taskRef.id, { includeStats: true });
        } catch (err) {
            this.logger.warn(`Kasir WA task bootstrap failed: ${(err as Error).message}`);
            throw err;
        }
    }

    private async safeComplete(
        ready: Promise<void>,
        taskRef: { id: string | null },
        meta: KasirWaMirrorMeta,
        consultStatus: string,
    ): Promise<void> {
        try {
            await ready;
            if (!taskRef.id) return;
            const tenantId = await this.resolveTenantId(meta.phone);
            const outcome = mapConsultOutcome(consultStatus);
            const now = new Date().toISOString();
            const description = kasirWaTaskDescription({
                kind: meta.kind,
                outcome: consultStatus || outcome,
                questionChars: meta.questionChars,
            });
            const patch: Row =
                outcome === 'failed'
                    ? {
                          status: 'failed',
                          progress: 1,
                          finished_at: now,
                          error: `Konsultasi gagal (${consultStatus || 'error'})`,
                          description,
                      }
                    : {
                          status: 'done',
                          progress: 1,
                          finished_at: now,
                          completed_at: now,
                          result: `Selesai (${consultStatus || 'ok'})`,
                          description,
                      };
            must(await this.aos.db.from('aos_tasks').update(patch).eq('id', taskRef.id));
            void this.aos.notifyTaskQueue(tenantId, outcome, taskRef.id, { includeStats: true });
            void this.aos.audit(tenantId, {
                actorType: 'agent',
                actorId: KASIR_EMPLOYEE_SLUG,
                action: outcome === 'failed' ? 'task_failed' : 'task_done',
                entity: 'task',
                entityId: taskRef.id,
                summary: `${kasirWaTaskTitle(meta.kind)} — ${consultStatus || outcome}`,
                level: outcome === 'failed' ? 'warning' : 'success',
                moduleId: MODULE_ID,
                route: ROUTE,
            });
        } catch (err) {
            this.logger.warn(`Kasir WA task complete failed: ${(err as Error).message}`);
        }
    }

    private async resolveTenantId(phone?: string): Promise<string> {
        const digits = normalizePhoneDigits(phone || '');
        if (digits.length >= 8) {
            try {
                const ctx = await this.umkm.resolveUmkmContextByOwnerPhone(digits);
                if (ctx?.tenantId) return tenantOf(ctx.tenantId);
            } catch (err) {
                this.logger.warn(`Tenant resolve for kasir task failed: ${(err as Error).message}`);
            }
        }
        return AOS_DEFAULT_TENANT;
    }

    private async ensureKasirAgentId(tenantId: string): Promise<string> {
        const t = tenantOf(tenantId);
        const existing = must(
            await this.aos.db.from('aos_agents').select('id').eq('tenant_id', t).eq('slug', KASIR_EMPLOYEE_SLUG).maybeSingle(),
        ) as Row | null;
        if (existing?.id) return String(existing.id);

        const inserted = must(
            await this.aos.db
                .from('aos_agents')
                .insert({
                    tenant_id: t,
                    slug: KASIR_EMPLOYEE_SLUG,
                    name: 'Kasir UMKM',
                    role: 'UMKM WhatsApp Kasir',
                    persona: 'Kasir WhatsApp untuk UMKM — catat jual, stok, dan konsultasi.',
                    color: '#22c55e',
                    zone: 'operations',
                    desk_id: 'ops-1',
                    modules: [MODULE_ID],
                    skills: ['Kasir WA', 'Konsultasi', 'Stok'],
                    tools: ['module.read', 'activity.log'],
                    permissions: { [MODULE_ID]: 'write' },
                    runner: 'browser',
                    status: 'active',
                    stats: {},
                })
                .select('id')
                .single(),
        ) as Row;
        return String(inserted.id);
    }
}
