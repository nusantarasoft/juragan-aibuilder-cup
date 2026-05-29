import { Module } from '@nestjs/common';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsService } from './analytics.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [AnalyticsResolver, AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule {}
