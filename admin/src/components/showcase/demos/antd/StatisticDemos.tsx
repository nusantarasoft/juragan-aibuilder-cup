"use client";

import React from "react";
import { Statistic, Row, Col, Card, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { Countdown: CountdownComponent } = Statistic;

// Demo 1: Basic Statistic
const BasicStatisticDemo = () => (
    <Row gutter={16}>
        <Col span={12}>
            <Statistic title="Active Users" value={112893} />
        </Col>
        <Col span={12}>
            <Statistic title="Account Balance (CNY)" value={112893} precision={2} />
        </Col>
    </Row>
);

// Demo 2: With Prefix/Suffix
const PrefixSuffixDemo = () => (
    <Row gutter={16}>
        <Col span={12}>
            <Statistic title="Feedback" value={1128} prefix="👍" />
        </Col>
        <Col span={12}>
            <Statistic title="Unmerged" value={93} suffix="/ 100" />
        </Col>
    </Row>
);

// Demo 3: In Card
const CardStatisticDemo = () => (
    <Row gutter={16}>
        <Col span={12}>
            <Card>
                <Statistic
                    title="Active"
                    value={11.28}
                    precision={2}
                    valueStyle={{ color: "#3f8600" }}
                    prefix="↑"
                    suffix="%"
                />
            </Card>
        </Col>
        <Col span={12}>
            <Card>
                <Statistic
                    title="Idle"
                    value={9.3}
                    precision={2}
                    valueStyle={{ color: "#cf1322" }}
                    prefix="↓"
                    suffix="%"
                />
            </Card>
        </Col>
    </Row>
);

// Demo 4: Countdown
const CountdownDemo = () => (
    <Row gutter={16}>
        <Col span={12}>
            <CountdownComponent title="Countdown" value={Date.now() + 1000 * 60 * 60 * 24} />
        </Col>
        <Col span={12}>
            <CountdownComponent title="Day Level" value={Date.now() + 1000 * 60 * 60 * 24 * 2} format="D天 H时 m分 s秒" />
        </Col>
    </Row>
);

// Demo 5: Loading
const LoadingStatisticDemo = () => (
    <Statistic title="Data Loading" value={1128} loading />
);

// Demo 6: Group
const GroupStatisticDemo = () => (
    <Card>
        <Row gutter={16}>
            <Col span={8}>
                <Statistic title="Users" value={8846} />
            </Col>
            <Col span={8}>
                <Statistic title="Orders" value={2456} />
            </Col>
            <Col span={8}>
                <Statistic title="Revenue" value={98765} prefix="$" />
            </Col>
        </Row>
    </Card>
);

export const statisticData: AntdComponentData = {
    id: "antd-statistic",
    name: "Statistic",
    description: "Statistic displays numeric data with optional prefix, suffix, precision, and countdown functionality.",
    whenToUse: "Use Statistic for dashboards, analytics, metrics display, or any numeric data presentation.",
    docUrl: "https://ant.design/components/statistic",
    demos: [
        {
            id: "basic",
            title: "Basic Statistic",
            description: "Simple numeric display",
            demo: <BasicStatisticDemo />,
            code: `<Statistic title="Active Users" value={112893} />
<Statistic title="Balance" value={112893} precision={2} />`,
        },
        {
            id: "prefix-suffix",
            title: "Prefix/Suffix",
            description: "With icons and units",
            demo: <PrefixSuffixDemo />,
            code: `<Statistic title="Feedback" prefix="👍" value={1128} />
<Statistic title="Progress" value={93} suffix="/ 100" />`,
        },
        {
            id: "card",
            title: "In Card",
            description: "Colored values",
            demo: <CardStatisticDemo />,
            code: `<Statistic
  title="Active"
  value={11.28}
  valueStyle={{ color: "#3f8600" }}
  prefix="↑"
  suffix="%"
/>`,
        },
        {
            id: "countdown",
            title: "Countdown",
            description: "Timer countdown",
            demo: <CountdownDemo />,
            code: `<Statistic.Countdown
  title="Countdown"
  value={Date.now() + 1000 * 60 * 60}
/>`,
        },
        {
            id: "loading",
            title: "Loading",
            description: "Loading state",
            demo: <LoadingStatisticDemo />,
            code: `<Statistic title="Loading" value={1128} loading />`,
        },
        {
            id: "group",
            title: "Statistic Group",
            description: "Multiple statistics",
            demo: <GroupStatisticDemo />,
            code: `<Row gutter={16}>
  <Col><Statistic title="Users" value={8846} /></Col>
  <Col><Statistic title="Orders" value={2456} /></Col>
</Row>`,
        },
    ],
    apiProps: [
        { name: "title", type: "ReactNode", description: "Statistic title" },
        { name: "value", type: "number | string", description: "Display value" },
        { name: "precision", type: "number", description: "Decimal places" },
        { name: "prefix", type: "ReactNode", description: "Value prefix" },
        { name: "suffix", type: "ReactNode", description: "Value suffix" },
        { name: "valueStyle", type: "CSSProperties", description: "Value styles" },
        { name: "loading", type: "boolean", description: "Loading state" },
        { name: "Countdown.value", type: "number", description: "Target timestamp" },
        { name: "Countdown.format", type: "string", description: "Format string" },
        { name: "Countdown.onFinish", type: "() => void", description: "Finish callback" },
    ],
};
