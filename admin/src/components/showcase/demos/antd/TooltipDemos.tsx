"use client";

import React from "react";
import { Tooltip, Button, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Tooltip
const BasicTooltipDemo = () => (
    <Tooltip title="Prompt text">
        <span>Hover me</span>
    </Tooltip>
);

// Demo 2: Placements
const PlacementTooltipDemo = () => (
    <Space wrap>
        <Tooltip placement="top" title="Top">
            <Button>Top</Button>
        </Tooltip>
        <Tooltip placement="bottom" title="Bottom">
            <Button>Bottom</Button>
        </Tooltip>
        <Tooltip placement="left" title="Left">
            <Button>Left</Button>
        </Tooltip>
        <Tooltip placement="right" title="Right">
            <Button>Right</Button>
        </Tooltip>
    </Space>
);

// Demo 3: Arrow
const ArrowTooltipDemo = () => (
    <Space>
        <Tooltip title="With arrow" arrow>
            <Button>Arrow</Button>
        </Tooltip>
        <Tooltip title="No arrow" arrow={false}>
            <Button>No Arrow</Button>
        </Tooltip>
    </Space>
);

// Demo 4: Colors
const ColorTooltipDemo = () => (
    <Space wrap>
        <Tooltip title="Pink" color="pink">
            <Button>Pink</Button>
        </Tooltip>
        <Tooltip title="Red" color="red">
            <Button>Red</Button>
        </Tooltip>
        <Tooltip title="Orange" color="orange">
            <Button>Orange</Button>
        </Tooltip>
        <Tooltip title="Green" color="green">
            <Button>Green</Button>
        </Tooltip>
        <Tooltip title="Blue" color="blue">
            <Button>Blue</Button>
        </Tooltip>
        <Tooltip title="Purple" color="purple">
            <Button>Purple</Button>
        </Tooltip>
    </Space>
);

// Demo 5: Trigger Types
const TriggerTooltipDemo = () => (
    <Space>
        <Tooltip title="Hover" trigger="hover">
            <Button>Hover</Button>
        </Tooltip>
        <Tooltip title="Focus" trigger="focus">
            <Button>Focus</Button>
        </Tooltip>
        <Tooltip title="Click" trigger="click">
            <Button>Click</Button>
        </Tooltip>
    </Space>
);

// Demo 6: Custom Content
const CustomTooltipDemo = () => (
    <Tooltip
        title={
            <div>
                <div><strong>Title</strong></div>
                <div>Line 1</div>
                <div>Line 2</div>
            </div>
        }
    >
        <Button>Rich content</Button>
    </Tooltip>
);

export const tooltipData: AntdComponentData = {
    id: "antd-tooltip",
    name: "Tooltip",
    description: "Tooltip displays a text popup when hovering, focusing, or clicking an element. Supports various placements and colors.",
    whenToUse: "Use Tooltip to explain buttons, icons, or any UI element that needs additional context.",
    docUrl: "https://ant.design/components/tooltip",
    demos: [
        {
            id: "basic",
            title: "Basic Tooltip",
            description: "Simple hover tooltip",
            demo: <BasicTooltipDemo />,
            code: `<Tooltip title="Prompt text">
  <span>Hover me</span>
</Tooltip>`,
        },
        {
            id: "placement",
            title: "Placements",
            description: "12 position options",
            demo: <PlacementTooltipDemo />,
            code: `<Tooltip placement="top" title="Top">...</Tooltip>
<Tooltip placement="bottom" title="Bottom">...</Tooltip>`,
        },
        {
            id: "arrow",
            title: "Arrow Options",
            description: "With/without arrow",
            demo: <ArrowTooltipDemo />,
            code: `<Tooltip arrow title="With arrow">...</Tooltip>
<Tooltip arrow={false} title="No arrow">...</Tooltip>`,
        },
        {
            id: "colors",
            title: "Colors",
            description: "Preset colors",
            demo: <ColorTooltipDemo />,
            code: `<Tooltip color="pink" title="Pink">...</Tooltip>
<Tooltip color="blue" title="Blue">...</Tooltip>`,
        },
        {
            id: "trigger",
            title: "Trigger Types",
            description: "Hover, focus, click",
            demo: <TriggerTooltipDemo />,
            code: `<Tooltip trigger="hover" title="Hover">...</Tooltip>
<Tooltip trigger="click" title="Click">...</Tooltip>`,
        },
        {
            id: "custom",
            title: "Custom Content",
            description: "Rich tooltip content",
            demo: <CustomTooltipDemo />,
            code: `<Tooltip title={<div><strong>Title</strong><p>Content</p></div>}>
  ...
</Tooltip>`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode | () => ReactNode", description: "Tooltip content" },
        { name: "placement", type: "'top' | 'bottom' | 'left' | 'right' | ...", description: "Position", default: "top" },
        { name: "trigger", type: "'hover' | 'focus' | 'click' | 'contextMenu'", description: "Trigger type", default: "hover" },
        { name: "arrow", type: "boolean | { pointAtCenter }", description: "Show arrow", default: "true" },
        { name: "color", type: "string", description: "Background color" },
        { name: "open", type: "boolean", description: "Controlled visibility" },
        { name: "onOpenChange", type: "(open) => void", description: "Visibility callback" },
    ],
};
