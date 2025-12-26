"use client";

import React from "react";
import { Alert, Space, Button } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Alert
const BasicAlertDemo = () => (
    <Alert message="Success Text" type="success" />
);

// Demo 2: Alert Types
const TypesAlertDemo = () => (
    <Space orientation="vertical" style={{ width: "100%" }}>
        <Alert message="Success Tips" type="success" showIcon />
        <Alert message="Informational Notes" type="info" showIcon />
        <Alert message="Warning" type="warning" showIcon />
        <Alert message="Error" type="error" showIcon />
    </Space>
);

// Demo 3: Closable
const ClosableAlertDemo = () => (
    <Space orientation="vertical" style={{ width: "100%" }}>
        <Alert message="Warning Text" type="warning" closable />
        <Alert message="Error Text" type="error" closable onClose={() => console.log("closed")} />
    </Space>
);

// Demo 4: With Description
const DescriptionAlertDemo = () => (
    <Alert
        message="Success Tips"
        description="Detailed description and advice about successful copywriting."
        type="success"
        showIcon
    />
);

// Demo 5: Banner
const BannerAlertDemo = () => (
    <Alert message="Warning: Check your configuration!" type="warning" banner />
);

// Demo 6: Actions
const ActionAlertDemo = () => (
    <Alert
        message="Success Tips"
        type="success"
        showIcon
        action={
            <Button size="small" type="text">UNDO</Button>
        }
        closable
    />
);

// Demo 7: Icon Variants
const IconAlertDemo = () => (
    <Space orientation="vertical" style={{ width: "100%" }}>
        <Alert message="Success" type="success" showIcon />
        <Alert
            message="Success Tips"
            description="Additional description text"
            type="success"
            showIcon
        />
    </Space>
);

export const alertData: AntdComponentData = {
    id: "antd-alert",
    name: "Alert",
    description: "Alert displays important messages with different severity levels. Supports icons, descriptions, closable, and banner modes.",
    whenToUse: "Use Alert for system notifications, form validations, or any important feedback messages.",
    docUrl: "https://ant.design/components/alert",
    demos: [
        {
            id: "basic",
            title: "Basic Alert",
            description: "Simple success alert",
            demo: <BasicAlertDemo />,
            code: `<Alert message="Success Text" type="success" />`,
        },
        {
            id: "types",
            title: "Alert Types",
            description: "Four alert types",
            demo: <TypesAlertDemo />,
            code: `<Alert type="success" showIcon />
<Alert type="info" showIcon />
<Alert type="warning" showIcon />
<Alert type="error" showIcon />`,
        },
        {
            id: "closable",
            title: "Closable",
            description: "Dismissable alerts",
            demo: <ClosableAlertDemo />,
            code: `<Alert closable onClose={() => {}} />`,
        },
        {
            id: "description",
            title: "With Description",
            description: "Additional details",
            demo: <DescriptionAlertDemo />,
            code: `<Alert
  message="Success"
  description="Detailed description"
  type="success"
/>`,
        },
        {
            id: "banner",
            title: "Banner Mode",
            description: "Full-width banner",
            demo: <BannerAlertDemo />,
            code: `<Alert message="Warning!" type="warning" banner />`,
        },
        {
            id: "action",
            title: "With Action",
            description: "Action buttons",
            demo: <ActionAlertDemo />,
            code: `<Alert
  action={<Button size="small">UNDO</Button>}
/>`,
        },
        {
            id: "icons",
            title: "Icon Variants",
            description: "Icons with descriptions",
            demo: <IconAlertDemo />,
            code: `<Alert showIcon type="success" />`,
        },
    ],
    apiProps: [
        { name: "message", type: "ReactNode", description: "Alert content" },
        { name: "description", type: "ReactNode", description: "Additional content" },
        { name: "type", type: "'success' | 'info' | 'warning' | 'error'", description: "Alert type" },
        { name: "showIcon", type: "boolean", description: "Show icon" },
        { name: "closable", type: "boolean", description: "Closable" },
        { name: "closeIcon", type: "ReactNode", description: "Custom close icon" },
        { name: "banner", type: "boolean", description: "Banner mode" },
        { name: "action", type: "ReactNode", description: "Action area" },
        { name: "onClose", type: "(e) => void", description: "Close callback" },
    ],
};
