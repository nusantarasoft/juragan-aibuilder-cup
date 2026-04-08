import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiModule } from '../ai/ai.module';
import { ItsmService } from './itsm.service';
import { ItsmResolver } from './itsm.resolver';

@Module({
    imports: [SupabaseModule, AiModule],
    providers: [ItsmService, ItsmResolver],
    exports: [ItsmService],
})
export class ItsmModule { }
