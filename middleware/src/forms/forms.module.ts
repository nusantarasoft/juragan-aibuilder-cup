import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { FormsService } from './forms.service';
import { FormsResolver } from './forms.resolver';

@Module({
    imports: [SupabaseModule],
    providers: [FormsService, FormsResolver],
    exports: [FormsService],
})
export class FormsModule { }
