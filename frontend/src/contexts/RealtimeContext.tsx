"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface RealtimeContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({
    socket: null,
    isConnected: false
});

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

        const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const newSocket = io(API_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            auth: { token: token ?? '' },
        });

        newSocket.on('connect', () => {
            console.log('[Realtime] Connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
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
