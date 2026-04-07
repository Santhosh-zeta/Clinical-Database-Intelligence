"use client";

import React, { useState } from 'react';
import { useAuth, User } from '../../contexts/AuthContext';
import { Shield, User as UserIcon, Activity, KeyRound, ArrowRight, HeartPulse, Stethoscope, BriefcaseMedical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Shell } from './Shell';
import { motion, AnimatePresence } from 'framer-motion';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { currentUser, login } = useAuth();
    const [selectedRole, setSelectedRole] = useState<'admin' | 'doctor' | 'nurse' | 'patient'>('admin');
    const [isLoading, setIsLoading] = useState(false);

    const handleSimulatedLogin = async (mockUser: any) => {
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: `${mockUser.id}@intellicare.demo`, password: 'password123' })
            });
            const data = await res.json();
            login({ ...mockUser }, data.token);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="relative min-h-screen flex items-center justify-center p-4 selection:bg-indigo-500/30 overflow-hidden">
                {/* ── Background Layer ────────────────────────────────────────── */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] scale-110 motion-safe:animate-slow-zoom"
                    style={{ backgroundImage: 'url("/login-bg.png")' }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-slate-900/60 backdrop-brightness-90" />

                {/* ── Glass Container ─────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="relative w-full max-w-xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 border border-white/40 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] rounded-[2.5rem] overflow-hidden"
                >
                    <div className="pt-10 pb-8 px-6 sm:px-12 text-center">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="mx-auto flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-indigo-500/20 shadow-lg mb-6 ring-4 ring-white/50"
                        >
                            <HeartPulse className="w-9 h-9 text-white" />
                        </motion.div>

                        <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                            IntelliCare
                        </h1>
                        <p className="text-slate-600 font-medium tracking-wide text-sm opacity-80 uppercase">
                            Clinical Intelligence System
                        </p>
                    </div>

                    <div className="px-6 sm:px-12 pb-12">
                        {/* Role Selector */}
                        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl gap-1 mb-8 border border-white/50">
                            <RoleTab role="admin" icon={<Shield size={18} />} label="Admin" selected={selectedRole} onClick={setSelectedRole} />
                            <RoleTab role="doctor" icon={<Stethoscope size={18} />} label="Doctor" selected={selectedRole} onClick={setSelectedRole} />
                            <RoleTab role="nurse" icon={<Activity size={18} />} label="Nurse" selected={selectedRole} onClick={setSelectedRole} />
                            <RoleTab role="patient" icon={<UserIcon size={18} />} label="Patient" selected={selectedRole} onClick={setSelectedRole} />
                        </div>

                        {/* Login Options with Animation */}
                        <div className="min-h-[180px]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedRole}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    className="space-y-3"
                                >
                                    {selectedRole === 'admin' && (
                                        <LoginOption
                                            title="System Administrator"
                                            desc="Central hub, user analytics & RBAC"
                                            icon={<Shield className="text-indigo-600" />}
                                            onClick={() => handleSimulatedLogin({ id: 'a1', name: 'Super Admin', role: 'admin' })}
                                            loading={isLoading}
                                        />
                                    )}
                                    {selectedRole === 'doctor' && (
                                        <>
                                            <LoginOption
                                                title="Dr. Sarah Connor"
                                                desc="Cardiology • Ward A-12 Supervisor"
                                                icon={<Stethoscope className="text-indigo-600" />}
                                                onClick={() => handleSimulatedLogin({ id: 'd1', name: 'Dr. Sarah Connor', role: 'doctor' })}
                                                loading={isLoading}
                                            />
                                            <LoginOption
                                                title="Dr. Vikram Nair"
                                                desc="Internal Medicine • On-Call"
                                                icon={<Stethoscope className="text-indigo-600" />}
                                                onClick={() => handleSimulatedLogin({ id: 'd2', name: 'Dr. Vikram Nair', role: 'doctor' })}
                                                loading={isLoading}
                                            />
                                        </>
                                    )}
                                    {selectedRole === 'nurse' && (
                                        <LoginOption
                                            title="Nurse Clara"
                                            desc="Critical Care Unit • Shift A"
                                            icon={<Activity className="text-indigo-600" />}
                                            onClick={() => handleSimulatedLogin({ id: 'n1', name: 'Nurse Clara', role: 'nurse' })}
                                            loading={isLoading}
                                        />
                                    )}
                                    {selectedRole === 'patient' && (
                                        <>
                                            <LoginOption
                                                title="Rajesh Kumar"
                                                desc="Active Recovery • Bed GEN-01"
                                                icon={<UserIcon className="text-indigo-600" />}
                                                onClick={() => handleSimulatedLogin({ id: 'p1', name: 'Rajesh Kumar', role: 'patient', patientId: '1' })}
                                                loading={isLoading}
                                            />
                                            <LoginOption
                                                title="Sunita Devi"
                                                desc="Active Recovery • Bed GEN-02"
                                                icon={<UserIcon className="text-indigo-600" />}
                                                onClick={() => handleSimulatedLogin({ id: 'p2', name: 'Sunita Devi', role: 'patient', patientId: '2' })}
                                                loading={isLoading}
                                            />
                                        </>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer Info */}
                        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-slate-500 font-bold uppercase tracking-widest opacity-60">
                            <span className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5" /> Secure Demo Access</span>
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            <span>v2.4.0-Clinical</span>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return <Shell>{children}</Shell>;
}

function RoleTab({ role, icon, label, selected, onClick }: any) {
    const isSelected = role === selected;
    return (
        <button
            onClick={() => onClick(role)}
            className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-3 rounded-[1rem] transition-all duration-300",
                isSelected
                    ? "bg-white text-indigo-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)] scale-100"
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/40 scale-95"
            )}
        >
            <div className={cn("mb-1 transition-transform", isSelected ? "scale-110" : "scale-100")}>{icon}</div>
            <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
            {isSelected && (
                <motion.div
                    layoutId="role-pill"
                    className="absolute inset-0 border-2 border-indigo-500/20 rounded-[1rem]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
            )}
        </button>
    )
}

function LoginOption({ title, desc, icon, onClick, loading }: any) {
    return (
        <motion.div
            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.9)' }}
            whileTap={{ scale: 0.98 }}
            onClick={loading ? undefined : onClick}
            className={cn(
                "p-4 bg-white/50 border border-white/60 rounded-2xl transition-all cursor-pointer group flex items-center gap-4",
                loading ? "opacity-50 pointer-events-none" : "hover:border-indigo-400/50 hover:shadow-xl hover:shadow-indigo-500/10"
            )}
        >
            <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors truncate">{title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">{desc}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-600 flex items-center justify-center transition-all group-hover:rotate-[-45deg]">
                {loading
                    ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    : <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                }
            </div>
        </motion.div>
    )
}
