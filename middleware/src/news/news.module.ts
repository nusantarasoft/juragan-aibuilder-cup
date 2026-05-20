import { Module } from '@nestjs/common';
import { NewsResolver } from './news.resolver';
import { NewsService } from './news.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [NewsResolver, NewsService],
    exports: [NewsService],
})
export class NewsModule {}
