import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { ObjectType, Field, InputType, Int } from '@nestjs/graphql';
import { DremioService } from './dremio.service';
import GraphQLJSON from 'graphql-type-json';

// ─── Types ───────────────────────────────────────────────────────────────────

@ObjectType()
class DremioCatalogItem {
    @Field() id: string;
    @Field(() => [String]) path: string[];
    @Field() type: string;
    @Field({ nullable: true }) containerType?: string;
    @Field({ nullable: true }) datasetType?: string;
    @Field({ nullable: true }) tag?: string;
}

@ObjectType()
class DremioCatalogDetail {
    @Field() id: string;
    @Field(() => [String]) path: string[];
    @Field() type: string;
    @Field({ nullable: true }) entityType?: string;
    @Field({ nullable: true }) containerType?: string;
    @Field({ nullable: true }) datasetType?: string;
    @Field({ nullable: true }) tag?: string;
    @Field(() => GraphQLJSON, { nullable: true }) config?: Record<string, any>;
    @Field(() => GraphQLJSON, { nullable: true }) fields?: any[];
    @Field({ nullable: true }) sql?: string;
    @Field(() => [String], { nullable: true }) sqlContext?: string[];
    @Field(() => [DremioCatalogItem], { nullable: true }) children?: DremioCatalogItem[];
}

@ObjectType()
class DremioColumn {
    @Field() name: string;
    @Field() type: string;
}

@ObjectType()
class DremioQueryResult {
    @Field() jobId: string;
    @Field(() => Int) rowCount: number;
    @Field(() => [DremioColumn]) columns: DremioColumn[];
    @Field(() => [GraphQLJSON]) rows: Record<string, any>[];
    @Field() status: string;
}

@ObjectType()
class DremioSourceType {
    @Field() id: string;
    @Field() name: string;
    @Field() type: string;
    @Field() tag: string;
    @Field(() => GraphQLJSON, { nullable: true }) config?: Record<string, any>;
}

@ObjectType()
class DremioConnectionTest {
    @Field() success: boolean;
    @Field() message: string;
}

@ObjectType()
class DremioCsvResult {
    @Field() csv: string;
}

@ObjectType()
class DremioDeleteResult {
    @Field() success: boolean;
}

// ─── Inputs ──────────────────────────────────────────────────────────────────

@InputType()
class DremioCreateSourceInput {
    @Field() name: string;
    @Field() type: string;
    @Field(() => GraphQLJSON) config: Record<string, any>;
}

@InputType()
class DremioUpdateSourceInput {
    @Field() id: string;
    @Field() tag: string;
    @Field({ nullable: true }) name?: string;
    @Field({ nullable: true }) type?: string;
    @Field(() => GraphQLJSON, { nullable: true }) config?: Record<string, any>;
}

// ─── Resolver ────────────────────────────────────────────────────────────────

@Resolver()
export class DremioResolver {
    constructor(private readonly dremioService: DremioService) { }

    @Query(() => [DremioCatalogItem], { name: 'dremioCatalog' })
    async getCatalog(): Promise<DremioCatalogItem[]> {
        return this.dremioService.getCatalog();
    }

    @Query(() => DremioCatalogDetail, { name: 'dremioCatalogByPath' })
    async getCatalogByPath(
        @Args('path', { type: () => [String] }) path: string[],
    ): Promise<DremioCatalogDetail> {
        return this.dremioService.getCatalogByPath(path) as any;
    }

    @Query(() => DremioCatalogDetail, { name: 'dremioCatalogById' })
    async getCatalogById(
        @Args('id') id: string,
    ): Promise<DremioCatalogDetail> {
        return this.dremioService.getCatalogById(id) as any;
    }

    @Query(() => [DremioCatalogItem], { name: 'dremioCatalogChildren' })
    async getCatalogChildren(
        @Args('id') id: string,
    ): Promise<DremioCatalogItem[]> {
        return this.dremioService.getCatalogChildren(id);
    }

    @Query(() => DremioQueryResult, { name: 'dremioDatasetPreview' })
    async getDatasetPreview(
        @Args('path', { type: () => [String] }) path: string[],
        @Args('limit', { type: () => Int, defaultValue: 100 }) limit: number,
    ): Promise<DremioQueryResult> {
        return this.dremioService.getDatasetPreview(path, limit) as any;
    }

    @Query(() => [DremioSourceType], { name: 'dremioSources' })
    async getSources(): Promise<DremioSourceType[]> {
        return this.dremioService.getSources() as any;
    }

    @Query(() => DremioSourceType, { name: 'dremioSourceDetail' })
    async getSourceDetail(
        @Args('id') id: string,
    ): Promise<DremioSourceType> {
        return this.dremioService.getSourceDetail(id) as any;
    }

    @Query(() => DremioConnectionTest, { name: 'dremioTestConnection' })
    async testConnection(): Promise<DremioConnectionTest> {
        return this.dremioService.testConnection();
    }

    @Mutation(() => DremioQueryResult, { name: 'dremioRunSQL' })
    async runSQL(
        @Args('sql') sql: string,
        @Args('context', { type: () => [String], nullable: true }) context?: string[],
    ): Promise<DremioQueryResult> {
        return this.dremioService.runSQL(sql, context) as any;
    }

    @Mutation(() => DremioSourceType, { name: 'dremioCreateSource' })
    async createSource(
        @Args('input') input: DremioCreateSourceInput,
    ): Promise<DremioSourceType> {
        return this.dremioService.createSource(input) as any;
    }

    @Mutation(() => DremioSourceType, { name: 'dremioUpdateSource' })
    async updateSource(
        @Args('input') input: DremioUpdateSourceInput,
    ): Promise<DremioSourceType> {
        return this.dremioService.updateSource(input.id, input) as any;
    }

    @Mutation(() => DremioDeleteResult, { name: 'dremioDeleteSource' })
    async deleteSource(
        @Args('id') id: string,
        @Args('tag') tag: string,
    ): Promise<DremioDeleteResult> {
        const success = await this.dremioService.deleteSource(id, tag);
        return { success };
    }

    @Mutation(() => DremioCatalogDetail, { name: 'dremioCreateVDS' })
    async createVDS(
        @Args('path', { type: () => [String] }) path: string[],
        @Args('sql') sql: string,
        @Args('sqlContext', { type: () => [String], nullable: true }) sqlContext?: string[],
    ): Promise<DremioCatalogDetail> {
        return this.dremioService.createVDS(path, sql, sqlContext) as any;
    }

    @Mutation(() => DremioCatalogDetail, { name: 'dremioCreateSpace' })
    async createSpace(
        @Args('name') name: string,
    ): Promise<DremioCatalogDetail> {
        return this.dremioService.createSpace(name) as any;
    }

    @Mutation(() => DremioCsvResult, { name: 'dremioExportCsv' })
    async exportCsv(
        @Args('sql') sql: string,
    ): Promise<DremioCsvResult> {
        const result = await this.dremioService.runSQL(sql);
        const csv = this.dremioService.resultsToCsv(result);
        return { csv };
    }

    @Mutation(() => DremioCatalogDetail, { name: 'dremioUpdateVDS' })
    async updateVDS(
        @Args('id') id: string,
        @Args('tag') tag: string,
        @Args('sql') sql: string,
        @Args('sqlContext', { type: () => [String], nullable: true }) sqlContext?: string[],
    ): Promise<DremioCatalogDetail> {
        return this.dremioService.updateVDS(id, tag, sql, sqlContext) as any;
    }

    @Mutation(() => DremioDeleteResult, { name: 'dremioDeleteVDS' })
    async deleteVDS(
        @Args('id') id: string,
        @Args('tag') tag: string,
    ): Promise<DremioDeleteResult> {
        const success = await this.dremioService.deleteVDS(id, tag);
        return { success };
    }

    @Mutation(() => DremioDeleteResult, { name: 'dremioDeleteSpace' })
    async deleteSpace(
        @Args('id') id: string,
        @Args('tag') tag: string,
    ): Promise<DremioDeleteResult> {
        const success = await this.dremioService.deleteSpace(id, tag);
        return { success };
    }

    @Mutation(() => DremioDeleteResult, { name: 'dremioCancelJob' })
    async cancelJob(
        @Args('jobId') jobId: string,
    ): Promise<DremioDeleteResult> {
        const success = await this.dremioService.cancelJob(jobId);
        return { success };
    }

    @Query(() => DremioQueryResult, { name: 'dremioJobResults' })
    async getJobResults(
        @Args('jobId') jobId: string,
        @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
        @Args('limit', { type: () => Int, defaultValue: 500 }) limit: number,
    ): Promise<DremioQueryResult> {
        return this.dremioService.getJobResults(jobId, offset, limit) as any;
    }

    @Mutation(() => DremioCatalogDetail, { name: 'dremioRenameSpace' })
    async renameSpace(
        @Args('id') id: string,
        @Args('tag') tag: string,
        @Args('newName') newName: string,
    ): Promise<DremioCatalogDetail> {
        return this.dremioService.renameSpace(id, tag, newName) as any;
    }
}
