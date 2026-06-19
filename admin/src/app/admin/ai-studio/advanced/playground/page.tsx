"use client";

import React, { useEffect, useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { useAppMessage } from "@/hooks/useAppMessage";
import { studioService, type StudioPlaygroundResult } from "@/lib/studioService";
import { Alert, Button, Card, Input, Spin, Typography, Tag, Space } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { AuroraText } from "@/components/magicui/aurora-text";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from "recharts";

const { Text } = Typography;
const { TextArea } = Input;
const glass = {
    background: "rgba(255,255,255,0.65)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.45)",
    borderRadius: 14,
};

export default function StudioPlaygroundPage() {
    const message = useAppMessage();
    const { themeColor } = usePreferencesStore();
    const [pgSystemPrompt, setPgSystemPrompt] = useState(
        "You are a helpful assistant. Answer clearly and concisely.",
    );
    const [pgUserPrompt, setPgUserPrompt] = useState("");
    const [pgOutput, setPgOutput] = useState("");
    const [pgTemperature, setPgTemperature] = useState(0.7);
    const [pgMaxTokens, setPgMaxTokens] = useState(2048);
    const [pgLoading, setPgLoading] = useState(false);
    const [pgLastResult, setPgLastResult] = useState<StudioPlaygroundResult | null>(null);
    const [pgMetrics, setPgMetrics] = useState<
        { label: string; latencyMs: number; totalTokens?: number }[]
    >([]);
    const [activeAi, setActiveAi] = useState<{ provider?: string; model?: string }>({});

    useEffect(() => {
        studioService.getAiStatus().then((s) => {
            if (s) setActiveAi({ provider: s.llmProvider, model: s.llmModel });
        }).catch(() => {});
    }, []);

    const chartData = pgMetrics.map((m) => ({
        name: m.label,
        latency: m.latencyMs,
        tokens: m.totalTokens ?? 0,
    }));

    const runPlaygroundTest = async () => {
        if (!pgUserPrompt.trim()) {
            message.warning("Isi user prompt terlebih dahulu.");
            return;
        }
        setPgLoading(true);
        try {
            const result = await studioService.playgroundTest({
                systemPrompt: pgSystemPrompt,
                userPrompt: pgUserPrompt.trim(),
                temperature: pgTemperature,
                maxTokens: pgMaxTokens,
            });
            setPgOutput(result.output);
            setPgLastResult(result);
            const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            setPgMetrics((prev) => [
                ...prev.slice(-9),
                { label: stamp, latencyMs: result.latencyMs, totalTokens: result.totalTokens },
            ]);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Playground test failed");
        } finally {
            setPgLoading(false);
        }
    };

    return (
        <CMSLayout
            title={<AuroraText colors={[themeColor, "#6366f1", "#a78bfa"]}>Playground</AuroraText>}
            subTitle="Sandbox prompt — tidak memakai RAG notebook"
        >
            <div className="flex h-full gap-4" style={{ minHeight: 560 }}>
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <Alert
                        type="info"
                        showIcon
                        className="!text-xs"
                        message={
                            <Space wrap>
                                <span>Sandbox prompt — tidak memakai RAG notebook</span>
                                {activeAi.provider && (
                                    <Tag color="blue">Active: {activeAi.provider} / {activeAi.model}</Tag>
                                )}
                            </Space>
                        }
                    />
                    <Card size="small" title="System Prompt" className="flex-1" style={glass}>
                        <TextArea
                            value={pgSystemPrompt}
                            onChange={(e) => setPgSystemPrompt(e.target.value)}
                            style={{ minHeight: 100, resize: "none", background: "transparent", border: "none" }}
                        />
                    </Card>
                    <Card size="small" title="User Prompt" style={glass}>
                        <TextArea
                            value={pgUserPrompt}
                            onChange={(e) => setPgUserPrompt(e.target.value)}
                            rows={3}
                            style={{ resize: "none", background: "transparent", border: "none" }}
                            onPressEnter={(e) => {
                                if (e.shiftKey) return;
                                e.preventDefault();
                                void runPlaygroundTest();
                            }}
                        />
                        <div className="flex gap-2 mt-2 flex-wrap items-center">
                            <label className="text-xs text-gray-500">
                                Temp:{" "}
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    value={pgTemperature}
                                    onChange={(e) => setPgTemperature(parseFloat(e.target.value))}
                                />{" "}
                                {pgTemperature}
                            </label>
                            <label className="text-xs text-gray-500">
                                Max tokens:{" "}
                                <input
                                    type="number"
                                    className="w-20 border rounded px-1"
                                    value={pgMaxTokens}
                                    onChange={(e) => setPgMaxTokens(parseInt(e.target.value, 10) || 2048)}
                                />
                            </label>
                            <Button
                                type="primary"
                                icon={<RobotOutlined />}
                                loading={pgLoading}
                                onClick={() => void runPlaygroundTest()}
                                style={{ backgroundColor: themeColor, marginLeft: "auto" }}
                            >
                                Run
                            </Button>
                        </div>
                    </Card>
                    <Card size="small" title="Output" className="flex-1" style={glass}>
                        <Spin spinning={pgLoading}>
                            <TextArea
                                value={pgOutput}
                                readOnly
                                style={{ minHeight: 160, resize: "none", background: "transparent", border: "none" }}
                            />
                        </Spin>
                        {pgLastResult && (
                            <Text type="secondary" className="text-[10px] block mt-2">
                                {pgLastResult.provider} / {pgLastResult.model} — {pgLastResult.latencyMs}ms
                            </Text>
                        )}
                    </Card>
                </div>
                <Card size="small" title="Latency" style={{ width: 280, ...glass }}>
                    {chartData.length === 0 ? (
                        <Text type="secondary" className="text-xs">Belum ada run</Text>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} width={36} />
                                <Line type="monotone" dataKey="latency" stroke={themeColor} strokeWidth={2} dot={{ r: 3 }} />
                                <RechartsTooltip />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </Card>
            </div>
        </CMSLayout>
    );
}
