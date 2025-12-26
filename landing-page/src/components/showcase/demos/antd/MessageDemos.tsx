"use client";

import React from "react";
import { message, Button, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Message
const BasicMessageDemo = () => (
    <Button onClick={() => message.info("This is a normal message")}>
        Display Message
    </Button>
);

// Demo 2: Message Types
const TypesMessageDemo = () => (
    <Space wrap>
        <Button onClick={() => message.success("Success!")}>Success</Button>
        <Button onClick={() => message.error("Error!")}>Error</Button>
        <Button onClick={() => message.warning("Warning!")}>Warning</Button>
        <Button onClick={() => message.info("Information")}>Info</Button>
        <Button onClick={() => message.loading("Loading...")}>Loading</Button>
    </Space>
);

// Demo 3: Custom Duration
const DurationMessageDemo = () => (
    <Space>
        <Button onClick={() => message.success("Closes in 1s", 1)}>1 second</Button>
        <Button onClick={() => message.success("Closes in 10s", 10)}>10 seconds</Button>
    </Space>
);

// Demo 4: Promise Interface
const PromiseMessageDemo = () => (
    <Button onClick={() => {
        message.loading("Action in progress...", 2.5)
            .then(() => message.success("Loading finished", 2.5))
            .then(() => message.info("Loading finished", 2.5));
    }}>
        Sequential Messages
    </Button>
);

// Demo 5: Custom Content
const CustomMessageDemo = () => (
    <Button onClick={() => message.open({
        content: <span>Custom content with <strong>bold text</strong></span>,
        duration: 3,
    })}>
        Custom Content
    </Button>
);

// Demo 6: Update Message
const UpdateMessageDemo = () => {
    const key = "updatable";
    return (
        <Button onClick={() => {
            message.loading({ content: "Loading...", key });
            setTimeout(() => {
                message.success({ content: "Loaded!", key, duration: 2 });
            }, 1000);
        }}>
            Update Message
        </Button>
    );
};

export const messageData: AntdComponentData = {
    id: "antd-message",
    name: "Message",
    description: "Message displays global feedback messages. Lightweight and supports success, error, warning, info, and loading types.",
    whenToUse: "Use Message for lightweight feedback after user actions like form submissions or API responses.",
    docUrl: "https://ant.design/components/message",
    demos: [
        {
            id: "basic",
            title: "Basic Message",
            description: "Simple info message",
            demo: <BasicMessageDemo />,
            code: `message.info("This is a message");`,
        },
        {
            id: "types",
            title: "Message Types",
            description: "Five message types",
            demo: <TypesMessageDemo />,
            code: `message.success("Success!");
message.error("Error!");
message.warning("Warning!");
message.info("Information");
message.loading("Loading...");`,
        },
        {
            id: "duration",
            title: "Custom Duration",
            description: "Auto-close timing",
            demo: <DurationMessageDemo />,
            code: `message.success("Quick!", 1);
message.success("Slow...", 10);`,
        },
        {
            id: "promise",
            title: "Promise Interface",
            description: "Sequential messages",
            demo: <PromiseMessageDemo />,
            code: `message.loading("Loading...")
  .then(() => message.success("Done!"));`,
        },
        {
            id: "custom",
            title: "Custom Content",
            description: "Rich message content",
            demo: <CustomMessageDemo />,
            code: `message.open({
  content: <span>Custom <strong>content</strong></span>,
});`,
        },
        {
            id: "update",
            title: "Update Message",
            description: "Update existing message",
            demo: <UpdateMessageDemo />,
            code: `message.loading({ content: "Loading...", key });
// Later...
message.success({ content: "Done!", key });`,
        },
    ],
    apiProps: [
        { name: "message.success", type: "(content, duration?) => Promise", description: "Success message" },
        { name: "message.error", type: "(content, duration?) => Promise", description: "Error message" },
        { name: "message.warning", type: "(content, duration?) => Promise", description: "Warning message" },
        { name: "message.info", type: "(content, duration?) => Promise", description: "Info message" },
        { name: "message.loading", type: "(content, duration?) => Promise", description: "Loading message" },
        { name: "content", type: "ReactNode", description: "Message content" },
        { name: "duration", type: "number", description: "Auto-close seconds", default: "3" },
        { name: "key", type: "string | number", description: "Unique message key" },
        { name: "onClose", type: "() => void", description: "Close callback" },
    ],
};
