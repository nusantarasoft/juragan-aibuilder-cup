// Property Schema System for Dynamic Block Property Editing

export interface PropFieldOption {
    label: string;
    value: string | number | boolean;
}

export interface PropField {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'color' | 'array' | 'object' | 'image';
    options?: PropFieldOption[];
    defaultValue?: unknown;
    category: string;
    placeholder?: string;
    min?: number;
    max?: number;
    // For array type - defines the schema of each item
    itemSchema?: PropField[];
    // For object type - defines nested fields
    objectFields?: PropField[];
}

export interface BlockSchema {
    type: string;
    name: string;
    icon: string;
    props: PropField[];
}

// Define all block schemas
export const blockSchemas: Record<string, BlockSchema> = {
    navigation: {
        type: 'navigation',
        name: 'Navigation',
        icon: '🧭',
        props: [
            { key: 'logo', label: 'Logo Text', type: 'text', category: 'Content', placeholder: 'Brand name' },
            {
                key: 'links', label: 'Nav Links', type: 'array', category: 'Content', itemSchema: [
                    { key: 'value', label: 'Link', type: 'text', category: 'Content' }
                ]
            },
            { key: 'sticky', label: 'Sticky Header', type: 'switch', category: 'Behavior', defaultValue: true },
            { key: 'transparent', label: 'Transparent', type: 'switch', category: 'Appearance', defaultValue: false },
        ]
    },
    hero: {
        type: 'hero',
        name: 'Hero Banner',
        icon: '🦸',
        props: [
            { key: 'title', label: 'Title', type: 'text', category: 'Content', placeholder: 'Main heading' },
            { key: 'subtitle', label: 'Subtitle', type: 'textarea', category: 'Content', placeholder: 'Supporting text' },
            { key: 'ctaText', label: 'Button Text', type: 'text', category: 'Content', placeholder: 'Get Started' },
            { key: 'ctaLink', label: 'Button Link', type: 'text', category: 'Content', placeholder: '#' },
            { key: 'backgroundUrl', label: 'Background Image URL', type: 'image', category: 'Appearance' },
            { key: 'overlay', label: 'Show Overlay', type: 'switch', category: 'Appearance', defaultValue: true },
            { key: 'showRadialGradient', label: 'Aurora Gradient', type: 'switch', category: 'Appearance', defaultValue: true },
            {
                key: 'theme', label: 'Theme', type: 'select', category: 'Appearance', options: [
                    { label: 'Aurora', value: 'aurora' },
                    { label: 'Dark', value: 'dark' },
                    { label: 'Light', value: 'light' },
                ]
            },
        ]
    },
    footer: {
        type: 'footer',
        name: 'Footer',
        icon: '🦶',
        props: [
            { key: 'copyright', label: 'Copyright Text', type: 'text', category: 'Content' },
            { key: 'showSocials', label: 'Show Social Links', type: 'switch', category: 'Content', defaultValue: true },
            { key: 'facebook', label: 'Facebook URL', type: 'text', category: 'Social Links', placeholder: 'https://facebook.com/...' },
            { key: 'twitter', label: 'Twitter/X URL', type: 'text', category: 'Social Links', placeholder: 'https://twitter.com/...' },
            { key: 'instagram', label: 'Instagram URL', type: 'text', category: 'Social Links', placeholder: 'https://instagram.com/...' },
        ]
    },
    text: {
        type: 'text',
        name: 'Text Block',
        icon: '📝',
        props: [
            { key: 'content', label: 'Content', type: 'textarea', category: 'Content', placeholder: 'Enter your text...' },
            {
                key: 'align', label: 'Text Align', type: 'select', category: 'Appearance', options: [
                    { label: 'Left', value: 'left' },
                    { label: 'Center', value: 'center' },
                    { label: 'Right', value: 'right' },
                ]
            },
            {
                key: 'animation', label: 'Animation', type: 'select', category: 'Animation', options: [
                    { label: 'None', value: 'none' },
                    { label: 'Fade In', value: 'fadeIn' },
                    { label: 'Slide Up', value: 'slideUp' },
                    { label: 'Typewriter', value: 'typewriter' },
                ]
            },
        ]
    },
    features: {
        type: 'features',
        name: 'Features Grid',
        icon: '✨',
        props: [
            { key: 'title', label: 'Section Title', type: 'text', category: 'Content', placeholder: 'Our Features' },
            {
                key: 'columns', label: 'Columns', type: 'select', category: 'Layout', options: [
                    { label: '2 Columns', value: 2 },
                    { label: '3 Columns', value: 3 },
                    { label: '4 Columns', value: 4 },
                ]
            },
            {
                key: 'items', label: 'Feature Items', type: 'array', category: 'Content', itemSchema: [
                    { key: 'icon', label: 'Icon', type: 'text', category: 'Content', placeholder: '🚀' },
                    { key: 'title', label: 'Title', type: 'text', category: 'Content' },
                    { key: 'description', label: 'Description', type: 'textarea', category: 'Content' },
                    { key: 'className', label: 'CSS Class', type: 'text', category: 'Advanced' },
                ]
            },
        ]
    },
    testimonials: {
        type: 'testimonials',
        name: 'Testimonials',
        icon: '💬',
        props: [
            { key: 'title', label: 'Section Title', type: 'text', category: 'Content', placeholder: 'What Our Clients Say' },
            { key: 'autoPlay', label: 'Auto Play', type: 'switch', category: 'Animation', defaultValue: true },
            {
                key: 'speed', label: 'Speed', type: 'select', category: 'Animation', options: [
                    { label: 'Slow', value: 'slow' },
                    { label: 'Normal', value: 'normal' },
                    { label: 'Fast', value: 'fast' },
                ]
            },
            {
                key: 'direction', label: 'Direction', type: 'select', category: 'Animation', options: [
                    { label: 'Left', value: 'left' },
                    { label: 'Right', value: 'right' },
                ]
            },
            {
                key: 'items', label: 'Testimonials', type: 'array', category: 'Content', itemSchema: [
                    { key: 'name', label: 'Name', type: 'text', category: 'Content' },
                    { key: 'role', label: 'Role/Title', type: 'text', category: 'Content' },
                    { key: 'text', label: 'Quote', type: 'textarea', category: 'Content' },
                    { key: 'avatar', label: 'Avatar URL', type: 'image', category: 'Content' },
                ]
            },
        ]
    },
    pricing: {
        type: 'pricing',
        name: 'Pricing Table',
        icon: '💰',
        props: [
            { key: 'title', label: 'Section Title', type: 'text', category: 'Content', placeholder: 'Pricing Plans' },
            {
                key: 'plans', label: 'Plans', type: 'array', category: 'Content', itemSchema: [
                    { key: 'name', label: 'Plan Name', type: 'text', category: 'Content' },
                    { key: 'price', label: 'Price', type: 'text', category: 'Content', placeholder: '$29' },
                    {
                        key: 'features', label: 'Features', type: 'array', category: 'Content', itemSchema: [
                            { key: 'value', label: 'Feature', type: 'text', category: 'Content' }
                        ]
                    },
                ]
            },
        ]
    },
    gallery: {
        type: 'gallery',
        name: 'Gallery',
        icon: '🖼️',
        props: [
            { key: 'title', label: 'Section Title', type: 'text', category: 'Content', placeholder: 'Gallery' },
            {
                key: 'layout', label: 'Layout', type: 'select', category: 'Layout', options: [
                    { label: 'Grid', value: 'grid' },
                    { label: 'Masonry', value: 'masonry' },
                    { label: 'Carousel', value: 'carousel' },
                ]
            },
            {
                key: 'columns', label: 'Columns', type: 'select', category: 'Layout', options: [
                    { label: '2 Columns', value: 2 },
                    { label: '3 Columns', value: 3 },
                    { label: '4 Columns', value: 4 },
                ]
            },
            {
                key: 'images', label: 'Images', type: 'array', category: 'Content', itemSchema: [
                    { key: 'url', label: 'Image URL', type: 'image', category: 'Content' },
                    { key: 'alt', label: 'Alt Text', type: 'text', category: 'Content' },
                    { key: 'caption', label: 'Caption', type: 'text', category: 'Content' },
                ]
            },
        ]
    },
    contact: {
        type: 'contact',
        name: 'Contact Form',
        icon: '📧',
        props: [
            { key: 'title', label: 'Section Title', type: 'text', category: 'Content', placeholder: 'Contact Us' },
            { key: 'email', label: 'Contact Email', type: 'text', category: 'Content', placeholder: 'contact@example.com' },
            { key: 'showMap', label: 'Show Map', type: 'switch', category: 'Content', defaultValue: false },
        ]
    },
    dock: {
        type: 'dock',
        name: 'Floating Dock',
        icon: '🚢',
        props: [
            {
                key: 'position', label: 'Position', type: 'select', category: 'Layout', options: [
                    { label: 'Bottom', value: 'bottom' },
                    { label: 'Left', value: 'left' },
                    { label: 'Right', value: 'right' },
                ]
            },
            {
                key: 'size', label: 'Size', type: 'select', category: 'Appearance', options: [
                    { label: 'Small', value: 'small' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Large', value: 'large' },
                ]
            },
            {
                key: 'items', label: 'Dock Items', type: 'array', category: 'Content', itemSchema: [
                    { key: 'value', label: 'Label', type: 'text', category: 'Content' }
                ]
            },
        ]
    },
    games: {
        type: 'games',
        name: 'Mini Games',
        icon: '🎮',
        props: [
            {
                key: 'game', label: 'Game', type: 'select', category: 'Content', options: [
                    { label: 'Snake', value: 'snake' },
                    { label: 'Tetris', value: 'tetris' },
                    { label: 'Memory', value: 'memory' },
                ]
            },
            { key: 'enabled', label: 'Enabled', type: 'switch', category: 'Behavior', defaultValue: true },
        ]
    },
    chat: {
        type: 'chat',
        name: 'Chat Widget',
        icon: '💭',
        props: [
            { key: 'enabled', label: 'Enabled', type: 'switch', category: 'Behavior', defaultValue: true },
            { key: 'title', label: 'Widget Title', type: 'text', category: 'Content', placeholder: 'Chat with us' },
            {
                key: 'position', label: 'Position', type: 'select', category: 'Layout', options: [
                    { label: 'Bottom Right', value: 'bottom-right' },
                    { label: 'Bottom Left', value: 'bottom-left' },
                ]
            },
        ]
    },
    counter: {
        type: 'counter',
        name: 'Stats Counter',
        icon: '🔢',
        props: [
            {
                key: 'items', label: 'Counters', type: 'array', category: 'Content', itemSchema: [
                    { key: 'label', label: 'Label', type: 'text', category: 'Content' },
                    { key: 'value', label: 'Value', type: 'number', category: 'Content', min: 0 },
                    { key: 'suffix', label: 'Suffix', type: 'text', category: 'Content', placeholder: '+' },
                ]
            },
        ]
    },
    gridContainer: {
        type: 'gridContainer',
        name: 'Grid Container',
        icon: '🔲',
        props: [
            // Grid container has special handling in PropertyEditor due to complex row/column management
            // Basic props are still defined here for reference
            {
                key: 'gutter', label: 'Gutter (H, V)', type: 'object', category: 'Layout', objectFields: [
                    { key: '0', label: 'Horizontal', type: 'number', category: 'Layout', min: 0 },
                    { key: '1', label: 'Vertical', type: 'number', category: 'Layout', min: 0 },
                ]
            },
        ]
    },
};

// Helper to get schema for a block type
export function getBlockSchema(type: string): BlockSchema | undefined {
    return blockSchemas[type];
}

// Get unique categories from a schema
export function getCategories(schema: BlockSchema): string[] {
    const categories = new Set<string>();
    schema.props.forEach(prop => categories.add(prop.category));
    return Array.from(categories);
}
