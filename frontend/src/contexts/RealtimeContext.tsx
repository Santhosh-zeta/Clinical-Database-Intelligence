"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface RealtimeContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({ socket: null, isConnected: false });

export const useRealtime = () => useContext(RealtimeContext);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!currentUser) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
            return;
        }

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const newSocket = io(API_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
            console.log('[Realtime] Connected to backend');
            setIsConnected(true);
            newSocket.emit('join-org', currentUser.org_id || 1);
        });

        newSocket.on('disconnect', () => {
            console.log('[Realtime] Disconnected');
            setIsConnected(false);
        });

        newSocket.on('new-alert', (payload) => {
            console.log('[Realtime] ALERT:', payload);
            alert(`CRITICAL ALERT for ${payload.patient_name}: ${payload.message}`);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [currentUser?.id]);

    return (
        <RealtimeContext.Provider value={{ socket, isConnected }}>
            {children}
        </RealtimeContext.Provider>
    );
};
