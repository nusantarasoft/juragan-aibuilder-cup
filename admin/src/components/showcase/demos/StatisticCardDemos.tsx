"use client";

import React from "react";
import { StatisticCard } from "@ant-design/pro-components";
import { Space, Divider } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

const { Statistic, Divider: StatDivider } = StatisticCard;

// Demo 1: Basic Statistic Card
const BasicStatisticDemo = () => (
    <StatisticCard
        statistic={{
            title: "Total Sales",
            value: 125670,
            precision: 2,
            prefix: "$",
        }}
        style={{ maxWidth: 300 }}
    />
);

// Demo 2: With Description
const DescriptionStatisticDemo = () => (
    <StatisticCard
        statistic={{
            title: "Active Users",
            value: 8932,
            description: <Statistic title="Daily Growth" value="12.5%" trend="up" />,
        }}
        style={{ maxWidth: 300 }}
    />
);

// Demo 3: Multiple Statistics
const MultipleStatisticsDemo = () => (
    <StatisticCard.Group style={{ maxWidth: 600 }}>
        <StatisticCard
            statistic={{ title: "Total", value: 1234 }}
        />
        <StatDivider />
        <StatisticCard
            statistic={{ title: "Completed", value: 892, status: "success" }}
        />
        <StatDivider />
        <StatisticCard
            statistic={{ title: "Pending", value: 342, status: "warning" }}
        />
    </StatisticCard.Group>
);

// Demo 4: With Chart Placeholder
const ChartStatisticDemo = () => (
    <StatisticCard
        title="Revenue Trend"
        statistic={{
            title: "Total Revenue",
            value: 89234,
            prefix: "$",
        }}
        chart={
            <div style={{ height: 60, background: "linear-gradient(90deg, #1890ff 0%, #52c41a 100%)", borderRadius: 4, opacity: 0.3, display: "flex", alignItems: "flex-end", padding: "0 8px" }}>
                <div style={{ width: "10%", height: "40%", background: "#1890ff", marginRight: 4 }}></div>
                <div style={{ width: "10%", height: "60%", background: "#1890ff", marginRight: 4 }}></div>
                <div style={{ width: "10%", height: "45%", background: "#1890ff", marginRight: 4 }}></div>
                <div style={{ width: "10%", height: "80%", background: "#1890ff", marginRight: 4 }}></div>
                <div style={{ width: "10%", height: "55%", background: "#1890ff", marginRight: 4 }}></div>
                <div style={{ width: "10%", height: "90%", background: "#52c41a", marginRight: 4 }}></div>
            </div>
        }
        style={{ maxWidth: 300 }}
    />
);

// Demo 5: Trend Indicators
const TrendStatisticDemo = () => (
    <Space size="large">
        <StatisticCard
            statistic={{
                title: "Growth",
                value: "15.8%",
                trend: "up",
            }}
            style={{ width: 150 }}
        />
        <StatisticCard
            statistic={{
                title: "Decline",
                value: "8.2%",
                trend: "down",
            }}
            style={{ width: 150 }}
        />
    </Space>
);

// Demo 6: Loading State
const LoadingStatisticDemo = () => (
    <StatisticCard
        loading
        statistic={{
            title: "Loading Data",
            value: 0,
        }}
        style={{ maxWidth: 300 }}
    />
);

export const statisticCardData: AntdComponentData = {
    id: "pro-statistic-card",
    name: "StatisticCard",
    description: "StatisticCard displays numeric data with optional trends, charts, and formatting. Perfect for dashboards and data visualization.",
    whenToUse: "Use StatisticCard on dashboards to display key metrics, KPIs, and statistics with visual indicators for trends and status.",
    docUrl: "https://procomponents.ant.design/en-US/components/statistic",
    demos: [
        {
            id: "basic",
            title: "Basic Statistic Card",
            description: "Simple statistic display",
            demo: <BasicStatisticDemo />,
            code: `<StatisticCard
  statistic={{
    title: "Total Sales",
    value: 125670,
    precision: 2,
    prefix: "$",
  }}
/>`,
        },
        {
            id: "description",
            title: "With Description",
            description: "Statistic with sub-metrics",
            demo: <DescriptionStatisticDemo />,
            code: `<StatisticCard
  statistic={{
    title: "Active Users",
    value: 8932,
    description: <Statistic title="Growth" value="12.5%" trend="up" />,
  }}
/>`,
        },
        {
            id: "multiple",
            title: "Multiple Statistics",
            description: "Grouped statistics",
            demo: <MultipleStatisticsDemo />,
            code: `<StatisticCard.Group>
  <StatisticCard statistic={{ title: "Total", value: 1234 }} />
  <StatDivider />
  <StatisticCard statistic={{ title: "Completed", value: 892 }} />
</StatisticCard.Group>`,
        },
        {
            id: "chart",
            title: "With Chart",
            description: "Statistic with chart visualization",
            demo: <ChartStatisticDemo />,
            code: `<StatisticCard
  title="Revenue Trend"
  statistic={{ title: "Total", value: 89234, prefix: "$" }}
  chart={<ChartComponent />}
/>`,
        },
        {
            id: "trend",
            title: "Trend Indicators",
            description: "Up and down trend display",
            demo: <TrendStatisticDemo />,
            code: `<StatisticCard
  statistic={{ title: "Growth", value: "15.8%", trend: "up" }}
/>
<StatisticCard
  statistic={{ title: "Decline", value: "8.2%", trend: "down" }}
/>`,
        },
        {
            id: "loading",
            title: "Loading State",
            description: "Card in loading state",
            demo: <LoadingStatisticDemo />,
            code: `<StatisticCard loading statistic={{ title: "Loading", value: 0 }} />`,
        },
    ],
    apiProps: [
        { name: "statistic", type: "StatisticProps", description: "Statistic configuration", required: true },
        { name: "title", type: "ReactNode", description: "Card title" },
        { name: "chart", type: "ReactNode", description: "Chart component to display" },
        { name: "loading", type: "boolean", description: "Loading state" },
        { name: "tip", type: "string", description: "Tooltip text" },
        { name: "footer", type: "ReactNode", description: "Footer content" },
    ],
};
