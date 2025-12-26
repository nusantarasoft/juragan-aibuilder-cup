"use client";

import React from "react";
import { ProSkeleton } from "@ant-design/pro-components";
import { Card, Space } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: List Skeleton
const ListSkeletonDemo = () => (
    <Card title="List Skeleton" size="small">
        <ProSkeleton type="list" />
    </Card>
);

// Demo 2: Result Skeleton
const ResultSkeletonDemo = () => (
    <Card title="Result Skeleton" size="small">
        <ProSkeleton type="result" />
    </Card>
);

// Demo 3: Descriptions Skeleton
const DescriptionsSkeletonDemo = () => (
    <Card title="Descriptions Skeleton" size="small">
        <ProSkeleton type="descriptions" />
    </Card>
);

// Demo 4: Statistic Skeleton
const StatisticSkeletonDemo = () => (
    <Space size="large">
        <Card size="small" style={{ width: 150 }}>
            <ProSkeleton statistic={1} />
        </Card>
        <Card size="small" style={{ width: 150 }}>
            <ProSkeleton statistic={1} />
        </Card>
    </Space>
);

// Demo 5: Active Animation
const ActiveSkeletonDemo = () => (
    <Card title="Active Animation" size="small">
        <ProSkeleton type="list" active />
    </Card>
);

// Demo 6: Statistic Card
const StatisticCardSkeletonDemo = () => (
    <Card size="small" style={{ width: 300 }}>
        <ProSkeleton statistic={2} />
    </Card>
);

export const proSkeletonData: AntdComponentData = {
    id: "pro-skeleton",
    name: "ProSkeleton",
    description: "ProSkeleton provides pre-designed loading placeholders for common ProComponents layouts like lists, results, descriptions, and statistics.",
    whenToUse: "Use ProSkeleton to display loading states for ProComponents. It provides consistent loading experiences that match the component structure they represent.",
    docUrl: "https://procomponents.ant.design/en-US/components/skeleton",
    demos: [
        {
            id: "list",
            title: "List Skeleton",
            description: "Skeleton for list content",
            demo: <ListSkeletonDemo />,
            code: `<ProSkeleton type="list" />`,
        },
        {
            id: "result",
            title: "Result Skeleton",
            description: "Skeleton for result pages",
            demo: <ResultSkeletonDemo />,
            code: `<ProSkeleton type="result" />`,
        },
        {
            id: "descriptions",
            title: "Descriptions Skeleton",
            description: "Skeleton for description lists",
            demo: <DescriptionsSkeletonDemo />,
            code: `<ProSkeleton type="descriptions" />`,
        },
        {
            id: "statistic",
            title: "Statistic Skeleton",
            description: "Skeleton for statistic cards",
            demo: <StatisticSkeletonDemo />,
            code: `<ProSkeleton statistic={1} />`,
        },
        {
            id: "active",
            title: "Active Animation",
            description: "Skeleton with pulse animation",
            demo: <ActiveSkeletonDemo />,
            code: `<ProSkeleton type="list" active />`,
        },
        {
            id: "statcard",
            title: "Multiple Statistics",
            description: "Multiple stat placeholders",
            demo: <StatisticCardSkeletonDemo />,
            code: `<ProSkeleton statistic={2} />`,
        },
    ],
    apiProps: [
        { name: "type", type: "'list' | 'result' | 'descriptions'", description: "Skeleton type" },
        { name: "active", type: "boolean", description: "Pulse animation", default: "false" },
        { name: "statistic", type: "number | false", description: "Number of statistic items" },
        { name: "list", type: "number | false", description: "Number of list items" },
        { name: "pageHeader", type: "false | { avatar }", description: "Page header skeleton config" },
    ],
};
