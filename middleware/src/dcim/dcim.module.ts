import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { DcimService } from './dcim.service';
import { DcimResolver } from './dcim.resolver';

@Module({
    imports: [SupabaseModule],
    providers: [DcimService, DcimResolver],
    exports: [DcimService],
})
export class DcimModule { }
