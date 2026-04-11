"use client";

import React, { useState, useEffect, useRef } from "react";
import CMSLayout from "@/components/layout/CMSLayout";
import { mediaService, MediaFile } from "@/lib/mediaService";
import {
    Card,
    Row,
    Col,
    List,
    Checkbox,
    Typography,
    Input,
    Button,
    Avatar,
    Space,
    Spin,
    message,
    Image as AntImage,
    Modal,
    Empty,
    Divider,
    Breadcrumb
} from "antd";
import {
    RobotOutlined,
    SendOutlined,
    FileImageOutlined,
    FileOutlined,
    LoadingOutlined,
    FileTextOutlined,
    FundProjectionScreenOutlined,
    PictureOutlined,
    DownloadOutlined,
    AudioOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    ExpandAltOutlined,
    CompressOutlined,
    FolderAddOutlined,
    PlusOutlined
} from "@ant-design/icons";
import ReactMarkdown from 'react-markdown';
import DecryptedText from "@/components/react-bits/DecryptedText";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TooltipWrapper as AnimatedTooltip } from '@/components/mvpblocks/AnimatedTooltip';
import { motion, AnimatePresence } from "framer-motion";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    timestamp: number;
}

interface PresentationSlide {
    title: string;
    bullets: string[];
    speakerNotes?: string;
}

interface PodcastLine {
    speaker: string;
    text: string;
}

export default function AIStudioPage() {
    // Media Source State
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(true);
    const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());

    // Modal States
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [slidesModalOpen, setSlidesModalOpen] = useState(false);
    const [imageModalOpen, setImageModalOpen] = useState(false);

    // Layout States
    const [showSources, setShowSources] = useState(true);
    const [showChat, setShowChat] = useState(true);

    // Chat State
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Report State
    const [reportQuery, setReportQuery] = useState("");
    const [generatedReport, setGeneratedReport] = useState("");
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // Slides State
    const [slidesQuery, setSlidesQuery] = useState("");
    const [generatedSlides, setGeneratedSlides] = useState<PresentationSlide[]>([]);
    const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    // Image State
    const [imagePrompt, setImagePrompt] = useState("");
    const [generatedImage, setGeneratedImage] = useState("");
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // Audio (Podcast) State
    const [podcastScript, setPodcastScript] = useState<PodcastLine[]>([]);
    const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLineIndex, setCurrentLineIndex] = useState(-1);
    const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Initial Load
    useEffect(() => {
        loadMedia();
        // Cleanup speech on unmount
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const loadMedia = async () => {
        setLoadingMedia(true);
        try {
            const files = await mediaService.getMedia({ limit: 50 });
            setMediaFiles(files);
        } catch (error) {
            message.error("Failed to load media.");
        } finally {
            setLoadingMedia(false);
        }
    };

    const toggleMedia = (id: string) => {
        const newSet = new Set(selectedMediaIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedMediaIds(newSet);
    };

    // --- ACTIONS ---

    const handleChatSend = async () => {
        if (!chatInput.trim()) return;
        if (selectedMediaIds.size === 0) {
            message.warning("Select media sources first.");
            return;
        }

        const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
        setChatHistory(prev => [...prev, userMsg]);
        setChatInput("");
        setIsChatting(true);

        try {
            const response = await mediaService.chatWithSources(userMsg.content, Array.from(selectedMediaIds));
            setChatHistory(prev => [...prev, { role: 'ai', content: response, timestamp: Date.now() }]);
        } catch (e) {
            message.error("Failed to chat.");
        } finally {
            setIsChatting(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!reportQuery.trim()) return;
        if (selectedMediaIds.size === 0) {
            message.warning("Select media sources first.");
            return;
        }
        setIsGeneratingReport(true);
        try {
            const response = await mediaService.generateReport(reportQuery, Array.from(selectedMediaIds));
            setGeneratedReport(response);
        } catch (e) {
            message.error("Failed to generate report.");
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleGenerateSlides = async () => {
        if (!slidesQuery.trim()) return;
        if (selectedMediaIds.size === 0) {
            message.warning("Select media sources first.");
            return;
        }
        setIsGeneratingSlides(true);
        try {
            const response = await mediaService.generatePresentation(slidesQuery, Array.from(selectedMediaIds));
            const cleanJson = response.replace(/```json|```/g, '').trim();
            const slides = JSON.parse(cleanJson);
            if (Array.isArray(slides)) {
                setGeneratedSlides(slides);
                setCurrentSlideIndex(0);
            } else {
                message.error("Invalid slide format returned.");
            }
        } catch (e) {
            console.error(e);
            message.error("Failed to generate slides.");
        } finally {
            setIsGeneratingSlides(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt.trim()) return;
        setIsGeneratingImage(true);
        try {
            const b64 = await mediaService.generateImage(imagePrompt);
            if (b64) {
                setGeneratedImage(b64);
            } else {
                message.error("No image returned.");
            }
        } catch (e) {
            message.error("Failed to generate image.");
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const handleGeneratePodcast = async () => {
        if (selectedMediaIds.size === 0) {
            message.warning("Select media sources first.");
            return;
        }
        setIsGeneratingPodcast(true);
        try {
            const response = await mediaService.generatePodcastScript(Array.from(selectedMediaIds));
            const cleanJson = response.replace(/```json|```/g, '').trim();
            const script = JSON.parse(cleanJson);
            if (Array.isArray(script)) {
                setPodcastScript(script);
                setCurrentLineIndex(-1);
                setIsPlaying(false);
                message.success("Audio Overview Generated!");
            } else {
                message.error("Invalid script format.");
            }
        } catch (e) {
            console.error(e);
            message.error("Failed to generate podcast.");
        } finally {
            setIsGeneratingPodcast(false);
        }
    };

    const speakLine = (index: number) => {
        if (index >= podcastScript.length) {
            setIsPlaying(false);
            setCurrentLineIndex(-1);
            return;
        }

        const line = podcastScript[index];
        setCurrentLineIndex(index);

        const utterance = new SpeechSynthesisUtterance(line.text);

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            if (line.speaker.includes("A")) {
                utterance.voice = voices.find(v => v.name.includes("Female") || v.name.includes("Microsoft Zira")) || voices[0];
                utterance.pitch = 1.1;
            } else {
                utterance.voice = voices.find(v => v.name.includes("Male") || v.name.includes("Microsoft David")) || voices[1] || voices[0];
                utterance.pitch = 0.9;
            }
        }

        utterance.onend = () => {
            if (isPlaying) {
                speakLine(index + 1);
            }
        };

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const togglePlayback = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
        } else {
            setIsPlaying(true);
            if (currentLineIndex === -1 || currentLineIndex >= podcastScript.length) {
                speakLine(0);
            } else {
                speakLine(currentLineIndex);
            }
        }
    };

    // --- RENDERERS ---

    const renderSidebar = () => (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
            {loadingMedia ? <Spin style={{ display: 'block', margin: '20px auto' }} /> : (
                <List
                    dataSource={mediaFiles}
                    renderItem={item => (
                        <List.Item
                            onClick={() => toggleMedia(item.id)}
                            style={{
                                cursor: 'pointer',
                                backgroundColor: selectedMediaIds.has(item.id) ? 'rgba(124, 58, 237, 0.08)' : 'transparent',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                marginBottom: '2px',
                                border: 'none',
                                transition: 'all 0.2s',
                                width: '100%'
                            }}
                            className="hover:bg-violet-500/5 group"
                        >
                            <Space>
                                <Checkbox checked={selectedMediaIds.has(item.id)} />
                                {item.mime_type?.startsWith('image/') ? (
                                    <AntImage src={item.url} width={32} height={32} preview={false} style={{ objectFit: 'cover', borderRadius: '4px' }} />
                                ) : <Avatar size={32} icon={<FileOutlined />} shape="square" />}
                                <div style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <Text className={selectedMediaIds.has(item.id) ? 'font-semibold' : ''} style={{ fontSize: '13px' }}>{item.filename}</Text>
                                    <div style={{ fontSize: '10px', color: '#8b929e' }}>{item.mime_type}</div>
                                </div>
                            </Space>
                        </List.Item>
                    )}
                />
            )}
        </div>
    );

    const renderChatMode = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {chatHistory.length === 0 && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Empty description="Select sources and ask questions." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    </div>
                )}
                {chatHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
                        <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: msg.role === 'user' ? '#7c3aed' : '#f0f0f0',
                            color: msg.role === 'user' ? '#fff' : '#000',
                            wordBreak: 'break-word',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {isChatting && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                        <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: '#f0f0f0' }}>
                            <Spin indicator={<LoadingOutlined spin />} size="small" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid rgba(139, 92, 246, 0.1)', background: 'transparent' }}>
                <Space.Compact style={{ width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 8 }}>
                    <Input
                        size="large"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onPressEnter={handleChatSend}
                        placeholder="Chat explicitly with sources..."
                        disabled={isChatting}
                        style={{ borderBottomLeftRadius: 8, borderTopLeftRadius: 8 }}
                    />
                    <Button 
                        size="large" 
                        type="primary" 
                        icon={<SendOutlined />} 
                        onClick={handleChatSend} 
                        loading={isChatting}
                        style={{ borderBottomRightRadius: 8, borderTopRightRadius: 8, backgroundColor: '#7c3aed' }}
                    />
                </Space.Compact>
            </div>
        </div>
    );

    return (
        <CMSLayout
            title={<AuroraText colors={["#9333ea", "#7c3aed", "#6366f1", "#00ffff", "#ff00ff"]}>AI Studio</AuroraText>}
            subTitle={
                <DecryptedText
                    text="Harness AI models to generate deep insights, multi-host audio, rich presentations, and custom imagery directly from your sources"
                    animateOn="view"
                    revealDirection="center"
                    speed={40}
                    maxIterations={15}
                    sequential={true}
                />
            }
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 16, height: '100%' }}>
                <div style={{
                    display: "flex",
                    gap: 16,
                    flex: 1,
                    minHeight: 600,
                    alignItems: 'stretch'
                }}>
                    {/* LEFT SIDEBAR: Sources */}
                    <AnimatePresence mode="wait">
                        {showSources && (
                            <motion.div
                                initial={{ width: 0, opacity: 0, x: -20 }}
                                animate={{ width: 280, opacity: 1, x: 0 }}
                                exit={{ width: 0, opacity: 0, x: -20 }}
                                transition={{ duration: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
                                style={{
                                    width: 280,
                                    minWidth: 280,
                                    display: "flex",
                                    flexDirection: "column",
                                }}
                            >
                                <Card 
                                    size="small"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span style={{
                                                background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                fontWeight: 600,
                                                fontSize: '14px'
                                            }}>
                                                Sources ({selectedMediaIds.size})
                                            </span>
                                        </div>
                                    }
                                    extra={
                                        <div className="flex items-center gap-0.5">
                                            <AnimatedTooltip content="Expand All">
                                                <Button
                                                    type="text"
                                                    icon={<ExpandAltOutlined style={{ fontSize: 14 }} />}
                                                    size="small"
                                                    className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                                                />
                                            </AnimatedTooltip>
                                            <AnimatedTooltip content="Collapse All">
                                                <Button
                                                    type="text"
                                                    icon={<CompressOutlined style={{ fontSize: 14 }} />}
                                                    size="small"
                                                    className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                                                />
                                            </AnimatedTooltip>

                                            <div className="w-[1px] h-3 bg-gray-200 dark:bg-gray-700 mx-1" />

                                            <AnimatedTooltip content="New Folder">
                                                <Button
                                                    type="text"
                                                    icon={<FolderAddOutlined style={{ fontSize: 14 }} />}
                                                    size="small"
                                                    className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                                                />
                                            </AnimatedTooltip>
                                            <AnimatedTooltip content="New Source">
                                                <Button
                                                    type="text"
                                                    icon={<PlusOutlined style={{ fontSize: 14 }} />}
                                                    size="small"
                                                    className="text-gray-400 hover:text-violet-500 flex items-center justify-center w-7 h-7"
                                                />
                                            </AnimatedTooltip>
                                        </div>
                                    }
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        background: 'transparent',
                                        backdropFilter: 'none',
                                        WebkitBackdropFilter: 'none',
                                        boxShadow: 'none',
                                        border: 'none',
                                    }}
                                    className="dark:!bg-transparent dark:!border-none"
                                    styles={{
                                        header: {
                                            background: 'transparent',
                                            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                                            minHeight: 40,
                                            padding: '0 12px'
                                        },
                                        body: {
                                            padding: '8px 0',
                                            flex: 1,
                                            overflow: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }
                                    }}
                                >
                                    {renderSidebar()}
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* MIDDLE COLUMN: Studio Overview & Generators (Inside 1 Card) */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Header Card */}
                        <Card 
                            size="small"
                            style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.5)',
                            }}
                            className="dark:!bg-[rgba(15,15,23,0.6)] dark:!border-purple-500/20"
                            styles={{ 
                                header: {
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                                }
                            }}
                            title={
                                <div className="flex items-center gap-3">
                                    <AnimatedTooltip content={showSources ? "Hide Sources" : "Show Sources"}>
                                        <Button 
                                            type="text" 
                                            icon={showSources ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} 
                                            onClick={() => setShowSources(!showSources)} 
                                            size="small"
                                            className="text-gray-400 hover:text-violet-500 w-7 h-7 flex items-center justify-center -ml-2"
                                        />
                                    </AnimatedTooltip>
                                    <span style={{
                                        background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontWeight: 600,
                                        fontSize: '14px'
                                    }}>
                                        Generative Guide
                                    </span>
                                </div>
                            }
                            extra={
                                <div className="flex items-center gap-1">
                                    <AnimatedTooltip content={showChat ? "Hide Assistant" : "Show Assistant"}>
                                        <Button 
                                            type="text" 
                                            icon={showChat ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} 
                                            onClick={() => setShowChat(!showChat)} 
                                            size="small"
                                            className="text-gray-400 hover:text-violet-500 w-7 h-7 flex items-center justify-center"
                                        />
                                    </AnimatedTooltip>
                                </div>
                            }
                        >
                            <Breadcrumb 
                                items={[
                                    { title: <><RobotOutlined className="mr-1" /> AI Studio</> },
                                    { title: "Generative Guide" }
                                ]} 
                                className="text-xs" 
                            />
                        </Card>

                        <div className="flex-1 overflow-auto custom-scrollbar px-2 pb-4 pt-2">
                            <div style={{ marginBottom: 32 }}>
                                <Title level={3} style={{ marginBottom: 8, fontWeight: 800 }}>
                                    <AuroraText>Studio Guide</AuroraText>
                                </Title>
                                <Text type="secondary">Explore various AI tools to deeply analyze and creatively transform your notes and documents.</Text>
                            </div>

                            <Title level={5} style={{ color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Audio Overview</Title>
                            <Card 
                                hoverable 
                                style={{ borderRadius: 16, borderColor: '#bae0ff', boxShadow: '0 4px 12px rgba(24, 144, 255, 0.1)', marginBottom: 32 }}
                                bodyStyle={{ padding: 24 }}
                                onClick={handleGeneratePodcast}
                            >
                                <Space align="center" size={16}>
                                    <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {isGeneratingPodcast ? <LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} spin /> : <AudioOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                                    </div>
                                    <div>
                                        <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>Deep Dive Discussion</Text>
                                        <Text type="secondary" style={{ fontSize: 13 }}>Two hosts analyze your notes and sources in an engaging podcast format.</Text>
                                    </div>
                                </Space>
                            </Card>

                            <Title level={5} style={{ color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Generate Artifacts</Title>
                            <Row gutter={[16, 16]}>
                                <Col span={12}>
                                    <Card 
                                        hoverable 
                                        style={{ borderRadius: 16 }}
                                        onClick={() => setReportModalOpen(true)}
                                    >
                                        <Space align="center">
                                            <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FileTextOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                                            </div>
                                            <Text strong>Executive Report</Text>
                                        </Space>
                                    </Card>
                                </Col>
                                <Col span={12}>
                                    <Card 
                                        hoverable 
                                        style={{ borderRadius: 16 }}
                                        onClick={() => setSlidesModalOpen(true)}
                                    >
                                        <Space align="center">
                                            <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#fffbe6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FundProjectionScreenOutlined style={{ fontSize: 20, color: '#faad14' }} />
                                            </div>
                                            <Text strong>Presentation</Text>
                                        </Space>
                                    </Card>
                                </Col>
                                <Col span={24}>
                                    <Card 
                                        hoverable 
                                        style={{ borderRadius: 16 }}
                                        onClick={() => setImageModalOpen(true)}
                                    >
                                        <Space align="center">
                                            <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff0f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <PictureOutlined style={{ fontSize: 20, color: '#eb2f96' }} />
                                            </div>
                                            <div>
                                                <Text strong style={{ display: 'block' }}>Vision Generate</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>Create an illustration based on sources</Text>
                                            </div>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Audio Player Inline Display if Podcast Exists */}
                            {podcastScript.length > 0 && (
                                <div style={{ marginTop: 40, padding: 24, backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    <Title level={4} style={{ marginBottom: 16 }}>Your Deep Dive Audio</Title>
                                    <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <Button
                                            type="primary"
                                            shape="circle"
                                            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                                            size="large"
                                            style={{ width: 64, height: 64, fontSize: 32 }}
                                            onClick={togglePlayback}
                                        />
                                        <div>
                                            <Text strong style={{ fontSize: 16 }}>{isPlaying ? 'Playing...' : 'Paused'}</Text>
                                            <br />
                                            <Text type="secondary">Generated AI Podcast</Text>
                                        </div>
                                    </div>
                                    
                                    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                        <List
                                            itemLayout="horizontal"
                                            dataSource={podcastScript}
                                            renderItem={(item, index) => (
                                                <List.Item style={{
                                                    background: index === currentLineIndex ? '#e6f7ff' : 'transparent',
                                                    transition: 'background 0.3s',
                                                    borderRadius: 8,
                                                    padding: '8px 12px',
                                                    border: 'none'
                                                }}>
                                                    <List.Item.Meta
                                                        avatar={<Avatar style={{ backgroundColor: item.speaker.includes('A') ? '#f56a00' : '#7265e6' }}>{item.speaker.charAt(item.speaker.length - 1)}</Avatar>}
                                                        title={<Text strong>{item.speaker}</Text>}
                                                        description={<Text style={{ fontSize: '14px', color: '#333' }}>{item.text}</Text>}
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </div>
                                    <div style={{ marginTop: 16, textAlign: 'right' }}>
                                        <Button danger type="text" onClick={() => { window.speechSynthesis.cancel(); setPodcastScript([]); setIsPlaying(false); }}>Close Player</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR: Chat & Artifacts */}
                    <AnimatePresence mode="wait">
                        {showChat && (
                            <motion.div
                                initial={{ width: 0, opacity: 0, x: 20 }}
                                animate={{ width: 340, opacity: 1, x: 0 }}
                                exit={{ width: 0, opacity: 0, x: 20 }}
                                transition={{ duration: 0.3, type: 'spring', stiffness: 100, damping: 20 }}
                                style={{
                                    width: 340,
                                    minWidth: 340,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 16
                                }}
                            >
                                {/* NEW CARD: Generated Artifact */}
                                <Card 
                                    size="small"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span style={{
                                                background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                fontWeight: 600,
                                                fontSize: '14px'
                                            }}>
                                                Generated Artifact
                                            </span>
                                        </div>
                                    }
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        minHeight: 250,
                                        background: 'transparent',
                                        backdropFilter: 'none',
                                        WebkitBackdropFilter: 'none',
                                        boxShadow: 'none',
                                        border: 'none',
                                        flexShrink: 0
                                    }}
                                    className="dark:!bg-transparent dark:!border-none"
                                    styles={{
                                        header: {
                                            background: 'transparent',
                                            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                                            minHeight: 40,
                                            padding: '0 12px'
                                        },
                                        body: {
                                            padding: '16px',
                                            flex: 1,
                                            overflow: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center'
                                        }
                                    }}
                                >
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span className="text-xs text-gray-400">No artifacts generated yet.</span>} />
                                </Card>

                                <Card 
                                    size="small"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span style={{
                                                background: 'linear-gradient(to right, #8b5cf6, #6366f1)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                fontWeight: 600,
                                                fontSize: '14px'
                                            }}>
                                                AI Assistant
                                            </span>
                                        </div>
                                    }
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        background: 'transparent',
                                        backdropFilter: 'none',
                                        WebkitBackdropFilter: 'none',
                                        boxShadow: 'none',
                                        border: 'none',
                                    }}
                                    className="dark:!bg-transparent dark:!border-none"
                                    styles={{
                                        header: {
                                            background: 'transparent',
                                            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                                            minHeight: 40,
                                            padding: '0 12px'
                                        },
                                        body: {
                                            padding: '0',
                                            flex: 1,
                                            overflow: 'auto',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }
                                    }}
                                >
                                    {renderChatMode()}
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Report Modal */}
            <Modal
                title={<span><FileTextOutlined style={{ color: '#52c41a', marginRight: 8 }} /> Generate Executive Report</span>}
                open={reportModalOpen}
                onCancel={() => setReportModalOpen(false)}
                footer={null}
                width={700}
                centered
            >
                {!generatedReport ? (
                    <div style={{ paddingTop: 16 }}>
                        <Paragraph type="secondary">Describe what you want the report to focus on based on your selected sources.</Paragraph>
                        <TextArea
                            rows={4}
                            value={reportQuery}
                            onChange={e => setReportQuery(e.target.value)}
                            placeholder="E.g. Analyze the Q3 growth based on the provided logs..."
                            style={{ marginBottom: 16 }}
                        />
                        <Button type="primary" size="large" onClick={handleGenerateReport} loading={isGeneratingReport} style={{ width: '100%' }}>Generate Report</Button>
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                            <Space>
                                <Button onClick={() => setGeneratedReport("")}>Reset</Button>
                                <Button type="primary" icon={<DownloadOutlined />}>Export PDF</Button>
                            </Space>
                        </div>
                        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                            <ReactMarkdown>{generatedReport}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Slides Modal */}
            <Modal
                title={<span><FundProjectionScreenOutlined style={{ color: '#faad14', marginRight: 8 }} /> Generate Presentation</span>}
                open={slidesModalOpen}
                onCancel={() => setSlidesModalOpen(false)}
                footer={null}
                width={800}
                centered
            >
                {generatedSlides.length === 0 ? (
                    <div style={{ paddingTop: 16 }}>
                        <Paragraph type="secondary">What topic should this presentation cover from the sources?</Paragraph>
                        <TextArea
                            rows={4}
                            value={slidesQuery}
                            onChange={e => setSlidesQuery(e.target.value)}
                            placeholder="Provide details about the presentation..."
                            style={{ marginBottom: 16 }}
                        />
                        <Button type="primary" size="large" onClick={handleGenerateSlides} loading={isGeneratingSlides} style={{ width: '100%' }}>Create Presentation</Button>
                    </div>
                ) : (
                    <div>
                        <div style={{ marginBottom: 16, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Button onClick={() => setGeneratedSlides([])}>Reset</Button>
                            <Space>
                                <Button disabled={currentSlideIndex === 0} onClick={() => setCurrentSlideIndex(c => c - 1)}>Prev</Button>
                                <Text strong>Slide {currentSlideIndex + 1} of {generatedSlides.length}</Text>
                                <Button disabled={currentSlideIndex === generatedSlides.length - 1} onClick={() => setCurrentSlideIndex(c => c + 1)}>Next</Button>
                            </Space>
                        </div>
                        <div style={{ aspectRatio: '16/9', background: '#2f54eb', color: '#fff', borderRadius: 12, padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                            <Title level={2} style={{ color: '#fff', marginBottom: 24, borderBottom: '2px solid rgba(255,255,255,0.2)', paddingBottom: 16 }}>
                                {generatedSlides[currentSlideIndex].title}
                            </Title>
                            <ul style={{ paddingLeft: 20 }}>
                                {generatedSlides[currentSlideIndex].bullets.map((b, i) => (
                                    <li key={i} style={{ fontSize: '20px', marginBottom: 12, lineHeight: 1.5 }}>{b}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Image Modal */}
            <Modal
                title={<span><PictureOutlined style={{ color: '#eb2f96', marginRight: 8 }} /> Visual Generation</span>}
                open={imageModalOpen}
                onCancel={() => setImageModalOpen(false)}
                footer={null}
                centered
            >
                <div style={{ paddingTop: 16 }}>
                    <Paragraph type="secondary">Provide a prompt specifically describing the image you want regarding these sources.</Paragraph>
                    <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
                        <Input size="large" value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="A vivid illustration of..." />
                        <Button size="large" type="primary" onClick={handleGenerateImage} loading={isGeneratingImage}>Generate</Button>
                    </Space.Compact>
                    {generatedImage && (
                        <div>
                            <img src={generatedImage} alt="Generated" style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} />
                            <Button block href={generatedImage} download="ai_image.png" icon={<DownloadOutlined />}>Download Image</Button>
                        </div>
                    )}
                </div>
            </Modal>
        </CMSLayout>
    );
}

