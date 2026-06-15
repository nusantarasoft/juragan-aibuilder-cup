import { Resolver, Query, Mutation, Args, ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { BmsService } from './bms.service';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
class BmsSystem {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field() systemType: string;
    @Field({ nullable: true }) status?: string;
}

@ObjectType()
class BmsZone {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) systemId?: string;
    @Field() name: string;
    @Field({ nullable: true }) parentZoneId?: string;
}

@ObjectType()
class BmsEquipment {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) systemId?: string;
    @Field({ nullable: true }) zoneId?: string;
    @Field() name: string;
    @Field() equipmentType: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
}

@ObjectType()
class BmsAlarm {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) systemId?: string;
    @Field({ nullable: true }) equipmentId?: string;
    @Field() severity: string;
    @Field() message: string;
    @Field() status: string;
    @Field() createdAt: string;
}

const mapSystem = (row: any) => ({
    id: row.id, tenantId: row.tenant_id, name: row.name, systemType: row.system_type, status: row.status
});

const mapZone = (row: any) => ({
    id: row.id, tenantId: row.tenant_id, systemId: row.system_id, name: row.name, parentZoneId: row.parent_zone_id
});

const mapEquipment = (row: any) => ({
    id: row.id, tenantId: row.tenant_id, systemId: row.system_id, zoneId: row.zone_id, 
    name: row.name, equipmentType: row.equipment_type, status: row.status, metadata: row.metadata
});

const mapAlarm = (row: any) => ({
    id: row.id, tenantId: row.tenant_id, systemId: row.system_id, equipmentId: row.equipment_id,
    severity: row.severity, message: row.message, status: row.status, createdAt: row.created_at
});

@Resolver()
export class BmsResolver {
    constructor(private readonly bmsService: BmsService) {}

    @Query(() => [BmsSystem])
    async bmsSystems(@Args('tenantId') tenantId: string) {
        const data = await this.bmsService.getSystems(tenantId);
        return data.map(mapSystem);
    }

    @Query(() => [BmsZone])
    async bmsZones(@Args('tenantId') tenantId: string, @Args('systemId', { nullable: true }) systemId?: string) {
        const data = await this.bmsService.getZones(tenantId, systemId);
        return data.map(mapZone);
    }

    @Query(() => [BmsEquipment])
    async bmsEquipment(
        @Args('tenantId') tenantId: string, 
        @Args('systemId', { nullable: true }) systemId?: string,
        @Args('zoneId', { nullable: true }) zoneId?: string
    ) {
        const data = await this.bmsService.getEquipment(tenantId, { systemId, zoneId });
        return data.map(mapEquipment);
    }

    @Query(() => [BmsAlarm])
    async bmsAlarms(@Args('tenantId') tenantId: string, @Args('systemId', { nullable: true }) systemId?: string) {
        const data = await this.bmsService.getAlarms(tenantId, systemId);
        return data.map(mapAlarm);
    }
}
