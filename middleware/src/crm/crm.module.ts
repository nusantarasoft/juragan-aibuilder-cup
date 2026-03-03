import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CrmService } from './crm.service';
import { CrmResolver } from './crm.resolver';

@Module({
    imports: [SupabaseModule],
    providers: [CrmService, CrmResolver],
    exports: [CrmService],
})
export class CrmModule { }
