"use client";

import React from "react";
import { FloatButton, message } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Float Button
const BasicFloatButtonDemo = () => (
    <div style={{ height: 150, position: "relative", background: "#f5f5f5", borderRadius: 8 }}>
        <FloatButton onClick={() => message.info("Clicked!")} style={{ position: "absolute", right: 24, bottom: 24 }} />
    </div>
);

// Demo 2: Float Button with Icon
const IconFloatButtonDemo = () => (
    <div style={{ height: 150, position: "relative", background: "#f5f5f5", borderRadius: 8 }}>
        <FloatButton icon={<span>❓</span>} type="primary" style={{ position: "absolute", right: 24, bottom: 24 }} />
    </div>
);

// Demo 3: Float Button with Description
const DescriptionFloatButtonDemo = () => (
    <div style={{ height: 150, position: "relative", background: "#f5f5f5", borderRadius: 8 }}>
        <FloatButton icon={<span>💬</span>} description="Help" shape="square" style={{ position: "absolute", right: 24, bottom: 24 }} />
    </div>
);

// Demo 4: Float Button Group
const GroupFloatButtonDemo = () => (
    <div style={{ height: 200, position: "relative", background: "#f5f5f5", borderRadius: 8 }}>
        <FloatButton.Group shape="circle" style={{ position: "absolute", right: 24, bottom: 24 }}>
            <FloatButton icon={<span>❓</span>} />
            <FloatButton icon={<span>💬</span>} />
            <FloatButton icon={<span>⚙️</span>} />
        </FloatButton.Group>
    </div>
);

// Demo 5: Back to Top
const BackTopDemo = () => (
    <div style={{ height: 150, position: "relative", background: "#f5f5f5", borderRadius: 8 }}>
        <FloatButton.BackTop visibilityHeight={0} style={{ position: "absolute", right: 24, bottom: 24 }} />
        <p style={{ padding: 24, color: "#666" }}>Scroll to see Back to Top button</p>
    </div>
);

// Demo 6: Custom Shape
const ShapeFloatButtonDemo = () => (
    <div style={{ height: 150, position: "relative", background: "#f5f5f5", borderRadius: 8, display: "flex", gap: 16, padding: 24 }}>
        <FloatButton shape="circle" icon={<span>⭕</span>} style={{ position: "static" }} />
        <FloatButton shape="square" icon={<span>⬜</span>} style={{ position: "static" }} />
    </div>
);

export const floatButtonData: AntdComponentData = {
    id: "antd-float-button",
    name: "FloatButton",
    description: "FloatButton is a floating action button that hovers over the page for quick actions like help, chat, or back to top.",
    whenToUse: "Use FloatButton for persistent actions that should be accessible from anywhere on the page, such as customer support or scroll-to-top.",
    docUrl: "https://ant.design/components/float-button",
    demos: [
        {
            id: "basic",
            title: "Basic Float Button",
            description: "Simple floating button",
            demo: <BasicFloatButtonDemo />,
            code: `<FloatButton onClick={() => message.info("Clicked!")} />`,
        },
        {
            id: "icon",
            title: "With Icon",
            description: "Float button with custom icon",
            demo: <IconFloatButtonDemo />,
            code: `<FloatButton icon={<QuestionIcon />} type="primary" />`,
        },
        {
            id: "description",
            title: "With Description",
            description: "Square button with text",
            demo: <DescriptionFloatButtonDemo />,
            code: `<FloatButton icon={<ChatIcon />} description="Help" shape="square" />`,
        },
        {
            id: "group",
            title: "Float Button Group",
            description: "Multiple buttons grouped",
            demo: <GroupFloatButtonDemo />,
            code: `<FloatButton.Group shape="circle">
  <FloatButton icon={<QuestionIcon />} />
  <FloatButton icon={<ChatIcon />} />
</FloatButton.Group>`,
        },
        {
            id: "backtop",
            title: "Back to Top",
            description: "Scroll back to top button",
            demo: <BackTopDemo />,
            code: `<FloatButton.BackTop visibilityHeight={400} />`,
        },
        {
            id: "shape",
            title: "Custom Shape",
            description: "Circle and square shapes",
            demo: <ShapeFloatButtonDemo />,
            code: `<FloatButton shape="circle" />
<FloatButton shape="square" />`,
        },
    ],
    apiProps: [
        { name: "icon", type: "ReactNode", description: "Icon element" },
        { name: "description", type: "ReactNode", description: "Text description" },
        { name: "type", type: "'default' | 'primary'", description: "Button type" },
        { name: "shape", type: "'circle' | 'square'", description: "Button shape", default: "circle" },
        { name: "tooltip", type: "ReactNode", description: "Tooltip text" },
        { name: "onClick", type: "() => void", description: "Click handler" },
    ],
};
