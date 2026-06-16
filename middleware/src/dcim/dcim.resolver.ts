import { Resolver, Query, Mutation, Args, ObjectType, Field, ID, Float, Int, InputType } from '@nestjs/graphql';
import { DcimService } from './dcim.service';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
class DcimSite {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) address?: string;
    @Field({ nullable: true }) city?: string;
    @Field({ nullable: true }) country?: string;
    @Field(() => Float, { nullable: true }) latitude?: number;
    @Field(() => Float, { nullable: true }) longitude?: number;
    @Field({ nullable: true }) tierLevel?: string;
    @Field(() => Float, { nullable: true }) totalAreaSqm?: number;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class DcimBuilding {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) siteId?: string;
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field(() => Int, { nullable: true }) floors?: number;
    @Field(() => Float, { nullable: true }) totalAreaSqm?: number;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class DcimRoom {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) buildingId?: string;
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) floor?: string;
    @Field({ nullable: true }) roomType?: string;
    @Field(() => Float, { nullable: true }) totalAreaSqm?: number;
    @Field(() => Float, { nullable: true }) maxPowerKw?: number;
    @Field(() => Float, { nullable: true }) maxCoolingKw?: number;
    @Field(() => Float, { nullable: true }) raisedFloorHeightCm?: number;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) layoutData?: any;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class DcimPod {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) roomId?: string;
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class DcimRow {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) roomId?: string;
    @Field({ nullable: true }) podId?: string;
    @Field() name: string;
    @Field(() => Float, { nullable: true }) positionX?: number;
    @Field(() => Float, { nullable: true }) positionY?: number;
    @Field({ nullable: true }) orientation?: string;
    @Field({ nullable: true }) rowType?: string;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class DcimRack {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) roomId?: string;
    @Field({ nullable: true }) podId?: string;
    @Field({ nullable: true }) rowId?: string;
    @Field() name: string;
    @Field({ nullable: true }) code?: string;
    @Field(() => Int, { nullable: true }) totalU?: number;
    @Field(() => Int, { nullable: true }) widthMm?: number;
    @Field(() => Int, { nullable: true }) depthMm?: number;
    @Field(() => Float, { nullable: true }) maxWeightKg?: number;
    @Field(() => Float, { nullable: true }) positionX?: number;
    @Field(() => Float, { nullable: true }) positionY?: number;
    @Field(() => Float, { nullable: true }) positionZ?: number;
    @Field({ nullable: true }) orientation?: string;
    @Field({ nullable: true }) hasFrontDoor?: boolean;
    @Field({ nullable: true }) hasRearDoor?: boolean;
    @Field({ nullable: true }) powerFeedA?: string;
    @Field({ nullable: true }) powerFeedB?: string;
    @Field({ nullable: true }) status?: string;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

@ObjectType()
class DcimDevice {
    @Field(() => ID) id: string;
    @Field() tenantId: string;
    @Field({ nullable: true }) deviceTypeId?: string;
    @Field({ nullable: true }) rackId?: string;
    @Field() name: string;
    @Field({ nullable: true }) assetTag?: string;
    @Field({ nullable: true }) serialNumber?: string;
    @Field(() => Int, { nullable: true }) positionU?: number;
    @Field({ nullable: true }) positionFace?: string;
    @Field({ nullable: true }) hostname?: string;
    @Field({ nullable: true }) primaryIp?: string;
    @Field({ nullable: true }) osVersion?: string;
    @Field({ nullable: true }) firmwareVersion?: string;
    @Field({ nullable: true }) status?: string;
    @Field({ nullable: true }) lifecycleStage?: string;
    @Field({ nullable: true }) warrantyStart?: string;
    @Field({ nullable: true }) warrantyEnd?: string;
    @Field({ nullable: true }) purchaseDate?: string;
    @Field(() => Float, { nullable: true }) purchasePrice?: number;
    @Field({ nullable: true }) assignedTo?: string;
    @Field({ nullable: true }) notes?: string;
    @Field({ nullable: true }) managementIp?: string;
    @Field({ nullable: true }) managementUrl?: string;
    @Field({ nullable: true }) managementProtocol?: string;
    @Field({ nullable: true }) remoteCredentialsId?: string;
    @Field(() => GraphQLJSON, { nullable: true }) metadata?: any;
    @Field() createdAt: string;
    @Field() updatedAt: string;
}

// Map helpers
const mapSite = (dbRow: any) => ({
    id: dbRow.id,
    tenantId: dbRow.tenant_id,
    name: dbRow.name,
    code: dbRow.code,
    address: dbRow.address,
    city: dbRow.city,
    country: dbRow.country,
    latitude: dbRow.latitude,
    longitude: dbRow.longitude,
    tierLevel: dbRow.tier_level,
    totalAreaSqm: dbRow.total_area_sqm,
    status: dbRow.status,
    metadata: dbRow.metadata,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
});

const mapBuilding = (dbRow: any) => ({
    id: dbRow.id,
    tenantId: dbRow.tenant_id,
    siteId: dbRow.site_id,
    name: dbRow.name,
    code: dbRow.code,
    floors: dbRow.floors,
    totalAreaSqm: dbRow.total_area_sqm,
    status: dbRow.status,
    metadata: dbRow.metadata,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
});

const mapRoom = (dbRow: any) => ({
    id: dbRow.id,
    tenantId: dbRow.tenant_id,
    buildingId: dbRow.building_id,
    name: dbRow.name,
    code: dbRow.code,
    floor: dbRow.floor,
    roomType: dbRow.room_type,
    totalAreaSqm: dbRow.total_area_sqm,
    maxPowerKw: dbRow.max_power_kw,
    maxCoolingKw: dbRow.max_cooling_kw,
    raisedFloorHeightCm: dbRow.raised_floor_height_cm,
    status: dbRow.status,
    layoutData: dbRow.layout_data,
    metadata: dbRow.metadata,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
});

const mapPod = (dbRow: any) => ({
    id: dbRow.id,
    tenantId: dbRow.tenant_id,
    roomId: dbRow.room_id,
    name: dbRow.name,
    code: dbRow.code,
    status: dbRow.status,
    metadata: dbRow.metadata,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
});

const mapRow = (dbRow: any) => ({
    id: dbRow.id,
    tenantId: dbRow.tenant_id,
    roomId: dbRow.room_id,
    podId: dbRow.pod_id,
    name: dbRow.name,
    positionX: dbRow.position_x,
    positionY: dbRow.position_y,
    orientation: dbRow.orientation,
    rowType: dbRow.row_type,
    metadata: dbRow.metadata,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
});

const mapRack = (dbRow: any) => ({
    id: dbRow.id,
    tenantId: dbRow.tenant_id,
    roomId: dbRow.room_id,
    podId: dbRow.pod_id,
    rowId: dbRow.row_id,
    name: dbRow.name,
    code: dbRow.code,
    totalU: dbRow.total_u,
    widthMm: dbRow.width_mm,
    depthMm: dbRow.depth_mm,
    maxWeightKg: dbRow.max_weight_kg,
    positionX: dbRow.position_x,
    positionY: dbRow.position_y,
    positionZ: dbRow.position_z,
    orientation: dbRow.orientation,
    hasFrontDoor: dbRow.has_front_door,
    hasRearDoor: dbRow.has_rear_door,
    powerFeedA: dbRow.power_feed_a,
    powerFeedB: dbRow.power_feed_b,
    status: dbRow.status,
    metadata: dbRow.metadata,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
});

const mapDevice = (dbRow: any) => ({
    id: dbRow.id,
    tenantId: dbRow.tenant_id,
    deviceTypeId: dbRow.device_type_id,
    rackId: dbRow.rack_id,
    name: dbRow.name,
    assetTag: dbRow.asset_tag,
    serialNumber: dbRow.serial_number,
    positionU: dbRow.position_u,
    positionFace: dbRow.position_face,
    hostname: dbRow.hostname,
    primaryIp: dbRow.primary_ip,
    osVersion: dbRow.os_version,
    firmwareVersion: dbRow.firmware_version,
    status: dbRow.status,
    lifecycleStage: dbRow.lifecycle_stage,
    warrantyStart: dbRow.warranty_start,
    warrantyEnd: dbRow.warranty_end,
    purchaseDate: dbRow.purchase_date,
    purchasePrice: dbRow.purchase_price,
    assignedTo: dbRow.assigned_to,
    notes: dbRow.notes,
    managementIp: dbRow.management_ip,
    managementUrl: dbRow.management_url,
    managementProtocol: dbRow.management_protocol,
    remoteCredentialsId: dbRow.remote_credentials_id,
    metadata: dbRow.metadata,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
});

@InputType()
class CreateSiteInput {
    @Field() name: string;
    @Field({ nullable: true }) city?: string;
    @Field({ nullable: true }) tierLevel?: string;
    @Field(() => Float, { nullable: true }) totalAreaSqm?: number;
}

@Resolver()
export class DcimResolver {
    constructor(private readonly dcimService: DcimService) {}

    @Query(() => [DcimSite])
    async dcimSites(@Args('tenantId') tenantId: string) {
        const data = await this.dcimService.getSites(tenantId);
        return data.map(mapSite);
    }

    @Mutation(() => DcimSite)
    async createDcimSite(
        @Args('tenantId') tenantId: string,
        @Args('input') input: CreateSiteInput
    ) {
        const data = await this.dcimService.createSite(tenantId, input);
        return mapSite(data);
    }

    @Query(() => [DcimBuilding])
    async dcimBuildings(
        @Args('tenantId') tenantId: string,
        @Args('siteId', { nullable: true }) siteId?: string
    ) {
        const data = await this.dcimService.getBuildings(tenantId, siteId);
        return data.map(mapBuilding);
    }

    @Query(() => [DcimRoom])
    async dcimRooms(
        @Args('tenantId') tenantId: string,
        @Args('buildingId', { nullable: true }) buildingId?: string
    ) {
        const data = await this.dcimService.getRooms(tenantId, buildingId);
        return data.map(mapRoom);
    }

    @Query(() => [DcimPod])
    async dcimPods(
        @Args('tenantId') tenantId: string,
        @Args('roomId', { nullable: true }) roomId?: string
    ) {
        const data = await this.dcimService.getPods(tenantId, roomId);
        return data.map(mapPod);
    }

    @Query(() => [DcimRow])
    async dcimRows(
        @Args('tenantId') tenantId: string,
        @Args('podId', { nullable: true }) podId?: string
    ) {
        const data = await this.dcimService.getRows(tenantId, podId);
        return data.map(mapRow);
    }

    @Query(() => [DcimRack])
    async dcimRacks(
        @Args('tenantId') tenantId: string,
        @Args('roomId', { nullable: true }) roomId?: string,
        @Args('podId', { nullable: true }) podId?: string,
        @Args('rowId', { nullable: true }) rowId?: string
    ) {
        const data = await this.dcimService.getRacks(tenantId, { roomId, podId, rowId });
        return data.map(mapRack);
    }

    @Query(() => [DcimDevice])
    async dcimDevices(
        @Args('tenantId') tenantId: string,
        @Args('rackId', { nullable: true }) rackId?: string
    ) {
        const data = await this.dcimService.getDevices(tenantId, { rackId });
        return data.map(mapDevice);
    }
}
