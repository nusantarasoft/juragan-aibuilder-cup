import { Resolver, Query, Mutation, Args, ObjectType, Field, InputType, ID } from '@nestjs/graphql';
import { PagesService } from './pages.service';

// ============ Object Types ============

@ObjectType()
export class PageType {
    @Field(() => ID)
    id: string;

    @Field(() => String)
    title: string;

    @Field(() => String)
    slug: string;

    @Field(() => String, { nullable: true })
    content?: string;

    @Field(() => String)
    status: string;

    @Field(() => String, { nullable: true })
    authorId?: string;

    @Field(() => String, { nullable: true })
    createdAt?: string;

    @Field(() => String, { nullable: true })
    updatedAt?: string;

    @Field(() => String, { nullable: true })
    publishedAt?: string;

    // SEO Fields
    @Field(() => String, { nullable: true })
    metaTitle?: string;

    @Field(() => String, { nullable: true })
    metaDescription?: string;

    @Field(() => String, { nullable: true })
    ogImage?: string;

    @Field(() => String, { nullable: true })
    ogTitle?: string;

    @Field(() => String, { nullable: true })
    ogDescription?: string;
}

// ============ Input Types ============

@InputType()
class CreatePageInput {
    @Field()
    title: string;

    @Field()
    slug: string;

    @Field(() => String, { nullable: true })
    content?: string;

    @Field(() => String, { nullable: true })
    status?: string;
}

@InputType()
class UpdatePageInput {
    @Field(() => String, { nullable: true })
    title?: string;

    @Field(() => String, { nullable: true })
    slug?: string;

    @Field(() => String, { nullable: true })
    content?: string;

    @Field(() => String, { nullable: true })
    status?: string;
}

// ============ Resolver ============

@Resolver(() => PageType)
export class PagesResolver {
    constructor(private pagesService: PagesService) { }

    @Query(() => [PageType])
    async pages(
        @Args('status', { type: () => String, nullable: true }) status?: string,
    ): Promise<PageType[]> {
        return this.pagesService.findAll(status);
    }

    @Query(() => PageType, { nullable: true })
    async page(@Args('id', { type: () => ID }) id: string): Promise<PageType | null> {
        return this.pagesService.findById(id);
    }

    @Query(() => PageType, { nullable: true })
    async pageBySlug(@Args('slug') slug: string): Promise<PageType | null> {
        return this.pagesService.findBySlug(slug);
    }

    @Mutation(() => PageType)
    async createPage(@Args('input') input: CreatePageInput): Promise<PageType> {
        return this.pagesService.create(input);
    }

    @Mutation(() => PageType)
    async updatePage(
        @Args('id', { type: () => ID }) id: string,
        @Args('input') input: UpdatePageInput,
    ): Promise<PageType> {
        return this.pagesService.update(id, input);
    }

    @Mutation(() => Boolean)
    async deletePage(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
        return this.pagesService.delete(id);
    }

    @Mutation(() => PageType)
    async publishPage(@Args('id', { type: () => ID }) id: string): Promise<PageType> {
        return this.pagesService.update(id, { status: 'published' });
    }

    @Mutation(() => PageType)
    async unpublishPage(@Args('id', { type: () => ID }) id: string): Promise<PageType> {
        return this.pagesService.update(id, { status: 'draft' });
    }
}
