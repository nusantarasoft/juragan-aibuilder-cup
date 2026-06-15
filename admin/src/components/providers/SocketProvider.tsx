'use client';

import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWebSocketStore } from '@/store/useWebSocketStore';

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const socketRef = useRef<Socket | null>(null);
    const { setIsConnected, setLastPing, updateTelemetry } = useWebSocketStore();

    useEffect(() => {
        // Connect to NestJS backend WebSocket gateway
        // In production, this URL should come from env vars
        const socket = io('http://localhost:3000/facility', {
            transports: ['websocket'],
            autoConnect: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to Facility WebSocket');
            setIsConnected(true);
            setLastPing(Date.now());
            
            // Auto-subscribe to telemetry on connect
            socket.emit('subscribe_telemetry', {});
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Facility WebSocket');
            setIsConnected(false);
        });

        socket.on('telemetry_update', (data) => {
            setLastPing(Date.now());
            updateTelemetry(data);
        });

        return () => {
            socket.disconnect();
        };
    }, [setIsConnected, setLastPing, updateTelemetry]);

    return <>{children}</>;
}
