import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StudioService } from './studio.service';
import { GuideFlowService } from './guide-flow.service';
import { StudioResolver } from './studio.resolver';
import { StudioUploadController } from './studio-upload.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [ConfigModule, SupabaseModule, AiModule],
    controllers: [StudioUploadController],
    providers: [StudioService, GuideFlowService, StudioResolver],
    exports: [StudioService, GuideFlowService],
})
export class StudioModule { }
