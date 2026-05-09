import { Module } from '@nestjs/common';
import { MediaResolver } from './media.resolver';
import { MediaService } from './media.service';
import { RagModule } from '../rag/rag.module';
import { StudioModule } from '../studio/studio.module';

@Module({
    imports: [RagModule, StudioModule],
    providers: [MediaResolver, MediaService],
    exports: [MediaService],
})
export class MediaModule { }
