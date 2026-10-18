"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Select, Slider, Space, Tag, Typography } from "antd";
import {
    DownloadOutlined,
    PauseOutlined,
    CaretRightOutlined,
    StepForwardOutlined,
    StopOutlined,
} from "@ant-design/icons";
import { parseAudioScript, speakerOrder, type DialogueSegment } from "./audioScript";
import { studioService } from "@/lib/studioService";
import { useAppMessage } from "@/hooks/useAppMessage";

const { Text } = Typography;

type Props = {
    script: string;
    themeColor: string;
    /** When provided, enables server-side MP3 synthesis + download. */
    notebookId?: string;
    outputId?: string;
    language?: string;
};

/**
 * Audio Overview player. Reads a two-host podcast script aloud using the browser
 * Web Speech API (SpeechSynthesis) — no API key required, works offline. Speakers
 * are mapped to distinct voices (Indonesian preferred) so it feels like a duet.
 */
export default function AudioOverviewPlayer({ script, themeColor, notebookId, outputId, language }: Props) {
    const message = useAppMessage();
    const segments = useMemo(() => parseAudioScript(script), [script]);
    const speakers = useMemo(() => speakerOrder(segments), [segments]);
    const [downloading, setDownloading] = useState(false);

    const handleDownloadMp3 = async () => {
        if (!notebookId || !outputId) return;
        setDownloading(true);
        try {
            const { url } = await studioService.synthesizeAudio(notebookId, outputId, language);
            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noreferrer";
            a.download = "audio-overview.mp3";
            document.body.appendChild(a);
            a.click();
            a.remove();
            message.success("MP3 audio ready for download");
        } catch (e: unknown) {
            message.error(e instanceof Error ? e.message : "Failed to generate MP3");
        } finally {
            setDownloading(false);
        }
    };

    const supported =
        typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [rate, setRate] = useState(1);
    const [voiceA, setVoiceA] = useState<string>("");
    const [voiceB, setVoiceB] = useState<string>("");
    const [playing, setPlaying] = useState(false);
    const [paused, setPaused] = useState(false);
    const [current, setCurrent] = useState(-1);

    const idxRef = useRef(0);
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

    // Pick sensible default voices once the list loads (English first).
    useEffect(() => {
        if (!voices.length) return;
        const enVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
        const pool = enVoices.length ? enVoices : voices;
        setVoiceA((prev) => prev || pool[0]?.voiceURI || "");
        setVoiceB((prev) => prev || (pool[1]?.voiceURI ?? pool[0]?.voiceURI) || "");
    }, [voices]);

    const voiceFor = useCallback(
        (seg: DialogueSegment): SpeechSynthesisVoice | undefined => {
            const isSecond = seg.speaker ? speakers.indexOf(seg.speaker) % 2 === 1 : false;
            const uri = isSecond ? voiceB : voiceA;
            return voices.find((v) => v.voiceURI === uri);
        },
        [speakers, voiceA, voiceB, voices],
    );

    const speakFrom = useCallback(
        (start: number) => {
            if (!supported || start >= segments.length) {
                setPlaying(false);
                setPaused(false);
                setCurrent(-1);
                return;
            }
            stoppedRef.current = false;
            idxRef.current = start;

            const speakNext = () => {
                if (stoppedRef.current) return;
                const i = idxRef.current;
                if (i >= segments.length) {
                    setPlaying(false);
                    setPaused(false);
                    setCurrent(-1);
                    return;
                }
                const seg = segments[i];
                setCurrent(i);
                const utt = new SpeechSynthesisUtterance(seg.text);
                const v = voiceFor(seg);
                if (v) {
                    utt.voice = v;
                    utt.lang = v.lang;
                }
                utt.rate = rate;
                utt.onend = () => {
                    if (stoppedRef.current) return;
                    idxRef.current += 1;
                    speakNext();
                };
                utt.onerror = () => {
                    if (stoppedRef.current) return;
                    idxRef.current += 1;
                    speakNext();
                };
                window.speechSynthesis.speak(utt);
            };

            window.speechSynthesis.cancel();
            setPlaying(true);
            setPaused(false);
            speakNext();
        },
        [segments, supported, rate, voiceFor],
    );

    const handlePlay = () => {
        if (paused) {
            window.speechSynthesis.resume();
            setPaused(false);
            setPlaying(true);
            return;
        }
        speakFrom(current >= 0 ? current : 0);
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
        setCurrent(-1);
        idxRef.current = 0;
    };

    const handleSkip = () => {
        if (!supported || !segments.length) return;
        const next = Math.min((current < 0 ? 0 : current) + 1, segments.length - 1);
        speakFrom(next);
    };

    if (!supported) {
        return (
            <Alert
                type="warning"
                showIcon
                message="Audio Overview not supported"
                description="This browser does not support the Web Speech API. Try the latest Chrome or Edge."
            />
        );
    }

    if (segments.length === 0) {
        return <Alert type="info" showIcon message="Audio script is empty or could not be parsed." />;
    }

    const voiceOptions = voices.map((v) => ({ value: v.voiceURI, label: `${v.name} (${v.lang})` }));

    return (
        <div
            className="rounded-none border border-white/10 p-3 mb-3 bg-white/[0.02]"
            style={{ borderTop: `2px solid ${themeColor}` }}
        >
            <div className="flex items-center gap-2 mb-2">
                {!playing ? (
                    <Button
                        type="primary"
                        icon={<CaretRightOutlined />}
                        onClick={handlePlay}
                        style={{ backgroundColor: themeColor, borderColor: themeColor }}
                    />
                ) : (
                    <Button
                        type="primary"
                        icon={<PauseOutlined />}
                        onClick={handlePause}
                        style={{ backgroundColor: themeColor, borderColor: themeColor }}
                    />
                )}
                <Button icon={<StepForwardOutlined />} onClick={handleSkip} title="Skip segment" />
                <Button icon={<StopOutlined />} onClick={handleStop} title="Stop" />
                <Text className="font-mono text-[11px] text-gray-400 ml-1 tabular-nums">
                    {current >= 0 ? `Segment ${current + 1}/${segments.length}` : `${segments.length} segments`}
                </Text>
                {notebookId && outputId && (
                    <Button
                        size="small"
                        className="ml-auto font-mono"
                        icon={<DownloadOutlined />}
                        loading={downloading}
                        onClick={() => void handleDownloadMp3()}
                        title="Synthesize & download MP3 (server)"
                    >
                        MP3
                    </Button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
                <Space size={4}>
                    <Text className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400">Voice 1</Text>
                    <Select
                        size="small"
                        style={{ minWidth: 150 }}
                        value={voiceA || undefined}
                        options={voiceOptions}
                        onChange={setVoiceA}
                        placeholder="Voice"
                    />
                </Space>
                <Space size={4}>
                    <Text className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400">Voice 2</Text>
                    <Select
                        size="small"
                        style={{ minWidth: 150 }}
                        value={voiceB || undefined}
                        options={voiceOptions}
                        onChange={setVoiceB}
                        placeholder="Voice"
                    />
                </Space>
                <Space size={4} className="flex-1 min-w-[120px]">
                    <Text className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400">Speed</Text>
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
            </div>

            {current >= 0 && (
                <div className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2">
                    {segments[current].speaker && (
                        <Tag color={themeColor} className="font-mono !text-[9px] !mr-1 !rounded-none">
                            {segments[current].speaker}
                        </Tag>
                    )}
                    {segments[current].text}
                </div>
            )}
        </div>
    );
}
