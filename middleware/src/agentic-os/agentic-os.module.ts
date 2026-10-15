import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsAppProviderModule } from '../whatsapp/whatsapp-provider.module';
import { AgenticOsService } from './agentic-os.service';
import { AgenticOsResolver } from './agentic-os.resolver';
import { AgenticOsRunner } from './agentic-os.runner';
import { AgenticOsPulse } from './agentic-os.pulse';
import { AgenticOsWorkflows } from './agentic-os.workflows';
import { AgenticOsGoals } from './agentic-os.goals';
import { AosAuthGuard } from './aos-auth.guard';
import { AosKasirLiveService } from './aos-kasir-live.service';
import { AosRecruitService } from './aos-recruit.service';
import { AosTenantAgentSettingsService } from './aos-tenant-agent-settings.service';
import { AosTaskQueueEvents } from './aos-task-queue.events';
import { AosUsageMetricsService } from './aos-usage-metrics.service';

@Module({
    imports: [SupabaseModule, AuthModule, AiModule, NotificationsModule, WhatsAppProviderModule],
    providers: [
        AosTaskQueueEvents,
        AgenticOsService,
        AgenticOsResolver,
        AgenticOsRunner,
        AgenticOsPulse,
        AgenticOsWorkflows,
        AgenticOsGoals,
        AosAuthGuard,
        AosKasirLiveService,
        AosRecruitService,
        AosTenantAgentSettingsService,
        AosUsageMetricsService,
    ],
    exports: [AgenticOsService, AosTenantAgentSettingsService],
})
export class AgenticOsModule { }
