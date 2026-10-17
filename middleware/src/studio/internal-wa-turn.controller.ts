/**
 * Internal HTTP for Hermes kasir-pipe → persist WA turns + handoff probe.
 * Docker-network only; same key as kasir-consult.
 */
import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpException,
    HttpStatus,
    Logger,
    Post,
    Query,
} from '@nestjs/common';
import { AlternativeAuth } from '../auth/alternative-auth.decorator';
import { StudioWaConversationsService, type WaTurnAuthorKind } from './studio-wa-conversations.service';

type WaTurnBody = {
    phone?: string;
    chat_id?: string;
    author_kind?: string;
    body_text?: string;
};

const AUTHOR_KINDS = new Set<WaTurnAuthorKind>(['owner', 'ai', 'human']);

@AlternativeAuth()
@Controller('internal')
export class InternalWaTurnController {
    private readonly logger = new Logger(InternalWaTurnController.name);

    constructor(private readonly wa: StudioWaConversationsService) {}

    private assertKey(key?: string): void {
        try {
            this.wa.assertInternalKey(key);
        } catch {
            this.logger.warn('wa-turn auth rejected');
            throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }
    }

    @Post('wa-turn')
    @HttpCode(200)
    async recordTurn(@Body() body: WaTurnBody, @Headers('x-kasir-consult-key') key?: string) {
        this.assertKey(key);
        const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
        const authorRaw = typeof body?.author_kind === 'string' ? body.author_kind.trim() : '';
        const text = typeof body?.body_text === 'string' ? body.body_text : '';
        if (!phone || !authorRaw || !text.trim()) {
            throw new HttpException('phone, author_kind, body_text required', HttpStatus.BAD_REQUEST);
        }
        if (!AUTHOR_KINDS.has(authorRaw as WaTurnAuthorKind)) {
            throw new HttpException('invalid author_kind', HttpStatus.BAD_REQUEST);
        }
        await this.wa.recordTurnBestEffort({
            phone,
            chatId: typeof body.chat_id === 'string' ? body.chat_id : undefined,
            authorKind: authorRaw as WaTurnAuthorKind,
            bodyText: text,
        });
        return { ok: true as const };
    }

    @Get('wa-handoff')
    @HttpCode(200)
    async handoff(@Query('phone') phone?: string, @Headers('x-kasir-consult-key') key?: string) {
        this.assertKey(key);
        const p = typeof phone === 'string' ? phone.trim() : '';
        if (!p) {
            throw new HttpException('phone required', HttpStatus.BAD_REQUEST);
        }
        return this.wa.handoffForPhone(p);
    }
}
