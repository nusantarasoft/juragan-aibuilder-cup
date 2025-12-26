"use client";

import React from "react";
import { QueryFilter, ProFormText, ProFormSelect, ProFormDatePicker, ProFormDateRangePicker, LightFilter } from "@ant-design/pro-components";
import { message } from "antd";
import type { AntdComponentData } from "../AntdStyleContent";

// Demo 1: Basic Query Filter
const BasicQueryFilterDemo = () => (
    <QueryFilter
        onFinish={async (values) => {
            console.log(values);
            message.success("Search applied!");
        }}
    >
        <ProFormText name="keyword" label="Keyword" />
        <ProFormSelect
            name="status"
            label="Status"
            options={[
                { label: "All", value: "all" },
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ]}
        />
    </QueryFilter>
);

// Demo 2: With Date Filters
const DateQueryFilterDemo = () => (
    <QueryFilter
        onFinish={async (values) => {
            console.log(values);
            message.success("Filtered!");
        }}
    >
        <ProFormText name="name" label="Name" />
        <ProFormDatePicker name="date" label="Date" />
        <ProFormDateRangePicker name="dateRange" label="Date Range" />
    </QueryFilter>
);

// Demo 3: Collapsed Filters
const CollapsedQueryFilterDemo = () => (
    <QueryFilter
        defaultCollapsed
        onFinish={async (values) => {
            console.log(values);
            message.success("Applied!");
        }}
    >
        <ProFormText name="keyword" label="Keyword" />
        <ProFormText name="author" label="Author" />
        <ProFormSelect name="category" label="Category" options={[{ label: "Tech", value: "tech" }, { label: "News", value: "news" }]} />
        <ProFormDatePicker name="date" label="Date" />
    </QueryFilter>
);

// Demo 4: Light Filter
const LightFilterDemo = () => (
    <LightFilter
        onFinish={async (values) => {
            console.log(values);
            message.success("Light filter applied!");
        }}
    >
        <ProFormText name="search" label="Search" />
        <ProFormSelect
            name="type"
            label="Type"
            options={[
                { label: "All", value: "all" },
                { label: "Documents", value: "docs" },
                { label: "Images", value: "images" },
            ]}
        />
    </LightFilter>
);

// Demo 5: Vertical Layout
const VerticalQueryFilterDemo = () => (
    <QueryFilter
        layout="vertical"
        onFinish={async (values) => {
            console.log(values);
            message.success("Searched!");
        }}
    >
        <ProFormText name="title" label="Title" />
        <ProFormSelect name="status" label="Status" options={[{ label: "Active", value: "active" }]} />
    </QueryFilter>
);

export const queryFilterData: AntdComponentData = {
    id: "pro-query-filter",
    name: "QueryFilter / LightFilter",
    description: "QueryFilter provides a horizontal filter bar for search forms. LightFilter is a minimal dropdown-based filter for compact spaces.",
    whenToUse: "Use QueryFilter for table search forms with multiple criteria. Use LightFilter when you need compact filtering in limited space.",
    docUrl: "https://procomponents.ant.design/en-US/components/query-filter",
    demos: [
        {
            id: "basic",
            title: "Basic Query Filter",
            description: "Horizontal search form",
            demo: <BasicQueryFilterDemo />,
            code: `<QueryFilter onFinish={async (values) => { ... }}>
  <ProFormText name="keyword" label="Keyword" />
  <ProFormSelect name="status" label="Status" options={[...]} />
</QueryFilter>`,
        },
        {
            id: "date",
            title: "With Date Filters",
            description: "Filter with date pickers",
            demo: <DateQueryFilterDemo />,
            code: `<QueryFilter>
  <ProFormDatePicker name="date" label="Date" />
  <ProFormDateRangePicker name="range" label="Range" />
</QueryFilter>`,
        },
        {
            id: "collapsed",
            title: "Collapsed Filters",
            description: "Auto-collapse extra fields",
            demo: <CollapsedQueryFilterDemo />,
            code: `<QueryFilter defaultCollapsed>
  <ProFormText name="keyword" label="Keyword" />
  <ProFormText name="author" label="Author" />
  <ProFormSelect name="category" label="Category" />
  <ProFormDatePicker name="date" label="Date" />
</QueryFilter>`,
        },
        {
            id: "light",
            title: "Light Filter",
            description: "Compact dropdown filters",
            demo: <LightFilterDemo />,
            code: `<LightFilter onFinish={async (values) => { ... }}>
  <ProFormText name="search" label="Search" />
  <ProFormSelect name="type" label="Type" options={[...]} />
</LightFilter>`,
        },
        {
            id: "vertical",
            title: "Vertical Layout",
            description: "Labels above inputs",
            demo: <VerticalQueryFilterDemo />,
            code: `<QueryFilter layout="vertical">
  <ProFormText name="title" label="Title" />
</QueryFilter>`,
        },
    ],
    apiProps: [
        { name: "onFinish", type: "(values) => Promise<void>", description: "Submit callback" },
        { name: "onReset", type: "() => void", description: "Reset callback" },
        { name: "layout", type: "'horizontal' | 'vertical'", description: "Field layout" },
        { name: "defaultCollapsed", type: "boolean", description: "Initially collapsed" },
        { name: "collapsed", type: "boolean", description: "Controlled collapsed state" },
        { name: "span", type: "number", description: "Grid span for fields" },
    ],
};
