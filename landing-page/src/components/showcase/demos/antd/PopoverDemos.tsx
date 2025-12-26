"use client";

import React from "react";
import { Popover, Button, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const content = (
    <div>
        <p>Content line 1</p>
        <p>Content line 2</p>
    </div>
);

// Demo 1: Basic Popover
const BasicPopoverDemo = () => (
    <Popover content={content} title="Title">
        <Button type="primary">Hover me</Button>
    </Popover>
);

// Demo 2: Trigger Types
const TriggerPopoverDemo = () => (
    <Space>
        <Popover content={content} title="Hover" trigger="hover">
            <Button>Hover</Button>
        </Popover>
        <Popover content={content} title="Focus" trigger="focus">
            <Button>Focus</Button>
        </Popover>
        <Popover content={content} title="Click" trigger="click">
            <Button>Click</Button>
        </Popover>
    </Space>
);

// Demo 3: Placements
const PlacementPopoverDemo = () => (
    <Space>
        <Popover content={content} placement="top">
            <Button>Top</Button>
        </Popover>
        <Popover content={content} placement="bottom">
            <Button>Bottom</Button>
        </Popover>
        <Popover content={content} placement="left">
            <Button>Left</Button>
        </Popover>
        <Popover content={content} placement="right">
            <Button>Right</Button>
        </Popover>
    </Space>
);

// Demo 4: Arrow
const ArrowPopoverDemo = () => (
    <Space>
        <Popover content={content} title="With Arrow">
            <Button>Arrow</Button>
        </Popover>
        <Popover content={content} title="No Arrow" arrow={false}>
            <Button>No Arrow</Button>
        </Popover>
    </Space>
);

// Demo 5: Custom Content
const CustomPopoverDemo = () => (
    <Popover
        content={
            <div style={{ width: 200 }}>
                <p><strong>Custom Content</strong></p>
                <p>This popover has custom styled content with multiple elements.</p>
                <Button type="primary" size="small">Action</Button>
            </div>
        }
        title="Custom Popover"
        trigger="click"
    >
        <Button>Click for custom</Button>
    </Popover>
);

// Demo 6: No Title
const NoTitlePopoverDemo = () => (
    <Popover content="Content without title">
        <Button>No Title</Button>
    </Popover>
);

export const popoverData: AntdComponentData = {
    id: "antd-popover",
    name: "Popover",
    description: "Popover is a floating card triggered by clicking/hovering. Unlike Tooltip, it can contain more complex content including titles and actions.",
    whenToUse: "Use Popover for additional information, mini forms, or any content that needs more space than a Tooltip.",
    docUrl: "https://ant.design/components/popover",
    demos: [
        {
            id: "basic",
            title: "Basic Popover",
            description: "Simple hover popover",
            demo: <BasicPopoverDemo />,
            code: `<Popover content={content} title="Title">
  <Button>Hover me</Button>
</Popover>`,
        },
        {
            id: "trigger",
            title: "Trigger Types",
            description: "Hover, focus, click",
            demo: <TriggerPopoverDemo />,
            code: `<Popover trigger="hover">...</Popover>
<Popover trigger="focus">...</Popover>
<Popover trigger="click">...</Popover>`,
        },
        {
            id: "placement",
            title: "Placements",
            description: "12 position options",
            demo: <PlacementPopoverDemo />,
            code: `<Popover placement="top">...</Popover>
<Popover placement="bottom">...</Popover>
<Popover placement="left">...</Popover>`,
        },
        {
            id: "arrow",
            title: "Arrow Options",
            description: "With or without arrow",
            demo: <ArrowPopoverDemo />,
            code: `<Popover arrow={true}>...</Popover>
<Popover arrow={false}>...</Popover>`,
        },
        {
            id: "custom",
            title: "Custom Content",
            description: "Rich popover content",
            demo: <CustomPopoverDemo />,
            code: `<Popover content={
  <div>
    <p>Custom content</p>
    <Button>Action</Button>
  </div>
}>...</Popover>`,
        },
        {
            id: "notitle",
            title: "No Title",
            description: "Content only",
            demo: <NoTitlePopoverDemo />,
            code: `<Popover content="Content">...</Popover>`,
        },
    ],
    apiProps: [
        { name: "content", type: "ReactNode | () => ReactNode", description: "Popover content" },
        { name: "title", type: "ReactNode | () => ReactNode", description: "Popover title" },
        { name: "trigger", type: "'hover' | 'focus' | 'click' | 'contextMenu'", description: "Trigger type", default: "hover" },
        { name: "placement", type: "'top' | 'bottom' | 'left' | 'right' | ...", description: "Position", default: "top" },
        { name: "arrow", type: "boolean | { pointAtCenter }", description: "Show arrow", default: "true" },
        { name: "open", type: "boolean", description: "Controlled visibility" },
        { name: "defaultOpen", type: "boolean", description: "Initial visibility" },
        { name: "onOpenChange", type: "(open) => void", description: "Visibility callback" },
    ],
};
