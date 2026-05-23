import { Module } from '@nestjs/common';
import { AuditResolver } from './audit.resolver';
import { AuditService } from './audit.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [AuditResolver, AuditService],
    exports: [AuditService],
})
export class AuditModule {}
