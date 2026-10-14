import { Controller, Post, Get, Body, Headers, Logger, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { AlternativeAuth } from '../auth/alternative-auth.decorator';
import { Public } from '../auth/public.decorator';
import { WebhooksService } from './webhooks.service';

/**
 * Label Studio Webhook Payload Types
 */
interface LabelStudioWebhookPayload {
    action: 'ANNOTATION_CREATED' | 'ANNOTATION_UPDATED' | 'ANNOTATIONS_DELETED' | 'TASK_CREATED' | 'TASK_DELETED';
    annotation?: {
        id: number;
        task: number;
        result: Array<{
            from_name: string;
            to_name: string;
            type: string;
            value: any;
        }>;
        completed_by?: {
            id: number;
            email: string;
            first_name?: string;
            last_name?: string;
        };
        created_at?: string;
        updated_at?: string;
    };
    project?: {
        id: number;
        title: string;
    };
    task?: {
        id: number;
        data: Record<string, any>;
        meta?: Record<string, any>;
    };
}

@Controller('webhooks')
export class WebhooksController {
    private readonly logger = new Logger(WebhooksController.name);

    constructor(private readonly webhooksService: WebhooksService) { }

    @Public()
    @Get('health')
    health() {
        return { status: 'UP', service: 'webhooks' };
    }

    @AlternativeAuth()
    @Post('labelstudio')
    @HttpCode(200)
    async handleLabelStudioWebhook(
        @Body() payload: LabelStudioWebhookPayload,
        @Headers('x-label-studio-signature') signature?: string
    ) {
        this.logger.log(`Received Label Studio webhook: ${payload.action}`);
        this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

        try {
            // Validate signature if configured
            const isValid = await this.webhooksService.validateSignature(signature, payload);
            if (!isValid) {
                this.logger.warn('Invalid webhook signature');
                throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
            }

            // Handle different action types
            switch (payload.action) {
                case 'ANNOTATION_CREATED':
                case 'ANNOTATION_UPDATED':
                    await this.webhooksService.handleAnnotation(payload);
                    break;

                case 'ANNOTATIONS_DELETED':
                    await this.webhooksService.handleAnnotationDeleted(payload);
                    break;

                case 'TASK_CREATED':
                    this.logger.log(`Task created: ${payload.task?.id}`);
                    break;

                case 'TASK_DELETED':
                    await this.webhooksService.handleTaskDeleted(payload);
                    break;

                default:
                    this.logger.warn(`Unhandled webhook action: ${payload.action}`);
            }

            return { success: true, action: payload.action };
        } catch (error) {
            this.logger.error('Webhook processing failed', error);
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException('Webhook processing failed', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
