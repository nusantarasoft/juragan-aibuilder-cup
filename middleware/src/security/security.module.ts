import { Module } from '@nestjs/common';
import { SecurityResolver } from './security.resolver';
import { SecurityService } from './security.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [SecurityResolver, SecurityService],
    exports: [SecurityService],
})
export class SecurityModule {}
