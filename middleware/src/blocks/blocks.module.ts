import { Module } from '@nestjs/common';
import { BlocksResolver } from './blocks.resolver';
import { BlocksService } from './blocks.service';

@Module({
    providers: [BlocksResolver, BlocksService],
    exports: [BlocksService],
})
export class BlocksModule { }
