import { Resolver, Query } from '@nestjs/graphql';
import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { InfrastructureService } from './infrastructure.service';

// ─── GraphQL Types ───────────────────────────────────────────────────────────

@ObjectType()
class SystemInfo {
    @Field() hostname: string;
    @Field() os: string;
    @Field() architecture: string;
    @Field(() => Int) cpuCount: number;
    @Field(() => Int) totalMemoryMB: number;
    @Field(() => Int) usedMemoryMB: number;
    @Field() dockerVersion: string;
    @Field(() => Int) containerCount: number;
    @Field(() => Int) runningCount: number;
    @Field(() => Int) stoppedCount: number;
    @Field(() => Int) imageCount: number;
    @Field(() => Int) volumeCount: number;
    @Field(() => Int) networkCount: number;
    @Field(() => Int) uptimeSeconds: number;
    @Field(() => Float) diskTotalGB: number;
    @Field(() => Float) diskUsedGB: number;
}

@ObjectType()
class PortainerEndpointGQL {
    @Field(() => Int) id: number;
    @Field() name: string;
    @Field(() => Int) type: number;
    @Field() url: string;
    @Field(() => Int) status: number;
    @Field(() => Int) snapshots: number;
    @Field(() => Int) containers: number;
    @Field(() => Int) runningContainers: number;
    @Field(() => Int) stoppedContainers: number;
    @Field(() => Int) images: number;
    @Field(() => Int) volumes: number;
}

@ObjectType()
class MinioInfo {
    @Field() version: string;
    @Field(() => Int) uptime: number;
    @Field(() => Int) bucketCount: number;
    @Field(() => Int) objectCount: number;
    @Field(() => Float) totalSizeBytes: number;
    @Field(() => Int) disks: number;
    @Field(() => Int) onlineDisks: number;
    @Field() healthStatus: string;
}

// ─── Resolver ────────────────────────────────────────────────────────────────

@Resolver()
export class InfrastructureResolver {
    constructor(private readonly infraService: InfrastructureService) {}

    @Query(() => SystemInfo, { name: 'systemInfo' })
    async getSystemInfo(): Promise<SystemInfo> {
        return this.infraService.getSystemInfo() as any;
    }

    @Query(() => [PortainerEndpointGQL], { name: 'portainerEndpoints' })
    async getPortainerEndpoints(): Promise<PortainerEndpointGQL[]> {
        return this.infraService.getPortainerEndpoints() as any;
    }

    @Query(() => MinioInfo, { name: 'minioServerInfo' })
    async getMinioServerInfo(): Promise<MinioInfo> {
        return this.infraService.getMinioServerInfo() as any;
    }
}
