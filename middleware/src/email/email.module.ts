import { Module } from '@nestjs/common';
import { EmailResolver } from './email.resolver';
import { EmailService } from './email.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [EmailResolver, EmailService],
    exports: [EmailService],
})
export class EmailModule {}
