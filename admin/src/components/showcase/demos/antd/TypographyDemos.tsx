"use client";

import React from "react";
import { Typography, Divider, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Title, Text, Paragraph, Link } = Typography;

// Demo 1: Title Levels
const TitleLevelsDemo = () => (
    <div>
        <Title level={1}>h1. Ant Design</Title>
        <Title level={2}>h2. Ant Design</Title>
        <Title level={3}>h3. Ant Design</Title>
        <Title level={4}>h4. Ant Design</Title>
        <Title level={5}>h5. Ant Design</Title>
    </div>
);

// Demo 2: Text Types
const TextTypesDemo = () => (
    <Space orientation="vertical">
        <Text>Default Text</Text>
        <Text type="secondary">Secondary Text</Text>
        <Text type="success">Success Text</Text>
        <Text type="warning">Warning Text</Text>
        <Text type="danger">Danger Text</Text>
        <Text disabled>Disabled Text</Text>
    </Space>
);

// Demo 3: Text Decorations
const TextDecorationsDemo = () => (
    <Space orientation="vertical">
        <Text mark>Marked text</Text>
        <Text code>Code text</Text>
        <Text keyboard>Keyboard text</Text>
        <Text underline>Underlined text</Text>
        <Text delete>Deleted text</Text>
        <Text strong>Strong text</Text>
        <Text italic>Italic text</Text>
    </Space>
);

// Demo 4: Paragraph
const ParagraphDemo = () => (
    <div style={{ maxWidth: 400 }}>
        <Paragraph>
            Ant Design, a design language for background applications, is refined by Ant UED Team.
            This is an example paragraph showing the Typography.Paragraph component.
        </Paragraph>
        <Paragraph ellipsis={{ rows: 2, expandable: true }}>
            Ant Design is a design language for enterprise applications. This paragraph demonstrates
            the ellipsis feature which truncates text after a certain number of rows and allows
            users to expand and see the full content. This is very useful for previews.
        </Paragraph>
    </div>
);

// Demo 5: Links
const LinksDemo = () => (
    <Space orientation="vertical">
        <Link href="https://ant.design" target="_blank">Ant Design (Link)</Link>
        <Link href="https://ant.design" target="_blank" disabled>Disabled Link</Link>
    </Space>
);

// Demo 6: Copyable
const CopyableDemo = () => (
    <Space orientation="vertical">
        <Paragraph copyable>Click to copy this text.</Paragraph>
        <Paragraph copyable={{ text: "Hello, World!" }}>Copy custom text</Paragraph>
    </Space>
);

// Demo 7: Editable
const EditableDemo = () => (
    <Space orientation="vertical">
        <Paragraph editable>Click to edit this text.</Paragraph>
        <Title level={4} editable>Editable Title</Title>
    </Space>
);

export const typographyData: AntdComponentData = {
    id: "antd-typography",
    name: "Typography",
    description: "Typography provides basic text components including Title, Text, Paragraph, and Link with styling, copy, and edit features.",
    whenToUse: "Use Typography for consistent text styling across your application. Includes headings, body text, links, and special formatting.",
    docUrl: "https://ant.design/components/typography",
    demos: [
        {
            id: "titles",
            title: "Title Levels",
            description: "h1 to h5 headings",
            demo: <TitleLevelsDemo />,
            code: `<Title level={1}>h1. Heading</Title>
<Title level={2}>h2. Heading</Title>
<Title level={3}>h3. Heading</Title>`,
        },
        {
            id: "text-types",
            title: "Text Types",
            description: "Different text states",
            demo: <TextTypesDemo />,
            code: `<Text>Default</Text>
<Text type="secondary">Secondary</Text>
<Text type="success">Success</Text>
<Text type="danger">Danger</Text>`,
        },
        {
            id: "decorations",
            title: "Text Decorations",
            description: "Styling variations",
            demo: <TextDecorationsDemo />,
            code: `<Text mark>Marked</Text>
<Text code>Code</Text>
<Text keyboard>Kbd</Text>
<Text underline>Underlined</Text>`,
        },
        {
            id: "paragraph",
            title: "Paragraph",
            description: "Paragraph with ellipsis",
            demo: <ParagraphDemo />,
            code: `<Paragraph>Full paragraph content...</Paragraph>
<Paragraph ellipsis={{ rows: 2, expandable: true }}>
  Long content that will be truncated...
</Paragraph>`,
        },
        {
            id: "links",
            title: "Links",
            description: "Link component",
            demo: <LinksDemo />,
            code: `<Link href="https://ant.design" target="_blank">
  Ant Design
</Link>`,
        },
        {
            id: "copyable",
            title: "Copyable Text",
            description: "Click to copy",
            demo: <CopyableDemo />,
            code: `<Paragraph copyable>Click to copy</Paragraph>`,
        },
        {
            id: "editable",
            title: "Editable Text",
            description: "Click to edit",
            demo: <EditableDemo />,
            code: `<Paragraph editable>Click to edit</Paragraph>`,
        },
    ],
    apiProps: [
        { name: "type", type: "'secondary' | 'success' | 'warning' | 'danger'", description: "Text type" },
        { name: "disabled", type: "boolean", description: "Disabled state" },
        { name: "mark", type: "boolean", description: "Marked style" },
        { name: "code", type: "boolean", description: "Code style" },
        { name: "copyable", type: "boolean | CopyConfig", description: "Enable copy" },
        { name: "editable", type: "boolean | EditConfig", description: "Enable edit" },
        { name: "ellipsis", type: "boolean | EllipsisConfig", description: "Ellipsis config" },
        { name: "level", type: "1 | 2 | 3 | 4 | 5", description: "Title level" },
    ],
};
