"use client";

import React from "react";
import { Mentions, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { getMentions } = Mentions;

const users = [
    { value: "john", label: "John Doe" },
    { value: "jane", label: "Jane Smith" },
    { value: "bob", label: "Bob Johnson" },
    { value: "alice", label: "Alice Williams" },
];

// Demo 1: Basic Mentions
const BasicMentionsDemo = () => (
    <Mentions
        style={{ width: "100%" }}
        placeholder="Type @ to mention someone"
        options={users}
    />
);

// Demo 2: Custom Prefix
const PrefixMentionsDemo = () => (
    <Mentions
        style={{ width: "100%" }}
        prefix="#"
        placeholder="Type # for hashtags"
        options={[
            { value: "react", label: "react" },
            { value: "antd", label: "antd" },
            { value: "typescript", label: "typescript" },
        ]}
    />
);

// Demo 3: Multiple Prefixes
const MultiplePrefixDemo = () => (
    <Mentions
        style={{ width: "100%" }}
        prefix={["@", "#"]}
        placeholder="Type @ for users, # for tags"
        options={users}
    />
);

// Demo 4: With Rows
const RowsMentionsDemo = () => (
    <Mentions
        style={{ width: "100%" }}
        rows={4}
        placeholder="Type @ to mention (multiline)"
        options={users}
    />
);

// Demo 5: Disabled
const DisabledMentionsDemo = () => (
    <Space orientation="vertical" style={{ width: "100%" }}>
        <Mentions disabled placeholder="Disabled" options={users} />
        <Mentions readOnly defaultValue="@john is mentioned here" options={users} />
    </Space>
);

// Demo 6: Status
const StatusMentionsDemo = () => (
    <Space orientation="vertical" style={{ width: "100%" }}>
        <Mentions status="error" placeholder="Error state" options={users} />
        <Mentions status="warning" placeholder="Warning state" options={users} />
    </Space>
);

// Demo 7: Async Loading
const AsyncMentionsDemo = () => (
    <Mentions
        style={{ width: "100%" }}
        loading
        placeholder="Loading options..."
        options={users}
    />
);

export const mentionsData: AntdComponentData = {
    id: "antd-mentions",
    name: "Mentions",
    description: "Mentions provides an input for tagging users or items with @ or custom prefixes. Used in comments and chat applications.",
    whenToUse: "Use Mentions when users need to tag or reference other users, items, or categories in text input.",
    docUrl: "https://ant.design/components/mentions",
    demos: [
        {
            id: "basic",
            title: "Basic Mentions",
            description: "@ mention users",
            demo: <BasicMentionsDemo />,
            code: `<Mentions
  placeholder="Type @ to mention"
  options={[
    { value: "john", label: "John" },
    { value: "jane", label: "Jane" },
  ]}
/>`,
        },
        {
            id: "prefix",
            title: "Custom Prefix",
            description: "Use # for hashtags",
            demo: <PrefixMentionsDemo />,
            code: `<Mentions prefix="#" options={hashtags} />`,
        },
        {
            id: "multiple",
            title: "Multiple Prefixes",
            description: "Both @ and # triggers",
            demo: <MultiplePrefixDemo />,
            code: `<Mentions prefix={["@", "#"]} options={options} />`,
        },
        {
            id: "rows",
            title: "Multiline",
            description: "Multiple rows textarea",
            demo: <RowsMentionsDemo />,
            code: `<Mentions rows={4} options={options} />`,
        },
        {
            id: "disabled",
            title: "Disabled / ReadOnly",
            description: "Non-editable states",
            demo: <DisabledMentionsDemo />,
            code: `<Mentions disabled />
<Mentions readOnly defaultValue="@john" />`,
        },
        {
            id: "status",
            title: "Validation Status",
            description: "Error and warning states",
            demo: <StatusMentionsDemo />,
            code: `<Mentions status="error" />
<Mentions status="warning" />`,
        },
        {
            id: "async",
            title: "Async Loading",
            description: "Loading indicator",
            demo: <AsyncMentionsDemo />,
            code: `<Mentions loading options={options} />`,
        },
    ],
    apiProps: [
        { name: "options", type: "{ value, label }[]", description: "Mention options" },
        { name: "prefix", type: "string | string[]", description: "Trigger prefix", default: "@" },
        { name: "value", type: "string", description: "Controlled value" },
        { name: "defaultValue", type: "string", description: "Initial value" },
        { name: "rows", type: "number", description: "Textarea rows" },
        { name: "loading", type: "boolean", description: "Show loading" },
        { name: "disabled", type: "boolean", description: "Disable input" },
        { name: "readOnly", type: "boolean", description: "Read-only mode" },
        { name: "status", type: "'error' | 'warning'", description: "Validation status" },
        { name: "onChange", type: "(text) => void", description: "Change callback" },
        { name: "onSelect", type: "(option, prefix) => void", description: "Select callback" },
    ],
};
