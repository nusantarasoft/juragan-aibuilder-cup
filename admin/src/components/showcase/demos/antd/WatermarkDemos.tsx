"use client";

import React from "react";
import { Watermark, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Title, Paragraph } = Typography;

// Demo 1: Basic Watermark
const BasicWatermarkDemo = () => (
    <Watermark content="Ant Design">
        <div style={{ height: 200, background: "#f0f0f0", borderRadius: 8, padding: 20 }}>
            <Title level={5}>Content with Watermark</Title>
            <Paragraph>This content has a watermark overlay.</Paragraph>
        </div>
    </Watermark>
);

// Demo 2: Multi-line
const MultilineWatermarkDemo = () => (
    <Watermark content={["Ant Design", "Happy Working"]}>
        <div style={{ height: 200, background: "#f0f0f0", borderRadius: 8, padding: 20 }}>
            <Title level={5}>Multi-line Watermark</Title>
            <Paragraph>The watermark has multiple lines of text.</Paragraph>
        </div>
    </Watermark>
);

// Demo 3: Image Watermark
const ImageWatermarkDemo = () => (
    <Watermark
        image="https://gw.alipayobjects.com/zos/bmw-prod/59a18171-ae17-4571-8bd4-1c6c6bb10c38.svg"
        height={30}
        width={130}
    >
        <div style={{ height: 200, background: "#f0f0f0", borderRadius: 8, padding: 20 }}>
            <Title level={5}>Image Watermark</Title>
            <Paragraph>This uses an image as the watermark.</Paragraph>
        </div>
    </Watermark>
);

// Demo 4: Custom Style
const CustomWatermarkDemo = () => (
    <Watermark
        content="Confidential"
        font={{ color: "rgba(255, 0, 0, 0.15)", fontSize: 20 }}
        rotate={-22}
    >
        <div style={{ height: 200, background: "#f0f0f0", borderRadius: 8, padding: 20 }}>
            <Title level={5}>Custom Styled Watermark</Title>
            <Paragraph>Red colored, larger font watermark.</Paragraph>
        </div>
    </Watermark>
);

// Demo 5: Dense Watermark
const DenseWatermarkDemo = () => (
    <Watermark content="Draft" gap={[50, 50]}>
        <div style={{ height: 200, background: "#f0f0f0", borderRadius: 8, padding: 20 }}>
            <Title level={5}>Dense Watermark</Title>
            <Paragraph>Watermarks with smaller gaps.</Paragraph>
        </div>
    </Watermark>
);

// Demo 6: Offset
const OffsetWatermarkDemo = () => (
    <Watermark content="Offset" offset={[50, 50]}>
        <div style={{ height: 200, background: "#f0f0f0", borderRadius: 8, padding: 20 }}>
            <Title level={5}>Offset Watermark</Title>
            <Paragraph>Watermark with custom offset position.</Paragraph>
        </div>
    </Watermark>
);

export const watermarkData: AntdComponentData = {
    id: "antd-watermark",
    name: "Watermark",
    description: "Watermark adds a text or image overlay pattern to content. Used for document protection and ownership indication.",
    whenToUse: "Use Watermark for sensitive documents, preview content, or any content requiring ownership identification.",
    docUrl: "https://ant.design/components/watermark",
    demos: [
        {
            id: "basic",
            title: "Basic Watermark",
            description: "Simple text watermark",
            demo: <BasicWatermarkDemo />,
            code: `<Watermark content="Ant Design">
  <div>Content</div>
</Watermark>`,
        },
        {
            id: "multiline",
            title: "Multi-line",
            description: "Multiple text lines",
            demo: <MultilineWatermarkDemo />,
            code: `<Watermark content={["Line 1", "Line 2"]}>
  ...
</Watermark>`,
        },
        {
            id: "image",
            title: "Image Watermark",
            description: "Logo watermark",
            demo: <ImageWatermarkDemo />,
            code: `<Watermark image="logo.svg" width={130} height={30}>
  ...
</Watermark>`,
        },
        {
            id: "custom",
            title: "Custom Style",
            description: "Color and size",
            demo: <CustomWatermarkDemo />,
            code: `<Watermark
  content="Confidential"
  font={{ color: "rgba(255,0,0,0.15)", fontSize: 20 }}
  rotate={-22}
/>`,
        },
        {
            id: "dense",
            title: "Dense Pattern",
            description: "Smaller gaps",
            demo: <DenseWatermarkDemo />,
            code: `<Watermark gap={[50, 50]} />`,
        },
        {
            id: "offset",
            title: "Custom Offset",
            description: "Position offset",
            demo: <OffsetWatermarkDemo />,
            code: `<Watermark offset={[50, 50]} />`,
        },
    ],
    apiProps: [
        { name: "content", type: "string | string[]", description: "Watermark text" },
        { name: "image", type: "string", description: "Watermark image URL" },
        { name: "width", type: "number", description: "Watermark width", default: "120" },
        { name: "height", type: "number", description: "Watermark height", default: "64" },
        { name: "rotate", type: "number", description: "Rotation angle", default: "-22" },
        { name: "gap", type: "[number, number]", description: "Spacing between marks", default: "[100, 100]" },
        { name: "offset", type: "[number, number]", description: "Position offset" },
        { name: "zIndex", type: "number", description: "Z-index", default: "9" },
        { name: "font", type: "FontType", description: "Font settings" },
        { name: "font.color", type: "string", description: "Text color", default: "rgba(0,0,0,0.15)" },
        { name: "font.fontSize", type: "number", description: "Font size", default: "16" },
    ],
};
