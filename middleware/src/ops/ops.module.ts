import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { OpsService } from './ops.service';
import { OpsResolver } from './ops.resolver';
import { OpsSchedulerWorker } from './ops-scheduler.worker';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [SupabaseModule, NotificationsModule],
    providers: [OpsService, OpsResolver, OpsSchedulerWorker],
    exports: [OpsService],
})
export class OpsModule { }
