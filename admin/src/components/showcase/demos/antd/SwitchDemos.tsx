"use client";

import React, { useState } from "react";
import { Switch, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Switch
const BasicSwitchDemo = () => (
    <Switch defaultChecked />
);

// Demo 2: With Text
const TextSwitchDemo = () => (
    <Space orientation="vertical">
        <Switch checkedChildren="ON" unCheckedChildren="OFF" defaultChecked />
        <Switch checkedChildren="1" unCheckedChildren="0" />
        <Switch checkedChildren="Yes" unCheckedChildren="No" defaultChecked />
    </Space>
);

// Demo 3: Disabled
const DisabledSwitchDemo = () => (
    <Space>
        <Switch disabled />
        <Switch disabled defaultChecked />
    </Space>
);

// Demo 4: Sizes
const SizesSwitchDemo = () => (
    <Space>
        <Switch defaultChecked />
        <Switch size="small" defaultChecked />
    </Space>
);

// Demo 5: Loading
const LoadingSwitchDemo = () => (
    <Space>
        <Switch loading defaultChecked />
        <Switch size="small" loading />
    </Space>
);

// Demo 6: Controlled
const ControlledSwitchDemo = () => {
    const [checked, setChecked] = useState(true);
    return (
        <Space>
            <Switch checked={checked} onChange={setChecked} />
            <Text>{checked ? "Enabled" : "Disabled"}</Text>
        </Space>
    );
};

// Demo 7: With Icons
const IconSwitchDemo = () => (
    <Space>
        <Switch checkedChildren="✓" unCheckedChildren="✗" defaultChecked />
        <Switch checkedChildren="🌙" unCheckedChildren="☀️" defaultChecked />
    </Space>
);

export const switchData: AntdComponentData = {
    id: "antd-switch",
    name: "Switch",
    description: "Switch is a toggle control for switching between two states. Supports loading, sizes, and custom labels.",
    whenToUse: "Use Switch for binary options like on/off, enable/disable, or yes/no choices.",
    docUrl: "https://ant.design/components/switch",
    demos: [
        {
            id: "basic",
            title: "Basic Switch",
            description: "Simple toggle",
            demo: <BasicSwitchDemo />,
            code: `<Switch defaultChecked />`,
        },
        {
            id: "text",
            title: "With Text",
            description: "Labels for states",
            demo: <TextSwitchDemo />,
            code: `<Switch checkedChildren="ON" unCheckedChildren="OFF" />`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive switch",
            demo: <DisabledSwitchDemo />,
            code: `<Switch disabled />
<Switch disabled defaultChecked />`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Default and small",
            demo: <SizesSwitchDemo />,
            code: `<Switch />
<Switch size="small" />`,
        },
        {
            id: "loading",
            title: "Loading",
            description: "Processing state",
            demo: <LoadingSwitchDemo />,
            code: `<Switch loading defaultChecked />`,
        },
        {
            id: "controlled",
            title: "Controlled",
            description: "Controlled value",
            demo: <ControlledSwitchDemo />,
            code: `<Switch checked={checked} onChange={setChecked} />`,
        },
        {
            id: "icons",
            title: "With Icons",
            description: "Icon labels",
            demo: <IconSwitchDemo />,
            code: `<Switch checkedChildren="🌙" unCheckedChildren="☀️" />`,
        },
    ],
    apiProps: [
        { name: "checked", type: "boolean", description: "Controlled state" },
        { name: "defaultChecked", type: "boolean", description: "Initial state" },
        { name: "checkedChildren", type: "ReactNode", description: "Content when checked" },
        { name: "unCheckedChildren", type: "ReactNode", description: "Content when unchecked" },
        { name: "size", type: "'default' | 'small'", description: "Switch size" },
        { name: "disabled", type: "boolean", description: "Disable switch" },
        { name: "loading", type: "boolean", description: "Show loading" },
        { name: "onChange", type: "(checked) => void", description: "Change callback" },
    ],
};
