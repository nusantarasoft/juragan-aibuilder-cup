import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationDispatcher } from './notification.dispatcher';

@Module({
    imports: [SupabaseModule],
    providers: [NotificationsService, NotificationsResolver, NotificationDispatcher],
    exports: [NotificationsService, NotificationDispatcher],
})
export class NotificationsModule { }
