"use client";

import React, { useMemo, useState } from "react";
import { Alert, Button, Progress, Radio, Space, Tag, Typography } from "antd";
import { CheckCircleFilled, CloseCircleFilled, RedoOutlined } from "@ant-design/icons";
import { parseQuiz, type QuizQuestion } from "./quiz";

const { Text, Title } = Typography;

type Props = { content: string; themeColor: string };

export default function QuizView({ content, themeColor }: Props) {
    const questions = useMemo<QuizQuestion[] | null>(() => parseQuiz(content), [content]);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [submitted, setSubmitted] = useState(false);

    if (!questions) {
        return <Alert type="info" showIcon message="Kuis tidak bisa diparse — lihat teks mentah." />;
    }

    const answeredCount = Object.keys(answers).length;
    const allAnswered = answeredCount === questions.length;
    const score = questions.reduce((n, q, i) => (answers[i] === q.answerIndex ? n + 1 : n), 0);
    const pct = Math.round((score / questions.length) * 100);

    const reset = () => {
        setAnswers({});
        setSubmitted(false);
    };

    return (
        <div className="flex flex-col gap-4">
            {submitted && (
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3">
                    <Progress
                        type="circle"
                        percent={pct}
                        size={56}
                        strokeColor={themeColor}
                        format={() => `${score}/${questions.length}`}
                    />
                    <div>
                        <Title level={5} className="!mb-0">
                            {pct >= 80 ? "Bagus sekali!" : pct >= 50 ? "Lumayan" : "Perlu belajar lagi"}
                        </Title>
                        <Text type="secondary" className="text-xs">Skor {pct}%</Text>
                    </div>
                    <Button className="ml-auto" size="small" icon={<RedoOutlined />} onClick={reset}>
                        Ulangi
                    </Button>
                </div>
            )}

            {questions.map((q, i) => {
                const chosen = answers[i];
                const correct = q.answerIndex;
                return (
                    <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                        <Text strong className="text-[13px] block mb-2">
                            {i + 1}. {q.question}
                        </Text>
                        <Radio.Group
                            className="w-full"
                            value={chosen}
                            disabled={submitted}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                        >
                            <Space direction="vertical" className="w-full">
                                {q.options.map((opt, oi) => {
                                    const isCorrect = submitted && oi === correct;
                                    const isWrongChoice = submitted && oi === chosen && chosen !== correct;
                                    return (
                                        <Radio
                                            key={oi}
                                            value={oi}
                                            className={`!text-[12px] w-full px-2 py-1 rounded ${
                                                isCorrect
                                                    ? "bg-green-50 dark:bg-green-900/20"
                                                    : isWrongChoice
                                                      ? "bg-red-50 dark:bg-red-900/20"
                                                      : ""
                                            }`}
                                        >
                                            {opt}
                                            {isCorrect && (
                                                <CheckCircleFilled className="ml-1" style={{ color: "#52c41a" }} />
                                            )}
                                            {isWrongChoice && (
                                                <CloseCircleFilled className="ml-1" style={{ color: "#ff4d4f" }} />
                                            )}
                                        </Radio>
                                    );
                                })}
                            </Space>
                        </Radio.Group>
                        {submitted && q.explanation && (
                            <div className="mt-2 text-[11px] text-gray-500">
                                <Tag color={themeColor} className="!text-[9px]">Penjelasan</Tag>
                                {q.explanation}
                            </div>
                        )}
                    </div>
                );
            })}

            {!submitted && (
                <Button
                    type="primary"
                    disabled={!allAnswered}
                    onClick={() => setSubmitted(true)}
                    style={{ backgroundColor: themeColor, borderColor: themeColor }}
                >
                    {allAnswered ? "Periksa jawaban" : `Jawab semua dulu (${answeredCount}/${questions.length})`}
                </Button>
            )}
        </div>
    );
}
