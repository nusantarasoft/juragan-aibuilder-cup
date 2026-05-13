import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ObjectType, Field, Int, Float } from '@nestjs/graphql';
import { DockerService } from './docker.service';

// ─── Types ───────────────────────────────────────────────────────────────────

@ObjectType()
class DockerContainer {
    @Field() id: string;
    @Field() name: string;
    @Field() image: string;
    @Field() status: string;
    @Field() state: string;
    @Field() uptime: string;
    @Field() ports: string;
    @Field(() => Float) cpu: number;
    @Field(() => Int) memory: number;
    @Field(() => Int) memoryLimit: number;
    @Field(() => Int) restarts: number;
    @Field() created: string;
}

@ObjectType()
class DockerContainerStats {
    @Field(() => Float) cpu: number;
    @Field(() => Int) memory: number;
    @Field(() => Int) memoryLimit: number;
}

@ObjectType()
class DockerLogEntry {
    @Field() timestamp: string;
    @Field() message: string;
}

@ObjectType()
class DockerActionResult {
    @Field() success: boolean;
}

// ─── Resolver ────────────────────────────────────────────────────────────────

@Resolver()
export class DockerResolver {
    constructor(private readonly dockerService: DockerService) {}

    @Query(() => [DockerContainer], { name: 'dockerContainers' })
    async listContainers(): Promise<DockerContainer[]> {
        return this.dockerService.listContainers();
    }

    @Query(() => DockerContainerStats, { name: 'dockerContainerStats' })
    async getContainerStats(
        @Args('containerId') containerId: string,
    ): Promise<DockerContainerStats> {
        return this.dockerService.getContainerStats(containerId);
    }

    @Query(() => [DockerLogEntry], { name: 'dockerContainerLogs' })
    async getContainerLogs(
        @Args('containerId') containerId: string,
        @Args('tail', { type: () => Int, defaultValue: 100 }) tail: number,
    ): Promise<DockerLogEntry[]> {
        return this.dockerService.getContainerLogs(containerId, tail);
    }

    @Mutation(() => DockerActionResult, { name: 'dockerRestartContainer' })
    async restartContainer(
        @Args('containerId') containerId: string,
    ): Promise<DockerActionResult> {
        const success = await this.dockerService.restartContainer(containerId);
        return { success };
    }

    @Mutation(() => DockerActionResult, { name: 'dockerStopContainer' })
    async stopContainer(
        @Args('containerId') containerId: string,
    ): Promise<DockerActionResult> {
        const success = await this.dockerService.stopContainer(containerId);
        return { success };
    }

    @Mutation(() => DockerActionResult, { name: 'dockerStartContainer' })
    async startContainer(
        @Args('containerId') containerId: string,
    ): Promise<DockerActionResult> {
        const success = await this.dockerService.startContainer(containerId);
        return { success };
    }
}
