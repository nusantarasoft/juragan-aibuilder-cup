"use client";

import React from "react";
import { Anchor, Row, Col, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Title, Paragraph } = Typography;

// Demo 1: Basic Anchor
const BasicAnchorDemo = () => (
    <Row>
        <Col span={16}>
            <div id="part-1" style={{ height: 80, background: "#f0f0f0", padding: 16, marginBottom: 16 }}>
                <Title level={5}>Part 1</Title>
                <Paragraph>Content for Part 1</Paragraph>
            </div>
            <div id="part-2" style={{ height: 80, background: "#e6f7ff", padding: 16, marginBottom: 16 }}>
                <Title level={5}>Part 2</Title>
                <Paragraph>Content for Part 2</Paragraph>
            </div>
            <div id="part-3" style={{ height: 80, background: "#f6ffed", padding: 16 }}>
                <Title level={5}>Part 3</Title>
                <Paragraph>Content for Part 3</Paragraph>
            </div>
        </Col>
        <Col span={8}>
            <Anchor
                items={[
                    { key: "part-1", href: "#part-1", title: "Part 1" },
                    { key: "part-2", href: "#part-2", title: "Part 2" },
                    { key: "part-3", href: "#part-3", title: "Part 3" },
                ]}
            />
        </Col>
    </Row>
);

// Demo 2: Horizontal Anchor
const HorizontalAnchorDemo = () => (
    <Anchor
        direction="horizontal"
        items={[
            { key: "intro", href: "#intro", title: "Introduction" },
            { key: "usage", href: "#usage", title: "Usage" },
            { key: "api", href: "#api", title: "API" },
            { key: "faq", href: "#faq", title: "FAQ" },
        ]}
    />
);

// Demo 3: Nested Anchor
const NestedAnchorDemo = () => (
    <Anchor
        items={[
            {
                key: "components",
                href: "#components",
                title: "Components",
                children: [
                    { key: "button", href: "#button", title: "Button" },
                    { key: "input", href: "#input", title: "Input" },
                ],
            },
            {
                key: "hooks",
                href: "#hooks",
                title: "Hooks",
                children: [
                    { key: "usestate", href: "#usestate", title: "useState" },
                    { key: "useeffect", href: "#useeffect", title: "useEffect" },
                ],
            },
        ]}
    />
);

// Demo 4: Static Anchor (no affix)
const StaticAnchorDemo = () => (
    <Anchor
        affix={false}
        items={[
            { key: "1", href: "#static-1", title: "Static Section 1" },
            { key: "2", href: "#static-2", title: "Static Section 2" },
            { key: "3", href: "#static-3", title: "Static Section 3" },
        ]}
    />
);

// Demo 5: Custom Offset
const OffsetAnchorDemo = () => (
    <div>
        <Paragraph type="secondary">Anchor with 100px offset from top</Paragraph>
        <Anchor
            targetOffset={100}
            items={[
                { key: "1", href: "#offset-1", title: "Section 1" },
                { key: "2", href: "#offset-2", title: "Section 2" },
            ]}
        />
    </div>
);

export const anchorData: AntdComponentData = {
    id: "antd-anchor",
    name: "Anchor",
    description: "Anchor provides hyperlinks to scroll to specific parts of a page. It highlights the current section and supports nested navigation.",
    whenToUse: "Use Anchor for in-page navigation, such as table of contents or section navigation in long documents.",
    docUrl: "https://ant.design/components/anchor",
    demos: [
        {
            id: "basic",
            title: "Basic Anchor",
            description: "Simple anchor navigation",
            demo: <BasicAnchorDemo />,
            code: `<Anchor
  items={[
    { key: "part-1", href: "#part-1", title: "Part 1" },
    { key: "part-2", href: "#part-2", title: "Part 2" },
  ]}
/>`,
        },
        {
            id: "horizontal",
            title: "Horizontal Anchor",
            description: "Horizontal layout",
            demo: <HorizontalAnchorDemo />,
            code: `<Anchor
  direction="horizontal"
  items={[
    { key: "intro", href: "#intro", title: "Introduction" },
    { key: "api", href: "#api", title: "API" },
  ]}
/>`,
        },
        {
            id: "nested",
            title: "Nested Anchor",
            description: "Multi-level navigation",
            demo: <NestedAnchorDemo />,
            code: `<Anchor items={[
  {
    key: "components",
    href: "#components",
    title: "Components",
    children: [
      { key: "button", href: "#button", title: "Button" },
    ],
  },
]} />`,
        },
        {
            id: "static",
            title: "Static Anchor",
            description: "Without affix behavior",
            demo: <StaticAnchorDemo />,
            code: `<Anchor affix={false} items={[...]} />`,
        },
        {
            id: "offset",
            title: "Custom Offset",
            description: "Scroll offset from top",
            demo: <OffsetAnchorDemo />,
            code: `<Anchor targetOffset={100} items={[...]} />`,
        },
    ],
    apiProps: [
        { name: "items", type: "AnchorItem[]", description: "Anchor items" },
        { name: "direction", type: "'vertical' | 'horizontal'", description: "Layout direction", default: "vertical" },
        { name: "affix", type: "boolean", description: "Fixed position", default: "true" },
        { name: "targetOffset", type: "number", description: "Scroll offset" },
        { name: "onChange", type: "(currentActiveLink) => void", description: "Link change callback" },
        { name: "onClick", type: "(e, link) => void", description: "Click handler" },
    ],
};
