import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { HrService } from './hr.service';
import { HrResolver } from './hr.resolver';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [SupabaseModule, AiModule],
    providers: [HrService, HrResolver],
    exports: [HrService],
})
export class HrModule { }
