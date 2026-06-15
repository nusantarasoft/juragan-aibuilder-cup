import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ScadaService } from './scada.service';
import { ScadaResolver } from './scada.resolver';

@Module({
    imports: [SupabaseModule],
    providers: [ScadaService, ScadaResolver],
    exports: [ScadaService],
})
export class ScadaModule { }
