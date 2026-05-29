import { Module } from '@nestjs/common';
import { DocumentsResolver } from './documents.resolver';
import { DocumentsService } from './documents.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [DocumentsResolver, DocumentsService],
    exports: [DocumentsService],
})
export class DocumentsModule {}
