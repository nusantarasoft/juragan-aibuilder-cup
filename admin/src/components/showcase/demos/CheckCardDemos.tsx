"use client";

import React, { useState } from "react";
import { CheckCard } from "@ant-design/pro-components";
import { Space } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Basic CheckCard
const BasicCheckCardDemo = () => {
    const [value, setValue] = useState("option1");

    return (
        <CheckCard.Group value={value} onChange={(val) => setValue(val as string)}>
            <CheckCard title="Option 1" description="First option" value="option1" />
            <CheckCard title="Option 2" description="Second option" value="option2" />
            <CheckCard title="Option 3" description="Third option" value="option3" />
        </CheckCard.Group>
    );
};

// Demo 2: Multiple Selection
const MultipleCheckCardDemo = () => {
    const [values, setValues] = useState<string[]>(["a"]);

    return (
        <CheckCard.Group multiple value={values} onChange={(vals) => setValues(vals as string[])}>
            <CheckCard title="Plan A" description="Basic plan" value="a" />
            <CheckCard title="Plan B" description="Pro plan" value="b" />
            <CheckCard title="Plan C" description="Enterprise" value="c" />
        </CheckCard.Group>
    );
};

// Demo 3: With Avatar/Icon
const AvatarCheckCardDemo = () => (
    <CheckCard.Group defaultValue="react">
        <CheckCard
            avatar="⚛️"
            title="React"
            description="A JavaScript library"
            value="react"
        />
        <CheckCard
            avatar="💚"
            title="Vue"
            description="Progressive framework"
            value="vue"
        />
        <CheckCard
            avatar="🅰️"
            title="Angular"
            description="Platform for apps"
            value="angular"
        />
    </CheckCard.Group>
);

// Demo 4: Different Sizes
const SizesCheckCardDemo = () => (
    <Space orientation="vertical" size="large">
        <div>
            <p>Small:</p>
            <CheckCard.Group size="small" defaultValue="1">
                <CheckCard title="Small 1" value="1" />
                <CheckCard title="Small 2" value="2" />
            </CheckCard.Group>
        </div>
        <div>
            <p>Default:</p>
            <CheckCard.Group defaultValue="1">
                <CheckCard title="Default 1" value="1" />
                <CheckCard title="Default 2" value="2" />
            </CheckCard.Group>
        </div>
        <div>
            <p>Large:</p>
            <CheckCard.Group size="large" defaultValue="1">
                <CheckCard title="Large 1" value="1" />
                <CheckCard title="Large 2" value="2" />
            </CheckCard.Group>
        </div>
    </Space>
);

// Demo 5: Disabled State
const DisabledCheckCardDemo = () => (
    <CheckCard.Group defaultValue="enabled">
        <CheckCard title="Enabled" description="You can select this" value="enabled" />
        <CheckCard title="Disabled" description="Cannot select" value="disabled" disabled />
    </CheckCard.Group>
);

// Demo 6: Loading State
const LoadingCheckCardDemo = () => (
    <CheckCard.Group defaultValue="1">
        <CheckCard title="Normal Card" value="1" />
        <CheckCard title="Loading Card" value="2" loading />
    </CheckCard.Group>
);

export const checkCardData: AntdComponentData = {
    id: "pro-check-card",
    name: "CheckCard",
    description: "CheckCard is a selectable card component that works like radio buttons or checkboxes but with a card UI for better visual selection.",
    whenToUse: "Use CheckCard when you want users to select from a list of options with rich visual content, such as pricing plans, themes, or service tiers.",
    docUrl: "https://procomponents.ant.design/en-US/components/check-card",
    demos: [
        {
            id: "basic",
            title: "Basic CheckCard",
            description: "Single selection mode",
            demo: <BasicCheckCardDemo />,
            code: `<CheckCard.Group value={value} onChange={setValue}>
  <CheckCard title="Option 1" description="First" value="option1" />
  <CheckCard title="Option 2" description="Second" value="option2" />
</CheckCard.Group>`,
        },
        {
            id: "multiple",
            title: "Multiple Selection",
            description: "Select multiple cards",
            demo: <MultipleCheckCardDemo />,
            code: `<CheckCard.Group multiple value={values} onChange={setValues}>
  <CheckCard title="Plan A" value="a" />
  <CheckCard title="Plan B" value="b" />
</CheckCard.Group>`,
        },
        {
            id: "avatar",
            title: "With Avatar/Icon",
            description: "Cards with visual icons",
            demo: <AvatarCheckCardDemo />,
            code: `<CheckCard
  avatar="⚛️"
  title="React"
  description="A JavaScript library"
  value="react"
/>`,
        },
        {
            id: "sizes",
            title: "Different Sizes",
            description: "Small, default, and large sizes",
            demo: <SizesCheckCardDemo />,
            code: `<CheckCard.Group size="small">...</CheckCard.Group>
<CheckCard.Group size="default">...</CheckCard.Group>
<CheckCard.Group size="large">...</CheckCard.Group>`,
        },
        {
            id: "disabled",
            title: "Disabled State",
            description: "Non-selectable cards",
            demo: <DisabledCheckCardDemo />,
            code: `<CheckCard title="Disabled" value="x" disabled />`,
        },
        {
            id: "loading",
            title: "Loading State",
            description: "Card in loading state",
            demo: <LoadingCheckCardDemo />,
            code: `<CheckCard title="Loading" value="x" loading />`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode", description: "Card title" },
        { name: "description", type: "ReactNode", description: "Card description" },
        { name: "value", type: "string", description: "Card value for selection" },
        { name: "avatar", type: "ReactNode", description: "Avatar/icon content" },
        { name: "size", type: "'small' | 'default' | 'large'", description: "Card size" },
        { name: "disabled", type: "boolean", description: "Disable selection" },
        { name: "loading", type: "boolean", description: "Show loading state" },
        { name: "checked", type: "boolean", description: "Controlled checked state" },
        { name: "onChange", type: "(checked: boolean) => void", description: "Change callback" },
    ],
};
