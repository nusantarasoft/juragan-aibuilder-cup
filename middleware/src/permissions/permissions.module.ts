import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PermissionsService } from './permissions.service';
import { PermissionsResolver } from './permissions.resolver';
import { PermissionEngine } from './permission.engine';

@Module({
    imports: [SupabaseModule],
    providers: [PermissionsService, PermissionsResolver, PermissionEngine],
    exports: [PermissionsService, PermissionEngine],
})
export class PermissionsModule { }
