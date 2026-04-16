"use client";

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface GuardProps {
    children: React.ReactNode;
    requiredPermission: string;
    fallback?: React.ReactNode;
}

export function PermissionGuard({ children, requiredPermission, fallback }: GuardProps) {
    const { hasPermission } = useAuth();

    if (hasPermission(requiredPermission)) {
        return <>{children}</>;
    }

    if (fallback) {
        return <>{fallback}</>;
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 w-full h-full text-center min-h-[50vh]">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Restricted Access</h2>
            <p className="text-slate-500 max-w-sm">You do not have the required permission ({requiredPermission}) to access this feature.</p>
        </div>
    );
}
