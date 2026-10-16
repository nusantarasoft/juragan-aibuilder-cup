import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { WhatsAppProviderModule } from '../whatsapp/whatsapp-provider.module';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationDispatcher } from './notification.dispatcher';
import { NotificationCleanupWorker } from './notification-cleanup.worker';

@Module({
    imports: [SupabaseModule, WhatsAppProviderModule],
    providers: [NotificationsService, NotificationsResolver, NotificationDispatcher, NotificationCleanupWorker],
    exports: [NotificationsService, NotificationDispatcher],
})
export class NotificationsModule { }
