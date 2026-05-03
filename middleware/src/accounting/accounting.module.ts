import { Module } from '@nestjs/common';
import { AccountingResolver } from './accounting.resolver';
import { AccountingService } from './accounting.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [AccountingResolver, AccountingService],
    exports: [AccountingService],
})
export class AccountingModule {}
