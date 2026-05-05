"use client";

import React from 'react';
import { DatePicker, Select, Space, Typography, Tooltip } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import { useDateRangeStore, DateRangePreset } from '@/store/useDateRangeStore';
import dayjs from 'dayjs';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const PRESETS: { value: DateRangePreset; label: string; icon: string }[] = [
    { value: 'today', label: 'Today', icon: '📅' },
    { value: 'yesterday', label: 'Yesterday', icon: '⏪' },
    { value: 'last7', label: 'Last 7 Days', icon: '📊' },
    { value: 'last30', label: 'Last 30 Days', icon: '📈' },
    { value: 'thisMonth', label: 'This Month', icon: '🗓️' },
    { value: 'lastMonth', label: 'Last Month', icon: '📆' },
    { value: 'thisQuarter', label: 'This Quarter', icon: '📋' },
    { value: 'thisYear', label: 'This Year', icon: '🎯' },
    { value: 'custom', label: 'Custom Range', icon: '✏️' },
];

interface Props {
    /** Compact mode: show only the select without range label */
    compact?: boolean;
    /** Style overrides */
    style?: React.CSSProperties;
}

export default function GlobalDateRangePicker({ compact = false, style }: Props) {
    const { preset, startDate, endDate, setPreset, setCustomRange } = useDateRangeStore();

    return (
        <Space size={8} style={style}>
            {!compact && (
                <Tooltip title="Global date filter — applies across all modules">
                    <CalendarOutlined style={{ color: '#8b5cf6', fontSize: 14 }} />
                </Tooltip>
            )}
            <Select
                value={preset}
                onChange={(v: DateRangePreset) => setPreset(v)}
                style={{ minWidth: compact ? 130 : 150 }}
                size="small"
                options={PRESETS.map(p => ({
                    value: p.value,
                    label: <span>{p.icon} {p.label}</span>,
                }))}
            />
            {preset === 'custom' && (
                <RangePicker
                    size="small"
                    value={[dayjs(startDate), dayjs(endDate)]}
                    onChange={(dates) => {
                        if (dates && dates[0] && dates[1]) {
                            setCustomRange(dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD'));
                        }
                    }}
                />
            )}
            {!compact && preset !== 'custom' && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(startDate).format('MMM D')} — {dayjs(endDate).format('MMM D, YYYY')}
                </Text>
            )}
        </Space>
    );
}
