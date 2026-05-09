import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RagflowService } from './ragflow.service';
import { StudioService } from './studio.service';
import { StudioResolver } from './studio.resolver';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [ConfigModule, SupabaseModule],
    providers: [RagflowService, StudioService, StudioResolver],
    exports: [RagflowService, StudioService],
})
export class StudioModule { }
