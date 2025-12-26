"use client";

import React from "react";
import { DatePicker, Space, Typography } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { RangePicker } = DatePicker;
const { Text } = Typography;

// Demo 1: Basic DatePicker
const BasicDatePickerDemo = () => (
    <DatePicker placeholder="Select date" />
);

// Demo 2: Date and Time
const DateTimePickerDemo = () => (
    <DatePicker showTime placeholder="Select date and time" />
);

// Demo 3: Date Range
const RangePickerDemo = () => (
    <RangePicker />
);

// Demo 4: Different Pickers
const PickerTypesDemo = () => (
    <Space direction="vertical">
        <DatePicker picker="week" placeholder="Select week" />
        <DatePicker picker="month" placeholder="Select month" />
        <DatePicker picker="quarter" placeholder="Select quarter" />
        <DatePicker picker="year" placeholder="Select year" />
    </Space>
);

// Demo 5: Sizes
const SizesDatePickerDemo = () => (
    <Space direction="vertical">
        <DatePicker size="large" placeholder="Large" />
        <DatePicker placeholder="Default" />
        <DatePicker size="small" placeholder="Small" />
    </Space>
);

// Demo 6: Disabled
const DisabledDatePickerDemo = () => (
    <Space direction="vertical">
        <DatePicker disabled />
        <RangePicker disabled />
    </Space>
);

// Demo 7: Presets
const PresetsDatePickerDemo = () => (
    <RangePicker
        presets={[
            { label: "Last 7 Days", value: [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()] as any },
            { label: "Last 30 Days", value: [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()] as any },
        ]}
    />
);

// Demo 8: Format
const FormatDatePickerDemo = () => (
    <Space direction="vertical">
        <DatePicker format="YYYY-MM-DD" placeholder="YYYY-MM-DD" />
        <DatePicker format="DD/MM/YYYY" placeholder="DD/MM/YYYY" />
        <DatePicker format="MM-DD-YYYY" placeholder="MM-DD-YYYY" />
    </Space>
);

// Demo 9: Status
const StatusDatePickerDemo = () => (
    <Space direction="vertical">
        <DatePicker status="error" placeholder="Error" />
        <DatePicker status="warning" placeholder="Warning" />
    </Space>
);

export const datePickerData: AntdComponentData = {
    id: "antd-date-picker",
    name: "DatePicker",
    description: "DatePicker allows users to select dates. Supports single dates, ranges, and various picker types (week, month, quarter, year).",
    whenToUse: "Use DatePicker for date input fields, scheduling, or any date selection needs including ranges.",
    docUrl: "https://ant.design/components/date-picker",
    demos: [
        {
            id: "basic",
            title: "Basic DatePicker",
            description: "Simple date selection",
            demo: <BasicDatePickerDemo />,
            code: `<DatePicker placeholder="Select date" />`,
        },
        {
            id: "datetime",
            title: "Date and Time",
            description: "Include time selection",
            demo: <DateTimePickerDemo />,
            code: `<DatePicker showTime placeholder="Select date and time" />`,
        },
        {
            id: "range",
            title: "Date Range",
            description: "Select date range",
            demo: <RangePickerDemo />,
            code: `<DatePicker.RangePicker />`,
        },
        {
            id: "types",
            title: "Picker Types",
            description: "Week, month, quarter, year",
            demo: <PickerTypesDemo />,
            code: `<DatePicker picker="week" />
<DatePicker picker="month" />
<DatePicker picker="quarter" />
<DatePicker picker="year" />`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different sizes",
            demo: <SizesDatePickerDemo />,
            code: `<DatePicker size="large" />
<DatePicker />
<DatePicker size="small" />`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive picker",
            demo: <DisabledDatePickerDemo />,
            code: `<DatePicker disabled />`,
        },
        {
            id: "presets",
            title: "Presets",
            description: "Quick preset selections",
            demo: <PresetsDatePickerDemo />,
            code: `<RangePicker presets={[
  { label: "Last 7 Days", value: [dayjs().subtract(7, 'd'), dayjs()] }
]} />`,
        },
        {
            id: "format",
            title: "Custom Format",
            description: "Different date formats",
            demo: <FormatDatePickerDemo />,
            code: `<DatePicker format="YYYY-MM-DD" />
<DatePicker format="DD/MM/YYYY" />`,
        },
        {
            id: "status",
            title: "Validation Status",
            description: "Error and warning states",
            demo: <StatusDatePickerDemo />,
            code: `<DatePicker status="error" />
<DatePicker status="warning" />`,
        },
    ],
    apiProps: [
        { name: "picker", type: "'date' | 'week' | 'month' | 'quarter' | 'year'", description: "Picker type", default: "date" },
        { name: "value", type: "Dayjs", description: "Controlled value" },
        { name: "defaultValue", type: "Dayjs", description: "Initial value" },
        { name: "format", type: "string", description: "Date format" },
        { name: "showTime", type: "boolean | TimePickerProps", description: "Enable time selection" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Input size" },
        { name: "disabled", type: "boolean", description: "Disable picker" },
        { name: "status", type: "'error' | 'warning'", description: "Validation status" },
        { name: "onChange", type: "(date, dateString) => void", description: "Change callback" },
    ],
};
