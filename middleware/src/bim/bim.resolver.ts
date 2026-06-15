import { Resolver, Query, Args, ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';
import { BimService } from './bim.service';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
class BimModel {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) siteId?: string;
    @Field({ nullable: true }) buildingId?: string;
    @Field() name: string;
    @Field() version: string;
    @Field() fileUrl: string;
    @Field() format: string;
    @Field({ nullable: true }) status?: string;
}

@ObjectType()
class BimElement {
    @Field(() => ID) id: string;
    @Field() modelId: string;
    @Field() globalId: string;
    @Field() name: string;
    @Field() type: string;
    @Field(() => GraphQLJSON, { nullable: true }) properties?: any;
}

@ObjectType()
class BimIssue {
    @Field(() => ID) id: string;
    @Field() modelId: string;
    @Field() title: string;
    @Field() description: string;
    @Field() status: string;
    @Field() priority: string;
    @Field({ nullable: true }) assignedTo?: string;
}

@ObjectType()
class BimClashResult {
    @Field(() => ID) id: string;
    @Field() modelId: string;
    @Field() elementAId: string;
    @Field() elementBId: string;
    @Field() clashType: string;
    @Field() severity: string;
    @Field() status: string;
}

const mapModel = (row: any) => ({
    id: row.id, tenantId: row.tenant_id, siteId: row.site_id, buildingId: row.building_id,
    name: row.name, version: row.version, fileUrl: row.file_url, format: row.format, status: row.status
});

const mapElement = (row: any) => ({
    id: row.id, modelId: row.model_id, globalId: row.global_id, name: row.name, type: row.type, properties: row.properties
});

const mapIssue = (row: any) => ({
    id: row.id, modelId: row.model_id, title: row.title, description: row.description,
    status: row.status, priority: row.priority, assignedTo: row.assigned_to
});

const mapClash = (row: any) => ({
    id: row.id, modelId: row.model_id, elementAId: row.element_a_id, elementBId: row.element_b_id,
    clashType: row.clash_type, severity: row.severity, status: row.status
});

@Resolver()
export class BimResolver {
    constructor(private readonly bimService: BimService) {}

    @Query(() => [BimModel])
    async bimModels(@Args('tenantId') tenantId: string) {
        const data = await this.bimService.getModels(tenantId);
        return data.map(mapModel);
    }

    @Query(() => [BimElement])
    async bimElements(@Args('tenantId') tenantId: string, @Args('modelId') modelId: string) {
        const data = await this.bimService.getElements(tenantId, modelId);
        return data.map(mapElement);
    }

    @Query(() => [BimIssue])
    async bimIssues(@Args('tenantId') tenantId: string, @Args('modelId', { nullable: true }) modelId?: string) {
        const data = await this.bimService.getIssues(tenantId, modelId);
        return data.map(mapIssue);
    }

    @Query(() => [BimClashResult])
    async bimClashResults(@Args('tenantId') tenantId: string, @Args('modelId', { nullable: true }) modelId?: string) {
        const data = await this.bimService.getClashResults(tenantId, modelId);
        return data.map(mapClash);
    }
}
