"use client";

import React from "react";
import { Card, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Note: Masonry is a new component in Ant Design 5.x
// Creating visual mockup since it may not be available in current version

// Demo 1: Basic Masonry Visual
const BasicMasonryDemo = () => (
    <div style={{ columns: 2, columnGap: 16 }}>
        <Card style={{ marginBottom: 16, breakInside: "avoid" }}>Short Content</Card>
        <Card style={{ marginBottom: 16, breakInside: "avoid", height: 100 }}>Taller Content</Card>
        <Card style={{ marginBottom: 16, breakInside: "avoid", height: 60 }}>Medium</Card>
        <Card style={{ marginBottom: 16, breakInside: "avoid", height: 80 }}>Another Card</Card>
        <Card style={{ marginBottom: 16, breakInside: "avoid" }}>Small</Card>
        <Card style={{ marginBottom: 16, breakInside: "avoid", height: 120 }}>Tallest Card</Card>
    </div>
);

// Demo 2: Three Columns
const ThreeColumnMasonryDemo = () => (
    <div style={{ columns: 3, columnGap: 16 }}>
        {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} style={{ marginBottom: 16, breakInside: "avoid", height: 40 + Math.random() * 80 }}>
                Item {i + 1}
            </Card>
        ))}
    </div>
);

// Demo 3: With Images Mockup
const ImageMasonryDemo = () => (
    <div style={{ columns: 2, columnGap: 8 }}>
        {[100, 150, 80, 120, 90, 140].map((height, i) => (
            <div
                key={i}
                style={{
                    marginBottom: 8,
                    breakInside: "avoid",
                    height,
                    background: `linear-gradient(135deg, hsl(${i * 60}, 70%, 60%), hsl(${i * 60 + 30}, 70%, 50%))`,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "bold",
                }}
            >
                Image {i + 1}
            </div>
        ))}
    </div>
);

// Demo 4: Card Gallery
const GalleryMasonryDemo = () => (
    <div style={{ columns: 2, columnGap: 12 }}>
        <Card cover={<div style={{ height: 80, background: "#1890ff" }} />} style={{ marginBottom: 12, breakInside: "avoid" }}>
            <Card.Meta title="Card Title" description="Description" />
        </Card>
        <Card cover={<div style={{ height: 120, background: "#52c41a" }} />} style={{ marginBottom: 12, breakInside: "avoid" }}>
            <Card.Meta title="Card Title" description="Description" />
        </Card>
        <Card cover={<div style={{ height: 60, background: "#faad14" }} />} style={{ marginBottom: 12, breakInside: "avoid" }}>
            <Card.Meta title="Card Title" />
        </Card>
        <Card cover={<div style={{ height: 100, background: "#722ed1" }} />} style={{ marginBottom: 12, breakInside: "avoid" }}>
            <Card.Meta title="Card Title" description="Description" />
        </Card>
    </div>
);

// Demo 5: Gutter Sizes
const GutterMasonryDemo = () => (
    <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
            <Text type="secondary">8px gap</Text>
            <div style={{ columns: 2, columnGap: 8, marginTop: 8 }}>
                <Card style={{ marginBottom: 8, breakInside: "avoid" }}>A</Card>
                <Card style={{ marginBottom: 8, breakInside: "avoid", height: 60 }}>B</Card>
                <Card style={{ marginBottom: 8, breakInside: "avoid" }}>C</Card>
            </div>
        </div>
        <div style={{ flex: 1 }}>
            <Text type="secondary">24px gap</Text>
            <div style={{ columns: 2, columnGap: 24, marginTop: 8 }}>
                <Card style={{ marginBottom: 24, breakInside: "avoid" }}>A</Card>
                <Card style={{ marginBottom: 24, breakInside: "avoid", height: 60 }}>B</Card>
                <Card style={{ marginBottom: 24, breakInside: "avoid" }}>C</Card>
            </div>
        </div>
    </div>
);

export const masonryData: AntdComponentData = {
    id: "antd-masonry",
    name: "Masonry",
    description: "Masonry layout arranges items in an optimal position based on available vertical space, like a Pinterest-style grid.",
    whenToUse: "Use Masonry for image galleries, card collections, or any content with variable heights that should flow into optimal positions.",
    docUrl: "https://ant.design/components/masonry",
    demos: [
        {
            id: "basic",
            title: "Basic Masonry",
            description: "Two-column layout",
            demo: <BasicMasonryDemo />,
            code: `<Masonry columns={2} gutter={16}>
  <Card>Content 1</Card>
  <Card style={{ height: 100 }}>Taller</Card>
  <Card>Content 3</Card>
</Masonry>`,
        },
        {
            id: "three-columns",
            title: "Three Columns",
            description: "More columns for wider layouts",
            demo: <ThreeColumnMasonryDemo />,
            code: `<Masonry columns={3} gutter={16}>
  {items.map(item => <Card key={item.id}>{item.content}</Card>)}
</Masonry>`,
        },
        {
            id: "images",
            title: "Image Gallery",
            description: "Masonry with images",
            demo: <ImageMasonryDemo />,
            code: `<Masonry columns={2} gutter={8}>
  {images.map(img => <img key={img.id} src={img.url} />)}
</Masonry>`,
        },
        {
            id: "gallery",
            title: "Card Gallery",
            description: "Cards with covers",
            demo: <GalleryMasonryDemo />,
            code: `<Masonry columns={2}>
  {cards.map(card => (
    <Card cover={<img src={card.cover} />}>
      <Card.Meta title={card.title} />
    </Card>
  ))}
</Masonry>`,
        },
        {
            id: "gutter",
            title: "Gutter Sizes",
            description: "Different spacing options",
            demo: <GutterMasonryDemo />,
            code: `<Masonry gutter={8}>...</Masonry>
<Masonry gutter={24}>...</Masonry>`,
        },
    ],
    apiProps: [
        { name: "columns", type: "number | { xs, sm, md, lg, xl }", description: "Number of columns" },
        { name: "gutter", type: "number | [number, number]", description: "Spacing between items" },
        { name: "sequential", type: "boolean", description: "Layout items sequentially" },
        { name: "children", type: "ReactNode", description: "Masonry items" },
    ],
};
