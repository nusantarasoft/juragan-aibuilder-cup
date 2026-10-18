"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Select, Slider, Space, Typography } from "antd";
import {
    CaretRightOutlined,
    PauseOutlined,
    StepBackwardOutlined,
    StepForwardOutlined,
    StopOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import { parseVideoOverview } from "./videoOverview";

const { Text, Title } = Typography;

type Props = { content: string; themeColor: string };

/**
 * Video Overview player: a narrated slideshow. Each slide is shown on a "canvas"
 * while the Web Speech API reads its narration; playback auto-advances to the
 * next slide when narration finishes. No API key required (browser TTS).
 */
export default function VideoOverviewPlayer({ content, themeColor }: Props) {
    const overview = useMemo(() => parseVideoOverview(content), [content]);
    const slides = overview?.slides ?? [];

    const supported =
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        "SpeechSynthesisUtterance" in window;

    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [voice, setVoice] = useState<string>("");
    const [rate, setRate] = useState(1);
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [paused, setPaused] = useState(false);

    const stoppedRef = useRef(false);

    useEffect(() => {
        if (!supported) return;
        const load = () => {
            const list = window.speechSynthesis.getVoices();
            if (list.length) setVoices(list);
        };
        load();
        window.speechSynthesis.addEventListener?.("voiceschanged", load);
        return () => {
            window.speechSynthesis.removeEventListener?.("voiceschanged", load);
            window.speechSynthesis.cancel();
        };
    }, [supported]);

    useEffect(() => {
        if (!voices.length) return;
        const idVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("id"));
        const pool = idVoices.length ? idVoices : voices;
        setVoice((prev) => prev || pool[0]?.voiceURI || "");
    }, [voices]);

    const narrateFrom = useCallback(
        (start: number) => {
            if (!supported || start >= slides.length) {
                setPlaying(false);
                setPaused(false);
                return;
            }
            stoppedRef.current = false;
            window.speechSynthesis.cancel();
            setPlaying(true);
            setPaused(false);

            const speak = (i: number) => {
                if (stoppedRef.current) return;
                if (i >= slides.length) {
                    setPlaying(false);
                    setPaused(false);
                    return;
                }
                setIndex(i);
                const utt = new SpeechSynthesisUtterance(slides[i].narration || slides[i].heading);
                const v = voices.find((x) => x.voiceURI === voice);
                if (v) {
                    utt.voice = v;
                    utt.lang = v.lang;
                }
                utt.rate = rate;
                utt.onend = () => {
                    if (stoppedRef.current) return;
                    speak(i + 1);
                };
                utt.onerror = () => {
                    if (stoppedRef.current) return;
                    speak(i + 1);
                };
                window.speechSynthesis.speak(utt);
            };

            speak(start);
        },
        [slides, supported, voices, voice, rate],
    );

    const handlePlay = () => {
        if (paused) {
            window.speechSynthesis.resume();
            setPaused(false);
            setPlaying(true);
            return;
        }
        narrateFrom(index);
    };

    const handlePause = () => {
        if (!supported) return;
        window.speechSynthesis.pause();
        setPaused(true);
        setPlaying(false);
    };

    const handleStop = () => {
        if (!supported) return;
        stoppedRef.current = true;
        window.speechSynthesis.cancel();
        setPlaying(false);
        setPaused(false);
        setIndex(0);
    };

    const goTo = (i: number) => {
        const clamped = Math.max(0, Math.min(i, slides.length - 1));
        if (playing || paused) {
            narrateFrom(clamped);
        } else {
            setIndex(clamped);
        }
    };

    if (slides.length === 0) {
        return <Alert type="info" showIcon message="Video overview content is empty or could not be parsed." />;
    }

    const slide = slides[index];
    const voiceOptions = voices.map((v) => ({ value: v.voiceURI, label: `${v.name} (${v.lang})` }));

    return (
        <div className="mb-3">
            {overview?.title && (
                <Text className="text-[11px] text-gray-400 block mb-1">{overview.title}</Text>
            )}
            {/* Slide canvas (16:9) */}
            <div
                className="relative w-full rounded-none overflow-hidden border border-white/10"
                style={{
                    aspectRatio: "16 / 9",
                    borderTop: `2px solid ${themeColor}`,
                    background: `linear-gradient(135deg, ${themeColor}14, ${themeColor}05)`,
                }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.35 }}
                        className="absolute inset-0 flex flex-col justify-center px-6 py-4"
                    >
                        <div
                            className="font-mono text-[9.5px] uppercase tracking-[0.16em] mb-1.5 font-semibold tabular-nums"
                            style={{ color: themeColor }}
                        >
                            SLIDE // {index + 1} / {slides.length}
                        </div>
                        <Title level={4} className="!mb-2 !text-[13px] font-mono uppercase tracking-[0.06em]" style={{ color: themeColor }}>
                            {slide.heading}
                        </Title>
                        <ul className="space-y-1 list-none p-0 m-0">
                            {slide.bullets.map((b, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 + i * 0.1 }}
                                    className="flex items-start gap-2 text-[11.5px] leading-snug"
                                >
                                    <span style={{ color: themeColor }}>■</span>
                                    <span>{b}</span>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Progress bars */}
            <div className="flex items-center justify-center gap-1.5 my-2">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        aria-label={`Slide ${i + 1}`}
                        onClick={() => goTo(i)}
                        className="h-1.5 rounded-none transition-all cursor-pointer border-0 p-0"
                        style={{
                            width: i === index ? 20 : 8,
                            backgroundColor: i === index ? themeColor : `${themeColor}55`,
                        }}
                    />
                ))}
            </div>

            {/* Transport controls */}
            <div className="flex items-center gap-1.5">
                <Button size="small" icon={<StepBackwardOutlined />} onClick={() => goTo(index - 1)} disabled={index === 0} title="Previous" />
                {supported && (!playing ? (
                    <Button
                        size="small"
                        type="primary"
                        icon={<CaretRightOutlined />}
                        onClick={handlePlay}
                        style={{ backgroundColor: themeColor, borderColor: themeColor }}
                        title="Play"
                    />
                ) : (
                    <Button
                        size="small"
                        type="primary"
                        icon={<PauseOutlined />}
                        onClick={handlePause}
                        style={{ backgroundColor: themeColor, borderColor: themeColor }}
                        title="Pause"
                    />
                ))}
                {supported && <Button size="small" icon={<StopOutlined />} onClick={handleStop} title="Stop" />}
                <Button size="small" icon={<StepForwardOutlined />} onClick={() => goTo(index + 1)} disabled={index === slides.length - 1} title="Next" />
                {supported && (
                    <>
                        <Select
                            size="small"
                            style={{ minWidth: 140 }}
                            value={voice || undefined}
                            options={voiceOptions}
                            onChange={setVoice}
                            placeholder="Voice"
                            popupMatchSelectWidth={false}
                        />
                        <Space size={4} className="flex-1 min-w-[100px]">
                            <Text className="font-mono text-[10px] uppercase text-gray-400">Spd.</Text>
                            <Slider
                                className="flex-1"
                                min={0.5}
                                max={1.75}
                                step={0.05}
                                value={rate}
                                onChange={setRate}
                                tooltip={{ formatter: (v) => `${v}x` }}
                            />
                        </Space>
                    </>
                )}
            </div>

            {!supported && (
                <Alert
                    className="mt-2"
                    type="warning"
                    showIcon
                    message="Voice narration is not supported in this browser — slides can still be navigated manually."
                />
            )}

            {slide.narration && (
                <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 italic line-clamp-2">
                    {slide.narration}
                </div>
            )}
        </div>
    );
}
