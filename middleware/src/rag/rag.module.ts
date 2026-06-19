import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagResolver } from './rag.resolver';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [WebhooksModule, SupabaseModule, AiModule],
    providers: [RagService, RagResolver],
    exports: [RagService],
})
export class RagModule { }
