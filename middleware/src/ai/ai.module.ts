import { Module } from '@nestjs/common';
import { ClaudeAiService } from './claude-ai.service';
import { VertexAiService } from './vertex-ai.service';

@Module({
    providers: [VertexAiService, ClaudeAiService],
    exports: [VertexAiService, ClaudeAiService],
})
export class AiModule { }
