"use client";

import React, { useState, useEffect } from "react";
import { Spin, Typography, List, message, theme } from "antd";
import { EnvironmentOutlined, ClockCircleOutlined, CompassOutlined } from "@ant-design/icons";
import { usePreferencesStore } from "@/store/usePreferencesStore";

const { Text, Title } = Typography;

export default function AthanWidget() {
    const { themeColor } = usePreferencesStore();
    const { token } = theme.useToken();
    const [loading, setLoading] = useState(true);
    const [timings, setTimings] = useState<Record<string, string>>({});
    const [meta, setMeta] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAthan = async (lat: number, lng: number) => {
            try {
                setLoading(true);
                const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2`);
                const data = await res.json();
                if (data.code === 200) {
                    setTimings({
                        Fajr: data.data.timings.Fajr,
                        Sunrise: data.data.timings.Sunrise,
                        Dhuhr: data.data.timings.Dhuhr,
                        Asr: data.data.timings.Asr,
                        Maghrib: data.data.timings.Maghrib,
                        Isha: data.data.timings.Isha,
                    });
                    setMeta(data.data.meta);
                    setError(null);
                } else {
                    setError("Failed to fetch prayer times.");
                }
            } catch (err) {
                setError("Error fetching prayer times.");
            } finally {
                setLoading(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    fetchAthan(pos.coords.latitude, pos.coords.longitude);
                },
                (err) => {
                    message.warning("Geolocation denied or failed. Falling back to Jakarta.");
                    fetchAthan(-6.2088, 106.8456);
                }
            );
        } else {
            fetchAthan(-6.2088, 106.8456);
        }
    }, []);

    if (loading) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", flexDirection: "column" }}>
                <Spin size="large" />
                <Text style={{ marginTop: 16 }}>Locating & Fetching...</Text>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", padding: 20, textAlign: "center" }}>
                <Text type="danger">{error}</Text>
            </div>
        );
    }

    return (
        <div style={{ padding: 20, height: "100%", display: "flex", flexDirection: "column", background: "transparent" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <CompassOutlined style={{ fontSize: 32, color: themeColor, marginBottom: 8 }} />
                <Title level={4} style={{ margin: 0 }}>Prayer Times</Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    <EnvironmentOutlined style={{ marginRight: 4 }} />
                    {meta?.timezone || "Local Timezone"}
                </Text>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", background: token.colorBgContainer, borderRadius: token.borderRadiusLG, padding: 8 }}>
                <List
                    dataSource={Object.entries(timings)}
                    renderItem={([name, time]) => (
                        <List.Item style={{ padding: "12px 16px", borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                            <Text strong style={{ fontSize: 16 }}>{name}</Text>
                            <Text style={{ fontSize: 18, color: themeColor, fontWeight: 600 }}>
                                <ClockCircleOutlined style={{ marginRight: 6, fontSize: 14 }} />
                                {time}
                            </Text>
                        </List.Item>
                    )}
                />
            </div>
        </div>
    );
}
