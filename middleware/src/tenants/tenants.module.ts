import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { TenantsService } from './tenants.service';
import { TenantsResolver } from './tenants.resolver';

@Module({
    imports: [SupabaseModule],
    providers: [TenantsService, TenantsResolver],
    exports: [TenantsService],
})
export class TenantsModule { }
