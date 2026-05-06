import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { OpsService } from './ops.service';
import { OpsResolver } from './ops.resolver';
import { OpsSchedulerWorker } from './ops-scheduler.worker';

@Module({
    imports: [SupabaseModule],
    providers: [OpsService, OpsResolver, OpsSchedulerWorker],
    exports: [OpsService],
})
export class OpsModule { }
