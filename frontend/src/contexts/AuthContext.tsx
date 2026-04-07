"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'patient';

export interface User {
    id: string;
    name: string;
    role: UserRole;
    org_id?: string;
    patientId?: string; // used if role === 'patient' to look up their own records
    permissions?: string[];
}

interface AuthContextType {
    currentUser: User | null;
    login: (user: User, token?: string) => void;
    logout: () => void;
    hasPermission: (code: string) => boolean;
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

    const login = (user: User, token?: string) => {
        setCurrentUser(user);
        if (token) {
            localStorage.setItem('__intellicare_token', token);
        }
        localStorage.setItem('__intellicare_auth', JSON.stringify(user));
        document.cookie = `__intellicare_role=${user.role}; path=/`;
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('__intellicare_auth');
        localStorage.removeItem('__intellicare_token');
        document.cookie = '__intellicare_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    };

    const hasPermission = (code: string) => {
        if (!currentUser) return false;

        // 1. Check injected permissions directly
        if (currentUser.permissions && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0) {
            return currentUser.permissions.includes(code);
        }

        // 2. Fallback heuristic
        const role = currentUser.role?.toLowerCase() || '';
        if (role === 'admin' || role === 'ultra_admin' || role === 'hospital_admin') return true;
        if (role === 'doctor' && ['VIEW_PATIENT', 'VIEW_ALL_PATIENTS', 'PRESCRIBE_MEDICATION', 'VIEW_ALERTS', 'DISCHARGE_PATIENT', 'VIEW_TIMELINE', 'VIEW_ADMISSIONS', 'VIEW_VITALS'].includes(code)) return true;
        if (role === 'nurse' && ['VIEW_PATIENT', 'VIEW_ALL_PATIENTS', 'RECORD_VITALS', 'VIEW_ALERTS', 'VIEW_TIMELINE', 'VIEW_ADMISSIONS', 'VIEW_VITALS'].includes(code)) return true;
        if (role === 'patient' && ['VIEW_OWN_PATIENT', 'VIEW_ALERTS', 'VIEW_PRESCRIPTIONS', 'VIEW_VITALS', 'RECORD_VITALS'].includes(code)) return true;

        return false;
    };

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
    return ctx;
}
