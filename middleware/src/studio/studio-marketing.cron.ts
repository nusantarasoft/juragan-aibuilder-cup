import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { StudioMarketingService } from './studio-marketing.service';

/** Weekly marketing batch — disabled unless STUDIO_MARKETING_CRON_ENABLED=true. */
@Injectable()
export class StudioMarketingCronService {
    private readonly logger = new Logger(StudioMarketingCronService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly marketingService: StudioMarketingService,
    ) {}

    @Cron('0 4 * * 1', { name: 'studio-marketing-weekly' })
    async weeklyMarketingRun(): Promise<void> {
        const enabled =
            (this.config.get('STUDIO_MARKETING_CRON_ENABLED') ?? 'false').toString().toLowerCase() ===
            'true';
        if (!enabled) {
            this.logger.debug('Marketing cron skipped (STUDIO_MARKETING_CRON_ENABLED not true)');
            return;
        }
        this.logger.log('Starting weekly Konten Marketing generation…');
        await this.marketingService.runMarketingCron();
    }
}
