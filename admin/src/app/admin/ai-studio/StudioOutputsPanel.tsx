"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    Col,
    Drawer,
    Dropdown,
    Empty,
    Input,
    List,
    Modal,
    Row,
    Segmented,
    Select,
    Space,
    Spin,
    Tag,
    Tooltip,
    Typography,
} from "antd";
import {
    AudioOutlined,
    CopyOutlined,
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    ExportOutlined,
    FieldTimeOutlined,
    FileAddOutlined,
    FileMarkdownOutlined,
    FileTextOutlined,
    FundProjectionScreenOutlined,
    IdcardOutlined,
    NodeIndexOutlined,
    PrinterOutlined,
    ProfileOutlined,
    QuestionCircleOutlined,
    ReadOutlined,
    TableOutlined,
    ThunderboltOutlined,
    VideoCameraOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import {
    studioService,
    type StudioOutput,
    type StudioOutputType,
} from "@/lib/studioService";
import { useAppMessage } from "@/hooks/useAppMessage";
import MindMapView from "./MindMapView";
import AudioOverviewPlayer from "./AudioOverviewPlayer";
import VideoOverviewPlayer from "./VideoOverviewPlayer";
import QuizView from "./QuizView";
import FlashcardsView from "./FlashcardsView";
import { copyText, downloadMarkdown, printAsPdf } from "./outputExport";

const { Text, Title } = Typography;
const { TextArea } = Input;

type Tile = { type: StudioOutputType; label: string; desc: string; icon: React.ReactNode };

const TILE_GROUPS: { group: string; tiles: Tile[] }[] = [
    {
        group: "Reports",
        tiles: [
            { type: "brief", label: "Brief", desc: "Auto notebook summary", icon: <ThunderboltOutlined /> },
            { type: "study_guide", label: "Study Guide", desc: "Study guide + review", icon: <ReadOutlined /> },
            { type: "briefing_doc", label: "Briefing Doc", desc: "Executive briefing doc", icon: <ProfileOutlined /> },
            { type: "faq", label: "FAQ", desc: "Questions & answers", icon: <FundProjectionScreenOutlined /> },
            { type: "timeline", label: "Timeline", desc: "Chronological events", icon: <FieldTimeOutlined /> },
            { type: "blog_post", label: "Blog Post", desc: "Narrative article", icon: <EditOutlined /> },
            { type: "report", label: "Custom Report", desc: "Topic-focused report", icon: <FileTextOutlined /> },
        ],
    },
    {
        group: "Interactive & Media",
        tiles: [
            { type: "mind_map", label: "Mind Map", desc: "Interactive concept map", icon: <NodeIndexOutlined /> },
            { type: "quiz", label: "Quiz", desc: "Graded interactive quiz", icon: <QuestionCircleOutlined /> },
            { type: "flashcards", label: "Flashcards", desc: "Two-sided study cards", icon: <IdcardOutlined /> },
            { type: "audio_script", label: "Audio Overview", desc: "Script + audio player", icon: <AudioOutlined /> },
            { type: "video_overview", label: "Video Overview", desc: "Narrated slide deck", icon: <VideoCameraOutlined /> },
            { type: "data_table", label: "Data Table", desc: "Structured data table", icon: <TableOutlined /> },
        ],
    },
];

const TYPE_LABEL: Record<string, string> = {
    brief: "Brief",
    report: "Report",
    mind_map: "Mind Map",
    quiz: "Quiz",
    faq: "FAQ",
    flashcards: "Flashcards",
    audio_script: "Audio",
    data_table: "Data Table",
    study_guide: "Study Guide",
    briefing_doc: "Briefing Doc",
    timeline: "Timeline",
    blog_post: "Blog Post",
    video_overview: "Video Overview",
};

type Props = {
    themeColor: string;
    notebookId: string | null;
    notebookName?: string;
    sourcesReady: boolean;
    selectedSourceIds?: string[];
    onNoteSaved?: () => void;
    onAskNode?: (question: string) => void;
};

export default function StudioOutputsPanel({
    themeColor,
    notebookId,
    notebookName,
    sourcesReady,
    selectedSourceIds,
    onNoteSaved,
    onAskNode,
}: Props) {
    const message = useAppMessage();
    const [outputs, setOutputs] = useState<StudioOutput[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState<StudioOutputType | null>(null);
    const [viewOutput, setViewOutput] = useState<StudioOutput | null>(null);
    const [mindMapRaw, setMindMapRaw] = useState(false);
    const [reportModal, setReportModal] = useState(false);
    const [reportQuery, setReportQuery] = useState("");
    const [audioModal, setAudioModal] = useState(false);
    const [audioFocus, setAudioFocus] = useState("");
    const [audioLength, setAudioLength] = useState<"short" | "default" | "long">("default");
    const [outputLanguage, setOutputLanguage] = useState<string>("en");

    const isMindMap = viewOutput?.output_type === "mind_map";
    const isAudioScript = viewOutput?.output_type === "audio_script";
    const isVideoOverview = viewOutput?.output_type === "video_overview";
    const isQuiz = viewOutput?.output_type === "quiz";
    const isFlashcards = viewOutput?.output_type === "flashcards";

    const loadOutputs = useCallback(async () => {
        if (!notebookId) return;
        setLoading(true);
        try {
            const list = await studioService.listOutputs(notebookId);
            setOutputs(list);
        } catch {
            setOutputs([]);
        } finally {
            setLoading(false);
        }
    }, [notebookId]);

    useEffect(() => {
        void loadOutputs();
    }, [loadOutputs]);

    const handleGenerate = async (
        type: StudioOutputType,
        query?: string,
        opts?: { audioLength?: "short" | "default" | "long" },
    ) => {
        if (!notebookId) {
            message.warning("Select or create a notebook first.");
            return;
        }
        if (!sourcesReady) {
            message.warning("Wait for sources to finish indexing first.");
            return;
        }
        setGenerating(type);
        try {
            const out = await studioService.generateOutput(notebookId, type, {
                query,
                sourceIds: selectedSourceIds ?? [],
                audioLength: opts?.audioLength,
                language: outputLanguage,
            });
            message.success(`${out.title} generated`);
            await loadOutputs();
            setViewOutput(out);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Generation failed");
        } finally {
            setGenerating(null);
            setReportModal(false);
            setAudioModal(false);
        }
    };

    const handleExport = async (key: string, output: StudioOutput) => {
        try {
            if (key === "copy") {
                await copyText(output.content);
                message.success("Content copied");
            } else if (key === "md") {
                downloadMarkdown(output.title, output.content);
            } else if (key === "pdf") {
                printAsPdf(output.title, output.content);
            }
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Export failed");
        }
    };

    const handleSaveOutputToNote = async (output: StudioOutput) => {
        if (!notebookId) return;
        try {
            await studioService.createNote(notebookId, {
                title: output.title,
                content: output.content,
                origin: "output",
                sourceOutputId: output.id,
            });
            message.success("Saved to Notes");
            onNoteSaved?.();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to save to Notes");
        }
    };

    const handleDelete = async (outputId: string) => {
        try {
            await studioService.deleteOutput(outputId);
            message.success("Output deleted");
            if (viewOutput?.id === outputId) setViewOutput(null);
            await loadOutputs();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Delete failed");
        }
    };

    const [activeFilter, setActiveFilter] = useState<"all" | "Reports" | "Interactive & Media" | "library">("all");

    const visibleGroups = TILE_GROUPS.filter(
        (grp) => activeFilter === "all" || activeFilter === grp.group,
    );

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            {/* Compact 32px Tactical Header */}
            <div className="px-2.5 py-1.5 border-b border-white/10 shrink-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-1.5 w-1.5 bg-purple-400 shrink-0" />
                        <Title level={5} className="!mb-0 !text-[11px] font-mono uppercase tracking-[0.14em]">
                            Studio
                        </Title>
                        <span className="font-mono text-[9.5px] text-slate-400 tabular-nums">
                            [{outputs.length}]
                        </span>
                    </div>
                    <Tooltip title="Output language" placement="bottom">
                        <Select
                            size="small"
                            value={outputLanguage}
                            onChange={setOutputLanguage}
                            style={{ minWidth: 88 }}
                            popupMatchSelectWidth={false}
                            options={[
                                { value: "en", label: "English" },
                                { value: "id", label: "Indonesian" },
                                { value: "jv", label: "Javanese" },
                                { value: "ms", label: "Malay" },
                                { value: "ar", label: "Arabic" },
                                { value: "zh", label: "Chinese" },
                            ]}
                        />
                    </Tooltip>
                </div>
            </div>

            {/* Instant Tactical Filter Bar */}
            <div className="grid grid-cols-4 gap-1 px-2 py-1 border-b border-white/10 shrink-0 font-mono text-[9px] uppercase">
                {[
                    { id: "all", label: "ALL" },
                    { id: "Reports", label: "REPORTS" },
                    { id: "Interactive & Media", label: "MEDIA" },
                    { id: "library", label: `LIB (${outputs.length})` },
                ].map((tab) => {
                    const active = activeFilter === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveFilter(tab.id as any)}
                            className={`py-1 px-1 text-center border transition-colors cursor-pointer truncate ${
                                active
                                    ? "border-purple-400/60 bg-purple-500/15 text-purple-300 font-bold"
                                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.03]"
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1.5 min-h-0">
                {activeFilter !== "library" &&
                    visibleGroups.map((grp) => (
                        <div key={grp.group} className="mb-2">
                            <div className="flex items-center justify-between mb-1 px-0.5">
                                <Text className="font-mono text-[9px] font-semibold text-slate-400 uppercase tracking-[0.14em]">
                                    {grp.group} //
                                </Text>
                                <span className="font-mono text-[9px] text-slate-500 tabular-nums">
                                    {grp.tiles.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                {grp.tiles.map((tile) => {
                                    const isBusy = generating === tile.type;
                                    return (
                                        <button
                                            key={tile.type}
                                            type="button"
                                            disabled={isBusy}
                                            onClick={() => {
                                                if (!notebookId) {
                                                    message.warning("Select or create a notebook first.");
                                                    return;
                                                }
                                                if (tile.type === "report") {
                                                    setReportQuery(`Comprehensive analysis of ${notebookName ?? "notebook"}`);
                                                    setReportModal(true);
                                                } else if (tile.type === "audio_script") {
                                                    setAudioFocus("");
                                                    setAudioLength("default");
                                                    setAudioModal(true);
                                                } else {
                                                    void handleGenerate(tile.type);
                                                }
                                            }}
                                            className={`group flex items-center gap-1.5 px-2 py-1.5 text-left border border-white/10 bg-white/[0.02] hover:border-orange-400/50 hover:bg-white/[0.05] transition-colors cursor-pointer ${
                                                !notebookId ? "opacity-75" : ""
                                            }`}
                                            style={{
                                                borderLeft: `2px solid ${themeColor}`,
                                            }}
                                        >
                                            <span style={{ color: themeColor, fontSize: 13 }} className="shrink-0">
                                                {isBusy ? <Spin size="small" /> : tile.icon}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <Text strong className="text-[10.5px] block truncate leading-tight">
                                                    {tile.label}
                                                </Text>
                                                <Text className="text-[8.5px] text-slate-400 block truncate leading-tight">
                                                    {tile.desc}
                                                </Text>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                <div className="flex items-center justify-between mt-2 mb-1 px-0.5 border-t border-white/[0.06] pt-1.5">
                    <Text className="font-mono text-[9.5px] font-semibold text-slate-400 uppercase tracking-[0.14em]">
                        Artifact Library //
                    </Text>
                    <span className="font-mono text-[9px] text-slate-500 tabular-nums">
                        {outputs.length} ITEMS
                    </span>
                </div>
                {loading ? (
                    <div className="flex justify-center py-3"><Spin size="small" /></div>
                ) : outputs.length === 0 ? (
                    <div className="px-2 py-3 border border-dashed border-white/10 text-center font-mono text-[9.5px] text-slate-400">
                        No artifacts yet. Click any generator tile above.
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {outputs.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setViewOutput(item)}
                                className="group flex items-center justify-between gap-1.5 px-2 py-1.5 cursor-pointer border border-white/[0.06] bg-white/[0.015] hover:border-purple-400/40 hover:bg-white/[0.04] transition-colors"
                                style={{ borderLeft: "2px solid #a855f7" }}
                            >
                                <div className="min-w-0 flex-1">
                                    <Text className="text-[11px] font-medium truncate block leading-snug">
                                        {item.title}
                                    </Text>
                                    <Tag className="font-mono !text-[8.5px] !m-0 !px-1 !py-0 !leading-3.5 !rounded-none uppercase">
                                        {TYPE_LABEL[item.output_type] ?? item.output_type}
                                    </Tag>
                                </div>
                                <Button
                                    type="text"
                                    size="small"
                                    danger
                                    className="!h-5 !w-5 !p-0 opacity-0 group-hover:opacity-100"
                                    icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        void handleDelete(item.id);
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Drawer
                title={viewOutput?.title}
                open={!!viewOutput}
                onClose={() => {
                    setViewOutput(null);
                    setMindMapRaw(false);
                }}
                size={isMindMap || isVideoOverview ? 760 : 480}
                extra={
                    viewOutput ? (
                        <Space>
                            {(isMindMap || isQuiz || isFlashcards || isVideoOverview) && (
                                <Button size="small" onClick={() => setMindMapRaw((v) => !v)}>
                                    {mindMapRaw
                                        ? isMindMap
                                            ? "View diagram"
                                            : isQuiz
                                              ? "Quiz mode"
                                              : isFlashcards
                                                ? "Card mode"
                                                : "Video mode"
                                        : "View text"}
                                </Button>
                            )}
                            <Dropdown
                                trigger={["click"]}
                                menu={{
                                    onClick: ({ key }) => void handleExport(key, viewOutput),
                                    items: [
                                        { key: "copy", icon: <CopyOutlined />, label: "Copy text" },
                                        { key: "md", icon: <FileMarkdownOutlined />, label: "Download .md" },
                                        { key: "pdf", icon: <PrinterOutlined />, label: "Print / PDF" },
                                    ],
                                }}
                            >
                                <Button size="small" icon={<ExportOutlined />}>
                                    Export <DownloadOutlined />
                                </Button>
                            </Dropdown>
                            <Button
                                size="small"
                                icon={<FileAddOutlined />}
                                onClick={() => void handleSaveOutputToNote(viewOutput)}
                            >
                                Save to Notes
                            </Button>
                        </Space>
                    ) : undefined
                }
            >
                {viewOutput && (
                    isMindMap && !mindMapRaw ? (
                        <MindMapView
                            markdown={viewOutput.content}
                            height="calc(100vh - 140px)"
                            onNodeAsk={
                                onAskNode
                                    ? (label) => {
                                          onAskNode(`Explain "${label}" in more detail based on the sources.`);
                                          setViewOutput(null);
                                      }
                                    : undefined
                            }
                        />
                    ) : isQuiz && !mindMapRaw ? (
                        <QuizView content={viewOutput.content} themeColor={themeColor} />
                    ) : isFlashcards && !mindMapRaw ? (
                        <FlashcardsView content={viewOutput.content} themeColor={themeColor} />
                    ) : isVideoOverview && !mindMapRaw ? (
                        <VideoOverviewPlayer content={viewOutput.content} themeColor={themeColor} />
                    ) : (
                        <>
                            {isAudioScript && (
                                <AudioOverviewPlayer
                                    script={viewOutput.content}
                                    themeColor={themeColor}
                                    notebookId={notebookId ?? undefined}
                                    outputId={viewOutput.id}
                                    language={outputLanguage}
                                />
                            )}
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{viewOutput.content}</ReactMarkdown>
                            </div>
                        </>
                    )
                )}
            </Drawer>

            <Modal
                title="Generate Report"
                open={reportModal}
                onCancel={() => setReportModal(false)}
                onOk={() => void handleGenerate("report", reportQuery)}
                confirmLoading={generating === "report"}
            >
                <TextArea
                    rows={3}
                    value={reportQuery}
                    onChange={(e) => setReportQuery(e.target.value)}
                    placeholder="Report topic..."
                />
            </Modal>

            <Modal
                title="Generate Audio Overview"
                open={audioModal}
                onCancel={() => setAudioModal(false)}
                onOk={() =>
                    void handleGenerate("audio_script", audioFocus.trim() || undefined, { audioLength })
                }
                confirmLoading={generating === "audio_script"}
                okText="Generate"
            >
                <div className="flex flex-col gap-3">
                    <div>
                        <Text className="text-xs text-gray-500 block mb-1">Duration</Text>
                        <Segmented
                            block
                            value={audioLength}
                            onChange={(v) => setAudioLength(v as "short" | "default" | "long")}
                            options={[
                                { label: "Short (~3 min)", value: "short" },
                                { label: "Standard (~5 min)", value: "default" },
                                { label: "Long (~10 min)", value: "long" },
                            ]}
                        />
                    </div>
                    <div>
                        <Text className="text-xs text-gray-500 block mb-1">Discussion focus (optional)</Text>
                        <TextArea
                            rows={3}
                            value={audioFocus}
                            onChange={(e) => setAudioFocus(e.target.value)}
                            placeholder="e.g. Focus on monthly sales trends and strategic recommendations..."
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
