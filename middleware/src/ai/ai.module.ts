import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ClaudeAiService } from './claude-ai.service';
import { VertexAiService } from './vertex-ai.service';

@Module({
    imports: [SupabaseModule],
    providers: [VertexAiService, ClaudeAiService],
    exports: [VertexAiService, ClaudeAiService],
})
export class AiModule { }
