"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Drawer, Empty, Input, List, Popconfirm, Space, Spin, Tag, Typography } from "antd";
import {
    DeleteOutlined,
    FileAddOutlined,
    PlusOutlined,
    SaveOutlined,
} from "@ant-design/icons";
import { studioService, type StudioNote } from "@/lib/studioService";
import { useAppMessage } from "@/hooks/useAppMessage";

const { Text, Title } = Typography;
const { TextArea } = Input;

type Props = {
    themeColor: string;
    notebookId: string | null;
    /** Bump to force a reload after an external save (e.g. save-to-note from chat/output). */
    refreshSignal?: number;
    onSourceAdded?: () => void;
};

const ORIGIN_LABEL: Record<StudioNote["origin"], string> = {
    manual: "Manual",
    chat: "Dari chat",
    output: "Dari output",
};

export default function NotesPanel({ themeColor, notebookId, refreshSignal, onSourceAdded }: Props) {
    const message = useAppMessage();
    const [notes, setNotes] = useState<StudioNote[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<StudioNote | null>(null);
    const [draftTitle, setDraftTitle] = useState("");
    const [draftContent, setDraftContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [converting, setConverting] = useState(false);

    const loadNotes = useCallback(async () => {
        if (!notebookId) {
            setNotes([]);
            return;
        }
        setLoading(true);
        try {
            setNotes(await studioService.listNotes(notebookId));
        } catch {
            setNotes([]);
        } finally {
            setLoading(false);
        }
    }, [notebookId]);

    useEffect(() => {
        void loadNotes();
    }, [loadNotes, refreshSignal]);

    const openNew = () => {
        setEditing({
            id: "",
            notebook_id: notebookId ?? "",
            title: "",
            content: "",
            origin: "manual",
            created_at: new Date().toISOString(),
        });
        setDraftTitle("");
        setDraftContent("");
    };

    const openEdit = (note: StudioNote) => {
        setEditing(note);
        setDraftTitle(note.title);
        setDraftContent(note.content);
    };

    const closeEditor = () => {
        setEditing(null);
        setDraftTitle("");
        setDraftContent("");
    };

    const handleSave = async () => {
        if (!notebookId || !editing) return;
        setSaving(true);
        try {
            if (editing.id) {
                await studioService.updateNote(editing.id, { title: draftTitle, content: draftContent });
                message.success("Catatan diperbarui");
            } else {
                await studioService.createNote(notebookId, {
                    title: draftTitle,
                    content: draftContent,
                    origin: "manual",
                });
                message.success("Catatan dibuat");
            }
            closeEditor();
            await loadNotes();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal menyimpan catatan");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        try {
            await studioService.deleteNote(noteId);
            message.success("Catatan dihapus");
            if (editing?.id === noteId) closeEditor();
            await loadNotes();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal menghapus");
        }
    };

    const handleConvert = async (noteId: string) => {
        setConverting(true);
        try {
            await studioService.convertNoteToSource(noteId);
            message.success("Catatan dijadikan sumber — indeksasi dimulai");
            onSourceAdded?.();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Gagal menjadikan sumber");
        } finally {
            setConverting(false);
        }
    };

    if (!notebookId) {
        return (
            <div className="flex items-center justify-center h-full p-4 opacity-60">
                <Text type="secondary" className="text-xs text-center">Pilih notebook untuk Notes</Text>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="px-3 py-2 border-b border-[rgba(var(--theme-color-rgb,139,92,246),0.12)] flex items-center justify-between">
                <div>
                    <Title level={5} className="!mb-0 !text-sm">Notes</Title>
                    <Text type="secondary" className="text-[10px]">Catatan pribadi untuk notebook ini</Text>
                </div>
                <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openNew}
                    style={{ backgroundColor: themeColor, borderColor: themeColor }}>
                    Baru
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {loading ? (
                    <div className="flex justify-center py-4"><Spin size="small" /></div>
                ) : notes.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Belum ada catatan" className="my-4" />
                ) : (
                    <List
                        size="small"
                        dataSource={notes}
                        renderItem={(item) => (
                            <List.Item
                                className="!px-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded"
                                onClick={() => openEdit(item)}
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
                                        <Space size={4}>
                                            <Tag className="text-[9px] m-0">{ORIGIN_LABEL[item.origin]}</Tag>
                                            <Text className="text-[9px] text-gray-400 truncate">
                                                {item.content.slice(0, 40)}
                                            </Text>
                                        </Space>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </div>

            <Drawer
                title={editing?.id ? "Edit catatan" : "Catatan baru"}
                open={!!editing}
                onClose={closeEditor}
                size={480}
                extra={
                    editing?.id ? (
                        <Space>
                            <Button
                                size="small"
                                icon={<FileAddOutlined />}
                                loading={converting}
                                onClick={() => void handleConvert(editing.id)}
                            >
                                Jadikan sumber
                            </Button>
                            <Popconfirm title="Hapus catatan?" onConfirm={() => void handleDelete(editing.id)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </Space>
                    ) : undefined
                }
            >
                <div className="flex flex-col gap-3 h-full">
                    <Input
                        placeholder="Judul catatan"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                    />
                    <TextArea
                        placeholder="Tulis catatan (mendukung markdown)…"
                        value={draftContent}
                        onChange={(e) => setDraftContent(e.target.value)}
                        autoSize={{ minRows: 12, maxRows: 24 }}
                    />
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={() => void handleSave()}
                        style={{ backgroundColor: themeColor, borderColor: themeColor }}
                    >
                        Simpan
                    </Button>
                </div>
            </Drawer>
        </div>
    );
}
