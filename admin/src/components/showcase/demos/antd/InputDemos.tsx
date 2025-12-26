"use client";

import React, { useState } from "react";
import { Input, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { TextArea, Search, Password } = Input;
const { Text } = Typography;

// Demo 1: Basic Input
const BasicInputDemo = () => (
    <Space orientation="vertical" style={{ width: 300 }}>
        <Input placeholder="Basic input" />
        <Input placeholder="With default value" defaultValue="Hello World" />
    </Space>
);

// Demo 2: Input Sizes
const InputSizesDemo = () => (
    <Space orientation="vertical" style={{ width: 300 }}>
        <Input size="large" placeholder="Large input" />
        <Input placeholder="Default input" />
        <Input size="small" placeholder="Small input" />
    </Space>
);

// Demo 3: Input with Prefix/Suffix
const PrefixSuffixDemo = () => (
    <Space orientation="vertical" style={{ width: 300 }}>
        <Input prefix="👤" placeholder="Username" />
        <Input prefix="$" suffix="USD" placeholder="Price" />
        <Input suffix="@gmail.com" placeholder="Email" />
    </Space>
);

// Demo 4: Password Input
const PasswordInputDemo = () => (
    <Space orientation="vertical" style={{ width: 300 }}>
        <Password placeholder="Password" />
        <Password placeholder="Confirm Password" visibilityToggle />
    </Space>
);

// Demo 5: Search Input
const SearchInputDemo = () => (
    <Space orientation="vertical" style={{ width: 300 }}>
        <Search placeholder="Search..." onSearch={(value) => console.log(value)} />
        <Search placeholder="Search with button" enterButton />
        <Search placeholder="Custom button" enterButton="Search" loading={false} />
    </Space>
);

// Demo 6: TextArea
const TextAreaDemo = () => (
    <Space orientation="vertical" style={{ width: 300 }}>
        <TextArea rows={4} placeholder="Basic textarea" />
        <TextArea showCount maxLength={100} placeholder="With character count" />
        <TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="Auto-sizing textarea" />
    </Space>
);

// Demo 7: Disabled and Read-only
const DisabledReadOnlyDemo = () => (
    <Space orientation="vertical" style={{ width: 300 }}>
        <Input placeholder="Disabled input" disabled />
        <Input value="Read-only value" readOnly />
        <TextArea placeholder="Disabled textarea" disabled />
    </Space>
);

// Demo 8: Input Status
const InputStatusDemo = () => (
    <Space orientation="vertical" style={{ width: 300 }}>
        <Input status="error" placeholder="Error status" />
        <Input status="warning" placeholder="Warning status" />
    </Space>
);

// Demo 9: Input with Clear
const ClearableInputDemo = () => (
    <Space orientation="vertical" style={{ width: 300 }}>
        <Input placeholder="Clearable input" allowClear />
        <TextArea placeholder="Clearable textarea" allowClear />
    </Space>
);

export const inputData: AntdComponentData = {
    id: "antd-input",
    name: "Input",
    description: "Input is a basic widget for getting user input. It supports various types like text, password, search, and textarea.",
    whenToUse: "Use Input when you need to accept user text input. Includes variants for password, search, and multi-line text areas.",
    docUrl: "https://ant.design/components/input",
    demos: [
        {
            id: "basic",
            title: "Basic Input",
            description: "Simple text input",
            demo: <BasicInputDemo />,
            code: `<Input placeholder="Basic input" />
<Input defaultValue="Hello World" />`,
        },
        {
            id: "sizes",
            title: "Input Sizes",
            description: "Large, default, and small sizes",
            demo: <InputSizesDemo />,
            code: `<Input size="large" placeholder="Large" />
<Input placeholder="Default" />
<Input size="small" placeholder="Small" />`,
        },
        {
            id: "prefix-suffix",
            title: "Prefix & Suffix",
            description: "Input with icons or text",
            demo: <PrefixSuffixDemo />,
            code: `<Input prefix="👤" placeholder="Username" />
<Input prefix="$" suffix="USD" placeholder="Price" />`,
        },
        {
            id: "password",
            title: "Password Input",
            description: "Password field with toggle",
            demo: <PasswordInputDemo />,
            code: `<Input.Password placeholder="Password" />`,
        },
        {
            id: "search",
            title: "Search Input",
            description: "Input with search button",
            demo: <SearchInputDemo />,
            code: `<Input.Search placeholder="Search..." onSearch={onSearch} />
<Input.Search enterButton="Search" />`,
        },
        {
            id: "textarea",
            title: "TextArea",
            description: "Multi-line text input",
            demo: <TextAreaDemo />,
            code: `<Input.TextArea rows={4} placeholder="Text area" />
<Input.TextArea showCount maxLength={100} />
<Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />`,
        },
        {
            id: "disabled",
            title: "Disabled & Read-only",
            description: "Non-editable inputs",
            demo: <DisabledReadOnlyDemo />,
            code: `<Input disabled placeholder="Disabled" />
<Input readOnly value="Read-only" />`,
        },
        {
            id: "status",
            title: "Input Status",
            description: "Error and warning states",
            demo: <InputStatusDemo />,
            code: `<Input status="error" placeholder="Error" />
<Input status="warning" placeholder="Warning" />`,
        },
        {
            id: "clearable",
            title: "Clearable Input",
            description: "Input with clear button",
            demo: <ClearableInputDemo />,
            code: `<Input allowClear placeholder="Clearable" />`,
        },
    ],
    apiProps: [
        { name: "placeholder", type: "string", description: "Placeholder text" },
        { name: "value", type: "string", description: "Controlled value" },
        { name: "defaultValue", type: "string", description: "Initial value" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Input size" },
        { name: "prefix", type: "ReactNode", description: "Prefix element" },
        { name: "suffix", type: "ReactNode", description: "Suffix element" },
        { name: "disabled", type: "boolean", description: "Disable input" },
        { name: "allowClear", type: "boolean", description: "Show clear button" },
        { name: "status", type: "'error' | 'warning'", description: "Validation status" },
        { name: "onChange", type: "(e) => void", description: "Change handler" },
    ],
};
