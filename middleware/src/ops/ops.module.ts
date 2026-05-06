import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { OpsService } from './ops.service';
import { OpsResolver } from './ops.resolver';

@Module({
    imports: [SupabaseModule],
    providers: [OpsService, OpsResolver],
    exports: [OpsService],
})
export class OpsModule { }
