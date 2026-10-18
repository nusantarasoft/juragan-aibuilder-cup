/**
 * Internal HTTP for Hermes kasir_consult → Studio kurikulum RAG.
 * Docker-network only; not published via nginx.
 */
import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpException,
    HttpStatus,
    Logger,
    Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlternativeAuth } from '../auth/alternative-auth.decorator';
import {
    CONSULT_OFF_COPY,
} from './studio-umkm-pendamping.prompts';
import { StudioUmkmPendampingService } from './studio-umkm-pendamping.service';
import { KasirConsultAosTaskService } from './kasir-consult-aos-task.service';
import { StudioUmkmService } from './studio-umkm.service';
import { AosTenantAgentSettingsService } from '../agentic-os/aos-tenant-agent-settings.service';
import { StudioWaConversationsService } from './studio-wa-conversations.service';

type ConsultBody = {
    question?: string;
    /** Owner WA digits — required for coach mode; optional for kurikulum consult. */
    phone?: string;
    /** `coach` = Pendamping Gabungan (store tools + playbook + notebook RAG). Default = kurikulum RAG only. */
    mode?: string;
};

function isTruthyFlag(raw: string | undefined): boolean {
    const v = String(raw || '')
        .trim()
        .toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

@AlternativeAuth()
@Controller('internal')
export class InternalKasirConsultController {
    private readonly logger = new Logger(InternalKasirConsultController.name);

    constructor(
        private readonly pendamping: StudioUmkmPendampingService,
        private readonly config: ConfigService,
        private readonly kasirTasks: KasirConsultAosTaskService,
        private readonly umkm: StudioUmkmService,
        private readonly tenantAgentSettings: AosTenantAgentSettingsService,
        private readonly waConversations: StudioWaConversationsService,
    ) {}

    @Post('kasir-consult')
    @HttpCode(200)
    async kasirConsult(
        @Body() body: ConsultBody,
        @Headers('x-kasir-consult-key') key?: string,
    ) {
        const expected = String(
            this.config.get('KASIR_CONSULT_KEY') || process.env.KASIR_CONSULT_KEY || '',
        ).trim();
        if (!expected || key !== expected) {
            this.logger.warn('kasir-consult auth rejected');
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const question = typeof body?.question === 'string' ? body.question : '';
        if (!question.trim()) {
            throw new HttpException('question required', HttpStatus.BAD_REQUEST);
        }

        const phone =
            typeof body?.phone === 'string' ? body.phone.trim().slice(0, 32) : undefined;

        let tenantIdForGate: string | undefined;
        if (phone?.trim()) {
            const ctx = await this.umkm.resolveUmkmContextByOwnerPhone(phone);
            if (!ctx) {
                this.logger.warn('kasir-consult sender not on store whitelist or WA inactive');
                throw new HttpException('Sender not allowed', HttpStatus.FORBIDDEN);
            }
            tenantIdForGate = ctx.tenantId;
        }

        const mode = String(body?.mode || '')
            .trim()
            .toLowerCase();

        const startMirror = (kind: 'consult' | 'coach' | 'off') => {
            try {
                return this.kasirTasks.begin({
                    kind,
                    phone,
                    questionChars: question.trim().length,
                });
            } catch (err) {
                this.logger.warn(`kasir AOS task mirror start failed: ${(err as Error).message}`);
                return { complete: () => undefined };
            }
        };
        const finishMirror = (handle: { complete: (s: string) => void }, status: string) => {
            try {
                handle.complete(status);
            } catch (err) {
                this.logger.warn(`kasir AOS task mirror finish failed: ${(err as Error).message}`);
            }
        };

        if (!isTruthyFlag(this.config.get('KASIR_CONSULT') ?? process.env.KASIR_CONSULT)) {
            this.logger.log('path=kasir_consult status=consult_off');
            finishMirror(startMirror('off'), 'off');
            return { status: 'off' as const, text: CONSULT_OFF_COPY };
        }

        if (phone?.trim()) {
            const handoff = await this.waConversations.handoffForPhone(phone);
            if (handoff.active) {
                this.logger.log('path=kasir_consult status=human_handoff');
                finishMirror(startMirror('off'), 'human_handoff');
                return { status: 'human_handoff' as const, text: '' };
            }
        }

        if (tenantIdForGate) {
            const kasirId = await this.tenantAgentSettings.findRecruitedAgentForAutoGate(tenantIdForGate, null);
            if (kasirId) {
                const gate = await this.tenantAgentSettings.assertAutoWorkAllowed(tenantIdForGate, kasirId);
                if (gate.allowed === false) {
                    this.logger.log(`path=kasir_consult status=${gate.status}`);
                    finishMirror(startMirror('off'), gate.status);
                    return { status: gate.status as 'paused' | 'quiet_hours', text: gate.text };
                }
            }
        }

        const mirrorKind = mode === 'coach' ? 'coach' : 'consult';
        const mirror = startMirror(mirrorKind);

        if (mode === 'coach') {
            if (!phone?.trim()) {
                throw new HttpException('phone required for coach mode', HttpStatus.BAD_REQUEST);
            }
            this.logger.log('path=kasir_consult mode=coach');
            const coach = await this.pendamping.coachFromOwnerPhone({
                phone,
                aliasText: question.trim(),
            });
            finishMirror(mirror, coach.status);
            return { status: coach.status, text: coach.text };
        }

        const result = await this.pendamping.consultFromNotebook(question, undefined, {
            phone,
        });
        finishMirror(mirror, result.status);
        return { status: result.status, text: result.text };
    }
}
