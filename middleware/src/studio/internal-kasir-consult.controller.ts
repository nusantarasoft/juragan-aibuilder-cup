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

        if (!isTruthyFlag(this.config.get('KASIR_CONSULT') ?? process.env.KASIR_CONSULT)) {
            this.logger.log('path=kasir_consult status=consult_off');
            return { status: 'off' as const, text: CONSULT_OFF_COPY };
        }

        const question = typeof body?.question === 'string' ? body.question : '';
        if (!question.trim()) {
            throw new HttpException('question required', HttpStatus.BAD_REQUEST);
        }

        const phone =
            typeof body?.phone === 'string' ? body.phone.trim().slice(0, 32) : undefined;

        const mode = String(body?.mode || '')
            .trim()
            .toLowerCase();
        if (mode === 'coach') {
            if (!phone?.trim()) {
                throw new HttpException('phone required for coach mode', HttpStatus.BAD_REQUEST);
            }
            this.logger.log('path=kasir_consult mode=coach');
            const coach = await this.pendamping.coachFromOwnerPhone({
                phone,
                aliasText: question.trim(),
            });
            return { status: coach.status, text: coach.text };
        }

        const result = await this.pendamping.consultFromNotebook(question, undefined, {
            phone,
        });
        return { status: result.status, text: result.text };
    }
}
