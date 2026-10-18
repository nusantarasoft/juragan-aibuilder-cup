"use client";

import React, { useEffect, useState } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { useAppMessage } from "@/hooks/useAppMessage";
import { studioService, type StudioPlaygroundResult } from "@/lib/studioService";
import { Alert, Button, Card, Input, InputNumber, Slider, Spin, Typography, Tag, Space } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { usePreferencesStore } from "@/store/usePreferencesStore";
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
const tacticalCard: React.CSSProperties = {
    borderRadius: 0,
    borderTop: "2px solid #fb923c",
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
            message.warning("Please enter a user prompt first.");
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

    const PRESETS = [
        {
            code: "EXEC",
            label: "Summary",
            sys: "You are an executive analyst. Respond concisely and in a structured manner with key bullet points and concrete recommendations.",
        },
        {
            code: "JSON",
            label: "JSON Strict",
            sys: "You are a strict data extractor. Return valid JSON only without markdown fences or prose.",
        },
        {
            code: "SQL",
            label: "SQLPostgreSQL",
            sys: "You are a senior PostgreSQL architect. Write performant, safe SQL queries with brief explanations.",
        },
        {
            code: "CODE",
            label: "Code Review",
            sys: "You are a principal software engineer. Audit the input for bugs, security risks, and performance bottlenecks.",
        },
    ];

    return (
        <CMSLayout
            title="Playground"
            subTitle="Prompt sandbox — bypasses notebook RAG"
        >
            <div
                className="flex flex-col gap-1.5 overflow-hidden"
                style={{ height: "calc(100vh - 142px)", minHeight: 460 }}
            >
                {/* Compact 36px Tactical Telemetry & Preset Ribbon */}
                <div
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border border-white/10 bg-white/[0.02] shrink-0"
                    style={{ borderTop: "2px solid #fb923c" }}
                >
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange-400">
                            SANDBOX //
                        </span>
                        <span className="text-xs text-slate-400 hidden sm:inline">
                            Prompt sandbox — bypasses notebook RAG
                        </span>
                        {activeAi.provider && (
                            <Tag color="orange" className="font-mono !text-[9.5px] !m-0" style={{ borderRadius: 0 }}>
                                Active: {activeAi.provider} / {activeAi.model}
                            </Tag>
                        )}
                    </div>
                    <div className="flex items-center gap-1 font-mono">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 mr-0.5">PRESET:</span>
                        {PRESETS.map((p) => (
                            <button
                                key={p.code}
                                type="button"
                                onClick={() => setPgSystemPrompt(p.sys)}
                                className="px-1.5 py-0.5 text-[9.5px] border border-white/10 bg-white/[0.02] hover:border-orange-400/50 hover:text-orange-300 transition-colors cursor-pointer"
                            >
                                [{p.code}] {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Viewport-Locked 2-Column Workbench (Prompts Left, Output & Telemetry Right) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 flex-1 min-h-0 overflow-hidden">
                    {/* Left Column: System Prompt + User Prompt + Parameters */}
                    <div className="md:col-span-6 flex flex-col gap-1.5 h-full min-h-0 overflow-hidden">
                        <Card
                            size="small"
                            title={<span className="font-mono text-[11px] uppercase tracking-[0.12em]">System Prompt</span>}
                            className="shrink-0"
                            style={tacticalCard}
                            styles={{ body: { padding: 8 } }}
                        >
                            <TextArea
                                value={pgSystemPrompt}
                                onChange={(e) => setPgSystemPrompt(e.target.value)}
                                rows={3}
                                className="font-mono text-xs"
                                style={{ resize: "none", background: "transparent", border: "none", borderRadius: 0, padding: 0 }}
                            />
                        </Card>

                        <Card
                            size="small"
                            title={<span className="font-mono text-[11px] uppercase tracking-[0.12em]">User Prompt</span>}
                            className="flex-1 flex flex-col min-h-0 overflow-hidden"
                            style={{ ...tacticalCard, borderTop: "2px solid #38bdf8" }}
                            styles={{
                                body: {
                                    padding: 8,
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    minHeight: 0,
                                },
                            }}
                        >
                            <TextArea
                                value={pgUserPrompt}
                                onChange={(e) => setPgUserPrompt(e.target.value)}
                                placeholder="Type test prompt here… (Press Enter to Run, Shift+Enter for new line)"
                                className="flex-1 font-mono text-xs"
                                style={{ resize: "none", background: "transparent", border: "none", borderRadius: 0, padding: 0 }}
                                onPressEnter={(e) => {
                                    if (e.shiftKey) return;
                                    e.preventDefault();
                                    void runPlaygroundTest();
                                }}
                            />
                            <div className="flex gap-3 mt-2 flex-wrap items-center pt-2 border-t border-white/[0.08] shrink-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-70">Temp</span>
                                    <div style={{ width: 96 }}>
                                        <Slider
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            value={pgTemperature}
                                            onChange={(val) => setPgTemperature(val)}
                                            className="!my-1"
                                        />
                                    </div>
                                    <span className="font-mono text-xs tabular-nums">{pgTemperature.toFixed(1)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-70">Max tokens</span>
                                    <InputNumber
                                        size="small"
                                        min={64}
                                        max={8192}
                                        value={pgMaxTokens}
                                        onChange={(val) => setPgMaxTokens(typeof val === "number" ? val : 2048)}
                                        style={{ width: 84, borderRadius: 0 }}
                                    />
                                </div>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<RobotOutlined />}
                                    loading={pgLoading}
                                    onClick={() => void runPlaygroundTest()}
                                    style={{ backgroundColor: themeColor, marginLeft: "auto", borderRadius: 0 }}
                                >
                                    Run
                                </Button>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Live Output + Latency Telemetry */}
                    <div className="md:col-span-6 flex flex-col gap-1.5 h-full min-h-0 overflow-hidden">
                        <Card
                            size="small"
                            title={<span className="font-mono text-[11px] uppercase tracking-[0.12em]">Output</span>}
                            extra={
                                pgLastResult && (
                                    <span className="font-mono text-[10px] text-emerald-400 tabular-nums">
                                        {pgLastResult.provider} / {pgLastResult.model} · {pgLastResult.latencyMs}ms
                                    </span>
                                )
                            }
                            className="flex-1 flex flex-col min-h-0 overflow-hidden"
                            style={{ ...tacticalCard, borderTop: "2px solid #22c55e" }}
                            styles={{
                                body: {
                                    padding: 8,
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    minHeight: 0,
                                },
                            }}
                        >
                            <Spin spinning={pgLoading} wrapperClassName="flex-1 flex flex-col min-h-0 [&_.ant-spin-container]:flex-1 [&_.ant-spin-container]:flex [&_.ant-spin-container]:flex-col">
                                <TextArea
                                    value={pgOutput}
                                    readOnly
                                    placeholder="LLM execution output will appear here…"
                                    className="flex-1 font-mono text-xs"
                                    style={{ height: "100%", resize: "none", background: "transparent", border: "none", borderRadius: 0, padding: 0 }}
                                />
                            </Spin>
                        </Card>

                        <Card
                            size="small"
                            title={<span className="font-mono text-[11px] uppercase tracking-[0.12em]">Latency</span>}
                            className="shrink-0"
                            style={{ ...tacticalCard, borderTop: "2px solid #a855f7" }}
                            styles={{ body: { padding: 8, height: 136 } }}
                        >
                            {chartData.length === 0 ? (
                                <div className="h-full flex items-center justify-center">
                                    <Text type="secondary" className="font-mono text-xs">No runs yet</Text>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
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
                </div>
            </div>
        </CMSLayout>
    );
}
