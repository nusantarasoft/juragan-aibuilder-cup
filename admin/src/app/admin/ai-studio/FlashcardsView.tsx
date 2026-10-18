"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Progress, Space, Typography } from "antd";
import { LeftOutlined, RightOutlined, RetweetOutlined, SwapOutlined } from "@ant-design/icons";
import { parseFlashcards, type Flashcard } from "./flashcards";
import { useAdminLayout } from "@/components/layout/CMSLayoutContext";
import { getVOTheme } from "@/components/layout/voTheme";

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
    const darkMode = useAdminLayout((s) => s.darkMode);
    const t = getVOTheme(darkMode);
    const parsed = useMemo<Flashcard[] | null>(() => parseFlashcards(content), [content]);
    const [order, setOrder] = useState<Flashcard[] | null>(parsed);
    const [idx, setIdx] = useState(0);
    const [flipped, setFlipped] = useState(false);

    useEffect(() => {
        setOrder(parsed);
        setIdx(0);
        setFlipped(false);
    }, [parsed]);

    const cards = order ?? parsed;
    if (!cards) {
        return <Alert type="info" showIcon message="Flashcards could not be parsed — view raw text instead." />;
    }

    const card = cards[idx] ?? cards[0];
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
                <Text type="secondary" className="font-mono text-xs tabular-nums">
                    Card {idx + 1} / {cards.length}
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
                className="cursor-pointer select-none rounded-none flex items-center justify-center text-center p-6 min-h-[200px] transition-colors"
                style={{
                    border: `1px solid ${t.border}`,
                    borderTop: `2px solid ${themeColor}`,
                    background: flipped ? `${themeColor}14` : t.cardBg,
                }}
            >
                <div>
                    <Text className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] block mb-2" style={{ color: themeColor }}>
                        {flipped ? "Answer" : "Question"}
                    </Text>
                    <Text className="text-base font-medium block whitespace-pre-wrap" style={{ color: t.textPrimary }}>
                        {flipped ? card.back : card.front}
                    </Text>
                    <Text type="secondary" className="font-mono text-[10px] uppercase tracking-[0.1em] block mt-3">
                        <SwapOutlined /> click to flip
                    </Text>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <Button icon={<LeftOutlined />} onClick={() => go(-1)}>
                    Previous
                </Button>
                <Space>
                    <Button icon={<RetweetOutlined />} onClick={doShuffle} title="Shuffle">
                        Shuffle
                    </Button>
                    <Button
                        type="primary"
                        onClick={() => go(1)}
                        style={{ backgroundColor: themeColor, borderColor: themeColor }}
                    >
                        Next <RightOutlined />
                    </Button>
                </Space>
            </div>
        </div>
    );
}
