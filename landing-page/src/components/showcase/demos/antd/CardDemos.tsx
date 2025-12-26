"use client";

import React from "react";
import { Card, Avatar, Button, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Meta } = Card;
const { Paragraph } = Typography;

// Demo 1: Basic Card
const BasicCardDemo = () => (
    <Card title="Card Title" extra={<a href="#">More</a>} style={{ width: 300 }}>
        <p>Card content</p>
        <p>Card content</p>
    </Card>
);

// Demo 2: Simple Card
const SimpleCardDemo = () => (
    <Card style={{ width: 300 }}>
        <p>Card content without header</p>
    </Card>
);

// Demo 3: Card with Cover
const CoverCardDemo = () => (
    <Card
        hoverable
        style={{ width: 240 }}
        cover={<div style={{ height: 150, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }} />}
    >
        <Meta title="Card Title" description="This is the description" />
    </Card>
);

// Demo 4: Card with Avatar
const AvatarCardDemo = () => (
    <Card style={{ width: 300 }}>
        <Meta
            avatar={<Avatar style={{ backgroundColor: "#1890ff" }}>U</Avatar>}
            title="User Name"
            description="User description here"
        />
    </Card>
);

// Demo 5: Card Grid
const GridCardDemo = () => (
    <Card title="Card Grid">
        <Card.Grid style={{ width: "50%", textAlign: "center" }}>Grid 1</Card.Grid>
        <Card.Grid style={{ width: "50%", textAlign: "center" }}>Grid 2</Card.Grid>
        <Card.Grid style={{ width: "50%", textAlign: "center" }}>Grid 3</Card.Grid>
        <Card.Grid style={{ width: "50%", textAlign: "center" }}>Grid 4</Card.Grid>
    </Card>
);

// Demo 6: Card with Actions
const ActionsCardDemo = () => (
    <Card
        style={{ width: 300 }}
        actions={[
            <span key="edit">✏️ Edit</span>,
            <span key="delete">🗑️ Delete</span>,
            <span key="more">⋯</span>,
        ]}
    >
        <Meta title="Card with Actions" description="Click actions below" />
    </Card>
);

// Demo 7: Loading Card
const LoadingCardDemo = () => (
    <Card style={{ width: 300 }} loading>
        <Meta title="Loading Card" description="This content is loading..." />
    </Card>
);

// Demo 8: Bordered vs Borderless
const BorderCardDemo = () => (
    <Space direction="vertical">
        <Card title="Bordered" bordered style={{ width: 250 }}>
            Card with border
        </Card>
        <div style={{ background: "#f0f2f5", padding: 16 }}>
            <Card title="Borderless" bordered={false} style={{ width: 250 }}>
                Card without border
            </Card>
        </div>
    </Space>
);

// Demo 9: Card Sizes
const SizeCardDemo = () => (
    <Space direction="vertical">
        <Card title="Default Size" style={{ width: 300 }}>Default</Card>
        <Card title="Small Size" size="small" style={{ width: 300 }}>Small</Card>
    </Space>
);

export const cardData: AntdComponentData = {
    id: "antd-card",
    name: "Card",
    description: "Card is a container for displaying content related to a single subject. Supports covers, avatars, actions, and various layouts.",
    whenToUse: "Use Card to group related information. Common for product tiles, user profiles, and content previews.",
    docUrl: "https://ant.design/components/card",
    demos: [
        {
            id: "basic",
            title: "Basic Card",
            description: "Card with title and extra",
            demo: <BasicCardDemo />,
            code: `<Card title="Title" extra={<a>More</a>}>
  Card content
</Card>`,
        },
        {
            id: "simple",
            title: "Simple Card",
            description: "Card without header",
            demo: <SimpleCardDemo />,
            code: `<Card>Simple card content</Card>`,
        },
        {
            id: "cover",
            title: "Card with Cover",
            description: "Card with cover image",
            demo: <CoverCardDemo />,
            code: `<Card
  hoverable
  cover={<img src="..." />}
>
  <Meta title="Title" description="..." />
</Card>`,
        },
        {
            id: "avatar",
            title: "Card with Avatar",
            description: "Card with user avatar",
            demo: <AvatarCardDemo />,
            code: `<Card>
  <Meta
    avatar={<Avatar>U</Avatar>}
    title="User"
    description="..."
  />
</Card>`,
        },
        {
            id: "grid",
            title: "Card Grid",
            description: "Grid layout inside card",
            demo: <GridCardDemo />,
            code: `<Card title="Grid">
  <Card.Grid style={{ width: "50%" }}>Grid 1</Card.Grid>
  <Card.Grid style={{ width: "50%" }}>Grid 2</Card.Grid>
</Card>`,
        },
        {
            id: "actions",
            title: "Card with Actions",
            description: "Action buttons in footer",
            demo: <ActionsCardDemo />,
            code: `<Card
  actions={[<EditIcon />, <DeleteIcon />, <MoreIcon />]}
>
  Content
</Card>`,
        },
        {
            id: "loading",
            title: "Loading Card",
            description: "Card in loading state",
            demo: <LoadingCardDemo />,
            code: `<Card loading>Content</Card>`,
        },
        {
            id: "border",
            title: "Bordered vs Borderless",
            description: "With and without borders",
            demo: <BorderCardDemo />,
            code: `<Card bordered>Bordered</Card>
<Card bordered={false}>Borderless</Card>`,
        },
        {
            id: "size",
            title: "Card Sizes",
            description: "Default and small sizes",
            demo: <SizeCardDemo />,
            code: `<Card size="default">Default</Card>
<Card size="small">Small</Card>`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode", description: "Card title" },
        { name: "extra", type: "ReactNode", description: "Extra content in header" },
        { name: "cover", type: "ReactNode", description: "Cover image/content" },
        { name: "actions", type: "ReactNode[]", description: "Footer action buttons" },
        { name: "bordered", type: "boolean", description: "Show border", default: "true" },
        { name: "hoverable", type: "boolean", description: "Hover effect" },
        { name: "loading", type: "boolean", description: "Loading state" },
        { name: "size", type: "'default' | 'small'", description: "Card size" },
    ],
};
