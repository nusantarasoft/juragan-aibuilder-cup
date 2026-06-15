'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, List, Avatar, Typography, Space, theme } from 'antd';
import { RobotOutlined, SendOutlined, CloseOutlined, UserOutlined, ExperimentOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { usePreferencesStore } from '@/store/usePreferencesStore';

const { Text } = Typography;

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export function FacilityCopilot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'ai',
            text: 'Hello! I am your Facility AI Copilot. I can analyze telemetry, trigger BMS overrides, or check SCADA alarms. How can I assist you today?',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);

    const { themeColor } = usePreferencesStore();
    const { token: antToken } = theme.useToken();
    const isDark = antToken.colorBgContainer === '#141414' || antToken.colorBgBase?.includes('14');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: input,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Mock AI Response
        setTimeout(() => {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: 'Analyzing facility telemetry... No critical anomalies detected at this moment. Would you like me to generate a summary report?',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, aiMsg]);
        }, 1500);
    };

    const glassStyle = {
        background: isDark ? 'rgba(20,20,20,0.85)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        borderRadius: 16,
        overflow: 'hidden'
    };

    return (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
                        style={{
                            ...glassStyle,
                            width: 380,
                            height: 600,
                            marginBottom: 16,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Header */}
                        <div style={{ padding: '16px 20px', background: themeColor, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Space>
                                <ExperimentOutlined style={{ color: '#fff', fontSize: 18 }} />
                                <Text strong style={{ color: '#fff', fontSize: 16 }}>Facility AI Copilot</Text>
                            </Space>
                            <Button type="text" icon={<CloseOutlined style={{ color: '#fff' }} />} onClick={() => setIsOpen(false)} />
                        </div>

                        {/* Chat Body */}
                        <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {messages.map((msg) => (
                                <div key={msg.id} style={{ display: 'flex', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row', gap: 12 }}>
                                    <Avatar 
                                        icon={msg.sender === 'user' ? <UserOutlined /> : <RobotOutlined />} 
                                        style={{ backgroundColor: msg.sender === 'user' ? themeColor : (isDark ? '#333' : '#f0f0f0'), color: msg.sender === 'user' ? '#fff' : (isDark ? '#fff' : '#000') }}
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                        <div style={{
                                            padding: '10px 14px',
                                            borderRadius: 12,
                                            background: msg.sender === 'user' ? themeColor : (isDark ? '#2a2a2a' : '#f5f5f5'),
                                            color: msg.sender === 'user' ? '#fff' : (isDark ? '#fff' : '#000'),
                                            borderTopRightRadius: msg.sender === 'user' ? 2 : 12,
                                            borderTopLeftRadius: msg.sender === 'ai' ? 2 : 12,
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                                        }}>
                                            <Text style={{ color: 'inherit' }}>{msg.text}</Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>{msg.time}</Text>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: 16, borderTop: `1px solid ${isDark ? '#333' : '#f0f0f0'}` }}>
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onPressEnter={handleSend}
                                placeholder="Ask Copilot..."
                                variant="filled"
                                suffix={
                                    <Button 
                                        type="primary" 
                                        shape="circle" 
                                        icon={<SendOutlined />} 
                                        size="small" 
                                        onClick={handleSend} 
                                        style={{ background: themeColor, border: 'none' }}
                                    />
                                }
                                style={{ borderRadius: 24, paddingLeft: 16, paddingRight: 8, paddingBottom: 6, paddingTop: 6 }}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<RobotOutlined style={{ fontSize: 24 }} />}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        width: 64,
                        height: 64,
                        background: themeColor,
                        border: 'none',
                        boxShadow: `0 8px 24px ${themeColor}80`
                    }}
                />
            </motion.div>
        </div>
    );
}
