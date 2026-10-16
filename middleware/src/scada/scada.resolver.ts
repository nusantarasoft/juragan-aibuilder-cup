import { Resolver, Query, Args, ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { ScadaService } from './scada.service';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
class ScadaDataSource {
    @Field(() => ID) id: string;
    @Field() name: string;
    @Field() protocol: string;
    @Field({ nullable: true }) host?: string;
    @Field(() => Int, { nullable: true }) port?: number;
    @Field({ nullable: true }) status?: string;
}

@ObjectType()
class ScadaTag {
    @Field(() => ID) id: string;
    @Field({ nullable: true }) sourceId?: string;
    @Field() name: string;
    @Field() dataType: string;
    @Field({ nullable: true }) unit?: string;
}

@ObjectType()
class ScadaAlarmEvent {
    @Field(() => ID) id: string;
    @Field({ nullable: true }) tagId?: string;
    @Field() severity: string;
    @Field() message: string;
    @Field() status: string;
    @Field() createdAt: string;
}

const mapSource = (row: any) => ({
    id: row.id, name: row.name, protocol: row.protocol, host: row.host, port: row.port, status: row.status
});

const mapTag = (row: any) => ({
    id: row.id, sourceId: row.source_id, name: row.name, dataType: row.data_type, unit: row.unit ?? row.engineering_unit
});

const mapEvent = (row: any) => ({
    id: row.id, tagId: row.tag_id, severity: row.severity, message: row.message, status: row.status, createdAt: row.created_at
});

@Resolver()
export class ScadaResolver {
    constructor(private readonly scadaService: ScadaService) {}

    @Query(() => [ScadaDataSource])
    async scadaDataSources(@Args('tenantId') tenantId: string) {
        const data = await this.scadaService.getDataSources(tenantId);
        return data.map(mapSource);
    }

    @Query(() => [ScadaTag])
    async scadaTags(@Args('tenantId') tenantId: string, @Args('sourceId', { nullable: true }) sourceId?: string) {
        const data = await this.scadaService.getTags(tenantId, sourceId);
        return data.map(mapTag);
    }

    @Query(() => [ScadaAlarmEvent])
    async scadaActiveAlarms(@Args('tenantId') tenantId: string) {
        const data = await this.scadaService.getActiveAlarms(tenantId);
        return data.map(mapEvent);
    }
}
