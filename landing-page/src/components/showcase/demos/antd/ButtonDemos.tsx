"use client";

import React, { useState } from "react";
import { Button, Space, Dropdown } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Button Types
const ButtonTypesDemo = () => (
    <Space wrap>
        <Button type="primary">Primary</Button>
        <Button>Default</Button>
        <Button type="dashed">Dashed</Button>
        <Button type="text">Text</Button>
        <Button type="link">Link</Button>
    </Space>
);

// Demo 2: Button Sizes
const ButtonSizesDemo = () => (
    <Space wrap>
        <Button type="primary" size="large">Large</Button>
        <Button type="primary">Default</Button>
        <Button type="primary" size="small">Small</Button>
    </Space>
);

// Demo 3: Danger and Ghost
const DangerGhostDemo = () => (
    <Space wrap>
        <Button type="primary" danger>Danger Primary</Button>
        <Button danger>Danger Default</Button>
        <div style={{ background: "#001529", padding: 16, display: "inline-block" }}>
            <Button ghost>Ghost</Button>
        </div>
    </Space>
);

// Demo 4: Icon Buttons
const IconButtonsDemo = () => (
    <Space wrap>
        <Button type="primary" shape="circle">🔍</Button>
        <Button type="primary" icon={<span>🔍</span>}>Search</Button>
        <Button shape="round" icon={<span>📥</span>}>Download</Button>
        <Button type="primary" shape="round">Round Button</Button>
    </Space>
);

// Demo 5: Loading State
const LoadingButtonDemo = () => {
    const [loading, setLoading] = useState(false);

    return (
        <Space wrap>
            <Button type="primary" loading>Loading</Button>
            <Button type="primary" loading={loading} onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 2000);
            }}>
                Click to Load
            </Button>
        </Space>
    );
};

// Demo 6: Disabled State
const DisabledButtonDemo = () => (
    <Space wrap>
        <Button type="primary" disabled>Primary Disabled</Button>
        <Button disabled>Default Disabled</Button>
        <Button type="dashed" disabled>Dashed Disabled</Button>
    </Space>
);

// Demo 7: Block Button
const BlockButtonDemo = () => (
    <Space direction="vertical" style={{ width: 300 }}>
        <Button type="primary" block>Primary Block</Button>
        <Button block>Default Block</Button>
    </Space>
);

// Demo 8: Button Group
const ButtonGroupDemo = () => (
    <Space wrap>
        <Button.Group>
            <Button>Left</Button>
            <Button>Middle</Button>
            <Button>Right</Button>
        </Button.Group>
        <Button.Group>
            <Button type="primary">Prev</Button>
            <Button type="primary">Next</Button>
        </Button.Group>
    </Space>
);

export const buttonData: AntdComponentData = {
    id: "antd-button",
    name: "Button",
    description: "Button component is used to trigger actions. It supports multiple types, sizes, and states for different use cases.",
    whenToUse: "Use Button to trigger an operation. A button can contain a combination of text and an icon. Types include primary, default, dashed, text, and link.",
    docUrl: "https://ant.design/components/button",
    demos: [
        {
            id: "types",
            title: "Button Types",
            description: "Different button types for various contexts",
            demo: <ButtonTypesDemo />,
            code: `<Button type="primary">Primary</Button>
<Button>Default</Button>
<Button type="dashed">Dashed</Button>
<Button type="text">Text</Button>
<Button type="link">Link</Button>`,
        },
        {
            id: "sizes",
            title: "Button Sizes",
            description: "Large, default, and small sizes",
            demo: <ButtonSizesDemo />,
            code: `<Button type="primary" size="large">Large</Button>
<Button type="primary">Default</Button>
<Button type="primary" size="small">Small</Button>`,
        },
        {
            id: "danger",
            title: "Danger & Ghost",
            description: "Danger buttons and ghost style",
            demo: <DangerGhostDemo />,
            code: `<Button type="primary" danger>Danger</Button>
<Button ghost>Ghost</Button>`,
        },
        {
            id: "icon",
            title: "Icon Buttons",
            description: "Buttons with icons and shapes",
            demo: <IconButtonsDemo />,
            code: `<Button type="primary" shape="circle" icon={<SearchIcon />} />
<Button icon={<DownloadIcon />}>Download</Button>
<Button shape="round">Round</Button>`,
        },
        {
            id: "loading",
            title: "Loading State",
            description: "Button with loading indicator",
            demo: <LoadingButtonDemo />,
            code: `<Button type="primary" loading>Loading</Button>
<Button loading={isLoading} onClick={handleClick}>Submit</Button>`,
        },
        {
            id: "disabled",
            title: "Disabled State",
            description: "Non-interactive buttons",
            demo: <DisabledButtonDemo />,
            code: `<Button type="primary" disabled>Disabled</Button>`,
        },
        {
            id: "block",
            title: "Block Button",
            description: "Full-width buttons",
            demo: <BlockButtonDemo />,
            code: `<Button type="primary" block>Block Button</Button>`,
        },
        {
            id: "group",
            title: "Button Group",
            description: "Grouped buttons",
            demo: <ButtonGroupDemo />,
            code: `<Button.Group>
  <Button>Left</Button>
  <Button>Right</Button>
</Button.Group>`,
        },
    ],
    apiProps: [
        { name: "type", type: "'primary' | 'default' | 'dashed' | 'text' | 'link'", description: "Button type", default: "default" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Button size", default: "middle" },
        { name: "danger", type: "boolean", description: "Danger style", default: "false" },
        { name: "ghost", type: "boolean", description: "Ghost style", default: "false" },
        { name: "icon", type: "ReactNode", description: "Icon component" },
        { name: "loading", type: "boolean | { delay: number }", description: "Loading state" },
        { name: "disabled", type: "boolean", description: "Disabled state" },
        { name: "block", type: "boolean", description: "Full width" },
        { name: "shape", type: "'circle' | 'round'", description: "Button shape" },
        { name: "onClick", type: "(event) => void", description: "Click handler" },
    ],
};
