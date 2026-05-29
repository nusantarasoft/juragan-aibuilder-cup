import { Module } from '@nestjs/common';
import { MessagingResolver } from './messaging.resolver';
import { MessagingService } from './messaging.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [MessagingResolver, MessagingService],
    exports: [MessagingService],
})
export class MessagingModule {}
