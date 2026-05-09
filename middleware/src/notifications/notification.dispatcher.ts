import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import * as nodemailer from 'nodemailer';

interface SendOptions {
    tenantId: string;
    channelType: string;
    recipient: string;
    subject?: string;
    body: string;
    ruleId?: string;
    metadata?: any;
}

@Injectable()
export class NotificationDispatcher {
    private readonly logger = new Logger(NotificationDispatcher.name);

    constructor(
        private notificationsService: NotificationsService,
        private configService: ConfigService,
    ) {}

    /**
     * Main dispatch — routes to the correct transport based on channel type
     */
    async dispatch(opts: SendOptions): Promise<{ success: boolean; error?: string }> {
        const { tenantId, channelType, recipient, subject, body, ruleId, metadata } = opts;

        // Log the attempt
        const log = await this.notificationsService.createNotificationLog(tenantId, {
            ruleId, channelType, recipient, subject, body, status: 'pending', metadata,
        });

        try {
            let result: { success: boolean; error?: string };

            switch (channelType) {
                case 'email':
                    result = await this.sendEmail(recipient, subject || '', body);
                    break;
                case 'whatsapp':
                    result = await this.sendWhatsApp(recipient, body);
                    break;
                case 'webhook':
                    result = await this.sendWebhook(recipient, body, metadata);
                    break;
                case 'in_app':
                    result = await this.sendInApp(tenantId, recipient, subject || body, body);
                    break;
                default:
                    result = { success: false, error: `Unknown channel type: ${channelType}` };
            }

            // Update log
            await this.updateLog(log.id, result.success ? 'sent' : 'failed', result.error);

            return result;
        } catch (err: any) {
            this.logger.error(`Dispatch failed: ${err.message}`, err.stack);
            await this.updateLog(log.id, 'failed', err.message);
            return { success: false, error: err.message };
        }
    }

    // ─── EMAIL (via SMTP) ───────────────────────────────────

    private async sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; error?: string }> {
        try {

            const smtpHost = this.configService.get('SMTP_HOST', 'smtp.gmail.com');
            const smtpPort = Number(this.configService.get('SMTP_PORT', '587'));
            const smtpUser = this.configService.get('SMTP_USER', '');
            const smtpPass = this.configService.get('SMTP_PASS', '');
            const smtpFrom = this.configService.get('SMTP_SENDER_NAME', 'Nusantarasoft');

            if (!smtpUser || !smtpPass) {
                this.logger.warn('SMTP not configured, skipping email');
                return { success: false, error: 'SMTP credentials not configured' };
            }

            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                auth: { user: smtpUser, pass: smtpPass },
            });

            await transporter.sendMail({
                from: `"${smtpFrom}" <${smtpUser}>`,
                to,
                subject,
                text: body,
                html: body.replace(/\n/g, '<br>'),
            });

            this.logger.log(`Email sent to ${to}: ${subject}`);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    // ─── WHATSAPP (via OpenClaw Gateway) ────────────────────

    private async sendWhatsApp(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
        try {
            const gatewayUrl = this.configService.get('OPENCLAW_GATEWAY_URL', 'http://openclaw:18789');
            const gatewayToken = this.configService.get('OPENCLAW_GATEWAY_TOKEN', '');

            // Format phone: ensure it starts with country code
            const formattedPhone = phone.startsWith('+') ? phone.slice(1) : phone;
            const chatId = `${formattedPhone}@c.us`;

            const response = await fetch(`${gatewayUrl}/api/sendText`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(gatewayToken ? { 'Authorization': `Bearer ${gatewayToken}` } : {}),
                },
                body: JSON.stringify({
                    chatId,
                    text: message,
                    session: 'default',
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`WhatsApp API error ${response.status}: ${errorText}`);
            }

            this.logger.log(`WhatsApp sent to ${phone}`);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    // ─── WEBHOOK ────────────────────────────────────────────

    private async sendWebhook(url: string, body: string, metadata?: any): Promise<{ success: boolean; error?: string }> {
        try {
            let payload: string;
            try {
                // Try parsing as JSON first
                payload = typeof body === 'string' ? body : JSON.stringify(body);
                JSON.parse(payload); // Validate
            } catch {
                // Wrap plain text in JSON
                payload = JSON.stringify({
                    text: body,
                    ...metadata,
                    timestamp: new Date().toISOString(),
                });
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
            });

            if (!response.ok) {
                throw new Error(`Webhook returned ${response.status}`);
            }

            this.logger.log(`Webhook sent to ${url}`);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    // ─── IN-APP ─────────────────────────────────────────────

    private async sendInApp(tenantId: string, userId: string, title: string, message: string): Promise<{ success: boolean; error?: string }> {
        try {
            await this.notificationsService.createNotification(tenantId, {
                userId, title, message,
                module: 'system',
                icon: '🔔',
            });

            this.logger.log(`In-app notification created for user ${userId}`);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    // ─── Helpers ─────────────────────────────────────────────

    private async updateLog(logId: string, status: string, error?: string) {
        try {
            const { data } = await (this.notificationsService as any).db
                .from('notification_logs')
                .update({
                    status,
                    error_message: error || null,
                    sent_at: status === 'sent' ? new Date().toISOString() : null,
                })
                .eq('id', logId);
        } catch (err: any) {
            this.logger.error(`Failed to update log ${logId}: ${err.message}`);
        }
    }

    /**
     * Template variable interpolation: replaces {{var}} with values
     */
    interpolateTemplate(template: string, variables: Record<string, string>): string {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `{{${key}}}`);
    }
}
