"use client";

import React, { useState } from 'react';
import { useAuth, User } from '../../contexts/AuthContext';
import { Shield, User as UserIcon, Activity, KeyRound, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Shell } from './Shell';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { currentUser, login } = useAuth();
    const [selectedRole, setSelectedRole] = useState<'admin' | 'doctor' | 'patient'>('admin');

    if (!currentUser) {
        // Render Login Screen
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500/20">
                <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                    <div className="mx-auto flex items-center justify-center p-3 bg-indigo-50 border border-indigo-100/50 rounded-2xl w-16 h-16 shadow-sm mb-4">
                        <Activity className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">IntelliCare Secure Access</h2>
                    <p className="mt-2 text-sm text-slate-500 font-medium">Select your portal role to continue</p>
                </div>

                <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
                    <div className="bg-white py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-3xl sm:px-10 border border-slate-200/60">
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            <RoleTab role="admin" icon={<Shield size={20} />} label="Admin" selected={selectedRole} onClick={setSelectedRole} />
                            <RoleTab role="doctor" icon={<UserIcon size={20} />} label="Doctor" selected={selectedRole} onClick={setSelectedRole} />
                            <RoleTab role="patient" icon={<Activity size={20} />} label="Patient" selected={selectedRole} onClick={setSelectedRole} />
                        </div>

                        <div className="space-y-4">
                            {selectedRole === 'admin' && (
                                <LoginOption
                                    title="System Administrator"
                                    desc="Full access to Command Center and RBAC settings"
                                    onClick={() => login({ id: 'a1', name: 'Super Admin', role: 'admin' })}
                                />
                            )}
                            {selectedRole === 'doctor' && (
                                <>
                                    <LoginOption
                                        title="Dr. Sarah Connor"
                                        desc="Chief Cardiologist - Access to Patient Directory"
                                        onClick={() => login({ id: 'd1', name: 'Dr. Sarah Connor', role: 'doctor' })}
                                    />
                                    <LoginOption
                                        title="Dr. Vikram Nair"
                                        desc="Attending Physician"
                                        onClick={() => login({ id: 'd2', name: 'Dr. Vikram Nair', role: 'doctor' })}
                                    />
                                </>
                            )}
                            {selectedRole === 'patient' && (
                                <>
                                    <LoginOption
                                        title="Rajesh Kumar"
                                        desc="Admitted: Fever • Room GEN-01"
                                        onClick={() => login({ id: 'p1', name: 'Rajesh Kumar', role: 'patient', patientId: '1' })}
                                    />
                                    <LoginOption
                                        title="Sunita Devi"
                                        desc="Admitted: Cough • Room GEN-02"
                                        onClick={() => login({ id: 'p2', name: 'Sunita Devi', role: 'patient', patientId: '2' })}
                                    />
                                </>
                            )}
                        </div>

                        <div className="mt-8 border-t border-slate-100 pt-6">
                            <div className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-100/50 rounded-2xl">
                                <KeyRound className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 leading-relaxed font-medium">Bypassing SSO via demo gateway. Your role dictates your layout views, telemetry access, and navigation boundaries.</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    // Render App if authenticated
    return (
        <Shell>
            {children}
        </Shell>
    );
}

function RoleTab({ role, icon, label, selected, onClick }: any) {
    const isSelected = role === selected;
    return (
        <button
            onClick={() => onClick(role)}
            className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl transition-all border",
                isSelected ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-[0_2px_10px_rgb(99,102,241,0.1)]" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200"
            )}
        >
            <div className="mb-1">{icon}</div>
            <span className="text-xs font-bold tracking-wide">{label}</span>
        </button>
    )
}

function LoginOption({ title, desc, onClick }: any) {
    return (
        <div onClick={onClick} className="p-4 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-2xl transition-all cursor-pointer group flex items-center justify-between">
            <div>
                <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{title}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{desc}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
            </div>
        </div>
    )
}
