import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StudioService } from './studio.service';
import { GuideFlowService } from './guide-flow.service';
import { StudioResolver } from './studio.resolver';
import { StudioUploadController } from './studio-upload.controller';
import { StudioChatController } from './studio-chat.controller';
import { StudioShareController } from './studio-share.controller';
import { StudioIngestionService } from './studio-ingestion.service';
import { StudioContextService } from './studio-context.service';
import { StudioDbContextService } from './studio-db-context.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { GqlAuthGuard } from '../auth/gql-auth.guard';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';
import { DremioModule } from '../dremio/dremio.module';
import { WhatsAppProviderModule } from '../whatsapp/whatsapp-provider.module';
import { InventoryModule } from '../inventory/inventory.module';
import { StudioWhatsAppController } from './studio-whatsapp.controller';
import { StudioWhatsAppService } from './studio-whatsapp.service';
import { StudioUmkmService } from './studio-umkm.service';
import { StudioUmkmRegistrationService } from './studio-umkm-registration.service';
import { StudioUmkmCronService } from './studio-umkm.cron';
import { StudioUmkmAgenticAskService } from './studio-umkm-agentic-ask.service';
import { StudioUmkmPendampingService } from './studio-umkm-pendamping.service';
import { StudioOutputService } from './studio-output.service';
import { InternalKasirConsultController } from './internal-kasir-consult.controller';
import { KasirConsultAosTaskService } from './kasir-consult-aos-task.service';
import { AgenticOsModule } from '../agentic-os/agentic-os.module';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { StudioWebCrawlerService } from './studio-web-crawler.service';
import { StudioWebCrawlerWorker } from './studio-web-crawler.worker';
import { StudioWebCrawlerResolver } from './studio-web-crawler.resolver';
import { StudioKnowledgeGraphService } from './studio-knowledge-graph.service';
import { StudioKnowledgeGraphResolver } from './studio-knowledge-graph.resolver';
import { StudioAgentBuilderService } from './studio-agent-builder.service';
import { StudioAgentBuilderResolver } from './studio-agent-builder.resolver';
import { StudioLabelStudioService } from './studio-label-studio.service';
import { StudioLabelStudioResolver } from './studio-label-studio.resolver';

@Module({
    imports: [
        ConfigModule,
        SupabaseModule,
        AuthModule,
        AiModule,
        RagModule,
        DremioModule,
        WhatsAppProviderModule,
        InventoryModule,
        AgenticOsModule,
        forwardRef(() => OnboardingModule),
    ],
    controllers: [
        StudioUploadController,
        StudioChatController,
        StudioShareController,
        StudioWhatsAppController,
        InternalKasirConsultController,
    ],
    providers: [
        GqlAuthGuard,
        StudioService,
        GuideFlowService,
        StudioResolver,
        StudioIngestionService,
        StudioContextService,
        StudioDbContextService,
        StudioOutputService,
        StudioWhatsAppService,
        StudioUmkmService,
        StudioUmkmRegistrationService,
        StudioUmkmAgenticAskService,
        StudioUmkmPendampingService,
        StudioUmkmCronService,
        KasirConsultAosTaskService,
        StudioWebCrawlerService,
        StudioWebCrawlerWorker,
        StudioWebCrawlerResolver,
        StudioKnowledgeGraphService,
        StudioKnowledgeGraphResolver,
        StudioAgentBuilderService,
        StudioAgentBuilderResolver,
        StudioLabelStudioService,
        StudioLabelStudioResolver,
    ],
    exports: [
        StudioService,
        GuideFlowService,
        StudioIngestionService,
        StudioContextService,
        StudioWhatsAppService,
        StudioUmkmService,
        StudioUmkmRegistrationService,
        StudioUmkmAgenticAskService,
        StudioUmkmPendampingService,
    ],
})
export class StudioModule {}
