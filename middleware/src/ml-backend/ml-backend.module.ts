import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MLBackendController } from './ml-backend.controller';

@Module({
    imports: [ConfigModule],
    controllers: [MLBackendController],
})
export class MLBackendModule { }
