"use client";

import React from "react";
import { Timeline, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Timeline
const BasicTimelineDemo = () => (
    <Timeline
        items={[
            { children: "Create a services site 2015-09-01" },
            { children: "Solve initial network problems 2015-09-01" },
            { children: "Technical testing 2015-09-01" },
            { children: "Network problems being solved 2015-09-01" },
        ]}
    />
);

// Demo 2: Colors
const ColorTimelineDemo = () => (
    <Timeline
        items={[
            { color: "green", children: "Create a services site 2015-09-01" },
            { color: "green", children: "Solve initial network problems 2015-09-01" },
            { color: "red", children: "Technical testing 2015-09-01" },
            { color: "gray", children: "Pending..." },
        ]}
    />
);

// Demo 3: Pending
const PendingTimelineDemo = () => (
    <Timeline
        pending="Recording..."
        items={[
            { children: "Create a services site 2015-09-01" },
            { children: "Solve initial network problems 2015-09-01" },
            { children: "Technical testing 2015-09-01" },
        ]}
    />
);

// Demo 4: Custom Dot
const CustomDotTimelineDemo = () => (
    <Timeline
        items={[
            { dot: <span>🎉</span>, children: "Custom icon timeline" },
            { dot: <span>🔧</span>, children: "Technical testing" },
            { dot: <span>✅</span>, color: "green", children: "Completed" },
        ]}
    />
);

// Demo 5: Alternate Mode
const AlternateTimelineDemo = () => (
    <Timeline
        mode="alternate"
        items={[
            { children: "Create a services site 2015-09-01" },
            { children: "Solve initial network problems 2015-09-01" },
            { children: "Technical testing 2015-09-01" },
            { children: "Network problems being solved 2015-09-01" },
        ]}
    />
);

// Demo 6: Right Mode
const RightTimelineDemo = () => (
    <Timeline
        mode="right"
        items={[
            { children: "Create a services site 2015-09-01" },
            { children: "Solve initial network problems 2015-09-01" },
            { children: "Technical testing 2015-09-01" },
        ]}
    />
);

// Demo 7: With Labels
const LabelTimelineDemo = () => (
    <Timeline
        mode="left"
        items={[
            { label: "2015-09-01", children: "Create a services" },
            { label: "2015-09-01 09:12:11", children: "Solve initial network problems" },
            { label: "", children: "Technical testing" },
        ]}
    />
);

export const timelineData: AntdComponentData = {
    id: "antd-timeline",
    name: "Timeline",
    description: "Timeline displays a sequence of events in chronological order. Supports colors, custom icons, pending states, and various layouts.",
    whenToUse: "Use Timeline for activity feeds, version history, process steps, or any sequential events.",
    docUrl: "https://ant.design/components/timeline",
    demos: [
        {
            id: "basic",
            title: "Basic Timeline",
            description: "Simple event list",
            demo: <BasicTimelineDemo />,
            code: `<Timeline items={[
  { children: "Event 1" },
  { children: "Event 2" },
]} />`,
        },
        {
            id: "colors",
            title: "Colors",
            description: "Status colors",
            demo: <ColorTimelineDemo />,
            code: `{ color: "green", children: "Success" }
{ color: "red", children: "Error" }`,
        },
        {
            id: "pending",
            title: "Pending",
            description: "In-progress state",
            demo: <PendingTimelineDemo />,
            code: `<Timeline pending="Recording..." items={[...]} />`,
        },
        {
            id: "custom",
            title: "Custom Dot",
            description: "Custom icons",
            demo: <CustomDotTimelineDemo />,
            code: `{ dot: <ClockIcon />, children: "Event" }`,
        },
        {
            id: "alternate",
            title: "Alternate Mode",
            description: "Left-right alternating",
            demo: <AlternateTimelineDemo />,
            code: `<Timeline mode="alternate" items={[...]} />`,
        },
        {
            id: "right",
            title: "Right Mode",
            description: "Right-aligned",
            demo: <RightTimelineDemo />,
            code: `<Timeline mode="right" items={[...]} />`,
        },
        {
            id: "labels",
            title: "With Labels",
            description: "Time labels",
            demo: <LabelTimelineDemo />,
            code: `{ label: "2015-09-01", children: "Event" }`,
        },
    ],
    apiProps: [
        { name: "items", type: "TimelineItem[]", description: "Timeline items" },
        { name: "mode", type: "'left' | 'alternate' | 'right'", description: "Alignment mode" },
        { name: "pending", type: "ReactNode | boolean", description: "Pending text" },
        { name: "pendingDot", type: "ReactNode", description: "Pending dot icon" },
        { name: "reverse", type: "boolean", description: "Reverse order" },
        { name: "item.color", type: "string", description: "Dot color" },
        { name: "item.dot", type: "ReactNode", description: "Custom dot" },
        { name: "item.label", type: "ReactNode", description: "Label content" },
    ],
};
