import { Module } from '@nestjs/common';
import { PagesResolver } from './pages.resolver';
import { PagesService } from './pages.service';

@Module({
    providers: [PagesResolver, PagesService],
    exports: [PagesService],
})
export class PagesModule { }
