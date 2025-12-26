/**
 * Page Renderer Service
 * Renders CMS page content from JSON blocks to React components
 */

import React from "react";

// Block type definitions
export interface BlockData {
    id: string;
    type: string;
    props: Record<string, any>;
}

export interface PageData {
    id: string;
    title: string;
    slug: string;
    content: BlockData[];
    meta_title?: string;
    meta_description?: string;
}

// Fetch page data from CMS API
export async function fetchPage(slug: string): Promise<PageData | null> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_CMS_API_URL || "http://localhost:3001";
        const response = await fetch(`${baseUrl}/api/pages?slug=${slug}`, {
            cache: "no-store", // SSR fresh data
        });

        const data = await response.json();
        return data.success ? data.page : null;
    } catch (error) {
        console.error("Failed to fetch page:", error);
        return null;
    }
}

// Fetch all published pages for static generation
export async function fetchAllPages(): Promise<PageData[]> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_CMS_API_URL || "http://localhost:3001";
        const response = await fetch(`${baseUrl}/api/pages`, {
            cache: "no-store",
        });

        const data = await response.json();
        return data.success ? data.pages : [];
    } catch (error) {
        console.error("Failed to fetch pages:", error);
        return [];
    }
}

// Fetch settings from CMS
export async function fetchSettings(category?: string): Promise<Record<string, any>> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_CMS_API_URL || "http://localhost:3001";
        const url = category
            ? `${baseUrl}/api/settings?category=${category}`
            : `${baseUrl}/api/settings`;

        const response = await fetch(url, { cache: "no-store" });
        const data = await response.json();
        return data.success ? data.settings : {};
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return {};
    }
}

// Block component registry
const blockComponents: Record<string, React.ComponentType<any>> = {};

// Register a block component
export function registerBlockComponent(type: string, component: React.ComponentType<any>) {
    blockComponents[type] = component;
}

// Get block component by type
export function getBlockComponent(type: string): React.ComponentType<any> | null {
    return blockComponents[type] || null;
}

// Render a single block
export function renderBlock(block: BlockData): React.ReactNode {
    const Component = getBlockComponent(block.type);

    if (!Component) {
        // Fallback for unknown block types
        return (
            <div key={block.id} style={{ padding: 20, background: "#f0f0f0", margin: 10 }}>
                <p>Unknown block type: {block.type}</p>
            </div>
        );
    }

    return <Component key={block.id} {...block.props} />;
}

// Render all blocks on a page
export function renderPageContent(content: BlockData[]): React.ReactNode[] {
    return content.map(renderBlock);
}

// Default blocks (can be extended)
registerBlockComponent("hero", ({ title, subtitle, backgroundImage }) => (
    <section className="hero" style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        padding: "100px 20px",
        textAlign: "center",
        background: backgroundImage ? undefined : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
    }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>{title}</h1>
        {subtitle && <p style={{ fontSize: "1.5rem", opacity: 0.9 }}>{subtitle}</p>}
    </section>
));

registerBlockComponent("text", ({ content, alignment = "left" }) => (
    <section className="text-block" style={{
        padding: "40px 20px",
        maxWidth: 800,
        margin: "0 auto",
        textAlign: alignment,
    }}>
        <div dangerouslySetInnerHTML={{ __html: content || "" }} />
    </section>
));

registerBlockComponent("image", ({ src, alt, caption }) => (
    <figure style={{
        padding: "20px",
        textAlign: "center",
        margin: "0 auto",
    }}>
        <img src={src} alt={alt || ""} style={{ maxWidth: "100%", height: "auto" }} />
        {caption && <figcaption style={{ marginTop: 10, color: "#666" }}>{caption}</figcaption>}
    </figure>
));

registerBlockComponent("columns", ({ columns = [] }) => (
    <section style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        gap: "20px",
        padding: "40px 20px",
    }}>
        {columns.map((col: any, i: number) => (
            <div key={i} style={{ padding: 20 }}>
                {col.title && <h3>{col.title}</h3>}
                <p>{col.content}</p>
            </div>
        ))}
    </section>
));

registerBlockComponent("cta", ({ title, buttonText, buttonUrl, backgroundColor = "#1677ff" }) => (
    <section style={{
        padding: "60px 20px",
        textAlign: "center",
        background: backgroundColor,
        color: "white",
    }}>
        <h2 style={{ marginBottom: 20 }}>{title}</h2>
        {buttonText && (
            <a href={buttonUrl || "#"} style={{
                display: "inline-block",
                padding: "12px 30px",
                background: "white",
                color: backgroundColor,
                borderRadius: 4,
                textDecoration: "none",
                fontWeight: "bold",
            }}>
                {buttonText}
            </a>
        )}
    </section>
)); registerBlockComponent("gallery", ({ images = [], columns = 4 }) => (
    <section style={{ padding: "40px 20px" }}>
        <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 16,
        }}>
            {images.map((img: any, i: number) => (
                <div key={i} style={{ aspectRatio: "1", overflow: "hidden", borderRadius: 8 }}>
                    <img
                        src={img.src}
                        alt={img.alt || ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                </div>
            ))}
        </div>
    </section>
));

registerBlockComponent("form", ({ fields = [], submitLabel = "Submit", action }) => (
    <section style={{ padding: "40px 20px", maxWidth: 600, margin: "0 auto" }}>
        <form action={action} method="POST" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {fields.map((field: any) => (
                <div key={field.id}>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                        {field.label}
                        {field.required && <span style={{ color: "red" }}> *</span>}
                    </label>
                    {field.type === "textarea" ? (
                        <textarea
                            name={field.id}
                            placeholder={field.placeholder}
                            required={field.required}
                            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #d9d9d9" }}
                            rows={4}
                        />
                    ) : field.type === "select" ? (
                        <select
                            name={field.id}
                            required={field.required}
                            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #d9d9d9" }}
                        >
                            <option value="">Select...</option>
                            {(field.options || []).map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type={field.type || "text"}
                            name={field.id}
                            placeholder={field.placeholder}
                            required={field.required}
                            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #d9d9d9" }}
                        />
                    )}
                </div>
            ))}
            <button type="submit" style={{
                padding: "12px 24px",
                background: "#1677ff",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontWeight: 500,
            }}>
                {submitLabel}
            </button>
        </form>
    </section>
));

export default {
    fetchPage,
    fetchAllPages,
    fetchSettings,
    registerBlockComponent,
    renderPageContent,
};
