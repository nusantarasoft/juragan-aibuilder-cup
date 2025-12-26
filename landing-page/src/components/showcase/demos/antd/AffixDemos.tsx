"use client";

import React, { useState } from "react";
import { Affix, Button, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Affix
const BasicAffixDemo = () => (
    <Affix offsetTop={100}>
        <Button type="primary">Affix top (scroll to see)</Button>
    </Affix>
);

// Demo 2: Offset Top
const OffsetTopDemo = () => (
    <Space direction="vertical">
        <Affix offsetTop={10}>
            <Button>Affix at 10px from top</Button>
        </Affix>
    </Space>
);

// Demo 3: Callback
const CallbackAffixDemo = () => {
    const [affixed, setAffixed] = useState(false);
    return (
        <Space direction="vertical">
            <Affix offsetTop={120} onChange={(affixed) => setAffixed(!!affixed)}>
                <Button type={affixed ? "primary" : "default"}>
                    {affixed ? "Affixed!" : "Not affixed"}
                </Button>
            </Affix>
        </Space>
    );
};

// Demo 4: Target Container
const TargetAffixDemo = () => (
    <Space direction="vertical">
        <Text type="secondary">
            Affix can be fixed to a specific container using the target prop:
        </Text>
        <Text code>{"target={() => document.getElementById('container')}"}</Text>
    </Space>
);

// Demo 5: Bottom Affix
const BottomAffixDemo = () => (
    <Text type="secondary">
        Use offsetBottom to affix at the bottom of viewport.
        Example: {"<Affix offsetBottom={0}>...</Affix>"}
    </Text>
);

export const affixData: AntdComponentData = {
    id: "antd-affix",
    name: "Affix",
    description: "Affix wraps content to make it stick to the viewport when scrolling. Supports top/bottom positioning with callbacks.",
    whenToUse: "Use Affix for sticky navigation, action buttons, or any element that should remain visible while scrolling.",
    docUrl: "https://ant.design/components/affix",
    demos: [
        {
            id: "basic",
            title: "Basic Affix",
            description: "Stick to top on scroll",
            demo: <BasicAffixDemo />,
            code: `<Affix offsetTop={100}>
  <Button type="primary">Affix top</Button>
</Affix>`,
        },
        {
            id: "offset",
            title: "Offset Top",
            description: "Custom offset from top",
            demo: <OffsetTopDemo />,
            code: `<Affix offsetTop={10}>
  <Button>Affix at 10px</Button>
</Affix>`,
        },
        {
            id: "callback",
            title: "With Callback",
            description: "State change callback",
            demo: <CallbackAffixDemo />,
            code: `<Affix onChange={(affixed) => console.log(affixed)}>
  <Button>Click</Button>
</Affix>`,
        },
        {
            id: "target",
            title: "Target Container",
            description: "Affix to container",
            demo: <TargetAffixDemo />,
            code: `<Affix target={() => container}>
  <Button>Affix</Button>
</Affix>`,
        },
        {
            id: "bottom",
            title: "Bottom Affix",
            description: "Stick to bottom",
            demo: <BottomAffixDemo />,
            code: `<Affix offsetBottom={0}>
  <Button>Affix bottom</Button>
</Affix>`,
        },
    ],
    apiProps: [
        { name: "offsetTop", type: "number", description: "Offset from top (px)" },
        { name: "offsetBottom", type: "number", description: "Offset from bottom (px)" },
        { name: "target", type: "() => HTMLElement", description: "Container element", default: "() => window" },
        { name: "onChange", type: "(affixed) => void", description: "State change callback" },
    ],
};
