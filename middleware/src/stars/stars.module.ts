import { Module } from '@nestjs/common';
import { StarsService } from './stars.service';
import { StarsResolver } from './stars.resolver';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [StarsService, StarsResolver],
    exports: [StarsService],
})
export class StarsModule { }
