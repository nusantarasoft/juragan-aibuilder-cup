import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { NotificationsService } from './notifications.service';
import { NotificationsResolver } from './notifications.resolver';

@Module({
    imports: [SupabaseModule],
    providers: [NotificationsService, NotificationsResolver],
    exports: [NotificationsService],
})
export class NotificationsModule { }
