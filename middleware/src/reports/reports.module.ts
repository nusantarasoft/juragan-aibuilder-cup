import { Module } from '@nestjs/common';
import { ReportsResolver } from './reports.resolver';
import { ReportsService } from './reports.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [ReportsResolver, ReportsService],
    exports: [ReportsService],
})
export class ReportsModule {}
