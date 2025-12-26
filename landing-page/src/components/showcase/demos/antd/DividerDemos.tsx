"use client";

import React from "react";
import { Divider, Typography, Button } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Paragraph, Text, Title } = Typography;

// Demo 1: Basic Divider
const BasicDividerDemo = () => (
    <div>
        <Paragraph>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</Paragraph>
        <Divider />
        <Paragraph>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</Paragraph>
    </div>
);

// Demo 2: Divider with Text
const TextDividerDemo = () => (
    <div>
        <Paragraph>Content above</Paragraph>
        <Divider>Center Text</Divider>
        <Paragraph>Content below</Paragraph>
        <Divider>Left Section</Divider>
        <Paragraph>Content below</Paragraph>
        <Divider>Right Section</Divider>
        <Paragraph>Content below</Paragraph>
    </div>
);

// Demo 3: Dashed Divider
const DashedDividerDemo = () => (
    <div>
        <Paragraph>Content above</Paragraph>
        <Divider dashed />
        <Paragraph>Content below</Paragraph>
    </div>
);

// Demo 4: Vertical Divider
const VerticalDividerDemo = () => (
    <div>
        <Text>Link 1</Text>
        <Divider type="vertical" />
        <Text>Link 2</Text>
        <Divider type="vertical" />
        <Text>Link 3</Text>
    </div>
);

// Demo 5: Plain Style
const PlainDividerDemo = () => (
    <div>
        <Paragraph>Content above</Paragraph>
        <Divider plain>Plain Text</Divider>
        <Paragraph>Content below</Paragraph>
    </div>
);

// Demo 6: Custom Styles
const StylesDividerDemo = () => (
    <div>
        <Divider style={{ borderColor: "#1890ff" }}>Blue Divider</Divider>
        <Divider style={{ borderColor: "#52c41a", borderWidth: 2 }}>Green Bold</Divider>
    </div>
);

export const dividerData: AntdComponentData = {
    id: "antd-divider",
    name: "Divider",
    description: "Divider separates content with a horizontal or vertical line, optionally with text in the middle.",
    whenToUse: "Use Divider to separate sections of content or group related elements. Can include labels for section titles.",
    docUrl: "https://ant.design/components/divider",
    demos: [
        {
            id: "basic",
            title: "Basic Divider",
            description: "Simple horizontal line",
            demo: <BasicDividerDemo />,
            code: `<Paragraph>Content above</Paragraph>
<Divider />
<Paragraph>Content below</Paragraph>`,
        },
        {
            id: "text",
            title: "Divider with Text",
            description: "Text in the divider",
            demo: <TextDividerDemo />,
            code: `<Divider>Center Text</Divider>
<Divider orientation="left">Left Text</Divider>
<Divider orientation="right">Right</Divider>`,
        },
        {
            id: "dashed",
            title: "Dashed Divider",
            description: "Dashed line style",
            demo: <DashedDividerDemo />,
            code: `<Divider dashed />`,
        },
        {
            id: "vertical",
            title: "Vertical Divider",
            description: "Vertical separator",
            demo: <VerticalDividerDemo />,
            code: `<Text>Link 1</Text>
<Divider type="vertical" />
<Text>Link 2</Text>`,
        },
        {
            id: "plain",
            title: "Plain Style",
            description: "Plain text without bold",
            demo: <PlainDividerDemo />,
            code: `<Divider plain>Plain Text</Divider>`,
        },
        {
            id: "styles",
            title: "Custom Styles",
            description: "Custom colors and width",
            demo: <StylesDividerDemo />,
            code: `<Divider style={{ borderColor: "#1890ff" }}>Blue</Divider>`,
        },
    ],
    apiProps: [
        { name: "type", type: "'horizontal' | 'vertical'", description: "Divider direction", default: "horizontal" },
        { name: "orientation", type: "'left' | 'right' | 'center'", description: "Text position" },
        { name: "dashed", type: "boolean", description: "Dashed style" },
        { name: "plain", type: "boolean", description: "Plain style text" },
        { name: "children", type: "ReactNode", description: "Content inside divider" },
        { name: "style", type: "CSSProperties", description: "Custom styles" },
    ],
};
