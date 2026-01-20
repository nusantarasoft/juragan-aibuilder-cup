import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagResolver } from './rag.resolver';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [WebhooksModule, SupabaseModule],
    providers: [RagService, RagResolver],
    exports: [RagService],
})
export class RagModule { }
