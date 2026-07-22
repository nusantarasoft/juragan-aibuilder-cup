"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Alert, Card, Collapse, Empty, Spin, Tag, Typography } from "antd";
import { FileTextOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import { studioService, type StudioOutput } from "@/lib/studioService";
import { normalizeNotebookIcon } from "@/app/admin/ai-studio/notebookIcon";
import MindMapView from "@/app/admin/ai-studio/MindMapView";
import QuizView from "@/app/admin/ai-studio/QuizView";
import FlashcardsView from "@/app/admin/ai-studio/FlashcardsView";
import AudioOverviewPlayer from "@/app/admin/ai-studio/AudioOverviewPlayer";
import VideoOverviewPlayer from "@/app/admin/ai-studio/VideoOverviewPlayer";

const { Title, Text, Paragraph } = Typography;

const THEME = "#8b5cf6";

type SharedData = Awaited<ReturnType<typeof studioService.getSharedNotebook>>;

function OutputBody({ output }: { output: StudioOutput }) {
    switch (output.output_type) {
        case "mind_map":
            return <MindMapView markdown={output.content} height="420px" />;
        case "quiz":
            return <QuizView content={output.content} themeColor={THEME} />;
        case "flashcards":
            return <FlashcardsView content={output.content} themeColor={THEME} />;
        case "video_overview":
            return <VideoOverviewPlayer content={output.content} themeColor={THEME} />;
        case "audio_script":
            return (
                <>
                    <AudioOverviewPlayer script={output.content} themeColor={THEME} />
                    <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{output.content}</ReactMarkdown>
                    </div>
                </>
            );
        default:
            return (
                <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{output.content}</ReactMarkdown>
                </div>
            );
    }
}

export default function SharedStudioPage() {
    const params = useParams<{ token: string }>();
    const token = params?.token ?? "";
    const [data, setData] = useState<SharedData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        (async () => {
            setLoading(true);
            try {
                const res = await studioService.getSharedNotebook(token);
                if (active) setData(res);
            } catch (e: unknown) {
                if (active) setError(e instanceof Error ? e.message : "Gagal memuat notebook");
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [token]);

    const collapseItems = useMemo(
        () =>
            (data?.outputs ?? []).map((o) => ({
                key: o.id,
                label: (
                    <span className="flex items-center gap-2">
                        <span className="font-medium text-sm">{o.title}</span>
                        <Tag className="!text-[10px] !m-0">{o.output_type}</Tag>
                    </span>
                ),
                children: <OutputBody output={o} />,
            })),
        [data],
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spin size="large" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <Alert type="error" showIcon message="Tidak dapat memuat notebook" description={error ?? undefined} />
            </div>
        );
    }

    const { notebook, sources, outputs } = data;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center gap-3 mb-1">
                    <span style={{ fontSize: 34 }}>{normalizeNotebookIcon(notebook.icon)}</span>
                    <Title level={2} className="!mb-0">
                        {notebook.name}
                    </Title>
                </div>
                {notebook.description && (
                    <Paragraph type="secondary" className="!mb-2">
                        {notebook.description}
                    </Paragraph>
                )}
                <Text type="secondary" className="text-xs">
                    Tampilan publik hanya-baca · Diperbarui {new Date(notebook.updated_at).toLocaleDateString()}
                </Text>

                <Card size="small" className="!mt-6" title={`Sumber (${sources.length})`}>
                    {sources.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tidak ada sumber" />
                    ) : (
                        <ul className="m-0 pl-0 list-none space-y-1">
                            {sources.map((s) => (
                                <li key={s.id} className="flex items-center gap-2 text-sm">
                                    <FileTextOutlined style={{ color: THEME }} />
                                    <span className="truncate">{s.filename}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Title level={4} className="!mt-8 !mb-3">
                    Studio Outputs ({outputs.length})
                </Title>
                {outputs.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada output" />
                ) : (
                    <Collapse accordion items={collapseItems} />
                )}

                <div className="text-center mt-10">
                    <Text type="secondary" className="text-xs">
                        Dibuat dengan Nusantarasoft AI Studio
                    </Text>
                </div>
            </div>
        </div>
    );
}
