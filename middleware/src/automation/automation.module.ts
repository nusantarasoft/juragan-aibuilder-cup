import { Module } from '@nestjs/common';
import { AutomationResolver } from './automation.resolver';
import { AutomationService } from './automation.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [AutomationResolver, AutomationService],
    exports: [AutomationService],
})
export class AutomationModule {}
