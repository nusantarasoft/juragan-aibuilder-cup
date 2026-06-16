"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Button,
    Card,
    Col,
    Drawer,
    Empty,
    Input,
    List,
    Modal,
    Row,
    Spin,
    Tag,
    Typography,
} from "antd";
import {
    AudioOutlined,
    DeleteOutlined,
    FileTextOutlined,
    FundProjectionScreenOutlined,
    NodeIndexOutlined,
    QuestionCircleOutlined,
    TableOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import {
    studioService,
    type StudioOutput,
    type StudioOutputType,
} from "@/lib/studioService";
import { useAppMessage } from "@/hooks/useAppMessage";

const { Text, Title } = Typography;
const { TextArea } = Input;

const TILES: { type: StudioOutputType; label: string; desc: string; icon: React.ReactNode }[] = [
    { type: "brief", label: "Brief", desc: "Ringkasan otomatis notebook", icon: <ThunderboltOutlined /> },
    { type: "report", label: "Report", desc: "Laporan eksekutif mendalam", icon: <FileTextOutlined /> },
    { type: "mind_map", label: "Mind Map", desc: "Peta konsep hierarkis", icon: <NodeIndexOutlined /> },
    { type: "quiz", label: "Quiz", desc: "Kuis pilihan ganda", icon: <QuestionCircleOutlined /> },
    { type: "faq", label: "FAQ", desc: "Pertanyaan & jawaban", icon: <FundProjectionScreenOutlined /> },
    { type: "audio_script", label: "Audio Script", desc: "Naskah dialog podcast", icon: <AudioOutlined /> },
    { type: "data_table", label: "Data Table", desc: "Tabel terstruktur", icon: <TableOutlined /> },
];

type Props = {
    themeColor: string;
    notebookId: string | null;
    notebookName?: string;
    sourcesReady: boolean;
    selectedSourceIds?: string[];
};

export default function StudioOutputsPanel({
    themeColor,
    notebookId,
    notebookName,
    sourcesReady,
    selectedSourceIds,
}: Props) {
    const message = useAppMessage();
    const [outputs, setOutputs] = useState<StudioOutput[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState<StudioOutputType | null>(null);
    const [viewOutput, setViewOutput] = useState<StudioOutput | null>(null);
    const [reportModal, setReportModal] = useState(false);
    const [reportQuery, setReportQuery] = useState("");

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

    const handleGenerate = async (type: StudioOutputType, query?: string) => {
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
            });
            message.success(`${out.title} dibuat`);
            await loadOutputs();
            setViewOutput(out);
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal generate");
        } finally {
            setGenerating(null);
            setReportModal(false);
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
                <Title level={5} className="!mb-0 !text-sm">Studio</Title>
                <Text type="secondary" className="text-[10px]">Generate artefak dari sumber {notebookName}</Text>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                <Text className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Generate</Text>
                <Row gutter={[8, 8]}>
                    {TILES.map((tile) => (
                        <Col span={12} key={tile.type}>
                            <Card
                                size="small"
                                hoverable
                                className="!rounded-lg cursor-pointer"
                                onClick={() => {
                                    if (tile.type === "report") {
                                        setReportQuery(`Analisis lengkap ${notebookName ?? "notebook"}`);
                                        setReportModal(true);
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
                                        <Tag className="text-[9px] m-0">{item.output_type}</Tag>
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
                onClose={() => setViewOutput(null)}
                width={480}
            >
                {viewOutput && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{viewOutput.content}</ReactMarkdown>
                    </div>
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
        </div>
    );
}
