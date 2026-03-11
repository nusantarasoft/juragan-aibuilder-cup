import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CrmService } from './crm.service';
import { CrmResolver } from './crm.resolver';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [SupabaseModule, AiModule],
    providers: [CrmService, CrmResolver],
    exports: [CrmService],
})
export class CrmModule { }
