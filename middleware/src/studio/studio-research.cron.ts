import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { StudioResearchService } from './studio-research.service';

/**
 * Weekly regulatory research batch + pending expiry.
 * Disabled unless STUDIO_RESEARCH_CRON_ENABLED=true.
 */
@Injectable()
export class StudioResearchCronService {
    private readonly logger = new Logger(StudioResearchCronService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly researchService: StudioResearchService,
    ) {}

    @Cron('0 3 * * 1', { name: 'studio-research-weekly' })
    async weeklyResearchRun(): Promise<void> {
        const enabled =
            (this.config.get('STUDIO_RESEARCH_CRON_ENABLED') ?? 'false').toString().toLowerCase() ===
            'true';
        if (!enabled) {
            this.logger.debug('Research cron skipped (STUDIO_RESEARCH_CRON_ENABLED not true)');
            return;
        }
        this.logger.log('Starting weekly Riset Knowledge run…');
        await this.researchService.runResearchCron();
    }

    /** Expire pending research items older than 30 days (daily). */
    @Cron('15 5 * * *', { name: 'studio-research-expire-pending' })
    async expirePendingItems(): Promise<void> {
        const days = Number(this.config.get('STUDIO_RESEARCH_PENDING_EXPIRE_DAYS') ?? 30);
        await this.researchService.expirePendingOlderThanDays(days);
    }
}
