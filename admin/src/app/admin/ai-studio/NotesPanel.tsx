"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, Drawer, Empty, Input, List, Popconfirm, Space, Spin, Tag, Tooltip, Typography } from "antd";
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
    chat: "From chat",
    output: "From output",
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
                message.success("Note updated");
            } else {
                await studioService.createNote(notebookId, {
                    title: draftTitle,
                    content: draftContent,
                    origin: "manual",
                });
                message.success("Note created");
            }
            closeEditor();
            await loadNotes();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to save note");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        try {
            await studioService.deleteNote(noteId);
            message.success("Note deleted");
            if (editing?.id === noteId) closeEditor();
            await loadNotes();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to delete note");
        }
    };

    const handleConvert = async (noteId: string) => {
        setConverting(true);
        try {
            await studioService.convertNoteToSource(noteId);
            message.success("Note converted to source — indexing started");
            onSourceAdded?.();
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to convert note to source");
        } finally {
            setConverting(false);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
            <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-1.5 w-1.5 bg-purple-400 shrink-0" />
                    <Title level={5} className="!mb-0 !text-[11px] font-mono uppercase tracking-[0.14em]">
                        Notes
                    </Title>
                    <span className="font-mono text-[9.5px] text-slate-400 tabular-nums">
                        [{notes.length}]
                    </span>
                </div>
                <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    disabled={!notebookId}
                    onClick={openNew}
                    className="!text-[10.5px] !px-2 !h-6"
                    style={{ backgroundColor: themeColor, borderColor: themeColor }}
                >
                    New
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1.5 min-h-0">
                {!notebookId ? (
                    <div className="px-2.5 py-3 border border-dashed border-white/10 text-center font-mono text-[10px] text-slate-400">
                        Select a notebook to manage Notes.
                    </div>
                ) : loading ? (
                    <div className="flex justify-center py-4"><Spin size="small" /></div>
                ) : notes.length === 0 ? (
                    <div className="px-2.5 py-3 border border-dashed border-white/10 text-center font-mono text-[10px] text-slate-400">
                        No notes yet. Click New to write a note.
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {notes.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => openEdit(item)}
                                className="group flex items-center justify-between gap-1.5 px-2 py-1.5 cursor-pointer border border-white/[0.06] bg-white/[0.015] hover:border-purple-400/40 hover:bg-white/[0.04] transition-colors"
                                style={{ borderLeft: `2px solid ${themeColor}` }}
                            >
                                <div className="min-w-0 flex-1">
                                    <Text className="text-[11px] font-medium truncate block leading-snug">
                                        {item.title}
                                    </Text>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <Tag className="font-mono !text-[8.5px] !m-0 !px-1 !py-0 !leading-3.5 !rounded-none uppercase">
                                            {ORIGIN_LABEL[item.origin]}
                                        </Tag>
                                        <Text className="text-[9.5px] text-slate-400 truncate">
                                            {item.content.slice(0, 45)}
                                        </Text>
                                    </div>
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
                title={editing?.id ? "Edit Note" : "New Note"}
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
                                Convert to Source
                            </Button>
                            <Popconfirm title="Delete note?" onConfirm={() => void handleDelete(editing.id)}>
                                <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </Space>
                    ) : undefined
                }
            >
                <div className="flex flex-col gap-3 h-full">
                    <Input
                        placeholder="Note title"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                    />
                    <TextArea
                        placeholder="Write note (supports markdown)…"
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
                        Save
                    </Button>
                </div>
            </Drawer>
        </div>
    );
}
