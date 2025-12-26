"use client";

import React, { useState } from "react";
import { Skeleton, Space, Switch, Avatar, Card, List } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Skeleton
const BasicSkeletonDemo = () => (
    <Skeleton />
);

// Demo 2: Active Animation
const ActiveSkeletonDemo = () => (
    <Skeleton active />
);

// Demo 3: With Avatar
const AvatarSkeletonDemo = () => (
    <Skeleton avatar paragraph={{ rows: 4 }} />
);

// Demo 4: Different Sizes
const SizesSkeletonDemo = () => (
    <Space direction="vertical" style={{ width: "100%" }}>
        <Skeleton.Button size="large" active />
        <Skeleton.Button size="default" active />
        <Skeleton.Button size="small" active />
        <Space>
            <Skeleton.Avatar size="large" active />
            <Skeleton.Avatar size="default" active />
            <Skeleton.Avatar size="small" active />
        </Space>
        <Skeleton.Input size="large" active block />
    </Space>
);

// Demo 5: Button and Input
const ElementSkeletonDemo = () => (
    <Space>
        <Skeleton.Button active />
        <Skeleton.Avatar active />
        <Skeleton.Input active style={{ width: 200 }} />
    </Space>
);

// Demo 6: Image Skeleton
const ImageSkeletonDemo = () => (
    <Space>
        <Skeleton.Image active />
        <Skeleton.Image active />
    </Space>
);

// Demo 7: In Card
const CardSkeletonDemo = () => (
    <Card style={{ width: 300 }}>
        <Skeleton loading={true} avatar active>
            <Card.Meta
                avatar={<Avatar>U</Avatar>}
                title="Card title"
                description="Card description"
            />
        </Skeleton>
    </Card>
);

// Demo 8: Custom Rows
const RowsSkeletonDemo = () => (
    <Skeleton paragraph={{ rows: 6, width: ["100%", "80%", "60%", "40%", "20%", "10%"] }} />
);

export const skeletonData: AntdComponentData = {
    id: "antd-skeleton",
    name: "Skeleton",
    description: "Skeleton provides placeholder loading states for content. Supports avatars, paragraphs, images, and custom elements.",
    whenToUse: "Use Skeleton while content is loading to provide visual feedback and reduce perceived wait time.",
    docUrl: "https://ant.design/components/skeleton",
    demos: [
        {
            id: "basic",
            title: "Basic Skeleton",
            description: "Simple loading state",
            demo: <BasicSkeletonDemo />,
            code: `<Skeleton />`,
        },
        {
            id: "active",
            title: "Active Animation",
            description: "Animated skeleton",
            demo: <ActiveSkeletonDemo />,
            code: `<Skeleton active />`,
        },
        {
            id: "avatar",
            title: "With Avatar",
            description: "Avatar placeholder",
            demo: <AvatarSkeletonDemo />,
            code: `<Skeleton avatar paragraph={{ rows: 4 }} />`,
        },
        {
            id: "sizes",
            title: "Different Sizes",
            description: "Size variants",
            demo: <SizesSkeletonDemo />,
            code: `<Skeleton.Button size="large" />
<Skeleton.Avatar size="small" />
<Skeleton.Input size="default" />`,
        },
        {
            id: "elements",
            title: "Element Skeletons",
            description: "Buttons, inputs, avatars",
            demo: <ElementSkeletonDemo />,
            code: `<Skeleton.Button />
<Skeleton.Avatar />
<Skeleton.Input />`,
        },
        {
            id: "image",
            title: "Image Skeleton",
            description: "Image placeholder",
            demo: <ImageSkeletonDemo />,
            code: `<Skeleton.Image active />`,
        },
        {
            id: "card",
            title: "In Card",
            description: "Card loading state",
            demo: <CardSkeletonDemo />,
            code: `<Skeleton loading={true} avatar>
  <Card.Meta title="Title" />
</Skeleton>`,
        },
        {
            id: "rows",
            title: "Custom Rows",
            description: "Custom paragraph widths",
            demo: <RowsSkeletonDemo />,
            code: `<Skeleton paragraph={{ rows: 6, width: [...] }} />`,
        },
    ],
    apiProps: [
        { name: "active", type: "boolean", description: "Animate skeleton" },
        { name: "loading", type: "boolean", description: "Show skeleton" },
        { name: "avatar", type: "boolean | AvatarProps", description: "Show avatar" },
        { name: "title", type: "boolean | TitleProps", description: "Show title" },
        { name: "paragraph", type: "boolean | ParagraphProps", description: "Show paragraph" },
        { name: "paragraph.rows", type: "number", description: "Number of rows" },
        { name: "paragraph.width", type: "string | string[]", description: "Row widths" },
        { name: "Skeleton.Button", type: "Component", description: "Button skeleton" },
        { name: "Skeleton.Avatar", type: "Component", description: "Avatar skeleton" },
        { name: "Skeleton.Input", type: "Component", description: "Input skeleton" },
        { name: "Skeleton.Image", type: "Component", description: "Image skeleton" },
    ],
};
