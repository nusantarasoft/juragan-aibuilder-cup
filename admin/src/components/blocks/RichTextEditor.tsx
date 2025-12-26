"use client";

import React, { useState } from "react";
import { Card, Button, Input, Space, Tooltip, Dropdown } from "antd";
import {
    BoldOutlined,
    ItalicOutlined,
    UnderlineOutlined,
    OrderedListOutlined,
    UnorderedListOutlined,
    LinkOutlined,
    PictureOutlined,
    AlignLeftOutlined,
    AlignCenterOutlined,
    AlignRightOutlined,
    FontSizeOutlined,
} from "@ant-design/icons";

interface RichTextEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    minHeight?: number;
}

/**
 * Basic Rich Text Editor Component
 * Uses contentEditable with toolbar buttons
 * For full WYSIWYG, consider integrating Tiptap or Slate
 */
export default function RichTextEditor({
    value = "",
    onChange,
    placeholder = "Enter your content...",
    minHeight = 200,
}: RichTextEditorProps) {
    const [content, setContent] = useState(value);
    const editorRef = React.useRef<HTMLDivElement>(null);

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleChange();
    };

    const handleChange = () => {
        const html = editorRef.current?.innerHTML || "";
        setContent(html);
        onChange?.(html);
    };

    const headingSizes = [
        { key: "1", label: "Heading 1" },
        { key: "2", label: "Heading 2" },
        { key: "3", label: "Heading 3" },
        { key: "4", label: "Heading 4" },
        { key: "p", label: "Paragraph" },
    ];

    const insertLink = () => {
        const url = prompt("Enter URL:", "https://");
        if (url) {
            execCommand("createLink", url);
        }
    };

    const insertImage = () => {
        const url = prompt("Enter image URL:", "https://");
        if (url) {
            execCommand("insertImage", url);
        }
    };

    return (
        <Card size="small" styles={{ body: { padding: 0 } }}>
            {/* Toolbar */}
            <div
                style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #f0f0f0",
                    background: "#fafafa",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                }}
            >
                <Space size={4}>
                    <Dropdown
                        menu={{
                            items: headingSizes.map((h) => ({
                                key: h.key,
                                label: h.label,
                                onClick: () => {
                                    if (h.key === "p") {
                                        execCommand("formatBlock", "p");
                                    } else {
                                        execCommand("formatBlock", `h${h.key}`);
                                    }
                                },
                            })),
                        }}
                    >
                        <Button size="small" icon={<FontSizeOutlined />}>
                            Format
                        </Button>
                    </Dropdown>

                    <div style={{ width: 1, height: 20, background: "#d9d9d9" }} />

                    <Tooltip title="Bold">
                        <Button
                            size="small"
                            icon={<BoldOutlined />}
                            onClick={() => execCommand("bold")}
                        />
                    </Tooltip>
                    <Tooltip title="Italic">
                        <Button
                            size="small"
                            icon={<ItalicOutlined />}
                            onClick={() => execCommand("italic")}
                        />
                    </Tooltip>
                    <Tooltip title="Underline">
                        <Button
                            size="small"
                            icon={<UnderlineOutlined />}
                            onClick={() => execCommand("underline")}
                        />
                    </Tooltip>

                    <div style={{ width: 1, height: 20, background: "#d9d9d9" }} />

                    <Tooltip title="Bullet List">
                        <Button
                            size="small"
                            icon={<UnorderedListOutlined />}
                            onClick={() => execCommand("insertUnorderedList")}
                        />
                    </Tooltip>
                    <Tooltip title="Numbered List">
                        <Button
                            size="small"
                            icon={<OrderedListOutlined />}
                            onClick={() => execCommand("insertOrderedList")}
                        />
                    </Tooltip>

                    <div style={{ width: 1, height: 20, background: "#d9d9d9" }} />

                    <Tooltip title="Align Left">
                        <Button
                            size="small"
                            icon={<AlignLeftOutlined />}
                            onClick={() => execCommand("justifyLeft")}
                        />
                    </Tooltip>
                    <Tooltip title="Align Center">
                        <Button
                            size="small"
                            icon={<AlignCenterOutlined />}
                            onClick={() => execCommand("justifyCenter")}
                        />
                    </Tooltip>
                    <Tooltip title="Align Right">
                        <Button
                            size="small"
                            icon={<AlignRightOutlined />}
                            onClick={() => execCommand("justifyRight")}
                        />
                    </Tooltip>

                    <div style={{ width: 1, height: 20, background: "#d9d9d9" }} />

                    <Tooltip title="Insert Link">
                        <Button size="small" icon={<LinkOutlined />} onClick={insertLink} />
                    </Tooltip>
                    <Tooltip title="Insert Image">
                        <Button
                            size="small"
                            icon={<PictureOutlined />}
                            onClick={insertImage}
                        />
                    </Tooltip>
                </Space>
            </div>

            {/* Editor */}
            <div
                ref={editorRef}
                contentEditable
                style={{
                    minHeight,
                    padding: 16,
                    outline: "none",
                    lineHeight: 1.6,
                }}
                dangerouslySetInnerHTML={{ __html: content }}
                onInput={handleChange}
                onBlur={handleChange}
                data-placeholder={placeholder}
            />

            <style jsx global>{`
                [contenteditable]:empty:before {
                    content: attr(data-placeholder);
                    color: #bfbfbf;
                }
            `}</style>
        </Card>
    );
}
