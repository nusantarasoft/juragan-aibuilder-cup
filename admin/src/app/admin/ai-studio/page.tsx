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
    Tag,
    Image as AntImage,
    Layout,
    Segmented,
    Tabs,
    Divider,
    Empty,
    Alert,
    Progress
} from "antd";
import {
    RobotOutlined,
    UserOutlined,
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
    PauseCircleOutlined
} from "@ant-design/icons";
import ReactMarkdown from 'react-markdown';

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

    // Mode State
    const [mode, setMode] = useState<'chat' | 'report' | 'slides' | 'image' | 'audio'>('chat');

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

        // Simple voice assignment logic based on speaker name
        const voices = window.speechSynthesis.getVoices();
        // Try to find different gender/style voices for Host A vs Host B if available
        // This is browser dependent and often flaky, but better than nothing
        if (voices.length > 0) {
            if (line.speaker.includes("A")) {
                // Try to pick a female voice or first available
                utterance.voice = voices.find(v => v.name.includes("Female") || v.name.includes("Microsoft Zira")) || voices[0];
                utterance.pitch = 1.1;
            } else {
                // Try to pick a male voice or second available
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

    // ... (Sidebar, Chat, Report, Slides, Image renderers reused from previous step)
    // To keep it clean, I'll inline the previous logic since I'm doing a full file replacement for safety.

    const renderSidebar = () => (
        <Card
            title={<Space><FileImageOutlined /><span>Sources ({selectedMediaIds.size})</span></Space>}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ flex: 1, overflowY: 'auto', padding: '12px' }}
        >
            {loadingMedia ? <Spin style={{ display: 'block', margin: '20px auto' }} /> : (
                <List
                    dataSource={mediaFiles}
                    renderItem={item => (
                        <List.Item
                            onClick={() => toggleMedia(item.id)}
                            style={{
                                cursor: 'pointer',
                                backgroundColor: selectedMediaIds.has(item.id) ? '#e6f7ff' : 'transparent',
                                borderRadius: '8px',
                                padding: '8px',
                                marginBottom: '4px',
                                border: selectedMediaIds.has(item.id) ? '1px solid #1890ff' : '1px solid transparent'
                            }}
                        >
                            <Space>
                                <Checkbox checked={selectedMediaIds.has(item.id)} />
                                {item.mime_type?.startsWith('image/') ? (
                                    <AntImage src={item.url} width={40} height={40} preview={false} style={{ objectFit: 'cover', borderRadius: '4px' }} />
                                ) : <Avatar icon={<FileOutlined />} shape="square" />}
                                <div style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <Text strong>{item.filename}</Text>
                                    <div style={{ fontSize: '10px', color: '#888' }}>{item.mime_type}</div>
                                </div>
                            </Space>
                        </List.Item>
                    )}
                />
            )}
        </Card>
    );

    const renderChatMode = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {chatHistory.length === 0 && <Empty description="Select sources and ask questions." />}
                {chatHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
                        <div style={{
                            maxWidth: '75%',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            background: msg.role === 'user' ? '#1890ff' : '#f0f0f0',
                            color: msg.role === 'user' ? '#fff' : '#000'
                        }}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {isChatting && <Spin indicator={<LoadingOutlined spin />} />}
                <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: '16px', borderTop: '1px solid #eee' }}>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onPressEnter={handleChatSend}
                        placeholder="Ask a question..."
                        disabled={isChatting}
                    />
                    <Button type="primary" icon={<SendOutlined />} onClick={handleChatSend} loading={isChatting} />
                </Space.Compact>
            </div>
        </div>
    );

    const renderReportMode = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
            {!generatedReport ? (
                <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', textAlign: 'center' }}>
                    <Title level={3}>Generate Report</Title>
                    <TextArea
                        rows={4}
                        value={reportQuery}
                        onChange={e => setReportQuery(e.target.value)}
                        placeholder="Describe report requirements..."
                        style={{ marginBottom: 16 }}
                    />
                    <Button type="primary" size="large" onClick={handleGenerateReport} loading={isGeneratingReport} icon={<FileTextOutlined />}>Generate Report</Button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                        <Button onClick={() => setGeneratedReport("")}>Back</Button>
                        <Button icon={<DownloadOutlined />}>Export PDF</Button>
                    </div>
                    <Card style={{ flex: 1, overflowY: 'auto' }}><ReactMarkdown>{generatedReport}</ReactMarkdown></Card>
                </div>
            )}
        </div>
    );

    const renderSlidesMode = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
            {generatedSlides.length === 0 ? (
                <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', textAlign: 'center' }}>
                    <Title level={3}>Generate Presentation</Title>
                    <TextArea
                        rows={4}
                        value={slidesQuery}
                        onChange={e => setSlidesQuery(e.target.value)}
                        placeholder="Describe presentation topic..."
                        style={{ marginBottom: 16 }}
                    />
                    <Button type="primary" size="large" onClick={handleGenerateSlides} loading={isGeneratingSlides} icon={<FundProjectionScreenOutlined />}>Generate Slides</Button>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ marginBottom: 16, width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                        <Button onClick={() => setGeneratedSlides([])}>Back</Button>
                        <Space>
                            <Button disabled={currentSlideIndex === 0} onClick={() => setCurrentSlideIndex(c => c - 1)}>Prev</Button>
                            <Text>Slide {currentSlideIndex + 1} / {generatedSlides.length}</Text>
                            <Button disabled={currentSlideIndex === generatedSlides.length - 1} onClick={() => setCurrentSlideIndex(c => c + 1)}>Next</Button>
                        </Space>
                    </div>
                    <Card style={{ width: '100%', maxWidth: 800, aspectRatio: '16/9', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Title level={2}>{generatedSlides[currentSlideIndex].title}</Title>
                        <ul>{generatedSlides[currentSlideIndex].bullets.map((b, i) => <li key={i} style={{ fontSize: '18px', marginBottom: 8 }}>{b}</li>)}</ul>
                    </Card>
                </div>
            )}
        </div>
    );

    const renderImageMode = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
            <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', textAlign: 'center' }}>
                <Title level={3}>Generate Image</Title>
                <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
                    <Input size="large" value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} placeholder="Image prompt..." />
                    <Button size="large" type="primary" onClick={handleGenerateImage} loading={isGeneratingImage} icon={<PictureOutlined />}>Generate</Button>
                </Space.Compact>
                {generatedImage && <Card cover={<img src={generatedImage} alt="Generated" />} style={{ marginTop: 24 }}><Button block href={generatedImage} download="image.png">Download</Button></Card>}
            </div>
        </div>
    );

    const renderAudioMode = () => (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
            {podcastScript.length === 0 ? (
                <div style={{ maxWidth: 600, margin: '0 auto', width: '100%', textAlign: 'center' }}>
                    <Title level={3}>Audio Overview</Title>
                    <Paragraph>Generate a "Deep Dive" podcast conversation about your sources.</Paragraph>
                    <Button
                        type="primary"
                        size="large"
                        onClick={handleGeneratePodcast}
                        loading={isGeneratingPodcast}
                        icon={<AudioOutlined />}
                        style={{ height: '60px', fontSize: '18px' }}
                    >
                        Generate Audio Conversation
                    </Button>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 800, margin: '0 auto', width: '100%' }}>
                    <div style={{ marginBottom: 24, textAlign: 'center' }}>
                        <Button
                            type="primary"
                            shape="circle"
                            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                            size="large"
                            style={{ width: 64, height: 64, fontSize: 32 }}
                            onClick={togglePlayback}
                        />
                        <div style={{ marginTop: 8 }}><Text type="secondary">{isPlaying ? 'Playing...' : 'Paused'}</Text></div>
                    </div>

                    <Card style={{ flex: 1, overflowY: 'auto', background: '#fafafa' }}>
                        <List
                            itemLayout="horizontal"
                            dataSource={podcastScript}
                            renderItem={(item, index) => (
                                <List.Item style={{
                                    background: index === currentLineIndex ? '#e6f7ff' : 'transparent',
                                    transition: 'background 0.3s',
                                    borderRadius: 8,
                                    padding: 12,
                                    border: 'none'
                                }}>
                                    <List.Item.Meta
                                        avatar={<Avatar style={{ backgroundColor: item.speaker.includes('A') ? '#f56a00' : '#7265e6' }}>{item.speaker.charAt(item.speaker.length - 1)}</Avatar>}
                                        title={<Text strong>{item.speaker}</Text>}
                                        description={<Text style={{ fontSize: '16px', color: '#333' }}>{item.text}</Text>}
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                    <Button onClick={() => { window.speechSynthesis.cancel(); setPodcastScript([]); setIsPlaying(false); }} style={{ marginTop: 16 }}>Back</Button>
                </div>
            )}
        </div>
    );

    return (
        <CMSLayout>
            <div style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
                <Row style={{ height: '100%' }}>
                    <Col span={6} style={{ height: '100%', borderRight: '1px solid #f0f0f0' }}>
                        {renderSidebar()}
                    </Col>
                    <Col span={18} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '12px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' }}>
                            <Segmented
                                options={[
                                    { label: 'Chat', value: 'chat', icon: <RobotOutlined /> },
                                    { label: 'Report', value: 'report', icon: <FileTextOutlined /> },
                                    { label: 'Slides', value: 'slides', icon: <FundProjectionScreenOutlined /> },
                                    { label: 'Image', value: 'image', icon: <PictureOutlined /> },
                                    { label: 'Audio', value: 'audio', icon: <AudioOutlined /> },
                                ]}
                                value={mode}
                                onChange={(val: any) => {
                                    setMode(val);
                                    window.speechSynthesis.cancel();
                                    setIsPlaying(false);
                                }}
                                size="large"
                            />
                            <Tag color="cyan">Gemini 2.0 Flash / Imagen 3</Tag>
                        </div>

                        <div style={{ flex: 1, overflow: 'hidden', backgroundColor: '#fff' }}>
                            {mode === 'chat' && renderChatMode()}
                            {mode === 'report' && renderReportMode()}
                            {mode === 'slides' && renderSlidesMode()}
                            {mode === 'image' && renderImageMode()}
                            {mode === 'audio' && renderAudioMode()}
                        </div>
                    </Col>
                </Row>
            </div>
        </CMSLayout>
    );
}
