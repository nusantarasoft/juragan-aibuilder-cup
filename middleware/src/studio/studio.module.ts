import { Module } from '@nestjs/common';
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
import { WahaModule } from '../waha/waha.module';
import { WhatsAppProviderModule } from '../whatsapp/whatsapp-provider.module';
import { InventoryModule } from '../inventory/inventory.module';
import { StudioWhatsAppController } from './studio-whatsapp.controller';
import { StudioWhatsAppService } from './studio-whatsapp.service';
import { StudioUmkmService } from './studio-umkm.service';
import { StudioUmkmCronService } from './studio-umkm.cron';
import { StudioUmkmAgenticAskService } from './studio-umkm-agentic-ask.service';
import { StudioUmkmPendampingService } from './studio-umkm-pendamping.service';
import { StudioOutputService } from './studio-output.service';

@Module({
    imports: [
        ConfigModule,
        SupabaseModule,
        AuthModule,
        AiModule,
        RagModule,
        DremioModule,
        WahaModule,
        WhatsAppProviderModule,
        InventoryModule,
    ],
    controllers: [StudioUploadController, StudioChatController, StudioShareController, StudioWhatsAppController],
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
        StudioUmkmAgenticAskService,
        StudioUmkmPendampingService,
        StudioUmkmCronService,
    ],
    exports: [
        StudioService,
        GuideFlowService,
        StudioIngestionService,
        StudioContextService,
        StudioWhatsAppService,
        StudioUmkmService,
        StudioUmkmAgenticAskService,
        StudioUmkmPendampingService,
    ],
})
export class StudioModule {}
