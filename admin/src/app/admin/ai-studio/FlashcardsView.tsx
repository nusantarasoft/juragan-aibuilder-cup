"use client";

import React, { useMemo, useState } from "react";
import { Alert, Button, Progress, Space, Typography } from "antd";
import { LeftOutlined, RightOutlined, RetweetOutlined, SwapOutlined } from "@ant-design/icons";
import { parseFlashcards, type Flashcard } from "./flashcards";

const { Text } = Typography;

type Props = { content: string; themeColor: string };

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function FlashcardsView({ content, themeColor }: Props) {
    const parsed = useMemo<Flashcard[] | null>(() => parseFlashcards(content), [content]);
    const [order, setOrder] = useState<Flashcard[] | null>(parsed);
    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);

    const cards = order ?? parsed;
    if (!cards) {
        return <Alert type="info" showIcon message="Flashcards tidak bisa diparse — lihat teks mentah." />;
    }

    const card = cards[idx];
    const go = (delta: number) => {
        setFlipped(false);
        setIdx((prev) => (prev + delta + cards.length) % cards.length);
    };
    const doShuffle = () => {
        setOrder(shuffle(cards));
        setIdx(0);
        setFlipped(false);
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <Text type="secondary" className="text-xs">
                    Kartu {idx + 1} / {cards.length}
                </Text>
                <Progress
                    percent={Math.round(((idx + 1) / cards.length) * 100)}
                    showInfo={false}
                    strokeColor={themeColor}
                    className="!w-32 !mb-0"
                    size="small"
                />
            </div>

            <div
                role="button"
                tabIndex={0}
                onClick={() => setFlipped((f) => !f)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setFlipped((f) => !f);
                }}
                className="cursor-pointer select-none rounded-xl border-2 flex items-center justify-center text-center p-6 min-h-[200px] transition-colors"
                style={{
                    borderColor: themeColor,
                    background: flipped ? `${themeColor}12` : "var(--card-bg, #fff)",
                }}
            >
                <div>
                    <Text className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: themeColor }}>
                        {flipped ? "Jawaban" : "Pertanyaan"}
                    </Text>
                    <Text className="text-base font-medium block whitespace-pre-wrap">
                        {flipped ? card.back : card.front}
                    </Text>
                    <Text type="secondary" className="text-[10px] block mt-3">
                        <SwapOutlined /> klik untuk membalik
                    </Text>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Button icon={<LeftOutlined />} onClick={() => go(-1)}>
                    Sebelumnya
                </Button>
                <Space>
                    <Button icon={<RetweetOutlined />} onClick={doShuffle} title="Acak">
                        Acak
                    </Button>
                    <Button
                        type="primary"
                        onClick={() => go(1)}
                        style={{ backgroundColor: themeColor, borderColor: themeColor }}
                    >
                        Berikutnya <RightOutlined />
                    </Button>
                </Space>
            </div>
        </div>
    );
}
