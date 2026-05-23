import { Module } from '@nestjs/common';
import { DatasetsResolver } from './datasets.resolver';
import { DatasetsService } from './datasets.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [DatasetsResolver, DatasetsService],
    exports: [DatasetsService],
})
export class DatasetsModule {}
