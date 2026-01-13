import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagResolver } from './rag.resolver';

@Module({
    providers: [RagService, RagResolver],
    exports: [RagService],
})
export class RagModule { }
