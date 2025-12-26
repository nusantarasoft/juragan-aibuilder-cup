"use client";

import React, { useState } from "react";
import { Steps, Button, Space, message } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Steps
const BasicStepsDemo = () => (
    <Steps
        current={1}
        items={[
            { title: "Finished", description: "This is a description." },
            { title: "In Progress", description: "This is a description." },
            { title: "Waiting", description: "This is a description." },
        ]}
    />
);

// Demo 2: Mini Steps
const MiniStepsDemo = () => (
    <Steps
        size="small"
        current={1}
        items={[
            { title: "Finished" },
            { title: "In Progress" },
            { title: "Waiting" },
        ]}
    />
);

// Demo 3: Steps with Icons
const IconStepsDemo = () => (
    <Steps
        items={[
            { status: "finish", title: "Login", icon: <span>👤</span> },
            { status: "finish", title: "Verification", icon: <span>✓</span> },
            { status: "process", title: "Pay", icon: <span>💳</span> },
            { status: "wait", title: "Done", icon: <span>🎉</span> },
        ]}
    />
);

// Demo 4: Vertical Steps
const VerticalStepsDemo = () => (
    <Steps
        direction="vertical"
        current={1}
        items={[
            { title: "Step 1", description: "This is a description." },
            { title: "Step 2", description: "This is a description." },
            { title: "Step 3", description: "This is a description." },
        ]}
    />
);

// Demo 5: Steps with Status
const StatusStepsDemo = () => (
    <Steps
        current={1}
        status="error"
        items={[
            { title: "Finished" },
            { title: "Error", description: "Something went wrong" },
            { title: "Waiting" },
        ]}
    />
);

// Demo 6: Dot Style
const DotStepsDemo = () => (
    <Steps
        progressDot
        current={1}
        items={[
            { title: "Finished", description: "Step 1" },
            { title: "In Progress", description: "Step 2" },
            { title: "Waiting", description: "Step 3" },
        ]}
    />
);

// Demo 7: Clickable Steps
const ClickableStepsDemo = () => {
    const [current, setCurrent] = useState(0);
    return (
        <Steps
            current={current}
            onChange={setCurrent}
            items={[
                { title: "Step 1", description: "Click to jump" },
                { title: "Step 2", description: "Click to jump" },
                { title: "Step 3", description: "Click to jump" },
            ]}
        />
    );
};

// Demo 8: Navigation Steps
const NavigationStepsDemo = () => {
    const [current, setCurrent] = useState(0);
    return (
        <div>
            <Steps
                type="navigation"
                current={current}
                items={[
                    { title: "Personal Info" },
                    { title: "Account Setup" },
                    { title: "Confirmation" },
                ]}
            />
            <div style={{ marginTop: 16 }}>
                <Button disabled={current <= 0} onClick={() => setCurrent(current - 1)}>Previous</Button>
                <Button type="primary" style={{ marginLeft: 8 }} onClick={() => current < 2 ? setCurrent(current + 1) : message.success("Done!")}>
                    {current < 2 ? "Next" : "Done"}
                </Button>
            </div>
        </div>
    );
};

export const stepsData: AntdComponentData = {
    id: "antd-steps",
    name: "Steps",
    description: "Steps guides users through a multi-step process. Supports horizontal/vertical layouts, icons, dot style, and clickable navigation.",
    whenToUse: "Use Steps for wizards, checkout flows, or any multi-step process where users need to see their progress.",
    docUrl: "https://ant.design/components/steps",
    demos: [
        {
            id: "basic",
            title: "Basic Steps",
            description: "Standard step indicator",
            demo: <BasicStepsDemo />,
            code: `<Steps
  current={1}
  items={[
    { title: "Finished", description: "..." },
    { title: "In Progress", description: "..." },
    { title: "Waiting", description: "..." },
  ]}
/>`,
        },
        {
            id: "mini",
            title: "Mini Steps",
            description: "Smaller size",
            demo: <MiniStepsDemo />,
            code: `<Steps size="small" current={1} items={[...]} />`,
        },
        {
            id: "icons",
            title: "With Icons",
            description: "Custom step icons",
            demo: <IconStepsDemo />,
            code: `{ status: "finish", title: "Login", icon: <UserIcon /> }`,
        },
        {
            id: "vertical",
            title: "Vertical Steps",
            description: "Vertical layout",
            demo: <VerticalStepsDemo />,
            code: `<Steps direction="vertical" current={1} items={[...]} />`,
        },
        {
            id: "status",
            title: "Error Status",
            description: "Step with error",
            demo: <StatusStepsDemo />,
            code: `<Steps current={1} status="error" items={[...]} />`,
        },
        {
            id: "dot",
            title: "Dot Style",
            description: "Progress dot indicator",
            demo: <DotStepsDemo />,
            code: `<Steps progressDot current={1} items={[...]} />`,
        },
        {
            id: "clickable",
            title: "Clickable Steps",
            description: "Click to navigate",
            demo: <ClickableStepsDemo />,
            code: `<Steps current={current} onChange={setCurrent} items={[...]} />`,
        },
        {
            id: "navigation",
            title: "Navigation Type",
            description: "Navigation style steps",
            demo: <NavigationStepsDemo />,
            code: `<Steps type="navigation" current={current} items={[...]} />`,
        },
    ],
    apiProps: [
        { name: "items", type: "StepItem[]", description: "Step items" },
        { name: "current", type: "number", description: "Current step index" },
        { name: "direction", type: "'horizontal' | 'vertical'", description: "Layout", default: "horizontal" },
        { name: "size", type: "'default' | 'small'", description: "Step size" },
        { name: "status", type: "'wait' | 'process' | 'finish' | 'error'", description: "Current step status" },
        { name: "type", type: "'default' | 'navigation'", description: "Step type" },
        { name: "progressDot", type: "boolean | (dot, { index, status, title }) => ReactNode", description: "Dot style" },
        { name: "onChange", type: "(current) => void", description: "Step change callback" },
    ],
};
