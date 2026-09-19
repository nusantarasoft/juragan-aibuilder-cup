import {
    Controller,
    Post,
    Req,
    Headers,
    HttpCode,
    Logger,
    RawBodyRequest,
    GoneException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { normalizeWhatsAppWebhook } from '../whatsapp/hermes-webhook.normalizer';
import { StudioWhatsAppService } from './studio-whatsapp.service';

@Controller('api/studio/whatsapp')
export class StudioWhatsAppController {
    private readonly logger = new Logger(StudioWhatsAppController.name);

    constructor(
        private readonly whatsAppService: StudioWhatsAppService,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Legacy / escape-hatch inbound. Production kasir WA is Hermes kasir-pipe only.
     * Default: 410 Gone unless WHATSAPP_WEBHOOK_ENABLED=true|1 (gap G4).
     * Admin Simulasi uses StudioWhatsAppService.simulateInboundMessage — not this route.
     */
    @Post('webhook')
    @HttpCode(200)
    async webhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('x-webhook-hmac') hmac?: string,
    ) {
        const enabled = String(
            this.configService.get('WHATSAPP_WEBHOOK_ENABLED') || '',
        )
            .trim()
            .toLowerCase();
        if (enabled !== 'true' && enabled !== '1' && enabled !== 'yes') {
            this.logger.warn(
                'Rejected POST /webhook (pipe-only). Set WHATSAPP_WEBHOOK_ENABLED=1 only for legacy.',
            );
            throw new GoneException(
                'WhatsApp inbound webhook disabled; kasir uses Hermes pipe-only',
            );
        }

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
