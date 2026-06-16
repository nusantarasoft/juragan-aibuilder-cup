'use client';

import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWebSocketStore } from '@/store/useWebSocketStore';

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const socketRef = useRef<Socket | null>(null);
    const { setIsConnected, setLastPing, updateTelemetry } = useWebSocketStore();

    useEffect(() => {
        const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://127.0.0.1:4001/graphql';
        const wsBase = graphqlUrl.replace(/\/graphql\/?$/, '');
        const socket = io(`${wsBase}/facility`, {
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
