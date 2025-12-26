"use client";

import React, { useState } from "react";
import { Rate, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Rate
const BasicRateDemo = () => (
    <Rate defaultValue={3} />
);

// Demo 2: Half Stars
const HalfRateDemo = () => (
    <Rate allowHalf defaultValue={2.5} />
);

// Demo 3: Show Text
const TextRateDemo = () => {
    const [value, setValue] = useState(3);
    const desc = ["terrible", "bad", "normal", "good", "wonderful"];
    return (
        <Space>
            <Rate tooltips={desc} onChange={setValue} value={value} />
            {value ? <Text>{desc[value - 1]}</Text> : null}
        </Space>
    );
};

// Demo 4: Disabled
const DisabledRateDemo = () => (
    <Rate disabled defaultValue={3} />
);

// Demo 5: Clear
const ClearRateDemo = () => (
    <Space orientation="vertical">
        <Rate defaultValue={3} />
        <Text type="secondary">Click again to clear (default)</Text>
        <Rate allowClear={false} defaultValue={3} />
        <Text type="secondary">Cannot clear</Text>
    </Space>
);

// Demo 6: Custom Character
const CustomRateDemo = () => (
    <Space orientation="vertical">
        <Rate character="❤️" defaultValue={3} />
        <Rate character="👍" defaultValue={3} />
        <Rate character="A" allowHalf defaultValue={2.5} />
    </Space>
);

// Demo 7: Count
const CountRateDemo = () => (
    <Space orientation="vertical">
        <Rate count={3} defaultValue={2} />
        <Rate count={10} defaultValue={7} />
    </Space>
);

// Demo 8: Controlled
const ControlledRateDemo = () => {
    const [value, setValue] = useState(2);
    return (
        <Space>
            <Rate value={value} onChange={setValue} />
            <Text>Rating: {value}</Text>
        </Space>
    );
};

export const rateData: AntdComponentData = {
    id: "antd-rate",
    name: "Rate",
    description: "Rate component for rating or feedback. Supports half stars, custom characters, and tooltips.",
    whenToUse: "Use Rate when users need to provide ratings or feedback, such as product reviews or satisfaction scores.",
    docUrl: "https://ant.design/components/rate",
    demos: [
        {
            id: "basic",
            title: "Basic Rate",
            description: "Simple star rating",
            demo: <BasicRateDemo />,
            code: `<Rate defaultValue={3} />`,
        },
        {
            id: "half",
            title: "Half Stars",
            description: "Allow half values",
            demo: <HalfRateDemo />,
            code: `<Rate allowHalf defaultValue={2.5} />`,
        },
        {
            id: "text",
            title: "With Tooltips",
            description: "Show rating text",
            demo: <TextRateDemo />,
            code: `<Rate
  tooltips={["bad", "ok", "good", "great", "perfect"]}
  value={value}
/>`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Read-only display",
            demo: <DisabledRateDemo />,
            code: `<Rate disabled defaultValue={3} />`,
        },
        {
            id: "clear",
            title: "Clear Option",
            description: "Control clearing behavior",
            demo: <ClearRateDemo />,
            code: `<Rate allowClear={false} />`,
        },
        {
            id: "custom",
            title: "Custom Character",
            description: "Custom icons or text",
            demo: <CustomRateDemo />,
            code: `<Rate character="❤️" />
<Rate character="👍" />
<Rate character={<HeartIcon />} />`,
        },
        {
            id: "count",
            title: "Star Count",
            description: "Custom number of stars",
            demo: <CountRateDemo />,
            code: `<Rate count={3} />
<Rate count={10} />`,
        },
        {
            id: "controlled",
            title: "Controlled",
            description: "Controlled value",
            demo: <ControlledRateDemo />,
            code: `<Rate value={value} onChange={setValue} />`,
        },
    ],
    apiProps: [
        { name: "value", type: "number", description: "Controlled value" },
        { name: "defaultValue", type: "number", description: "Initial value" },
        { name: "count", type: "number", description: "Total stars", default: "5" },
        { name: "allowHalf", type: "boolean", description: "Allow half stars" },
        { name: "allowClear", type: "boolean", description: "Allow clearing", default: "true" },
        { name: "character", type: "ReactNode | (RateProps) => ReactNode", description: "Custom character" },
        { name: "tooltips", type: "string[]", description: "Tooltip for each star" },
        { name: "disabled", type: "boolean", description: "Read-only mode" },
        { name: "onChange", type: "(value) => void", description: "Change callback" },
    ],
};
