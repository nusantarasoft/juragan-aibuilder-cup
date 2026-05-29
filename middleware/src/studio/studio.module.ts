import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StudioService } from './studio.service';
import { GuideFlowService } from './guide-flow.service';
import { StudioResolver } from './studio.resolver';
import { StudioUploadController } from './studio-upload.controller';
import { StudioIngestionService } from './studio-ingestion.service';
import { StudioContextService } from './studio-context.service';
import { StudioDbContextService } from './studio-db-context.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiModule } from '../ai/ai.module';
import { RagModule } from '../rag/rag.module';
import { DremioModule } from '../dremio/dremio.module';
import { WahaModule } from '../waha/waha.module';
import { StudioWhatsAppController } from './studio-whatsapp.controller';
import { StudioWhatsAppService } from './studio-whatsapp.service';

@Module({
    imports: [ConfigModule, SupabaseModule, AiModule, RagModule, DremioModule, WahaModule],
    controllers: [StudioUploadController, StudioWhatsAppController],
    providers: [
        StudioService,
        GuideFlowService,
        StudioResolver,
        StudioIngestionService,
        StudioContextService,
        StudioDbContextService,
        StudioWhatsAppService,
    ],
    exports: [StudioService, GuideFlowService, StudioIngestionService, StudioContextService, StudioWhatsAppService],
})
export class StudioModule { }
