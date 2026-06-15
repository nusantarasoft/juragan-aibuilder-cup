import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { BmsService } from './bms.service';
import { BmsResolver } from './bms.resolver';

@Module({
    imports: [SupabaseModule],
    providers: [BmsService, BmsResolver],
    exports: [BmsService],
})
export class BmsModule { }
