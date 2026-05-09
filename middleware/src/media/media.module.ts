import { Module } from '@nestjs/common';
import { MediaResolver } from './media.resolver';
import { MediaService } from './media.service';
import { RagModule } from '../rag/rag.module';

@Module({
    imports: [RagModule],
    providers: [MediaResolver, MediaService],
    exports: [MediaService],
})
export class MediaModule { }
