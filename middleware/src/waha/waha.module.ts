import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WahaClientService } from './waha-client.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [WahaClientService],
    exports: [WahaClientService],
})
export class WahaModule {}
