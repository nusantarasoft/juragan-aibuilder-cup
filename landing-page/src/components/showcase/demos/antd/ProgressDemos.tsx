"use client";

import React from "react";
import { Progress, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Text } = Typography;

// Demo 1: Basic Progress
const BasicProgressDemo = () => (
    <Progress percent={30} />
);

// Demo 2: Circle
const CircleProgressDemo = () => (
    <Space>
        <Progress type="circle" percent={75} />
        <Progress type="circle" percent={70} status="exception" />
        <Progress type="circle" percent={100} />
    </Space>
);

// Demo 3: Mini
const MiniProgressDemo = () => (
    <Space direction="vertical" style={{ width: 200 }}>
        <Progress percent={30} size="small" />
        <Progress percent={50} size="small" status="active" />
        <Progress percent={70} size="small" status="exception" />
        <Progress percent={100} size="small" />
    </Space>
);

// Demo 4: Status
const StatusProgressDemo = () => (
    <Space direction="vertical" style={{ width: "100%" }}>
        <Progress percent={30} status="active" />
        <Progress percent={50} status="exception" />
        <Progress percent={100} status="success" />
    </Space>
);

// Demo 5: Steps
const StepsProgressDemo = () => (
    <Space direction="vertical" style={{ width: "100%" }}>
        <Progress percent={50} steps={5} />
        <Progress percent={30} steps={5} size="small" strokeColor="green" />
    </Space>
);

// Demo 6: Dashboard
const DashboardProgressDemo = () => (
    <Space>
        <Progress type="dashboard" percent={75} />
        <Progress type="dashboard" percent={75} gapDegree={30} />
    </Space>
);

// Demo 7: Gradient
const GradientProgressDemo = () => (
    <Space direction="vertical" style={{ width: "100%" }}>
        <Progress
            percent={99.9}
            strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }}
        />
        <Progress
            percent={99.9}
            status="active"
            strokeColor={{ from: "#108ee9", to: "#87d068" }}
        />
    </Space>
);

// Demo 8: Custom Format
const FormatProgressDemo = () => (
    <Space>
        <Progress type="circle" percent={75} format={(percent) => `${percent} Days`} />
        <Progress type="circle" percent={100} format={() => "Done"} />
    </Space>
);

export const progressData: AntdComponentData = {
    id: "antd-progress",
    name: "Progress",
    description: "Progress displays operation progress. Supports linear, circular, dashboard, and stepped variants with various styles.",
    whenToUse: "Use Progress for file uploads, long-running operations, or any process with measurable completion.",
    docUrl: "https://ant.design/components/progress",
    demos: [
        {
            id: "basic",
            title: "Basic Progress",
            description: "Linear progress bar",
            demo: <BasicProgressDemo />,
            code: `<Progress percent={30} />`,
        },
        {
            id: "circle",
            title: "Circle Progress",
            description: "Circular indicator",
            demo: <CircleProgressDemo />,
            code: `<Progress type="circle" percent={75} />`,
        },
        {
            id: "mini",
            title: "Mini Progress",
            description: "Small size bars",
            demo: <MiniProgressDemo />,
            code: `<Progress percent={30} size="small" />`,
        },
        {
            id: "status",
            title: "Status",
            description: "Active, exception, success",
            demo: <StatusProgressDemo />,
            code: `<Progress status="active" percent={30} />
<Progress status="exception" percent={50} />
<Progress status="success" percent={100} />`,
        },
        {
            id: "steps",
            title: "Steps Progress",
            description: "Segmented progress",
            demo: <StepsProgressDemo />,
            code: `<Progress percent={50} steps={5} />`,
        },
        {
            id: "dashboard",
            title: "Dashboard",
            description: "Semi-circle gauge",
            demo: <DashboardProgressDemo />,
            code: `<Progress type="dashboard" percent={75} />`,
        },
        {
            id: "gradient",
            title: "Gradient",
            description: "Gradient colors",
            demo: <GradientProgressDemo />,
            code: `<Progress strokeColor={{ "0%": "#108ee9", "100%": "#87d068" }} />`,
        },
        {
            id: "format",
            title: "Custom Format",
            description: "Custom text format",
            demo: <FormatProgressDemo />,
            code: `<Progress format={(p) => \`\${p} Days\`} />`,
        },
    ],
    apiProps: [
        { name: "percent", type: "number", description: "Completion percentage" },
        { name: "type", type: "'line' | 'circle' | 'dashboard'", description: "Progress type", default: "line" },
        { name: "status", type: "'success' | 'exception' | 'normal' | 'active'", description: "Status" },
        { name: "size", type: "'default' | 'small' | [width, height]", description: "Size" },
        { name: "steps", type: "number", description: "Number of steps" },
        { name: "strokeColor", type: "string | object", description: "Bar color" },
        { name: "strokeWidth", type: "number", description: "Bar width" },
        { name: "format", type: "(percent) => ReactNode", description: "Content formatter" },
        { name: "showInfo", type: "boolean", description: "Show percentage", default: "true" },
    ],
};
