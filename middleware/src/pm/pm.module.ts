import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiModule } from '../ai/ai.module';
import { PmService } from './pm.service';
import { PmResolver } from './pm.resolver';

@Module({
    imports: [SupabaseModule, AiModule],
    providers: [PmService, PmResolver],
    exports: [PmService],
})
export class PmModule { }
