import { Module } from '@nestjs/common';
import { CollaborationResolver } from './collaboration.resolver';
import { CollaborationService } from './collaboration.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [CollaborationResolver, CollaborationService],
    exports: [CollaborationService],
})
export class CollaborationModule {}
