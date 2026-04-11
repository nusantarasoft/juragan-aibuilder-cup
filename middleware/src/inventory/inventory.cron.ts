import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InventoryService } from './inventory.service';

@Injectable()
export class InventoryCronService {
    private readonly logger = new Logger(InventoryCronService.name);

    constructor(private readonly inventoryService: InventoryService) {}

    /**
     * Auto-run monthly depreciation on the 1st of each month at 2:00 AM
     * Calculates depreciation for all active fixed assets across all tenants
     */
    @Cron('0 2 1 * *', { name: 'monthly-depreciation' })
    async handleMonthlyDepreciation() {
        this.logger.log('Starting scheduled monthly depreciation run...');
        try {
            const result = await this.inventoryService.runDepreciation('default');
            this.logger.log(
                `Monthly depreciation completed: ${result.processed} assets processed, ` +
                `total depreciation: ${result.totalDepreciation}`,
            );
        } catch (error) {
            this.logger.error('Monthly depreciation failed:', error);
        }
    }

    /**
     * Daily check for expiring items at 6:00 AM
     * Logs warnings for items expiring within 30 days
     */
    @Cron('0 6 * * *', { name: 'daily-expiry-check' })
    async handleDailyExpiryCheck() {
        this.logger.log('Running daily expiry check...');
        try {
            const alerts = await this.inventoryService.getExpiryAlerts('default', 30);
            const expired = alerts.filter((a: any) => a.isExpired);
            const nearExpiry = alerts.filter((a: any) => !a.isExpired);

            if (expired.length > 0) {
                this.logger.warn(
                    `${expired.length} item(s) EXPIRED: ${expired.map((a: any) => a.itemName).join(', ')}`,
                );
            }
            if (nearExpiry.length > 0) {
                this.logger.warn(
                    `${nearExpiry.length} item(s) expiring within 30 days: ${nearExpiry.map((a: any) => `${a.itemName} (${a.daysUntilExpiry}d)`).join(', ')}`,
                );
            }
            if (expired.length === 0 && nearExpiry.length === 0) {
                this.logger.log('No expiry alerts.');
            }
        } catch (error) {
            this.logger.error('Expiry check failed:', error);
        }
    }

    /**
     * Weekly maintenance reminder check on Mondays at 8:00 AM
     * Logs assets that have upcoming maintenance dates
     */
    @Cron('0 8 * * 1', { name: 'weekly-maintenance-check' })
    async handleWeeklyMaintenanceCheck() {
        this.logger.log('Running weekly maintenance check...');
        try {
            const assets = await this.inventoryService.getFixedAssets('default', { status: 'active' });
            const now = new Date();
            const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

            const dueSoon = assets.filter((a: any) => {
                if (!a.nextMaintenanceDate) return false;
                const mDate = new Date(a.nextMaintenanceDate);
                return mDate <= sevenDaysOut;
            });

            if (dueSoon.length > 0) {
                this.logger.warn(
                    `${dueSoon.length} asset(s) due for maintenance: ${dueSoon.map((a: any) => `${a.assetName} (${a.nextMaintenanceDate})`).join(', ')}`,
                );
            } else {
                this.logger.log('No assets due for maintenance this week.');
            }
        } catch (error) {
            this.logger.error('Maintenance check failed:', error);
        }
    }
}
