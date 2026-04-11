import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { InventoryService } from './inventory.service';
import { InventoryResolver } from './inventory.resolver';
import { InventoryCronService } from './inventory.cron';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [SupabaseModule, AiModule],
    providers: [InventoryService, InventoryResolver, InventoryCronService],
    exports: [InventoryService],
})
export class InventoryModule { }
