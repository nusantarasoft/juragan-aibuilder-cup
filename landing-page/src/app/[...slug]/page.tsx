/**
 * Dynamic Page Route
 * Renders pages from CMS based on slug
 */

import { fetchPage, fetchAllPages, renderPageContent } from "@/lib/pageRenderer";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface PageProps {
    params: Promise<{ slug: string[] }>;
}

// Generate metadata from CMS page
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const resolvedParams = await params;
    const slug = resolvedParams.slug?.join("/") || "home";
    const page = await fetchPage(slug);

    if (!page) {
        return { title: "Page Not Found" };
    }

    return {
        title: page.meta_title || page.title,
        description: page.meta_description,
    };
}

// Generate static paths (optional for ISR)
export async function generateStaticParams() {
    try {
        const pages = await fetchAllPages();
        return pages.map((page) => ({
            slug: page.slug.split("/").filter(Boolean),
        }));
    } catch {
        return [];
    }
}

// Page component
export default async function DynamicPage({ params }: PageProps) {
    const resolvedParams = await params;
    const slug = resolvedParams.slug?.join("/") || "home";
    const page = await fetchPage(slug);

    if (!page) {
        notFound();
    }

    return (
        <main>
            {/* Render CMS blocks */}
            {renderPageContent(page.content)}
        </main>
    );
}
