"use client";

import React from "react";
import { Calendar, theme } from "antd";
import type { CalendarProps } from 'antd';
import type { Dayjs } from 'dayjs';

export default function CalendarWidget() {
    const { token } = theme.useToken();
    
    const wrapperStyle: React.CSSProperties = {
        width: '100%',
        height: '100%',
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
        overflow: 'hidden',
    };

    const onPanelChange = (value: Dayjs, mode: CalendarProps<Dayjs>['mode']) => {
        console.log(value.format('YYYY-MM-DD'), mode);
    };

    return (
        <div style={{ height: "100%", padding: 16, background: "transparent" }}>
            <div style={wrapperStyle}>
                <Calendar fullscreen={false} onPanelChange={onPanelChange} />
            </div>
        </div>
    );
}
