"use client";

import React from "react";
import { Collapse, Typography } from "antd";
import type { CollapseProps } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Panel } = Collapse;
const { Text } = Typography;

const text = `
  A dog is a type of domesticated animal.
  Known for its loyalty and faithfulness,
  it can be found as a welcome guest in many households across the world.
`;

const items: CollapseProps["items"] = [
    { key: "1", label: "This is panel header 1", children: <p>{text}</p> },
    { key: "2", label: "This is panel header 2", children: <p>{text}</p> },
    { key: "3", label: "This is panel header 3", children: <p>{text}</p> },
];

// Demo 1: Basic Collapse
const BasicCollapseDemo = () => (
    <Collapse items={items} defaultActiveKey={["1"]} />
);

// Demo 2: Accordion
const AccordionCollapseDemo = () => (
    <Collapse items={items} accordion defaultActiveKey={["1"]} />
);

// Demo 3: Borderless
const BorderlessCollapseDemo = () => (
    <Collapse items={items} bordered={false} defaultActiveKey={["1"]} />
);

// Demo 4: Ghost
const GhostCollapseDemo = () => (
    <Collapse items={items} ghost defaultActiveKey={["1"]} />
);

// Demo 5: Custom Icons
const IconCollapseDemo = () => (
    <Collapse
        items={items}
        defaultActiveKey={["1"]}
        expandIcon={({ isActive }) => <span>{isActive ? "▼" : "▶"}</span>}
    />
);

// Demo 6: Collapsible Options
const CollapsibleDemo = () => (
    <Collapse
        items={[
            { key: "1", label: "Header only", children: <p>{text}</p>, collapsible: "header" },
            { key: "2", label: "Disabled", children: <p>{text}</p>, collapsible: "disabled" },
            { key: "3", label: "Icon only", children: <p>{text}</p>, collapsible: "icon" },
        ]}
    />
);

// Demo 7: Sizes
const SizesCollapseDemo = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
            <Text type="secondary">Large</Text>
            <Collapse size="large" items={[{ key: "1", label: "Large Panel", children: <p>Content</p> }]} />
        </div>
        <div>
            <Text type="secondary">Small</Text>
            <Collapse size="small" items={[{ key: "1", label: "Small Panel", children: <p>Content</p> }]} />
        </div>
    </div>
);

export const collapseData: AntdComponentData = {
    id: "antd-collapse",
    name: "Collapse",
    description: "Collapse is an accordion component for showing/hiding content sections. Supports accordion mode, custom icons, and various styles.",
    whenToUse: "Use Collapse for FAQs, settings panels, or any content that can be organized into expandable sections.",
    docUrl: "https://ant.design/components/collapse",
    demos: [
        {
            id: "basic",
            title: "Basic Collapse",
            description: "Multiple panels open",
            demo: <BasicCollapseDemo />,
            code: `<Collapse items={[
  { key: "1", label: "Header 1", children: <p>Content</p> },
  { key: "2", label: "Header 2", children: <p>Content</p> },
]} />`,
        },
        {
            id: "accordion",
            title: "Accordion",
            description: "One panel at a time",
            demo: <AccordionCollapseDemo />,
            code: `<Collapse accordion items={items} />`,
        },
        {
            id: "borderless",
            title: "Borderless",
            description: "No outer border",
            demo: <BorderlessCollapseDemo />,
            code: `<Collapse bordered={false} items={items} />`,
        },
        {
            id: "ghost",
            title: "Ghost Style",
            description: "Transparent background",
            demo: <GhostCollapseDemo />,
            code: `<Collapse ghost items={items} />`,
        },
        {
            id: "icon",
            title: "Custom Icon",
            description: "Custom expand icons",
            demo: <IconCollapseDemo />,
            code: `<Collapse
  expandIcon={({ isActive }) => <span>{isActive ? "▼" : "▶"}</span>}
  items={items}
/>`,
        },
        {
            id: "collapsible",
            title: "Collapsible Options",
            description: "Different trigger modes",
            demo: <CollapsibleDemo />,
            code: `{ collapsible: "header" } // Only header triggers
{ collapsible: "disabled" } // Disabled
{ collapsible: "icon" } // Only icon triggers`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Large and small",
            demo: <SizesCollapseDemo />,
            code: `<Collapse size="large" items={items} />
<Collapse size="small" items={items} />`,
        },
    ],
    apiProps: [
        { name: "items", type: "CollapseItem[]", description: "Panel items" },
        { name: "defaultActiveKey", type: "string | string[]", description: "Initial expanded panels" },
        { name: "activeKey", type: "string | string[]", description: "Controlled expanded panels" },
        { name: "accordion", type: "boolean", description: "Accordion mode" },
        { name: "bordered", type: "boolean", description: "Show border", default: "true" },
        { name: "ghost", type: "boolean", description: "Ghost style" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Panel size" },
        { name: "expandIcon", type: "(panelProps) => ReactNode", description: "Custom icon" },
        { name: "onChange", type: "(key) => void", description: "Change callback" },
    ],
};
