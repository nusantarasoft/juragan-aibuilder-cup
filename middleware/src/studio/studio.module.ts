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

@Module({
    imports: [ConfigModule, SupabaseModule, AiModule, RagModule, DremioModule],
    controllers: [StudioUploadController],
    providers: [
        StudioService,
        GuideFlowService,
        StudioResolver,
        StudioIngestionService,
        StudioContextService,
        StudioDbContextService,
    ],
    exports: [StudioService, GuideFlowService, StudioIngestionService, StudioContextService],
})
export class StudioModule { }
