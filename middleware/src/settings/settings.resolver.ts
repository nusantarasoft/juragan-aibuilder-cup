import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { SettingsService, Setting } from './settings.service';

@ObjectType()
class SettingType {
    @Field(() => ID)
    id: string;

    @Field()
    key: string;

    @Field()
    value: string;

    @Field({ nullable: true })
    category?: string;

    @Field({ nullable: true })
    description?: string;

    @Field()
    createdAt: string;

    @Field()
    updatedAt: string;
}

@InputType()
class CreateSettingInput {
    @Field()
    key: string;

    @Field()
    value: string;

    @Field({ nullable: true })
    category?: string;

    @Field({ nullable: true })
    description?: string;
}

@InputType()
class UpdateSettingInput {
    @Field({ nullable: true })
    value?: string;

    @Field({ nullable: true })
    category?: string;

    @Field({ nullable: true })
    description?: string;
}

@ObjectType()
class DeleteSettingResponse {
    @Field()
    success: boolean;
}

@Resolver(() => SettingType)
export class SettingsResolver {
    constructor(private readonly settingsService: SettingsService) { }

    @Query(() => [SettingType], { name: 'settings' })
    async findAll(): Promise<Setting[]> {
        return this.settingsService.findAll();
    }

    @Query(() => [SettingType], { name: 'settingsByCategory' })
    async findByCategory(
        @Args('category') category: string,
    ): Promise<Setting[]> {
        return this.settingsService.findByCategory(category);
    }

    @Query(() => SettingType, { name: 'setting', nullable: true })
    async findOne(@Args('id', { type: () => ID }) id: string): Promise<Setting | null> {
        return this.settingsService.findOne(id);
    }

    @Query(() => SettingType, { name: 'settingByKey', nullable: true })
    async findByKey(@Args('key') key: string): Promise<Setting | null> {
        return this.settingsService.findByKey(key);
    }

    @Mutation(() => SettingType, { nullable: true })
    async createSetting(
        @Args('createSettingInput') input: CreateSettingInput,
    ): Promise<Setting | null> {
        return this.settingsService.create(input);
    }

    @Mutation(() => SettingType, { nullable: true })
    async updateSetting(
        @Args('id', { type: () => ID }) id: string,
        @Args('updateSettingInput') input: UpdateSettingInput,
    ): Promise<Setting | null> {
        return this.settingsService.update(id, input);
    }

    @Mutation(() => SettingType, { nullable: true })
    async updateSettingByKey(
        @Args('key') key: string,
        @Args('value') value: string,
    ): Promise<Setting | null> {
        return this.settingsService.updateByKey(key, value);
    }

    @Mutation(() => DeleteSettingResponse)
    async deleteSetting(
        @Args('id', { type: () => ID }) id: string,
    ): Promise<DeleteSettingResponse> {
        const success = await this.settingsService.delete(id);
        return { success };
    }
}
