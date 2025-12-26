"use client";

import React from "react";
import { App, Button, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic App Usage
const BasicAppDemo = () => {
    const { message, notification, modal } = App.useApp();

    return (
        <Space>
            <Button onClick={() => message.success("Success!")}>Message</Button>
            <Button onClick={() => notification.info({ message: "Info" })}>Notification</Button>
            <Button onClick={() => modal.confirm({ title: "Confirm?" })}>Modal</Button>
        </Space>
    );
};

// Wrapper for the demo
const BasicAppDemoWrapper = () => (
    <App>
        <BasicAppDemo />
    </App>
);

// Demo 2: Message via useApp
const MessageAppDemo = () => {
    const { message } = App.useApp();

    return (
        <Space>
            <Button onClick={() => message.success("Success!")}>Success</Button>
            <Button onClick={() => message.error("Error!")}>Error</Button>
            <Button onClick={() => message.warning("Warning!")}>Warning</Button>
        </Space>
    );
};

const MessageAppDemoWrapper = () => (
    <App>
        <MessageAppDemo />
    </App>
);

// Demo 3: Notification via useApp
const NotificationAppDemo = () => {
    const { notification } = App.useApp();

    return (
        <Button onClick={() => notification.success({
            message: "Success",
            description: "This notification uses App context"
        })}>
            Show Notification
        </Button>
    );
};

const NotificationAppDemoWrapper = () => (
    <App>
        <NotificationAppDemo />
    </App>
);

// Demo 4: Modal via useApp
const ModalAppDemo = () => {
    const { modal } = App.useApp();

    return (
        <Space>
            <Button onClick={() => modal.confirm({ title: "Confirm?", content: "Are you sure?" })}>
                Confirm
            </Button>
            <Button onClick={() => modal.info({ title: "Info", content: "Information modal" })}>
                Info
            </Button>
        </Space>
    );
};

const ModalAppDemoWrapper = () => (
    <App>
        <ModalAppDemo />
    </App>
);

// Demo 5: Why use App
const WhyAppDemo = () => (
    <Space direction="vertical">
        <Text>The App component provides a context for message, notification, and modal.</Text>
        <Text type="secondary">Benefits:</Text>
        <Text code>• Applies ConfigProvider theme to static methods</Text>
        <Text code>• Provides consistent styling</Text>
        <Text code>• Easier testing with context</Text>
    </Space>
);

export const appData: AntdComponentData = {
    id: "antd-app",
    name: "App",
    description: "App component provides context for message, notification, and modal static methods with ConfigProvider theming support.",
    whenToUse: "Use App as a wrapper to enable themed message/notification/modal via useApp hook instead of static methods.",
    docUrl: "https://ant.design/components/app",
    demos: [
        {
            id: "basic",
            title: "Basic App Usage",
            description: "Access via useApp hook",
            demo: <BasicAppDemoWrapper />,
            code: `<App>
  <MyComponent />
</App>

// In MyComponent:
const { message, notification, modal } = App.useApp();
message.success("Success!");`,
        },
        {
            id: "message",
            title: "Message via useApp",
            description: "Themed message API",
            demo: <MessageAppDemoWrapper />,
            code: `const { message } = App.useApp();
message.success("Success!");`,
        },
        {
            id: "notification",
            title: "Notification via useApp",
            description: "Themed notification API",
            demo: <NotificationAppDemoWrapper />,
            code: `const { notification } = App.useApp();
notification.success({ message: "Done" });`,
        },
        {
            id: "modal",
            title: "Modal via useApp",
            description: "Themed modal API",
            demo: <ModalAppDemoWrapper />,
            code: `const { modal } = App.useApp();
modal.confirm({ title: "Confirm?" });`,
        },
        {
            id: "why",
            title: "Why Use App",
            description: "Benefits explained",
            demo: <WhyAppDemo />,
            code: `// Without App: theme not applied to static methods
message.success("No theme");

// With App: theme is applied
const { message } = App.useApp();
message.success("Themed!");`,
        },
    ],
    apiProps: [
        { name: "message", type: "MessageInstance", description: "Message API from useApp" },
        { name: "notification", type: "NotificationInstance", description: "Notification API from useApp" },
        { name: "modal", type: "ModalInstance", description: "Modal API from useApp" },
        { name: "component", type: "ComponentType | false", description: "Render element", default: "div" },
        { name: "App.useApp", type: "() => { message, notification, modal }", description: "Hook to access APIs" },
    ],
};
