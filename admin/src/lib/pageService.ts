/**
 * Page Service - CRUD operations via GraphQL Middleware
 * NO direct Supabase access
 */

import { graphql, queries, mutations } from "./graphqlClient";
import type { Page, PageBlock, CreatePageInput, UpdatePageInput, SuccessResponse } from "./graphqlTypes";

// Map GraphQL response to legacy CMSPage format for backward compatibility
interface CMSPage {
    id: string;
    title: string;
    slug: string;
    content: PageBlock[];
    status: "draft" | "published";
    author_id?: string;
    meta_title?: string;
    meta_description?: string;
    created_at: string;
    updated_at: string;
    published_at?: string;
}

const mapPageToCMSPage = (page: Page): CMSPage => ({
    id: page.id,
    title: page.title,
    slug: page.slug,
    content: page.content || [],
    status: page.status,
    author_id: page.authorId,
    meta_title: page.metaTitle,
    meta_description: page.metaDescription,
    created_at: page.createdAt,
    updated_at: page.updatedAt,
    published_at: page.publishedAt,
});

export const pageService = {
    // Get all pages
    async getPages(status?: string): Promise<CMSPage[]> {
        try {
            const data = await graphql<{ pages: Page[] }>(queries.pages, {
                variables: { status },
            });
            return data.pages.map(mapPageToCMSPage);
        } catch (error) {
            console.error("Error fetching pages:", error);
            return [];
        }
    },

    // Get single page by ID
    async getPage(id: string): Promise<CMSPage | null> {
        try {
            const data = await graphql<{ page: Page }>(queries.page, {
                variables: { id },
            });
            return data.page ? mapPageToCMSPage(data.page) : null;
        } catch (error) {
            console.error("Error fetching page:", error);
            return null;
        }
    },

    // Get page by slug
    async getPageBySlug(slug: string): Promise<CMSPage | null> {
        try {
            const data = await graphql<{ pageBySlug: Page }>(queries.pageBySlug, {
                variables: { slug },
            });
            return data.pageBySlug ? mapPageToCMSPage(data.pageBySlug) : null;
        } catch (error) {
            console.error("Error fetching page by slug:", error);
            return null;
        }
    },

    // Create new page
    async createPage(page: Partial<CMSPage>): Promise<CMSPage | null> {
        try {
            const input: CreatePageInput = {
                title: page.title || "Untitled Page",
                slug: page.slug,
                content: page.content,
                status: page.status || "draft",
                metaTitle: page.meta_title,
                metaDescription: page.meta_description,
            };

            const data = await graphql<{ createPage: Page }>(mutations.createPage, {
                variables: { input },
            });
            return data.createPage ? mapPageToCMSPage(data.createPage) : null;
        } catch (error) {
            console.error("Error creating page:", error);
            return null;
        }
    },

    // Update page
    async updatePage(id: string, updates: Partial<CMSPage>): Promise<CMSPage | null> {
        try {
            const input: UpdatePageInput = {
                title: updates.title,
                slug: updates.slug,
                content: updates.content,
                status: updates.status,
                metaTitle: updates.meta_title,
                metaDescription: updates.meta_description,
            };

            const data = await graphql<{ updatePage: Page }>(mutations.updatePage, {
                variables: { id, input },
            });
            return data.updatePage ? mapPageToCMSPage(data.updatePage) : null;
        } catch (error) {
            console.error("Error updating page:", error);
            return null;
        }
    },

    // Save page content (blocks)
    async savePageContent(id: string, content: PageBlock[]): Promise<boolean> {
        try {
            await graphql<{ updatePage: Page }>(mutations.updatePage, {
                variables: { id, input: { content } },
            });
            return true;
        } catch (error) {
            console.error("Error saving page content:", error);
            return false;
        }
    },

    // Publish page
    async publishPage(id: string): Promise<boolean> {
        try {
            await graphql<{ publishPage: Page }>(mutations.publishPage, {
                variables: { id },
            });
            return true;
        } catch (error) {
            console.error("Error publishing page:", error);
            return false;
        }
    },

    // Unpublish page
    async unpublishPage(id: string): Promise<boolean> {
        try {
            await graphql<{ unpublishPage: Page }>(mutations.unpublishPage, {
                variables: { id },
            });
            return true;
        } catch (error) {
            console.error("Error unpublishing page:", error);
            return false;
        }
    },

    // Delete page
    async deletePage(id: string): Promise<boolean> {
        try {
            const data = await graphql<{ deletePage: SuccessResponse }>(mutations.deletePage, {
                variables: { id },
            });
            return data.deletePage.success;
        } catch (error) {
            console.error("Error deleting page:", error);
            return false;
        }
    },

    // Duplicate page
    async duplicatePage(id: string): Promise<CMSPage | null> {
        const original = await this.getPage(id);
        if (!original) return null;

        return this.createPage({
            title: `${original.title} (Copy)`,
            slug: `${original.slug}-copy-${Date.now()}`,
            content: original.content,
            status: "draft",
            meta_title: original.meta_title,
            meta_description: original.meta_description,
        });
    },
};

export type { CMSPage, PageBlock };
export default pageService;
