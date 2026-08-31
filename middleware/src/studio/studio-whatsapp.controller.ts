import {
    Controller,
    Post,
    Req,
    Headers,
    HttpCode,
    Logger,
    RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { normalizeWhatsAppWebhook } from '../whatsapp/hermes-to-waha-webhook.normalizer';
import { StudioWhatsAppService } from './studio-whatsapp.service';

@Controller('api/studio/whatsapp')
export class StudioWhatsAppController {
    private readonly logger = new Logger(StudioWhatsAppController.name);

    constructor(private readonly whatsAppService: StudioWhatsAppService) {}

    @Post('webhook')
    @HttpCode(200)
    async webhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('x-webhook-hmac') hmac?: string,
    ) {
        const raw = req.rawBody;
        if (raw) {
            this.whatsAppService.verifyWebhookHmac(raw, hmac);
        }

        const rawBody = (req.body || {}) as Record<string, unknown>;
        const body = normalizeWhatsAppWebhook(rawBody);
        const session = String(body.session || 'default');
        const event = String(body.event || 'message');
        this.logger.log(`Webhook ${event} session=${session}`);

        try {
            await this.whatsAppService.handleWebhook(body, session);
        } catch (e: any) {
            this.logger.error(`Webhook handler error: ${e?.message}`, e?.stack);
        }

        return { ok: true };
    }
}
