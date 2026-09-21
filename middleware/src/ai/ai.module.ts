import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AiSettingsService } from './ai-settings.service';
import { ClaudeAiService } from './claude-ai.service';
import { VertexAiService } from './vertex-ai.service';
import { OpenAiService } from './openai-ai.service';
import { OllamaAiService } from './ollama-ai.service';
import { GroqAiService } from './groq-ai.service';
import { OpenRouterAiService } from './openrouter-ai.service';
import { AiRouterService } from './ai-router.service';

@Module({
    imports: [SupabaseModule],
    providers: [
        AiSettingsService,
        VertexAiService,
        ClaudeAiService,
        OpenAiService,
        OllamaAiService,
        GroqAiService,
        OpenRouterAiService,
        AiRouterService,
    ],
    exports: [
        AiSettingsService,
        VertexAiService,
        ClaudeAiService,
        OpenAiService,
        OllamaAiService,
        GroqAiService,
        OpenRouterAiService,
        AiRouterService,
    ],
})
export class AiModule {}
