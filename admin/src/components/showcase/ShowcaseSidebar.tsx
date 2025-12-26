"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    IconChevronLeft,
    IconChevronRight,
    IconSparkles,
    IconCards,
    IconTypography,
    IconNavigation,
    IconArrowsVertical,
    IconLayoutGrid,
    IconOverline,
    IconForms,
    IconLoader,
    IconHandClick,
    IconChartBar,
    Icon3dCubeSphere,
    IconPointer,
    IconPhoto,
    IconUsers,

    IconTable,
    IconLayout,
    IconBell,
    IconSettings,
    IconFileText,
    IconList,
} from "@tabler/icons-react";

// Library types
type LibraryType = "aceternity" | "antd" | "procomponents" | "reactbits";

// Aceternity UI Component Categories - ALL 89 COMPONENTS
const aceternityCategories = [
    {
        name: "Backgrounds & Effects",
        icon: IconSparkles,
        components: [
            { id: "aurora-background", name: "Aurora Background" },
            { id: "background-beams", name: "Background Beams" },
            { id: "background-beams-with-collision", name: "Beams With Collision" },
            { id: "background-boxes", name: "Background Boxes" },
            { id: "background-gradient", name: "Background Gradient" },
            { id: "background-gradient-animation", name: "Gradient Animation" },
            { id: "background-lines", name: "Background Lines" },
            { id: "background-ripple-effect", name: "Ripple Effect" },
            { id: "canvas-reveal-effect", name: "Canvas Reveal Effect" },
            { id: "dither-shader", name: "Dither Shader" },
            { id: "glowing-effect", name: "Glowing Effect" },
            { id: "grid-background", name: "Grid Background" },
            { id: "hero-highlight", name: "Hero Highlight" },
            { id: "lamp", name: "Lamp Effect" },
            { id: "meteors", name: "Meteors" },
            { id: "noise-background", name: "Noise Background" },
            { id: "shooting-stars", name: "Shooting Stars" },
            { id: "sparkles", name: "Sparkles" },
            { id: "spotlight", name: "Spotlight" },
            { id: "spotlight-new", name: "Spotlight New" },
            { id: "svg-mask-effect", name: "SVG Mask Effect" },
            { id: "tracing-beam", name: "Tracing Beam" },
            { id: "vortex", name: "Vortex" },
            { id: "wavy-background", name: "Wavy Background" },
        ],
    },
    {
        name: "Cards",
        icon: IconCards,
        components: [
            { id: "3d-card", name: "3D Card Effect" },
            { id: "bento-grid", name: "Bento Grid" },
            { id: "card-hover-effect", name: "Card Hover Effect" },
            { id: "card-spotlight", name: "Card Spotlight" },
            { id: "card-stack", name: "Card Stack" },
            { id: "comet-card", name: "Comet Card" },
            { id: "direction-aware-hover", name: "Direction Aware Hover" },
            { id: "draggable-card", name: "Draggable Card" },
            { id: "evervault-card", name: "Evervault Card" },
            { id: "expandable-card", name: "Expandable Card" },
            { id: "focus-cards", name: "Focus Cards" },
            { id: "glare-card", name: "Glare Card" },
            { id: "glowing-stars", name: "Glowing Stars" },
            { id: "pixelated-canvas", name: "Pixelated Canvas" },
            { id: "tooltip-card", name: "Tooltip Card" },
            { id: "wobble-card", name: "Wobble Card" },
        ],
    },
    {
        name: "Text Effects",
        icon: IconTypography,
        components: [
            { id: "colourful-text", name: "Colourful Text" },
            { id: "container-text-flip", name: "Container Text Flip" },
            { id: "encrypted-text", name: "Encrypted Text" },
            { id: "flip-words", name: "Flip Words" },
            { id: "gradient-text", name: "Gradient Text" },
            { id: "text-generate-effect", name: "Text Generate Effect" },
            { id: "text-hover-effect", name: "Text Hover Effect" },
            { id: "text-reveal-card", name: "Text Reveal Card" },
            { id: "typewriter-effect", name: "Typewriter Effect" },
        ],
    },
    {
        name: "Navigation",
        icon: IconNavigation,
        components: [
            { id: "floating-dock", name: "Floating Dock" },
            { id: "floating-navbar", name: "Floating Navbar" },
            { id: "navbar-menu", name: "Navbar Menu" },
            { id: "resizable-navbar", name: "Resizable Navbar" },
            { id: "sidebar", name: "Sidebar" },
            { id: "sticky-banner", name: "Sticky Banner" },
            { id: "tabs", name: "Tabs" },
        ],
    },
    {
        name: "Scroll & Parallax",
        icon: IconArrowsVertical,
        components: [
            { id: "container-scroll-animation", name: "Container Scroll" },
            { id: "google-gemini-effect", name: "Google Gemini Effect" },
            { id: "hero-parallax", name: "Hero Parallax" },
            { id: "macbook-scroll", name: "Macbook Scroll" },
            { id: "parallax-scroll", name: "Parallax Scroll" },
            { id: "sticky-scroll-reveal", name: "Sticky Scroll Reveal" },
        ],
    },
    {
        name: "Carousels & Sliders",
        icon: IconPhoto,
        components: [
            { id: "apple-cards-carousel", name: "Apple Cards Carousel" },
            { id: "carousel", name: "Image Carousel" },
            { id: "images-slider", name: "Images Slider" },
            { id: "infinite-moving-cards", name: "Infinite Moving Cards" },
        ],
    },
    {
        name: "Layout & Grid",
        icon: IconLayoutGrid,
        components: [
            { id: "container-cover", name: "Container Cover" },
            { id: "layout-grid", name: "Layout Grid" },
        ],
    },
    {
        name: "Overlays & Modals",
        icon: IconOverline,
        components: [
            { id: "animated-modal", name: "Animated Modal" },
            { id: "animated-tooltip", name: "Animated Tooltip" },
            { id: "link-preview", name: "Link Preview" },
        ],
    },
    {
        name: "Forms & Inputs",
        icon: IconForms,
        components: [
            { id: "file-upload", name: "File Upload" },
            { id: "placeholders-and-vanish-input", name: "Vanish Input" },
            { id: "signup-form", name: "Signup Form" },
        ],
    },
    {
        name: "Loaders",
        icon: IconLoader,
        components: [
            { id: "loader", name: "Loader" },
            { id: "multi-step-loader", name: "Multi-Step Loader" },
        ],
    },
    {
        name: "Buttons",
        icon: IconHandClick,
        components: [
            { id: "hover-border-gradient", name: "Hover Border Gradient" },
            { id: "moving-border", name: "Moving Border" },
            { id: "tailwind-buttons", name: "Tailwind Buttons" },
        ],
    },
    {
        name: "Data & Visualization",
        icon: IconChartBar,
        components: [
            { id: "code-block", name: "Code Block" },
            { id: "compare", name: "Compare" },
            { id: "github-globe", name: "GitHub Globe" },
            { id: "timeline", name: "Timeline" },
            { id: "world-map", name: "World Map" },
        ],
    },
    {
        name: "3D Components",
        icon: Icon3dCubeSphere,
        components: [
            { id: "3d-marquee", name: "3D Marquee" },
            { id: "3d-pin", name: "3D Pin" },
        ],
    },
    {
        name: "Cursor & Pointer",
        icon: IconPointer,
        components: [
            { id: "following-pointer", name: "Following Pointer" },
            { id: "lens", name: "Lens" },
        ],
    },
    {
        name: "Testimonials",
        icon: IconUsers,
        components: [
            { id: "animated-testimonials", name: "Animated Testimonials" },
        ],
    },
];

// Ant Design Component Categories
const antdCategories = [
    {
        name: "General",
        icon: IconHandClick,
        components: [
            { id: "antd-button", name: "Button" },
            { id: "antd-float-button", name: "Float Button" },
            { id: "antd-icon", name: "Icon" },
            { id: "antd-typography", name: "Typography" },
        ],
    },
    {
        name: "Layout",
        icon: IconLayout,
        components: [
            { id: "antd-divider", name: "Divider" },
            { id: "antd-flex", name: "Flex" },
            { id: "antd-grid", name: "Grid" },
            { id: "antd-layout", name: "Layout" },
            { id: "antd-masonry", name: "Masonry" },
            { id: "antd-space", name: "Space" },
            { id: "antd-splitter", name: "Splitter" },
        ],
    },
    {
        name: "Navigation",
        icon: IconNavigation,
        components: [
            { id: "antd-anchor", name: "Anchor" },
            { id: "antd-breadcrumb", name: "Breadcrumb" },
            { id: "antd-dropdown", name: "Dropdown" },
            { id: "antd-menu", name: "Menu" },
            { id: "antd-pagination", name: "Pagination" },
            { id: "antd-steps", name: "Steps" },
        ],
    },
    {
        name: "Data Entry",
        icon: IconForms,
        components: [
            { id: "antd-autocomplete", name: "AutoComplete" },
            { id: "antd-cascader", name: "Cascader" },
            { id: "antd-checkbox", name: "Checkbox" },
            { id: "antd-color-picker", name: "ColorPicker" },
            { id: "antd-date-picker", name: "DatePicker" },
            { id: "antd-form", name: "Form" },
            { id: "antd-input", name: "Input" },
            { id: "antd-input-number", name: "InputNumber" },
            { id: "antd-mentions", name: "Mentions" },
            { id: "antd-radio", name: "Radio" },
            { id: "antd-rate", name: "Rate" },
            { id: "antd-select", name: "Select" },
            { id: "antd-slider", name: "Slider" },
            { id: "antd-switch", name: "Switch" },
            { id: "antd-time-picker", name: "TimePicker" },
            { id: "antd-transfer", name: "Transfer" },
            { id: "antd-tree-select", name: "TreeSelect" },
            { id: "antd-upload", name: "Upload" },
        ],
    },
    {
        name: "Data Display",
        icon: IconTable,
        components: [
            { id: "antd-avatar", name: "Avatar" },
            { id: "antd-badge", name: "Badge" },
            { id: "antd-calendar", name: "Calendar" },
            { id: "antd-card", name: "Card" },
            { id: "antd-carousel", name: "Carousel" },
            { id: "antd-collapse", name: "Collapse" },
            { id: "antd-descriptions", name: "Descriptions" },
            { id: "antd-empty", name: "Empty" },
            { id: "antd-image", name: "Image" },
            { id: "antd-list", name: "List" },
            { id: "antd-popover", name: "Popover" },
            { id: "antd-qrcode", name: "QRCode" },
            { id: "antd-segmented", name: "Segmented" },
            { id: "antd-statistic", name: "Statistic" },
            { id: "antd-table", name: "Table" },
            { id: "antd-tabs", name: "Tabs" },
            { id: "antd-tag", name: "Tag" },
            { id: "antd-timeline", name: "Timeline" },
            { id: "antd-tooltip", name: "Tooltip" },
            { id: "antd-tour", name: "Tour" },
            { id: "antd-tree", name: "Tree" },
        ],
    },
    {
        name: "Feedback",
        icon: IconBell,
        components: [
            { id: "antd-alert", name: "Alert" },
            { id: "antd-drawer", name: "Drawer" },
            { id: "antd-message", name: "Message" },
            { id: "antd-modal", name: "Modal" },
            { id: "antd-notification", name: "Notification" },
            { id: "antd-popconfirm", name: "Popconfirm" },
            { id: "antd-progress", name: "Progress" },
            { id: "antd-result", name: "Result" },
            { id: "antd-skeleton", name: "Skeleton" },
            { id: "antd-spin", name: "Spin" },
            { id: "antd-watermark", name: "Watermark" },
        ],
    },
    {
        name: "Other",
        icon: IconSettings,
        components: [
            { id: "antd-affix", name: "Affix" },
            { id: "antd-app", name: "App" },
            { id: "antd-config-provider", name: "ConfigProvider" },
        ],
    },
];

// ProComponents Categories
const proComponentCategories = [
    {
        name: "Layout",
        icon: IconLayout,
        components: [
            { id: "pro-layout", name: "ProLayout" },
            { id: "pro-page-container", name: "PageContainer" },
            { id: "pro-footer-toolbar", name: "FooterToolbar" },
        ],
    },
    {
        name: "Data Display",
        icon: IconTable,
        components: [
            { id: "pro-table", name: "ProTable" },
            { id: "pro-editable-table", name: "EditableProTable" },
            { id: "pro-list", name: "ProList" },
            { id: "pro-descriptions", name: "ProDescriptions" },
            { id: "pro-card", name: "ProCard" },
            { id: "pro-statistic-card", name: "StatisticCard" },
        ],
    },
    {
        name: "Data Entry",
        icon: IconForms,
        components: [
            { id: "pro-form", name: "ProForm" },
            { id: "pro-form-fields", name: "ProForm Fields" },
            { id: "pro-form-list", name: "ProFormList" },
            { id: "pro-steps-form", name: "StepsForm" },
            { id: "pro-modal-drawer-form", name: "ModalForm / DrawerForm" },
            { id: "pro-query-filter", name: "QueryFilter / LightFilter" },
            { id: "pro-login-form", name: "LoginForm" },
            { id: "pro-check-card", name: "CheckCard" },
        ],
    },
    {
        name: "Other",
        icon: IconFileText,
        components: [
            { id: "pro-skeleton", name: "ProSkeleton" },
            { id: "pro-field", name: "ProField" },
        ],
    },
];

// ReactBits Component Categories
const reactBitsCategories = [
    {
        name: "Text Animations",
        icon: IconTypography,
        components: [
            { id: "rb-split-text", name: "Split Text" },
            { id: "rb-blur-text", name: "Blur Text" },
        ],
    },
    {
        name: "Animations",
        icon: IconSparkles,
        components: [
            { id: "rb-animated-content", name: "Animated Content" },
        ],
    },
    {
        name: "Components",
        icon: IconCards,
        components: [
            { id: "rb-tilted-card", name: "Tilted Card" },
        ],
    },
    {
        name: "Backgrounds",
        icon: IconSparkles,
        components: [
            { id: "rb-aurora", name: "Aurora" },
        ],
    },
];

// Get categories based on library type
const getCategoriesByLibrary = (library: LibraryType) => {
    switch (library) {
        case "aceternity":
            return aceternityCategories;
        case "antd":
            return antdCategories;
        case "procomponents":
            return proComponentCategories;
        case "reactbits":
            return reactBitsCategories;
    }
};

// Calculate total components per library
const aceternityTotal = aceternityCategories.reduce((acc, cat) => acc + cat.components.length, 0);
const antdTotal = antdCategories.reduce((acc, cat) => acc + cat.components.length, 0);
const proComponentsTotal = proComponentCategories.reduce((acc, cat) => acc + cat.components.length, 0);
const reactBitsTotal = reactBitsCategories.reduce((acc, cat) => acc + cat.components.length, 0);

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    selectedComponent: string | null;
    onSelectComponent: (id: string) => void;
}

export function ShowcaseSidebar({ isOpen, onToggle, selectedComponent, onSelectComponent }: SidebarProps) {
    const [activeLibrary, setActiveLibrary] = useState<LibraryType>("aceternity");
    const [expandedCategories, setExpandedCategories] = useState<string[]>(
        getCategoriesByLibrary("aceternity").map(c => c.name)
    );

    const toggleCategory = (name: string) => {
        setExpandedCategories(prev =>
            prev.includes(name)
                ? prev.filter(c => c !== name)
                : [...prev, name]
        );
    };

    const handleLibraryChange = (library: LibraryType) => {
        setActiveLibrary(library);
        setExpandedCategories(getCategoriesByLibrary(library).map(c => c.name));
    };

    const currentCategories = getCategoriesByLibrary(activeLibrary);
    const currentTotal = activeLibrary === "aceternity" ? aceternityTotal
        : activeLibrary === "antd" ? antdTotal
            : activeLibrary === "procomponents" ? proComponentsTotal
                : reactBitsTotal;

    const libraryLabels = {
        aceternity: "Aceternity UI",
        antd: "Ant Design",
        procomponents: "ProComponents",
        reactbits: "ReactBits"
    };

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="fixed top-4 left-4 z-50 p-2 bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-700 transition-colors"
            >
                {isOpen ? (
                    <IconChevronLeft className="w-5 h-5 text-white" />
                ) : (
                    <IconChevronRight className="w-5 h-5 text-white" />
                )}
            </button>

            {/* Sidebar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        initial={{ x: -320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -320, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed left-0 top-0 h-screen w-80 bg-neutral-950 border-r border-neutral-800 z-40 overflow-y-auto"
                    >
                        <div className="p-6 pt-16">
                            <h2 className="text-xl font-bold text-white mb-2">Component Showcase</h2>
                            <p className="text-sm text-neutral-400 mb-4">{currentTotal} {libraryLabels[activeLibrary]} Components</p>

                            {/* Library Tabs */}
                            <div className="flex flex-wrap gap-1 mb-6 p-1 bg-neutral-900 rounded-lg">
                                {(["aceternity", "antd", "procomponents", "reactbits"] as LibraryType[]).map((lib) => (
                                    <button
                                        key={lib}
                                        onClick={() => handleLibraryChange(lib)}
                                        className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${activeLibrary === lib
                                            ? "bg-blue-600 text-white"
                                            : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                            }`}
                                    >
                                        {lib === "aceternity" ? "Aceternity" : lib === "antd" ? "Antd" : lib === "procomponents" ? "Pro" : "ReactBits"}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                {currentCategories.map((category) => (
                                    <div key={category.name}>
                                        <button
                                            onClick={() => toggleCategory(category.name)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
                                        >
                                            <category.icon className="w-4 h-4" />
                                            <span className="flex-1 text-sm font-medium">{category.name}</span>
                                            <span className="text-xs text-neutral-500">{category.components.length}</span>
                                        </button>

                                        <AnimatePresence>
                                            {expandedCategories.includes(category.name) && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pl-6 py-1 space-y-1">
                                                        {category.components.map((component) => (
                                                            <button
                                                                key={component.id}
                                                                onClick={() => onSelectComponent(component.id)}
                                                                className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${selectedComponent === component.id
                                                                    ? "bg-blue-600 text-white"
                                                                    : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                                                                    }`}
                                                            >
                                                                {component.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}

export { aceternityCategories, antdCategories, proComponentCategories, aceternityTotal, antdTotal, proComponentsTotal };

