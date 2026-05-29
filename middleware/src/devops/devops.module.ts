import { Module } from '@nestjs/common';
import { DevopsResolver } from './devops.resolver';
import { DevopsService } from './devops.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
    imports: [SupabaseModule],
    providers: [DevopsResolver, DevopsService],
    exports: [DevopsService],
})
export class DevopsModule {}
