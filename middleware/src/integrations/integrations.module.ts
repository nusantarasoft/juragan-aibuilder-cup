import { Module } from '@nestjs/common';
import { IntegrationsResolver } from './integrations.resolver';
import { IntegrationsService } from './integrations.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [IntegrationsResolver, IntegrationsService],
    exports: [IntegrationsService],
})
export class IntegrationsModule {}
