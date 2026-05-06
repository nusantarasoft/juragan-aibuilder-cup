import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';

/**
 * NotificationCleanupWorker — runs once daily at 2:00 AM to clean up
 * old notification logs and read notifications older than 30 days.
 *
 * Also runs a weekly overdue notification check.
 */
@Injectable()
export class NotificationCleanupWorker {
    private readonly logger = new Logger(NotificationCleanupWorker.name);
    private readonly TENANT_ID = '00000000-0000-0000-0000-000000000010';

    constructor(private notificationsService: NotificationsService) {}

    /**
     * Daily cleanup at 2:00 AM — prune logs and read notifications older than 30 days
     */
    @Cron('0 2 * * *') // Every day at 2:00 AM
    async dailyCleanup() {
        this.logger.log('🧹 Starting daily notification cleanup...');
        try {
            const result = await this.notificationsService.cleanupOldLogs(this.TENANT_ID, 30);
            this.logger.log(
                `✅ Cleanup complete: ${result.deletedLogs} logs, ${result.deletedNotifs} notifications removed`
            );
        } catch (err: any) {
            this.logger.error(`❌ Daily cleanup failed: ${err.message}`);
        }
    }

    /**
     * Hourly stats check — log notification system health
     */
    @Cron(CronExpression.EVERY_HOUR)
    async hourlyHealthCheck() {
        try {
            const stats = await this.notificationsService.getNotificationStats(this.TENANT_ID);
            const failRate = stats.totalLogs > 0
                ? ((stats.failedLogs / stats.totalLogs) * 100).toFixed(1)
                : '0.0';

            this.logger.log(
                `📊 Notification Health: ${stats.totalLogs} total, ${stats.sentLogs} sent, ` +
                `${stats.failedLogs} failed (${failRate}% failure rate), ` +
                `${stats.unreadNotifications} unread, ${stats.activeChannels} active channels`
            );

            // Alert if failure rate exceeds 20%
            if (stats.totalLogs > 5 && parseFloat(failRate) > 20) {
                this.logger.warn(
                    `⚠️ High notification failure rate: ${failRate}% — check channel configurations!`
                );
            }
        } catch (err: any) {
            this.logger.error(`Health check failed: ${err.message}`);
        }
    }
}
