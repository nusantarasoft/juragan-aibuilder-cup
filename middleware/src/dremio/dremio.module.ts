import { Module } from '@nestjs/common';
import { DremioResolver } from './dremio.resolver';
import { DremioService } from './dremio.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
    imports: [SettingsModule],
    providers: [DremioResolver, DremioService],
    exports: [DremioService],
})
export class DremioModule { }
