import { Module } from '@nestjs/common';
import { EcommerceResolver } from './ecommerce.resolver';
import { EcommerceService } from './ecommerce.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [EcommerceResolver, EcommerceService],
    exports: [EcommerceService],
})
export class EcommerceModule {}
