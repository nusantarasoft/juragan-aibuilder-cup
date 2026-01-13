export interface BlockProps {
    [key: string]: string | number | boolean | string[] | object | undefined;
}

export interface ElementNode {
    key: string;           // Unique identifier like "title", "button"
    label: string;         // Display name
    type: "text" | "button" | "container" | "image" | "list";
    icon?: string;
    children?: ElementNode[];
}

// Grid container types for Ant Design Row/Col system
export interface GridColumn {
    span: number;  // 1-24 (Ant Design 24-column grid)
    block?: PageBlock | null;
}

export interface GridRow {
    columns: GridColumn[];
}

export interface PageBlock {
    id: string;
    type: string;
    name: string;
    icon: string;
    props: BlockProps;
    children?: PageBlock[];  // For grid containers
}

// Helper to get element tree structure for each block type
export function getElementTree(block: PageBlock): ElementNode[] {
    switch (block.type) {
        case "hero":
            return [
                { key: "container", label: "Container", type: "container", icon: "📦" },
                { key: "title", label: "Title", type: "text", icon: "📝" },
                { key: "subtitle", label: "Subtitle", type: "text", icon: "📝" },
                { key: "button", label: "Button", type: "button", icon: "🔘" },
            ];
        case "testimonials":
            return [
                { key: "container", label: "Container", type: "container", icon: "📦" },
                { key: "title", label: "Section Title", type: "text", icon: "📝" },
                { key: "card", label: "Card", type: "container", icon: "🃏" },
                { key: "quote", label: "Quote Text", type: "text", icon: "💬" },
                { key: "name", label: "Author Name", type: "text", icon: "👤" },
            ];
        case "features":
            return [
                { key: "container", label: "Container", type: "container", icon: "📦" },
                { key: "title", label: "Section Title", type: "text", icon: "📝" },
                { key: "item", label: "Grid Item", type: "container", icon: "🔲" },
                { key: "description", label: "Description", type: "text", icon: "📝" },
            ];
        case "navigation":
            return [
                { key: "container", label: "Container", type: "container", icon: "📦" },
                { key: "logo", label: "Logo", type: "text", icon: "🏷️" },
                { key: "links", label: "Nav Links", type: "list", icon: "🔗" },
            ];
        case "gridContainer":
            return [
                { key: "container", label: "Grid Container", type: "container", icon: "🔲" },
            ];
        default:
            return [{ key: "container", label: "Container", type: "container", icon: "📦" }];
    }
}

// Default props for each block type with enhanced MagicUI/Aceternity support
export const blockDefaults: Record<string, BlockProps> = {
    navigation: {
        logo: "Nusantarasoft",
        links: ["Home", "About", "Services", "Contact"],
        sticky: true,
        transparent: false,
    },
    hero: {
        title: "Welcome to Our Website",
        subtitle: "Build amazing experiences with our platform",
        ctaText: "Get Started",
        ctaLink: "#",
        backgroundUrl: "",
        overlay: true,
        showRadialGradient: true,
        theme: "aurora",
        layout: { title: { order: 0 }, subtitle: { order: 1 }, button: { order: 2 } },
    },
    footer: {
        copyright: "© 2024 Nusantarasoft. All rights reserved.",
        showSocials: true,
        facebook: "",
        twitter: "",
        instagram: "",
    },
    text: {
        content: "Enter your text here...",
        align: "left",
        animation: "none",
    },
    features: {
        title: "Our Features",
        columns: 3,
        items: [
            { title: "Smart Automation", description: "Automate your workflow with AI.", icon: "🚀", className: "col-span-1" },
            { title: "Fast Performance", description: "Optimized for speed and efficiency.", icon: "⚡", className: "col-span-1" },
            { title: "Secure Platform", description: "Enterprise-grade security built-in.", icon: "🛡️", className: "col-span-1" },
            { title: "24/7 Support", description: "We are here to help anytime.", icon: "🎧", className: "col-span-2" },
        ],
    },
    testimonials: {
        title: "What Our Clients Say",
        autoPlay: true,
        speed: "normal",
        direction: "left",
        items: [
            { name: "John Doe", role: "CEO", text: "Amazing service! Highly recommended.", avatar: "" },
            { name: "Jane Smith", role: "CTO", text: "The best platform we've used.", avatar: "" },
            { name: "Mike Johnson", role: "Developer", text: "Incredible developer experience.", avatar: "" },
        ],
    },
    pricing: {
        title: "Pricing Plans",
        plans: [
            { name: "Basic", price: "$9", features: ["Feature 1", "Feature 2"] },
            { name: "Pro", price: "$29", features: ["All Basic", "Feature 3", "Feature 4"] },
        ],
    },
    gallery: {
        title: "Gallery",
        layout: "grid",
        columns: 3,
        images: [],
    },
    contact: {
        title: "Contact Us",
        email: "contact@example.com",
        showMap: false,
    },
    dock: {
        items: ["Home", "Shop", "Search", "Settings"],
        position: "bottom",
        size: "medium",
    },
    games: {
        game: "snake",
        enabled: true,
    },
    chat: {
        enabled: true,
        title: "Chat with us",
        position: "bottom-right",
    },
    counter: {
        items: [
            { label: "Users", value: 1000, suffix: "+" },
            { label: "Projects", value: 500, suffix: "+" },
        ],
    },
    gridContainer: {
        gutter: [16, 16],  // [horizontal, vertical]
        rows: [
            {
                columns: [
                    { span: 12, block: null },
                    { span: 12, block: null },
                ]
            }
        ],
    },
};
