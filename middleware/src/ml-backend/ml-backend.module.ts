import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MLBackendController } from './ml-backend.controller';
import { AiModule } from '../ai/ai.module';

@Module({
    imports: [ConfigModule, AiModule],
    controllers: [MLBackendController],
})
export class MLBackendModule { }
