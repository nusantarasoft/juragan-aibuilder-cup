"use client";

import React, { useState } from "react";
import { Transfer, Space, Switch, Typography } from "antd";
import type { TransferProps } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

interface RecordType {
    key: string;
    title: string;
    description?: string;
}

const mockData: RecordType[] = Array.from({ length: 10 }).map((_, i) => ({
    key: i.toString(),
    title: `Item ${i + 1}`,
    description: `Description of item ${i + 1}`,
}));

const initialTargetKeys = mockData.filter((item) => Number(item.key) > 5).map((item) => item.key);

// Demo 1: Basic Transfer
const BasicTransferDemo = () => {
    const [targetKeys, setTargetKeys] = useState<string[]>(initialTargetKeys);
    return (
        <Transfer
            dataSource={mockData}
            targetKeys={targetKeys}
            onChange={(keys) => setTargetKeys(keys as string[])}
            render={(item) => item.title}
        />
    );
};

// Demo 2: With Search
const SearchTransferDemo = () => {
    const [targetKeys, setTargetKeys] = useState<string[]>([]);
    return (
        <Transfer
            dataSource={mockData}
            showSearch
            filterOption={(input, option) => option.title.toLowerCase().includes(input.toLowerCase())}
            targetKeys={targetKeys}
            onChange={(keys) => setTargetKeys(keys as string[])}
            render={(item) => item.title}
        />
    );
};

// Demo 3: One Way
const OneWayTransferDemo = () => {
    const [targetKeys, setTargetKeys] = useState<string[]>([]);
    return (
        <Transfer
            dataSource={mockData}
            oneWay
            targetKeys={targetKeys}
            onChange={(keys) => setTargetKeys(keys as string[])}
            render={(item) => item.title}
        />
    );
};

// Demo 4: Pagination
const PaginationTransferDemo = () => {
    const [targetKeys, setTargetKeys] = useState<string[]>([]);
    return (
        <Transfer
            dataSource={mockData}
            pagination
            targetKeys={targetKeys}
            onChange={(keys) => setTargetKeys(keys as string[])}
            render={(item) => item.title}
        />
    );
};

// Demo 5: Custom Titles
const CustomTitleTransferDemo = () => {
    const [targetKeys, setTargetKeys] = useState<string[]>([]);
    return (
        <Transfer
            dataSource={mockData}
            titles={["Source", "Target"]}
            targetKeys={targetKeys}
            onChange={(keys) => setTargetKeys(keys as string[])}
            render={(item) => item.title}
        />
    );
};

// Demo 6: Disabled
const DisabledTransferDemo = () => (
    <Transfer
        dataSource={mockData.slice(0, 4)}
        targetKeys={["2", "3"]}
        disabled
        render={(item) => item.title}
    />
);

export const transferData: AntdComponentData = {
    id: "antd-transfer",
    name: "Transfer",
    description: "Transfer is a double-column list for moving items between source and target. Supports search, pagination, and one-way mode.",
    whenToUse: "Use Transfer when users need to move items between two lists, such as assigning permissions or selecting options.",
    docUrl: "https://ant.design/components/transfer",
    demos: [
        {
            id: "basic",
            title: "Basic Transfer",
            description: "Two-column transfer",
            demo: <BasicTransferDemo />,
            code: `<Transfer
  dataSource={data}
  targetKeys={targetKeys}
  onChange={setTargetKeys}
  render={(item) => item.title}
/>`,
        },
        {
            id: "search",
            title: "With Search",
            description: "Searchable transfer",
            demo: <SearchTransferDemo />,
            code: `<Transfer
  showSearch
  filterOption={(input, option) =>
    option.title.includes(input)
  }
/>`,
        },
        {
            id: "oneway",
            title: "One Way",
            description: "Only move to target",
            demo: <OneWayTransferDemo />,
            code: `<Transfer oneWay />`,
        },
        {
            id: "pagination",
            title: "Pagination",
            description: "Paginated lists",
            demo: <PaginationTransferDemo />,
            code: `<Transfer pagination />`,
        },
        {
            id: "titles",
            title: "Custom Titles",
            description: "Custom header labels",
            demo: <CustomTitleTransferDemo />,
            code: `<Transfer titles={["Source", "Target"]} />`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive transfer",
            demo: <DisabledTransferDemo />,
            code: `<Transfer disabled />`,
        },
    ],
    apiProps: [
        { name: "dataSource", type: "RecordType[]", description: "Source data" },
        { name: "targetKeys", type: "string[]", description: "Keys in target" },
        { name: "selectedKeys", type: "string[]", description: "Selected keys" },
        { name: "render", type: "(record) => ReactNode", description: "Item renderer" },
        { name: "titles", type: "[string, string]", description: "Column headers" },
        { name: "showSearch", type: "boolean", description: "Enable search" },
        { name: "filterOption", type: "(input, option) => boolean", description: "Filter function" },
        { name: "oneWay", type: "boolean", description: "One-way mode" },
        { name: "pagination", type: "boolean", description: "Enable pagination" },
        { name: "disabled", type: "boolean", description: "Disable transfer" },
        { name: "onChange", type: "(targetKeys, direction, moveKeys) => void", description: "Change callback" },
    ],
};
