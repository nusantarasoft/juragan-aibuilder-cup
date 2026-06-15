import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { BimService } from './bim.service';
import { BimResolver } from './bim.resolver';

@Module({
    imports: [SupabaseModule],
    providers: [BimService, BimResolver],
    exports: [BimService],
})
export class BimModule { }
