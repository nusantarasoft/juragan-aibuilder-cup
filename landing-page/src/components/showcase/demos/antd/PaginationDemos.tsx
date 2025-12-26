"use client";

import React, { useState } from "react";
import { Pagination, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Pagination
const BasicPaginationDemo = () => (
    <Pagination defaultCurrent={1} total={50} />
);

// Demo 2: More Pages
const MorePaginationDemo = () => (
    <Pagination defaultCurrent={6} total={500} />
);

// Demo 3: With Page Size Changer
const PageSizeDemo = () => (
    <Pagination
        showSizeChanger
        defaultCurrent={1}
        total={100}
        pageSizeOptions={[10, 20, 50, 100]}
    />
);

// Demo 4: With Quick Jumper
const QuickJumperDemo = () => (
    <Pagination showQuickJumper defaultCurrent={2} total={500} />
);

// Demo 5: Mini Size
const MiniPaginationDemo = () => (
    <Pagination size="small" total={50} />
);

// Demo 6: Simple Mode
const SimplePaginationDemo = () => (
    <Pagination simple defaultCurrent={2} total={50} />
);

// Demo 7: With Total
const TotalPaginationDemo = () => (
    <Space direction="vertical">
        <Pagination
            total={85}
            showTotal={(total) => `Total ${total} items`}
        />
        <Pagination
            total={85}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
        />
    </Space>
);

// Demo 8: Controlled Pagination
const ControlledPaginationDemo = () => {
    const [current, setCurrent] = useState(3);
    return (
        <div>
            <Text type="secondary">Current: {current}</Text>
            <Pagination
                current={current}
                onChange={(page) => setCurrent(page)}
                total={50}
            />
        </div>
    );
};

// Demo 9: Disabled
const DisabledPaginationDemo = () => (
    <Pagination disabled defaultCurrent={1} total={50} />
);

export const paginationData: AntdComponentData = {
    id: "antd-pagination",
    name: "Pagination",
    description: "Pagination divides content into discrete pages. Supports page size selection, quick jumping, and various display modes.",
    whenToUse: "Use Pagination when content needs to be split across multiple pages, such as in tables, lists, or search results.",
    docUrl: "https://ant.design/components/pagination",
    demos: [
        {
            id: "basic",
            title: "Basic Pagination",
            description: "Simple page navigation",
            demo: <BasicPaginationDemo />,
            code: `<Pagination defaultCurrent={1} total={50} />`,
        },
        {
            id: "more",
            title: "More Pages",
            description: "With ellipsis for many pages",
            demo: <MorePaginationDemo />,
            code: `<Pagination defaultCurrent={6} total={500} />`,
        },
        {
            id: "size-changer",
            title: "Page Size Changer",
            description: "Change items per page",
            demo: <PageSizeDemo />,
            code: `<Pagination
  showSizeChanger
  total={100}
  pageSizeOptions={[10, 20, 50]}
/>`,
        },
        {
            id: "quick-jumper",
            title: "Quick Jumper",
            description: "Jump to specific page",
            demo: <QuickJumperDemo />,
            code: `<Pagination showQuickJumper total={500} />`,
        },
        {
            id: "mini",
            title: "Mini Size",
            description: "Smaller pagination",
            demo: <MiniPaginationDemo />,
            code: `<Pagination size="small" total={50} />`,
        },
        {
            id: "simple",
            title: "Simple Mode",
            description: "Simplified view",
            demo: <SimplePaginationDemo />,
            code: `<Pagination simple total={50} />`,
        },
        {
            id: "total",
            title: "Show Total",
            description: "Display total count",
            demo: <TotalPaginationDemo />,
            code: `<Pagination
  total={85}
  showTotal={(total) => \`Total \${total} items\`}
/>`,
        },
        {
            id: "controlled",
            title: "Controlled",
            description: "Controlled current page",
            demo: <ControlledPaginationDemo />,
            code: `<Pagination
  current={current}
  onChange={(page) => setCurrent(page)}
  total={50}
/>`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive pagination",
            demo: <DisabledPaginationDemo />,
            code: `<Pagination disabled total={50} />`,
        },
    ],
    apiProps: [
        { name: "total", type: "number", description: "Total number of items", required: true },
        { name: "current", type: "number", description: "Current page" },
        { name: "defaultCurrent", type: "number", description: "Initial page", default: "1" },
        { name: "pageSize", type: "number", description: "Items per page", default: "10" },
        { name: "showSizeChanger", type: "boolean", description: "Show page size selector" },
        { name: "showQuickJumper", type: "boolean", description: "Show quick jumper" },
        { name: "showTotal", type: "(total, range) => ReactNode", description: "Show total display" },
        { name: "size", type: "'default' | 'small'", description: "Pagination size" },
        { name: "simple", type: "boolean", description: "Simple mode" },
        { name: "disabled", type: "boolean", description: "Disable pagination" },
        { name: "onChange", type: "(page, pageSize) => void", description: "Page change callback" },
    ],
};
