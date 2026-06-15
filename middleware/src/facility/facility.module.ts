import { Module } from '@nestjs/common';
import { FacilityGateway } from './facility.gateway';

@Module({
    providers: [FacilityGateway],
    exports: [FacilityGateway],
})
export class FacilityModule { }
