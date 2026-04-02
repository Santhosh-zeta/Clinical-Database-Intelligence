"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'doctor' | 'patient';

export interface User {
    id: string;
    name: string;
    role: UserRole;
    patientId?: string; // used if role === 'patient' to look up their own records
}

interface AuthContextType {
    currentUser: User | null;
    login: (user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Hydrate auth from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('__intellicare_auth');
        if (saved) {
            setCurrentUser(JSON.parse(saved));
        }
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('__intellicare_auth', JSON.stringify(user));
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('__intellicare_auth');
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
