"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, Ambulance, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Toast {
    id: string;
    message: string;
    type?: 'alert' | 'ambulance' | 'info' | 'success';
    patient_name?: string;
}

interface NotificationToastProps {
    toasts: Toast[];
    removeToast: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 w-80 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ x: 300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 300, opacity: 0 }}
                        className={cn(
                            "pointer-events-auto bg-white border border-slate-200 shadow-sm rounded-2xl p-4 shadow-[4px_4px_0px_#000] flex gap-3 relative overflow-hidden",
                            toast.type === 'alert' ? "border-red-600 shadow-[4px_4px_0px_#991b1b]" :
                                toast.type === 'ambulance' ? "border-blue-600 shadow-[4px_4px_0px_#1e40af]" : ""
                        )}
                    >
                        <div className={cn(
                            "shrink-0 w-10 h-10 flex items-center justify-center border border-slate-200 shadow-sm rounded-xl/20 bg-slate-50",
                            toast.type === 'alert' ? "text-red-600 bg-red-50" :
                                toast.type === 'ambulance' ? "text-blue-600 bg-blue-50" : "text-slate-500"
                        )}>
                            {toast.type === 'alert' ? <AlertTriangle size={20} /> :
                                toast.type === 'ambulance' ? <Ambulance size={20} /> : <Bell size={20} />}
                        </div>

                        <div className="flex-1 font-sans text-xs uppercase flex flex-col gap-1">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-[10px] tracking-tighter opacity-70">
                                    {toast.type === 'alert' ? 'CRITICAL ALERT' :
                                        toast.type === 'ambulance' ? 'FLEET TRANSIT' : 'SYSTEM NOTIFY'}
                                </span>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="hover:bg-slate-50/80 backdrop-blur-sm p-0.5 border border-transparent hover:border-slate-200 rounded-xl/10"
                                >
                                    <X size={12} />
                                </button>
                            </div>

                            {toast.patient_name && (
                                <div className="font-bold text-slate-800 border-b border-slate-100 pb-0.5 mb-0.5">
                                    REF: {toast.patient_name}
                                </div>
                            )}

                            <div className="font-bold leading-tight">
                                {toast.message}
                            </div>
                        </div>

                        {}
                        <motion.div
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: 8, ease: "linear" }}
                            className={cn(
                                "absolute bottom-0 left-0 right-0 h-1 origin-left",
                                toast.type === 'alert' ? "bg-rose-500 rounded-xl shadow-sm" :
                                    toast.type === 'ambulance' ? "bg-blue-600" : "bg-slate-800"
                            )}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
