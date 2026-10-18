"use client";

import React, { useEffect, useState } from "react";
import { Input, Modal, Typography } from "antd";

const { Text } = Typography;
const { TextArea } = Input;

type Props = {
    open: boolean;
    loading?: boolean;
    initialInstruction?: string;
    onCancel: () => void;
    onSave: (instruction: string) => Promise<void>;
};

export default function ConfigureChatModal({
    open,
    loading,
    initialInstruction = "",
    onCancel,
    onSave,
}: Props) {
    const [instruction, setInstruction] = useState(initialInstruction);

    useEffect(() => {
        if (open) setInstruction(initialInstruction);
    }, [open, initialInstruction]);

    return (
        <Modal
            title="Configure Chat"
            open={open}
            onCancel={onCancel}
            onOk={() => void onSave(instruction)}
            confirmLoading={loading}
            okText="Save"
        >
            <Text className="text-xs text-gray-500 block mb-2">
                These instructions are appended to every RAG chat response in this notebook (similar to NotebookLM).
            </Text>
            <TextArea
                rows={5}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Example: Respond in formal English. Focus on actionable business insights and metrics."
            />
        </Modal>
    );
}
