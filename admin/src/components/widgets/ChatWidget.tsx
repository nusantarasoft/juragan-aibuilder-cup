"use client";

import React, { useState } from "react";
import { Button, Input, Avatar } from "antd";
import { SendOutlined, CloseOutlined, MessageOutlined } from "@ant-design/icons";

interface ChatMessage {
    id: string;
    text: string;
    sender: "user" | "bot";
    timestamp: Date;
}

interface ChatWidgetProps {
    enabled?: boolean;
    title?: string;
    position?: "bottom-right" | "bottom-left";
}

const defaultResponses = [
    "Hello! How can I help you today?",
    "Thanks for your message! Our team will get back to you soon.",
    "That's a great question! Let me find the answer for you.",
    "I understand. Is there anything else I can help with?",
    "Feel free to ask me anything about our services!",
];

export default function ChatWidget({
    enabled = true,
    title = "Chat with us",
    position = "bottom-right"
}: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "1",
            text: "Hi! 👋 How can I help you today?",
            sender: "bot",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");

    if (!enabled) return null;

    const sendMessage = () => {
        if (!inputValue.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            text: inputValue,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages([...messages, userMessage]);
        setInputValue("");

        // Simulate bot response
        setTimeout(() => {
            const botMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: defaultResponses[Math.floor(Math.random() * defaultResponses.length)],
                sender: "bot",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMessage]);
        }, 1000);
    };

    const positionStyles = position === "bottom-right"
        ? { right: 20, bottom: 20 }
        : { left: 20, bottom: 20 };

    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div
                    className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden"
                    style={{
                        ...positionStyles,
                        width: 350,
                        height: 500,
                        bottom: 80,
                    }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar
                                style={{ backgroundColor: "#fff", color: "#1890ff" }}
                                icon={<MessageOutlined />}
                            />
                            <div>
                                <div className="font-semibold">{title}</div>
                                <div className="text-xs opacity-80">Online</div>
                            </div>
                        </div>
                        <Button
                            type="text"
                            icon={<CloseOutlined />}
                            onClick={() => setIsOpen(false)}
                            style={{ color: "white" }}
                        />
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto" style={{ height: 350 }}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`mb-4 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.sender === "user"
                                            ? "bg-blue-600 text-white rounded-br-none"
                                            : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none"
                                        }`}
                                >
                                    {msg.text}
                                    <div
                                        className={`text-xs mt-1 ${msg.sender === "user" ? "text-blue-200" : "text-gray-500"
                                            }`}
                                    >
                                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Type a message..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onPressEnter={sendMessage}
                                className="flex-1"
                            />
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={sendMessage}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed z-50 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110"
                style={positionStyles}
            >
                {isOpen ? <CloseOutlined style={{ fontSize: 20 }} /> : <MessageOutlined style={{ fontSize: 24 }} />}
            </button>
        </>
    );
}
