import { Module } from '@nestjs/common';
import { InfrastructureService } from './infrastructure.service';
import { InfrastructureResolver } from './infrastructure.resolver';

@Module({
    providers: [InfrastructureService, InfrastructureResolver],
    exports: [InfrastructureService],
})
export class InfrastructureModule {}
