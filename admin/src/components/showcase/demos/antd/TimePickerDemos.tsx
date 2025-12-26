"use client";

import React from "react";
import { TimePicker, Space } from "antd";
import type { AntdComponentData } from "../../AntdStyleContent";

const { RangePicker } = TimePicker;

// Demo 1: Basic TimePicker
const BasicTimePickerDemo = () => (
    <TimePicker placeholder="Select time" />
);

// Demo 2: Time Range
const RangeTimePickerDemo = () => (
    <RangePicker />
);

// Demo 3: 12-Hour Format
const Format12TimePickerDemo = () => (
    <TimePicker use12Hours format="h:mm a" placeholder="Select time" />
);

// Demo 4: Sizes
const SizesTimePickerDemo = () => (
    <Space orientation="vertical">
        <TimePicker size="large" placeholder="Large" />
        <TimePicker placeholder="Default" />
        <TimePicker size="small" placeholder="Small" />
    </Space>
);

// Demo 5: Disabled
const DisabledTimePickerDemo = () => (
    <TimePicker disabled />
);

// Demo 6: Hour and Minute
const HourMinuteDemo = () => (
    <TimePicker format="HH:mm" placeholder="HH:mm" />
);

// Demo 7: Status
const StatusTimePickerDemo = () => (
    <Space orientation="vertical">
        <TimePicker status="error" placeholder="Error" />
        <TimePicker status="warning" placeholder="Warning" />
    </Space>
);

// Demo 8: Interval
const IntervalTimePickerDemo = () => (
    <Space orientation="vertical">
        <TimePicker minuteStep={15} placeholder="15 min intervals" />
        <TimePicker minuteStep={30} placeholder="30 min intervals" />
    </Space>
);

export const timePickerData: AntdComponentData = {
    id: "antd-time-picker",
    name: "TimePicker",
    description: "TimePicker allows users to select a time. Supports 12/24 hour formats, ranges, and custom intervals.",
    whenToUse: "Use TimePicker when users need to select a specific time, such as scheduling or appointment booking.",
    docUrl: "https://ant.design/components/time-picker",
    demos: [
        {
            id: "basic",
            title: "Basic TimePicker",
            description: "Simple time selection",
            demo: <BasicTimePickerDemo />,
            code: `<TimePicker placeholder="Select time" />`,
        },
        {
            id: "range",
            title: "Time Range",
            description: "Select time range",
            demo: <RangeTimePickerDemo />,
            code: `<TimePicker.RangePicker />`,
        },
        {
            id: "12hour",
            title: "12-Hour Format",
            description: "AM/PM format",
            demo: <Format12TimePickerDemo />,
            code: `<TimePicker use12Hours format="h:mm a" />`,
        },
        {
            id: "sizes",
            title: "Sizes",
            description: "Different sizes",
            demo: <SizesTimePickerDemo />,
            code: `<TimePicker size="large" />
<TimePicker />
<TimePicker size="small" />`,
        },
        {
            id: "disabled",
            title: "Disabled",
            description: "Non-interactive picker",
            demo: <DisabledTimePickerDemo />,
            code: `<TimePicker disabled />`,
        },
        {
            id: "hourminute",
            title: "Hour and Minute",
            description: "Without seconds",
            demo: <HourMinuteDemo />,
            code: `<TimePicker format="HH:mm" />`,
        },
        {
            id: "status",
            title: "Validation Status",
            description: "Error and warning states",
            demo: <StatusTimePickerDemo />,
            code: `<TimePicker status="error" />
<TimePicker status="warning" />`,
        },
        {
            id: "interval",
            title: "Time Intervals",
            description: "Custom minute steps",
            demo: <IntervalTimePickerDemo />,
            code: `<TimePicker minuteStep={15} />
<TimePicker minuteStep={30} />`,
        },
    ],
    apiProps: [
        { name: "value", type: "Dayjs", description: "Controlled value" },
        { name: "defaultValue", type: "Dayjs", description: "Initial value" },
        { name: "format", type: "string", description: "Time format", default: "HH:mm:ss" },
        { name: "use12Hours", type: "boolean", description: "12-hour format" },
        { name: "hourStep", type: "number", description: "Hour step", default: "1" },
        { name: "minuteStep", type: "number", description: "Minute step", default: "1" },
        { name: "secondStep", type: "number", description: "Second step", default: "1" },
        { name: "size", type: "'large' | 'middle' | 'small'", description: "Input size" },
        { name: "disabled", type: "boolean", description: "Disable picker" },
        { name: "status", type: "'error' | 'warning'", description: "Validation status" },
        { name: "onChange", type: "(time, timeString) => void", description: "Change callback" },
    ],
};
