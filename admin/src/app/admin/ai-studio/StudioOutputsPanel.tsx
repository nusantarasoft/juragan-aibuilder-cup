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
        group: "Laporan",
        tiles: [
            { type: "brief", label: "Brief", desc: "Ringkasan otomatis notebook", icon: <ThunderboltOutlined /> },
            { type: "study_guide", label: "Study Guide", desc: "Panduan belajar + review", icon: <ReadOutlined /> },
            { type: "briefing_doc", label: "Briefing Doc", desc: "Dokumen briefing eksekutif", icon: <ProfileOutlined /> },
            { type: "faq", label: "FAQ", desc: "Pertanyaan & jawaban", icon: <FundProjectionScreenOutlined /> },
            { type: "timeline", label: "Timeline", desc: "Kronologi peristiwa", icon: <FieldTimeOutlined /> },
            { type: "blog_post", label: "Blog Post", desc: "Artikel naratif", icon: <EditOutlined /> },
            { type: "report", label: "Custom Report", desc: "Laporan sesuai topik", icon: <FileTextOutlined /> },
        ],
    },
    {
        group: "Interaktif & Media",
        tiles: [
            { type: "mind_map", label: "Mind Map", desc: "Peta konsep interaktif", icon: <NodeIndexOutlined /> },
            { type: "quiz", label: "Quiz", desc: "Kuis interaktif dinilai", icon: <QuestionCircleOutlined /> },
            { type: "flashcards", label: "Flashcards", desc: "Kartu belajar bolak-balik", icon: <IdcardOutlined /> },
            { type: "audio_script", label: "Audio Overview", desc: "Naskah + pemutar audio", icon: <AudioOutlined /> },
            { type: "video_overview", label: "Video Overview", desc: "Slide bernarasi otomatis", icon: <VideoCameraOutlined /> },
            { type: "data_table", label: "Data Table", desc: "Tabel terstruktur", icon: <TableOutlined /> },
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
    const [outputLanguage, setOutputLanguage] = useState<string>("id");

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
        if (!notebookId) return;
        if (!sourcesReady) {
            message.warning("Tunggu sumber terindeks dulu.");
            return;
        }
        setGenerating(type);
        try {
            const out = await studioService.generateOutput(notebookId, type, {
                query,
                sourceIds: selectedSourceIds?.length ? selectedSourceIds : undefined,
                audioLength: opts?.audioLength,
                language: outputLanguage,
            });
            message.success(`${out.title} dibuat`);
            await loadOutputs();
            setViewOutput(out);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal generate");
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
                message.success("Konten disalin");
            } else if (key === "md") {
                downloadMarkdown(output.title, output.content);
            } else if (key === "pdf") {
                printAsPdf(output.title, output.content);
            }
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal mengekspor");
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
            message.success("Disimpan ke Notes");
            onNoteSaved?.();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal menyimpan ke Notes");
        }
    };

    const handleDelete = async (outputId: string) => {
        try {
            await studioService.deleteOutput(outputId);
            message.success("Output dihapus");
            if (viewOutput?.id === outputId) setViewOutput(null);
            await loadOutputs();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal hapus");
        }
    };

    if (!notebookId) {
        return (
            <div className="flex items-center justify-center h-full p-4 opacity-60">
                <Text type="secondary" className="text-xs text-center">Pilih notebook untuk Studio outputs</Text>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-[rgba(var(--theme-color-rgb,139,92,246),0.12)]">
                <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <Title level={5} className="!mb-0 !text-sm">Studio</Title>
                        <Text type="secondary" className="text-[10px]">Generate artefak dari sumber {notebookName}</Text>
                    </div>
                    <Select
                        size="small"
                        value={outputLanguage}
                        onChange={setOutputLanguage}
                        title="Bahasa output"
                        style={{ minWidth: 96 }}
                        popupMatchSelectWidth={false}
                        options={[
                            { value: "id", label: "Indonesia" },
                            { value: "en", label: "English" },
                            { value: "jv", label: "Jawa" },
                            { value: "ms", label: "Melayu" },
                            { value: "ar", label: "العربية" },
                            { value: "zh", label: "中文" },
                        ]}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {TILE_GROUPS.map((grp) => (
                    <div key={grp.group} className="mb-3">
                        <Text className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">{grp.group}</Text>
                        <Row gutter={[8, 8]}>
                            {grp.tiles.map((tile) => (
                                <Col span={12} key={tile.type}>
                                    <Card
                                        size="small"
                                        hoverable
                                        className="!rounded-lg cursor-pointer h-full"
                                        onClick={() => {
                                            if (tile.type === "report") {
                                                setReportQuery(`Analisis lengkap ${notebookName ?? "notebook"}`);
                                                setReportModal(true);
                                            } else if (tile.type === "audio_script") {
                                                setAudioFocus("");
                                                setAudioLength("default");
                                                setAudioModal(true);
                                            } else {
                                                void handleGenerate(tile.type);
                                            }
                                        }}
                                    >
                                        <Spin spinning={generating === tile.type} size="small">
                                            <div className="flex items-start gap-2">
                                                <span style={{ color: themeColor, fontSize: 16 }}>{tile.icon}</span>
                                                <div className="min-w-0">
                                                    <Text strong className="text-[11px] block">{tile.label}</Text>
                                                    <Text className="text-[9px] text-gray-400 block leading-tight">{tile.desc}</Text>
                                                </div>
                                            </div>
                                        </Spin>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </div>
                ))}

                <Text className="text-[10px] text-gray-400 uppercase tracking-wider block mt-4 mb-2">Library</Text>
                {loading ? (
                    <div className="flex justify-center py-4"><Spin size="small" /></div>
                ) : outputs.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada output" className="my-4" />
                ) : (
                    <List
                        size="small"
                        dataSource={outputs}
                        renderItem={(item) => (
                            <List.Item
                                className="!px-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded"
                                onClick={() => setViewOutput(item)}
                                actions={[
                                    <Button
                                        key="del"
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void handleDelete(item.id);
                                        }}
                                    />,
                                ]}
                            >
                                <List.Item.Meta
                                    title={<Text className="text-[11px] truncate block">{item.title}</Text>}
                                    description={
                                        <Tag className="text-[9px] m-0">{TYPE_LABEL[item.output_type] ?? item.output_type}</Tag>
                                    }
                                />
                            </List.Item>
                        )}
                    />
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
                                            ? "Lihat diagram"
                                            : isQuiz
                                              ? "Mode kuis"
                                              : isFlashcards
                                                ? "Mode kartu"
                                                : "Mode video"
                                        : "Lihat teks"}
                                </Button>
                            )}
                            <Dropdown
                                trigger={["click"]}
                                menu={{
                                    onClick: ({ key }) => void handleExport(key, viewOutput),
                                    items: [
                                        { key: "copy", icon: <CopyOutlined />, label: "Salin teks" },
                                        { key: "md", icon: <FileMarkdownOutlined />, label: "Unduh .md" },
                                        { key: "pdf", icon: <PrinterOutlined />, label: "Cetak / PDF" },
                                    ],
                                }}
                            >
                                <Button size="small" icon={<ExportOutlined />}>
                                    Ekspor <DownloadOutlined />
                                </Button>
                            </Dropdown>
                            <Button
                                size="small"
                                icon={<FileAddOutlined />}
                                onClick={() => void handleSaveOutputToNote(viewOutput)}
                            >
                                Simpan ke Notes
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
                                          onAskNode(`Jelaskan lebih detail tentang "${label}" berdasarkan sumber.`);
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
                    placeholder="Topik laporan..."
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
                        <Text className="text-xs text-gray-500 block mb-1">Durasi</Text>
                        <Segmented
                            block
                            value={audioLength}
                            onChange={(v) => setAudioLength(v as "short" | "default" | "long")}
                            options={[
                                { label: "Singkat (~3 mnt)", value: "short" },
                                { label: "Standar (~5 mnt)", value: "default" },
                                { label: "Panjang (~10 mnt)", value: "long" },
                            ]}
                        />
                    </div>
                    <div>
                        <Text className="text-xs text-gray-500 block mb-1">Fokus pembahasan (opsional)</Text>
                        <TextArea
                            rows={3}
                            value={audioFocus}
                            onChange={(e) => setAudioFocus(e.target.value)}
                            placeholder="Mis. fokus ke tren penjualan bulanan dan rekomendasi..."
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
