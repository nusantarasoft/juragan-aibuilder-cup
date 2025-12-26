"use client";

import React from "react";
import { Popconfirm, Button, message, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Popconfirm
const BasicPopconfirmDemo = () => (
    <Popconfirm
        title="Delete the task"
        description="Are you sure to delete this task?"
        onConfirm={() => message.success("Deleted")}
        onCancel={() => message.error("Cancelled")}
        okText="Yes"
        cancelText="No"
    >
        <Button danger>Delete</Button>
    </Popconfirm>
);

// Demo 2: Placement
const PlacementPopconfirmDemo = () => (
    <Space>
        <Popconfirm title="Top?" placement="top">
            <Button>Top</Button>
        </Popconfirm>
        <Popconfirm title="Bottom?" placement="bottom">
            <Button>Bottom</Button>
        </Popconfirm>
        <Popconfirm title="Left?" placement="left">
            <Button>Left</Button>
        </Popconfirm>
        <Popconfirm title="Right?" placement="right">
            <Button>Right</Button>
        </Popconfirm>
    </Space>
);

// Demo 3: Async Close
const AsyncPopconfirmDemo = () => {
    const confirm = () =>
        new Promise<void>((resolve) => {
            setTimeout(() => {
                message.success("Done!");
                resolve();
            }, 2000);
        });

    return (
        <Popconfirm
            title="Async operation"
            description="This will take 2 seconds"
            onConfirm={confirm}
            okButtonProps={{ loading: false }}
        >
            <Button>Async Confirm</Button>
        </Popconfirm>
    );
};

// Demo 4: Custom Buttons
const CustomButtonsDemo = () => (
    <Popconfirm
        title="Custom buttons"
        okText="Accept"
        cancelText="Decline"
        okType="primary"
    >
        <Button>Custom Text</Button>
    </Popconfirm>
);

// Demo 5: With Icon
const IconPopconfirmDemo = () => (
    <Popconfirm
        title="Warning!"
        description="This action cannot be undone"
        icon={<span style={{ color: "red" }}>⚠️</span>}
    >
        <Button danger>Dangerous Action</Button>
    </Popconfirm>
);

// Demo 6: Disabled
const DisabledPopconfirmDemo = () => (
    <Popconfirm title="Confirm?" disabled>
        <Button>Disabled Popconfirm</Button>
    </Popconfirm>
);

export const popconfirmData: AntdComponentData = {
    id: "antd-popconfirm",
    name: "Popconfirm",
    description: "Popconfirm is a compact confirmation dialog triggered by clicking. Lighter than Modal for simple confirmations.",
    whenToUse: "Use Popconfirm for delete confirmations, critical actions, or any operation requiring user confirmation.",
    docUrl: "https://ant.design/components/popconfirm",
    demos: [
        {
            id: "basic",
            title: "Basic Popconfirm",
            description: "Simple confirmation",
            demo: <BasicPopconfirmDemo />,
            code: `<Popconfirm
  title="Delete the task"
  description="Are you sure?"
  onConfirm={handleConfirm}
>
  <Button>Delete</Button>
</Popconfirm>`,
        },
        {
            id: "placement",
            title: "Placements",
            description: "12 positions",
            demo: <PlacementPopconfirmDemo />,
            code: `<Popconfirm placement="top" title="Confirm?">
  ...
</Popconfirm>`,
        },
        {
            id: "async",
            title: "Async Confirm",
            description: "Promise-based close",
            demo: <AsyncPopconfirmDemo />,
            code: `onConfirm={() => 
  new Promise((resolve) => {
    setTimeout(resolve, 2000);
  })
}`,
        },
        {
            id: "custom",
            title: "Custom Buttons",
            description: "Custom button text",
            demo: <CustomButtonsDemo />,
            code: `<Popconfirm
  okText="Accept"
  cancelText="Decline"
/>`,
        },
        {
            id: "icon",
            title: "Custom Icon",
            description: "Warning icon",
            demo: <IconPopconfirmDemo />,
            code: `<Popconfirm icon={<WarningIcon />} />`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive",
            demo: <DisabledPopconfirmDemo />,
            code: `<Popconfirm disabled />`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode | () => ReactNode", description: "Confirm title" },
        { name: "description", type: "ReactNode | () => ReactNode", description: "Confirm content" },
        { name: "placement", type: "Placement", description: "Position", default: "top" },
        { name: "okText", type: "string", description: "OK button text", default: "OK" },
        { name: "cancelText", type: "string", description: "Cancel button text", default: "Cancel" },
        { name: "okType", type: "ButtonType", description: "OK button type", default: "primary" },
        { name: "icon", type: "ReactNode", description: "Custom icon" },
        { name: "disabled", type: "boolean", description: "Disable popconfirm" },
        { name: "onConfirm", type: "(e) => void | Promise", description: "Confirm callback" },
        { name: "onCancel", type: "(e) => void", description: "Cancel callback" },
    ],
};
