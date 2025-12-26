"use client";

import React from "react";
import { Calendar, Badge, Space } from "antd";
import type { CalendarProps } from "antd";
import type { Dayjs } from "dayjs";
import type { AntdComponentData } from "../../AntdStyleContent";

// Demo 1: Basic Calendar
const BasicCalendarDemo = () => (
    <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
        <Calendar fullscreen={false} />
    </div>
);

// Demo 2: Card Mode
const CardCalendarDemo = () => (
    <div style={{ width: 300, border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
        <Calendar fullscreen={false} />
    </div>
);

// Demo 3: Full Calendar
const FullCalendarDemo = () => (
    <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden", transform: "scale(0.6)", transformOrigin: "top left", height: 280, width: 450 }}>
        <Calendar />
    </div>
);

// Demo 4: Header Render (Year/Month selector)
const HeaderCalendarDemo = () => (
    <div style={{ width: 300, border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
        <Calendar
            fullscreen={false}
            headerRender={({ value, onChange }) => (
                <div style={{ padding: 8, background: "#fafafa" }}>
                    <strong>{value.format("MMMM YYYY")}</strong>
                </div>
            )}
        />
    </div>
);

// Demo 5: With Events (simplified)
const EventsCalendarDemo = () => (
    <div style={{ width: 300, border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
        <Calendar
            fullscreen={false}
            cellRender={(current) => {
                const day = (current as Dayjs).date();
                if (day === 8 || day === 15) {
                    return <Badge status="success" />;
                }
                if (day === 22) {
                    return <Badge status="error" />;
                }
                return null;
            }}
        />
    </div>
);

// Demo 6: Disabled Dates (visual mockup)
const DisabledCalendarDemo = () => (
    <div style={{ width: 300, border: "1px solid #d9d9d9", borderRadius: 8, overflow: "hidden" }}>
        <Calendar
            fullscreen={false}
            disabledDate={(current) => current.date() > 20}
        />
    </div>
);

export const calendarData: AntdComponentData = {
    id: "antd-calendar",
    name: "Calendar",
    description: "Calendar displays a calendar view for date display and selection. Supports full-page and card modes with custom rendering.",
    whenToUse: "Use Calendar for date viewing, event displays, scheduling interfaces, or date-based content organization.",
    docUrl: "https://ant.design/components/calendar",
    demos: [
        {
            id: "basic",
            title: "Basic Calendar",
            description: "Card mode calendar",
            demo: <BasicCalendarDemo />,
            code: `<Calendar fullscreen={false} />`,
        },
        {
            id: "card",
            title: "Card Calendar",
            description: "Compact calendar view",
            demo: <CardCalendarDemo />,
            code: `<div style={{ width: 300 }}>
  <Calendar fullscreen={false} />
</div>`,
        },
        {
            id: "full",
            title: "Full Calendar",
            description: "Full-page calendar (scaled)",
            demo: <FullCalendarDemo />,
            code: `<Calendar />`,
        },
        {
            id: "header",
            title: "Custom Header",
            description: "Custom header rendering",
            demo: <HeaderCalendarDemo />,
            code: `<Calendar
  headerRender={({ value }) => (
    <div>{value.format("MMMM YYYY")}</div>
  )}
/>`,
        },
        {
            id: "events",
            title: "With Events",
            description: "Show event indicators",
            demo: <EventsCalendarDemo />,
            code: `<Calendar
  cellRender={(current) => {
    if (hasEvent(current)) {
      return <Badge status="success" />;
    }
    return null;
  }}
/>`,
        },
        {
            id: "disabled",
            title: "Disabled Dates",
            description: "Non-selectable dates",
            demo: <DisabledCalendarDemo />,
            code: `<Calendar
  disabledDate={(current) => current.isAfter(today)}
/>`,
        },
    ],
    apiProps: [
        { name: "value", type: "Dayjs", description: "Controlled value" },
        { name: "defaultValue", type: "Dayjs", description: "Initial value" },
        { name: "mode", type: "'month' | 'year'", description: "Display mode" },
        { name: "fullscreen", type: "boolean", description: "Full calendar mode", default: "true" },
        { name: "headerRender", type: "(config) => ReactNode", description: "Custom header" },
        { name: "cellRender", type: "(date, info) => ReactNode", description: "Custom cell content" },
        { name: "disabledDate", type: "(date) => boolean", description: "Disable dates" },
        { name: "onChange", type: "(date) => void", description: "Date change callback" },
        { name: "onPanelChange", type: "(date, mode) => void", description: "Panel change callback" },
    ],
};
