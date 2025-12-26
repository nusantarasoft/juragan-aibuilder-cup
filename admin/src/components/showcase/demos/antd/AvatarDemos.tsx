"use client";

import React from "react";
import { Avatar, Space, Typography, Badge } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Avatar
const BasicAvatarDemo = () => (
    <Space size={16}>
        <Avatar size={64}>U</Avatar>
        <Avatar size="large">U</Avatar>
        <Avatar>U</Avatar>
        <Avatar size="small">U</Avatar>
    </Space>
);

// Demo 2: Avatar Types
const TypesAvatarDemo = () => (
    <Space size={16}>
        <Avatar icon={<span>👤</span>} />
        <Avatar>USER</Avatar>
        <Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />
        <Avatar style={{ backgroundColor: "#87d068" }}>U</Avatar>
    </Space>
);

// Demo 3: Avatar Shapes
const ShapesAvatarDemo = () => (
    <Space size={16}>
        <Avatar shape="circle" size={64}>C</Avatar>
        <Avatar shape="square" size={64}>S</Avatar>
    </Space>
);

// Demo 4: Avatar Colors
const ColorsAvatarDemo = () => (
    <Space size={16}>
        <Avatar style={{ backgroundColor: "#f56a00" }}>K</Avatar>
        <Avatar style={{ backgroundColor: "#7265e6" }}>P</Avatar>
        <Avatar style={{ backgroundColor: "#1890ff" }}>B</Avatar>
        <Avatar style={{ backgroundColor: "#00a2ae" }}>T</Avatar>
    </Space>
);

// Demo 5: Avatar with Badge
const BadgeAvatarDemo = () => (
    <Space size={24}>
        <Badge count={5}>
            <Avatar shape="square" size="large">U</Avatar>
        </Badge>
        <Badge dot>
            <Avatar shape="square" size="large">U</Avatar>
        </Badge>
    </Space>
);

// Demo 6: Avatar Group
const GroupAvatarDemo = () => (
    <Avatar.Group maxCount={4} maxPopoverTrigger="click" size="large" maxStyle={{ color: "#f56a00", backgroundColor: "#fde3cf" }}>
        <Avatar src="https://api.dicebear.com/7.x/miniavs/svg?seed=1" />
        <Avatar style={{ backgroundColor: "#f56a00" }}>K</Avatar>
        <Avatar style={{ backgroundColor: "#87d068" }}>J</Avatar>
        <Avatar style={{ backgroundColor: "#1890ff" }}>B</Avatar>
        <Avatar style={{ backgroundColor: "#7265e6" }}>P</Avatar>
    </Avatar.Group>
);

// Demo 7: Responsive Size
const ResponsiveAvatarDemo = () => (
    <Avatar size={{ xs: 24, sm: 32, md: 40, lg: 64, xl: 80, xxl: 100 }} style={{ backgroundColor: "#1890ff" }}>
        Responsive
    </Avatar>
);

export const avatarData: AntdComponentData = {
    id: "antd-avatar",
    name: "Avatar",
    description: "Avatar represents users or entities with icons, images, or text. Supports different sizes, shapes, and grouping.",
    whenToUse: "Use Avatar for user profile images, contact lists, or anywhere you need to represent a person or entity.",
    docUrl: "https://ant.design/components/avatar",
    demos: [
        {
            id: "basic",
            title: "Basic Sizes",
            description: "Different avatar sizes",
            demo: <BasicAvatarDemo />,
            code: `<Avatar size={64}>U</Avatar>
<Avatar size="large">U</Avatar>
<Avatar>U</Avatar>
<Avatar size="small">U</Avatar>`,
        },
        {
            id: "types",
            title: "Avatar Types",
            description: "Icon, text, and image",
            demo: <TypesAvatarDemo />,
            code: `<Avatar icon={<UserIcon />} />
<Avatar>USER</Avatar>
<Avatar src="url/to/image" />`,
        },
        {
            id: "shapes",
            title: "Shapes",
            description: "Circle and square",
            demo: <ShapesAvatarDemo />,
            code: `<Avatar shape="circle">C</Avatar>
<Avatar shape="square">S</Avatar>`,
        },
        {
            id: "colors",
            title: "Custom Colors",
            description: "Background colors",
            demo: <ColorsAvatarDemo />,
            code: `<Avatar style={{ backgroundColor: "#f56a00" }}>K</Avatar>`,
        },
        {
            id: "badge",
            title: "With Badge",
            description: "Status indicators",
            demo: <BadgeAvatarDemo />,
            code: `<Badge count={5}>
  <Avatar>U</Avatar>
</Badge>`,
        },
        {
            id: "group",
            title: "Avatar Group",
            description: "Multiple avatars",
            demo: <GroupAvatarDemo />,
            code: `<Avatar.Group maxCount={4}>
  <Avatar src="..." />
  <Avatar>K</Avatar>
</Avatar.Group>`,
        },
        {
            id: "responsive",
            title: "Responsive",
            description: "Size per breakpoint",
            demo: <ResponsiveAvatarDemo />,
            code: `<Avatar size={{ xs: 24, sm: 32, md: 40, lg: 64 }}>
  Responsive
</Avatar>`,
        },
    ],
    apiProps: [
        { name: "src", type: "string", description: "Image source" },
        { name: "icon", type: "ReactNode", description: "Icon element" },
        { name: "size", type: "number | 'large' | 'small' | 'default' | object", description: "Avatar size" },
        { name: "shape", type: "'circle' | 'square'", description: "Avatar shape", default: "circle" },
        { name: "alt", type: "string", description: "Alt text for image" },
        { name: "gap", type: "number", description: "Letter spacing" },
        { name: "Group.maxCount", type: "number", description: "Max visible avatars" },
        { name: "Group.maxStyle", type: "CSSProperties", description: "Overflow avatar style" },
    ],
};
