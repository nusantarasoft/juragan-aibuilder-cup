"use client";

import React, { useState } from "react";
import { Tag, Space, Divider } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Tag
const BasicTagDemo = () => (
    <Space>
        <Tag>Tag 1</Tag>
        <Tag>Tag 2</Tag>
        <Tag closable>Closable</Tag>
    </Space>
);

// Demo 2: Colorful Tags
const ColorfulTagDemo = () => (
    <Space wrap>
        <Tag color="magenta">magenta</Tag>
        <Tag color="red">red</Tag>
        <Tag color="volcano">volcano</Tag>
        <Tag color="orange">orange</Tag>
        <Tag color="gold">gold</Tag>
        <Tag color="lime">lime</Tag>
        <Tag color="green">green</Tag>
        <Tag color="cyan">cyan</Tag>
        <Tag color="blue">blue</Tag>
        <Tag color="geekblue">geekblue</Tag>
        <Tag color="purple">purple</Tag>
    </Space>
);

// Demo 3: Custom Colors
const CustomColorDemo = () => (
    <Space wrap>
        <Tag color="#f50">#f50</Tag>
        <Tag color="#2db7f5">#2db7f5</Tag>
        <Tag color="#87d068">#87d068</Tag>
        <Tag color="#108ee9">#108ee9</Tag>
    </Space>
);

// Demo 4: Status Tags
const StatusTagDemo = () => (
    <Space wrap>
        <Tag color="success">success</Tag>
        <Tag color="processing">processing</Tag>
        <Tag color="error">error</Tag>
        <Tag color="warning">warning</Tag>
        <Tag color="default">default</Tag>
    </Space>
);

// Demo 5: Bordered
const BorderedTagDemo = () => (
    <Space wrap>
        <Tag bordered={false} color="magenta">magenta</Tag>
        <Tag bordered={false} color="red">red</Tag>
        <Tag bordered={false} color="green">green</Tag>
        <Tag bordered={false} color="blue">blue</Tag>
    </Space>
);

// Demo 6: Checkable Tags
const CheckableTagDemo = () => {
    const [selectedTags, setSelectedTags] = useState<string[]>(["Books"]);
    const tagsData = ["Movies", "Books", "Music", "Sports"];

    const handleChange = (tag: string, checked: boolean) => {
        const nextSelectedTags = checked
            ? [...selectedTags, tag]
            : selectedTags.filter((t) => t !== tag);
        setSelectedTags(nextSelectedTags);
    };

    return (
        <Space wrap>
            {tagsData.map((tag) => (
                <Tag.CheckableTag
                    key={tag}
                    checked={selectedTags.includes(tag)}
                    onChange={(checked) => handleChange(tag, checked)}
                >
                    {tag}
                </Tag.CheckableTag>
            ))}
        </Space>
    );
};

// Demo 7: With Icons
const IconTagDemo = () => (
    <Space wrap>
        <Tag icon={<span>🔗</span>} color="blue">Link</Tag>
        <Tag icon={<span>🐦</span>} color="cyan">Twitter</Tag>
        <Tag icon={<span>📺</span>} color="red">YouTube</Tag>
        <Tag icon={<span>📘</span>} color="geekblue">Facebook</Tag>
    </Space>
);

export const tagData: AntdComponentData = {
    id: "antd-tag",
    name: "Tag",
    description: "Tag is used for marking and categorization. Supports colors, closable, checkable, and icon variants.",
    whenToUse: "Use Tag for categories, labels, status indicators, or any small pieces of information.",
    docUrl: "https://ant.design/components/tag",
    demos: [
        {
            id: "basic",
            title: "Basic Tag",
            description: "Simple and closable",
            demo: <BasicTagDemo />,
            code: `<Tag>Tag 1</Tag>
<Tag closable>Closable</Tag>`,
        },
        {
            id: "colors",
            title: "Preset Colors",
            description: "Built-in color palettes",
            demo: <ColorfulTagDemo />,
            code: `<Tag color="magenta">magenta</Tag>
<Tag color="green">green</Tag>`,
        },
        {
            id: "custom",
            title: "Custom Colors",
            description: "Hex color values",
            demo: <CustomColorDemo />,
            code: `<Tag color="#f50">#f50</Tag>
<Tag color="#87d068">#87d068</Tag>`,
        },
        {
            id: "status",
            title: "Status Tags",
            description: "Status variants",
            demo: <StatusTagDemo />,
            code: `<Tag color="success">success</Tag>
<Tag color="error">error</Tag>
<Tag color="processing">processing</Tag>`,
        },
        {
            id: "bordered",
            title: "Borderless",
            description: "Without borders",
            demo: <BorderedTagDemo />,
            code: `<Tag bordered={false} color="magenta">magenta</Tag>`,
        },
        {
            id: "checkable",
            title: "Checkable Tags",
            description: "Toggle selection",
            demo: <CheckableTagDemo />,
            code: `<Tag.CheckableTag
  checked={checked}
  onChange={setChecked}
>
  Tag
</Tag.CheckableTag>`,
        },
        {
            id: "icons",
            title: "With Icons",
            description: "Icon prefixes",
            demo: <IconTagDemo />,
            code: `<Tag icon={<TwitterIcon />} color="cyan">Twitter</Tag>`,
        },
    ],
    apiProps: [
        { name: "color", type: "string", description: "Tag color" },
        { name: "closable", type: "boolean", description: "Show close button" },
        { name: "bordered", type: "boolean", description: "Show border", default: "true" },
        { name: "icon", type: "ReactNode", description: "Icon element" },
        { name: "onClose", type: "(e) => void", description: "Close callback" },
        { name: "CheckableTag.checked", type: "boolean", description: "Checked state" },
        { name: "CheckableTag.onChange", type: "(checked) => void", description: "Toggle callback" },
    ],
};
