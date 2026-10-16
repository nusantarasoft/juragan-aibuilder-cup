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

@Module({
    imports: [SupabaseModule, AuthModule, AiModule, NotificationsModule, WhatsAppProviderModule],
    providers: [
        AgenticOsService,
        AgenticOsResolver,
        AgenticOsRunner,
        AgenticOsPulse,
        AgenticOsWorkflows,
        AgenticOsGoals,
        AosAuthGuard,
        AosKasirLiveService,
    ],
    exports: [AgenticOsService],
})
export class AgenticOsModule { }
