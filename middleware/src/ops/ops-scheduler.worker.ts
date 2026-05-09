import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OpsService } from './ops.service';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationDispatcher } from '../notifications/notification.dispatcher';

/**
 * OpsSchedulerWorker — runs every minute and checks if any ops_schedules
 * need to fire based on their cron_expression + timezone.
 *
 * For each matching schedule, it auto-creates a new ops_run from the
 * linked playbook template.
 */
@Injectable()
export class OpsSchedulerWorker {
    private readonly logger = new Logger(OpsSchedulerWorker.name);

    constructor(
        private opsService: OpsService,
        private supabaseService: SupabaseService,
        private dispatcher: NotificationDispatcher,
    ) {}

    /**
     * Check every minute if any schedule should fire
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async checkSchedules() {
        try {
            const db = this.supabaseService.getAdminClient();
            const tenantId = '00000000-0000-0000-0000-000000000010';

            // Fetch active schedules
            const { data: schedules, error } = await db
                .from('ops_schedules')
                .select('*, ops_playbooks(name)')
                .eq('tenant_id', tenantId)
                .eq('is_active', true);

            if (error || !schedules?.length) return;

            const now = new Date();

            for (const schedule of schedules) {
                if (this.shouldRun(schedule.cron_expression, now, schedule.timezone)) {
                    // Check if we already ran within the last 59 seconds (prevent double-fire)
                    if (schedule.last_run_at) {
                        const lastRun = new Date(schedule.last_run_at);
                        const diffMs = now.getTime() - lastRun.getTime();
                        if (diffMs < 59000) continue; // Already ran this minute
                    }

                    this.logger.log(`⏰ Triggering schedule: ${schedule.name}`);

                    try {
                        // Create the run
                        const playbookName = schedule.ops_playbooks?.name || 'Playbook';
                        const runName = `${playbookName} — ${this.formatDate(now)}`;

                        await this.opsService.createRun(tenantId, {
                            playbookId: schedule.playbook_id,
                            name: runName,
                            startedBy: 'scheduler',
                            scheduleId: schedule.id,
                        });

                        // Update last_run_at and next_run_at
                        await db.from('ops_schedules').update({
                            last_run_at: now.toISOString(),
                            next_run_at: this.getNextRunTime(schedule.cron_expression, now, schedule.timezone),
                            updated_at: now.toISOString(),
                        }).eq('id', schedule.id);

                        this.logger.log(`✅ Created run: ${runName}`);

                        // Dispatch in-app notification
                        try {
                            await this.dispatcher.dispatch({
                                tenantId,
                                channelType: 'in_app',
                                recipient: 'system',
                                subject: `Scheduled Run: ${playbookName}`,
                                body: `Automated run "${runName}" created from schedule "${schedule.name}".`,
                            });
                        } catch (notifErr: any) {
                            this.logger.warn(`Notification dispatch failed: ${notifErr.message}`);
                        }
                    } catch (err: any) {
                        this.logger.error(`Failed to create run for schedule ${schedule.name}: ${err.message}`);
                    }
                }
            }
        } catch (err: any) {
            this.logger.error(`Scheduler check failed: ${err.message}`);
        }
    }

    /**
     * Simple cron matching — checks if current time matches the cron expression
     * Format: minute hour day-of-month month day-of-week
     */
    private shouldRun(cronExpr: string, now: Date, timezone?: string): boolean {
        try {
            const parts = cronExpr.trim().split(/\s+/);
            if (parts.length < 5) return false;

            // Convert to timezone if provided
            let d = now;
            if (timezone) {
                try {
                    const tzStr = now.toLocaleString('en-US', { timeZone: timezone });
                    d = new Date(tzStr);
                } catch { /* fallback to UTC */ }
            }

            const minute = d.getMinutes();
            const hour = d.getHours();
            const dayOfMonth = d.getDate();
            const month = d.getMonth() + 1;
            const dayOfWeek = d.getDay(); // 0=Sunday

            return (
                this.matchField(parts[0], minute, 0, 59) &&
                this.matchField(parts[1], hour, 0, 23) &&
                this.matchField(parts[2], dayOfMonth, 1, 31) &&
                this.matchField(parts[3], month, 1, 12) &&
                this.matchField(parts[4], dayOfWeek, 0, 7)
            );
        } catch {
            return false;
        }
    }

    /**
     * Match a single cron field against a value
     * Supports: *, specific numbers, ranges (1-5), steps (*\/5), lists (1,3,5)
     */
    private matchField(field: string, value: number, min: number, max: number): boolean {
        if (field === '*') return true;

        // Handle step: */5
        if (field.startsWith('*/')) {
            const step = parseInt(field.slice(2));
            return step > 0 && value % step === 0;
        }

        // Handle list: 1,3,5
        if (field.includes(',')) {
            return field.split(',').some(p => this.matchField(p.trim(), value, min, max));
        }

        // Handle range: 1-5
        if (field.includes('-')) {
            const [start, end] = field.split('-').map(Number);
            return value >= start && value <= end;
        }

        // Exact match
        return parseInt(field) === value;
    }

    /**
     * Calculate next run time (approximate — for display purposes)
     */
    private getNextRunTime(cronExpr: string, from: Date, timezone?: string): string {
        // Simple: add 1 day for daily, 7 days for weekly, 30 for monthly
        const parts = cronExpr.trim().split(/\s+/);
        const d = new Date(from);

        if (parts[4] !== '*') {
            // Day-of-week specified: next week
            d.setDate(d.getDate() + 7);
        } else if (parts[2] !== '*') {
            // Day-of-month specified: next month
            d.setMonth(d.getMonth() + 1);
        } else {
            // Daily or sub-daily
            d.setDate(d.getDate() + 1);
        }

        return d.toISOString();
    }

    private formatDate(d: Date): string {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[d.getMonth()]} ${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
}
