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
            okText="Simpan"
        >
            <Text className="text-xs text-gray-500 block mb-2">
                Instruksi ini ditambahkan ke setiap jawaban chat RAG di notebook ini (seperti NotebookLM).
            </Text>
            <TextArea
                rows={5}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Contoh: Jawab dalam Bahasa Indonesia formal. Fokus pada insight bisnis."
            />
        </Modal>
    );
}
