import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { WahaModule } from '../waha/waha.module';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationDispatcher } from './notification.dispatcher';
import { NotificationCleanupWorker } from './notification-cleanup.worker';

@Module({
    imports: [SupabaseModule, WahaModule],
    providers: [NotificationsService, NotificationsResolver, NotificationDispatcher, NotificationCleanupWorker],
    exports: [NotificationsService, NotificationDispatcher],
})
export class NotificationsModule { }
