import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { InventoryService } from './inventory.service';
import { InventoryResolver } from './inventory.resolver';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [SupabaseModule, AiModule],
    providers: [InventoryService, InventoryResolver],
    exports: [InventoryService],
})
export class InventoryModule { }
