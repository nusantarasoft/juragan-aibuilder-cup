"use client";

import React from "react";
import { notification, Button, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Notification
const BasicNotificationDemo = () => (
    <Button onClick={() => notification.open({
        message: "Notification Title",
        description: "This is the content of the notification.",
    })}>
        Open Notification
    </Button>
);

// Demo 2: Notification Types
const TypesNotificationDemo = () => (
    <Space wrap>
        <Button onClick={() => notification.success({ message: "Success", description: "Operation successful!" })}>
            Success
        </Button>
        <Button onClick={() => notification.info({ message: "Info", description: "Information message" })}>
            Info
        </Button>
        <Button onClick={() => notification.warning({ message: "Warning", description: "Warning message" })}>
            Warning
        </Button>
        <Button onClick={() => notification.error({ message: "Error", description: "Error message" })}>
            Error
        </Button>
    </Space>
);

// Demo 3: Placements
const PlacementNotificationDemo = () => (
    <Space wrap>
        <Button onClick={() => notification.open({ message: "Top Left", placement: "topLeft" })}>
            Top Left
        </Button>
        <Button onClick={() => notification.open({ message: "Top Right", placement: "topRight" })}>
            Top Right
        </Button>
        <Button onClick={() => notification.open({ message: "Bottom Left", placement: "bottomLeft" })}>
            Bottom Left
        </Button>
        <Button onClick={() => notification.open({ message: "Bottom Right", placement: "bottomRight" })}>
            Bottom Right
        </Button>
    </Space>
);

// Demo 4: With Button
const ButtonNotificationDemo = () => (
    <Button onClick={() => notification.open({
        message: "Confirm Action",
        description: "Are you sure you want to proceed?",
        btn: (
            <Space>
                <Button size="small" onClick={() => notification.destroy()}>Cancel</Button>
                <Button type="primary" size="small" onClick={() => notification.destroy()}>Confirm</Button>
            </Space>
        ),
    })}>
        With Actions
    </Button>
);

// Demo 5: Custom Duration
const DurationNotificationDemo = () => (
    <Space>
        <Button onClick={() => notification.open({
            message: "Quick notification",
            duration: 2,
        })}>
            2 seconds
        </Button>
        <Button onClick={() => notification.open({
            message: "Stays until closed",
            duration: 0,
        })}>
            No auto-close
        </Button>
    </Space>
);

// Demo 6: Custom Icon
const IconNotificationDemo = () => (
    <Button onClick={() => notification.open({
        message: "Custom Icon",
        description: "Notification with custom icon",
        icon: <span style={{ fontSize: 24 }}>🎉</span>,
    })}>
        Custom Icon
    </Button>
);

export const notificationData: AntdComponentData = {
    id: "antd-notification",
    name: "Notification",
    description: "Notification displays system notifications in a corner of the screen. Supports various types, placements, and action buttons.",
    whenToUse: "Use Notification for system messages, background task completions, or any important alerts that don't require immediate action.",
    docUrl: "https://ant.design/components/notification",
    demos: [
        {
            id: "basic",
            title: "Basic Notification",
            description: "Simple notification",
            demo: <BasicNotificationDemo />,
            code: `notification.open({
  message: "Title",
  description: "Content",
});`,
        },
        {
            id: "types",
            title: "Notification Types",
            description: "Four types",
            demo: <TypesNotificationDemo />,
            code: `notification.success({ message: "Success" });
notification.error({ message: "Error" });`,
        },
        {
            id: "placement",
            title: "Placements",
            description: "Four corners",
            demo: <PlacementNotificationDemo />,
            code: `notification.open({ placement: "topLeft" });
notification.open({ placement: "bottomRight" });`,
        },
        {
            id: "button",
            title: "With Actions",
            description: "Action buttons",
            demo: <ButtonNotificationDemo />,
            code: `notification.open({
  message: "Confirm",
  btn: <Button onClick={close}>OK</Button>,
});`,
        },
        {
            id: "duration",
            title: "Custom Duration",
            description: "Auto-close timing",
            demo: <DurationNotificationDemo />,
            code: `notification.open({ duration: 2 });
notification.open({ duration: 0 }); // Never auto-close`,
        },
        {
            id: "icon",
            title: "Custom Icon",
            description: "Custom icon",
            demo: <IconNotificationDemo />,
            code: `notification.open({
  icon: <SmileIcon />,
  message: "Custom",
});`,
        },
    ],
    apiProps: [
        { name: "message", type: "ReactNode", description: "Notification title" },
        { name: "description", type: "ReactNode", description: "Notification content" },
        { name: "placement", type: "'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'", description: "Position", default: "topRight" },
        { name: "duration", type: "number | null", description: "Auto-close seconds", default: "4.5" },
        { name: "btn", type: "ReactNode", description: "Action buttons" },
        { name: "icon", type: "ReactNode", description: "Custom icon" },
        { name: "key", type: "string", description: "Unique key" },
        { name: "onClose", type: "() => void", description: "Close callback" },
        { name: "onClick", type: "() => void", description: "Click callback" },
    ],
};
