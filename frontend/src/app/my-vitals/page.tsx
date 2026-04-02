"use client";

import React from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { useAuth } from '../../contexts/AuthContext';
import {
    Activity,
    Heart,
    Thermometer,
    Droplets,
    ArrowLeft,
    Info
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { cn } from '../../lib/utils';
import Link from 'next/link';

export default function MyVitalsPage() {
    const { patients, vitalsHistory } = useSimulation();
    const { currentUser } = useAuth();

    const myAdmissionId = currentUser?.patientId || '1';
    const myVitals = vitalsHistory[myAdmissionId] || [];
    const latestVitals = myVitals[myVitals.length - 1];
    const myPatient = patients.find(p => p.id === myAdmissionId) || patients[0];

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full">

            <div className="flex items-center gap-4">
                <Link href="/" className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Live Vitals Monitoring</h1>
                    <p className="text-slate-500 font-medium capitalize">Monitoring for Patient ID: {myAdmissionId} • {myPatient?.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <VitalCard
                    label="Heart Rate"
                    value={latestVitals?.heartRate || '--'}
                    unit="bpm"
                    icon={<Heart className="w-5 h-5" />}
                    color="text-rose-600"
                    bg="bg-rose-50"
                    status={latestVitals?.heartRate > 100 || latestVitals?.heartRate < 60 ? 'Warning' : 'Normal'}
                />
                <VitalCard
                    label="Blood Pressure"
                    value={latestVitals ? `${latestVitals.bloodPressure.systolic}/${latestVitals.bloodPressure.diastolic}` : '--'}
                    unit="mmHg"
                    icon={<Activity className="w-5 h-5" />}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                    status={latestVitals?.bloodPressure.systolic > 140 ? 'High' : 'Normal'}
                />
                <VitalCard
                    label="Oxygen Saturation"
                    value={latestVitals?.oxygenLevel || '--'}
                    unit="%"
                    icon={<Droplets className="w-5 h-5" />}
                    color="text-blue-600"
                    bg="bg-blue-50"
                    status={latestVitals?.oxygenLevel < 95 ? 'Low' : 'Normal'}
                />
                <VitalCard
                    label="Body Temp"
                    value={latestVitals?.temperature || '--'}
                    unit="°C"
                    icon={<Thermometer className="w-5 h-5" />}
                    color="text-orange-600"
                    bg="bg-orange-50"
                    status={latestVitals?.temperature > 37.5 ? 'Fever' : 'Normal'}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        Heart Rate Trend
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={myVitals}>
                                <defs>
                                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="timestamp" hide />
                                <YAxis domain={['auto', 'auto']} fontSize={11} stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                    labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                                />
                                <Area type="monotone" dataKey="heartRate" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHr)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        Oxygen Level (SpO2)
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={myVitals}>
                                <defs>
                                    <linearGradient id="colorO2" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="timestamp" hide />
                                <YAxis domain={[85, 100]} fontSize={11} stroke="#94a3b8" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                                    labelFormatter={(t) => new Date(t).toLocaleTimeString()}
                                />
                                <Area type="monotone" dataKey="oxygenLevel" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorO2)" isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
                <div className="relative z-10 max-w-xl">
                    <h2 className="text-2xl font-bold mb-2">Clinical Note</h2>
                    <p className="text-slate-400 text-sm leading-relaxed">Your vitals are being monitored in real-time by the IntelliCare Clinical Engine. Any deviation from your baseline will immediately notify the attending nursing staff and your physician.</p>
                </div>
                <div className="relative z-10 flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur">
                    <Info className="w-4 h-4 text-slate-300" />
                    <span className="text-xs font-medium text-slate-200 italic">Continuous Telemetry Active</span>
                </div>
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
            </div>

        </div>
    );
}

function VitalCard({ label, value, unit, icon, color, bg, status }: any) {
    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-2 rounded-xl", bg, color)}>{icon}</div>
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    status === 'Normal' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                )}>{status}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-slate-800">{value}</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{unit}</span>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-2">{label}</p>
        </div>
    );
}
