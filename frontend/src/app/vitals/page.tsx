"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity, HeartPulse, Thermometer, Wind, BedDouble,
  Clock4, ShieldAlert, Zap, Maximize2, RefreshCw,
  Search, Filter, LayoutGrid, List, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, LineChart, Line
} from 'recharts';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

// ── Types ───────────────────────────────────────────────────────────────────
interface Patient {
  id: string;
  patient_id: number;
  name: string;
  age: number;
  ward: string;
  bed: string;
  riskScore: string;
  avatarUrl: string;
  diagnosis: string;
}

interface VitalsData {
  timestamp: string;
  heartRate: number;
  systolicBp: number;
  diastolicBp: number;
  oxygenLevel: number;
  temperature: number;
  ews: number;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function VitalsMonitor() {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<Record<string, VitalsData[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('detailed');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 1. Fetch Active Admissions
  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admissions?status=active`, { headers: ah() });
      if (res.ok) {
        const data = await res.json();
        const mapped: Patient[] = (data.data?.rows || data.rows || []).map((a: any) => ({
          id: String(a.id),
          patient_id: a.patient_id,
          name: a.patient_name,
          age: new Date().getFullYear() - new Date(a.date_of_birth).getFullYear(),
          ward: a.ward_name || 'Unassigned',
          bed: a.bed_number || 'Waitlist',
          diagnosis: a.diagnosis || 'Fever Observation',
          riskScore: a.risk_category || 'low',
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(a.patient_name)}&background=random`
        }));
        setPatients(mapped);
        if (mapped.length > 0 && !selectedPatient) {
          setSelectedPatient(mapped[0]);
        }
      }
    } catch (_) { }
    setLoading(false);
  }, [selectedPatient]);

  // 2. Fetch Vitals History for selected patient
  const fetchVitals = useCallback(async (p: Patient) => {
    try {
      const res = await fetch(`${API}/vitals/${p.patient_id}?limit=60`, { headers: ah() });
      if (res.ok) {
        const data = await res.json();
        const mapped: VitalsData[] = (data.data || []).map((v: any) => ({
          timestamp: v.recorded_at,
          heartRate: Number(v.heart_rate),
          systolicBp: Number(v.systolic_bp),
          diastolicBp: Number(v.diastolic_bp),
          oxygenLevel: Number(v.spo2),
          temperature: Number(v.temperature),
          ews: Number(v.ews_score || 0)
        })).reverse();
        setVitalsHistory(prev => ({ ...prev, [p.id]: mapped }));
        setLastUpdate(new Date());
      }
    } catch (_) { }
  }, []);

  // Sync Loops
  useEffect(() => {
    fetchPatients();
    const id = setInterval(fetchPatients, 10000);
    return () => clearInterval(id);
  }, [fetchPatients]);

  useEffect(() => {
    if (!selectedPatient) return;
    fetchVitals(selectedPatient);
    const id = setInterval(() => fetchVitals(selectedPatient), 5000); // 5s for real-time feel
    return () => clearInterval(id);
  }, [selectedPatient, fetchVitals]);

  // Filtered List
  const filteredPatients = useMemo(() => {
    return patients.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ward.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

  const latestVitals = selectedPatient ? vitalsHistory[selectedPatient.id]?.slice(-1)[0] : null;

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden">

      {/* ── Sidebar: Patient Command ────────────────────────────────────────── */}
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 tracking-tighter">Vital Monitor</h2>
            <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
              Live
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
          <AnimatePresence>
            {filteredPatients.map((p) => (
              <PatientSidebarCard
                key={p.id}
                patient={p}
                isSelected={selectedPatient?.id === p.id}
                onClick={() => setSelectedPatient(p)}
                vitals={vitalsHistory[p.id]?.slice(-1)[0]}
              />
            ))}
          </AnimatePresence>
          {loading && (
            <div className="py-10 text-center"><RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-300" /></div>
          )}
        </div>
      </aside>

      {/* ── Main Canvas ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <AnimatePresence mode="wait">
          {selectedPatient ? (
            <motion.div
              key={selectedPatient.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar"
            >
              {/* Patient Header Card */}
              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 transition-transform group-hover:scale-110 duration-700" />

                <div className="flex items-center gap-6 relative z-10">
                  <div className="relative">
                    <img
                      src={selectedPatient.avatarUrl}
                      className="w-24 h-24 rounded-[2rem] border-2 border-white shadow-xl bg-slate-100 object-cover"
                      alt=""
                    />
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white shadow-lg",
                      selectedPatient.riskScore === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'
                    )}>
                      <ShieldAlert className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{selectedPatient.name}</h1>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <BedDouble className="w-4 h-4 text-indigo-500" /> {selectedPatient.ward} · {selectedPatient.bed}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <Clock4 className="w-4 h-4" /> {selectedPatient.age} Yrs
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                        Diagnosis: {selectedPatient.diagnosis}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 z-10">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Telemetry Feed</p>
                    <p className="text-xs font-bold text-slate-600">Updated {lastUpdate.toLocaleTimeString()}</p>
                  </div>
                  <div className={cn(
                    "px-6 py-2 rounded-2xl border text-sm font-black uppercase tracking-widest shadow-sm",
                    selectedPatient.riskScore === 'critical' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  )}>
                    Status: {selectedPatient.riskScore}
                  </div>
                </div>
              </div>

              {/* Vitals Grid with Glowing Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0">
                <VitalCard
                  label="Heart Rate"
                  value={latestVitals?.heartRate || '—'}
                  unit="BPM"
                  icon={<HeartPulse className="w-6 h-6" />}
                  color="rose"
                  data={vitalsHistory[selectedPatient.id]?.map(v => ({ val: v.heartRate }))}
                  trend={getTrend(vitalsHistory[selectedPatient.id]?.map(v => v.heartRate))}
                />
                <VitalCard
                  label="Oxygen Saturation"
                  value={latestVitals?.oxygenLevel || '—'}
                  unit="%"
                  icon={<Wind className="w-6 h-6" />}
                  color="sky"
                  data={vitalsHistory[selectedPatient.id]?.map(v => ({ val: v.oxygenLevel }))}
                  trend={getTrend(vitalsHistory[selectedPatient.id]?.map(v => v.oxygenLevel))}
                />
                <VitalCard
                  label="Blood Pressure"
                  value={latestVitals ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}` : '—'}
                  unit="mmHg"
                  icon={<Activity className="w-6 h-6" />}
                  color="indigo"
                  data={vitalsHistory[selectedPatient.id]?.map(v => ({ val: v.systolicBp }))}
                  trend={getTrend(vitalsHistory[selectedPatient.id]?.map(v => v.systolicBp))}
                />
                <VitalCard
                  label="Core Temperature"
                  value={latestVitals?.temperature?.toFixed(1) || '—'}
                  unit="°C"
                  icon={<Thermometer className="w-6 h-6" />}
                  color="orange"
                  data={vitalsHistory[selectedPatient.id]?.map(v => ({ val: v.temperature }))}
                  trend={getTrend(vitalsHistory[selectedPatient.id]?.map(v => v.temperature))}
                />
              </div>

              {/* Big High-Res Clinical Chart */}
              <div className="flex-1 min-h-[500px] bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Clinical Telemetry Trend</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1">Multi-vector analysis of cardiac and pulmonary stability</p>
                  </div>
                  <div className="flex gap-4">
                    <LegendItem label="Heart Rate" color="#f43f5e" />
                    <LegendItem label="SpO2 Sat." color="#0ea5e9" />
                  </div>
                </div>

                <div className="flex-1 w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={vitalsHistory[selectedPatient.id]}>
                      <defs>
                        <linearGradient id="g-hr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="g-sat" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.1} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="5 5" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        hide
                      />
                      <YAxis yAxisId="left" stroke="#f43f5e" fontSize={11} fontWeight="800" axisLine={false} tickLine={false} tickMargin={10} domain={[40, 180]} />
                      <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" fontSize={11} fontWeight="800" axisLine={false} tickLine={false} tickMargin={10} domain={[85, 100]} />
                      <Tooltip
                        content={<CustomTooltip />}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="heartRate"
                        stroke="#f43f5e"
                        strokeWidth={4}
                        fill="url(#g-hr)"
                        isAnimationActive={false}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#f43f5e' }}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="oxygenLevel"
                        stroke="#0ea5e9"
                        strokeWidth={4}
                        fill="url(#g-sat)"
                        isAnimationActive={false}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#0ea5e9' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden opacity-5">
                  <Activity className="absolute -right-20 -bottom-20 w-[600px] h-[600px] text-indigo-500" />
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
              <Zap className="w-16 h-16 opacity-20 mb-4 animate-pulse" />
              <p className="font-black uppercase tracking-[0.2em] text-sm">Awaiting Selection</p>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// ── Components ──────────────────────────────────────────────────────────────

function PatientSidebarCard({ patient, isSelected, onClick, vitals }: { patient: Patient, isSelected: boolean, onClick: () => void, vitals?: VitalsData }) {
  const isCritical = patient.riskScore === 'critical' || (vitals?.heartRate && (vitals.heartRate > 120 || vitals.heartRate < 50));

  return (
    <motion.button
      layout
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-2xl border flex items-center gap-4 transition-all duration-300 relative overflow-hidden group mb-1",
        isSelected
          ? "bg-indigo-600 border-indigo-700 shadow-lg shadow-indigo-600/20 text-white"
          : "bg-white border-slate-100 hover:border-slate-300 shadow-sm text-slate-800"
      )}
    >
      <div className="relative shrink-0">
        <img src={patient.avatarUrl} className="w-12 h-12 rounded-xl border-2 border-white/20 object-cover shadow-sm" alt="" />
        {(isCritical) && (
          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 border-2 border-white rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          </div>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={cn("text-sm font-black truncate", isSelected ? "text-white" : "text-slate-900")}>{patient.name}</p>
        <p className={cn("text-[10px] font-bold uppercase tracking-widest truncate mt-0.5 opacity-60", isSelected ? "text-indigo-100" : "text-slate-500")}>
          {patient.ward} · {patient.bed}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-xs font-black", isSelected ? "text-indigo-100" : "text-indigo-600")}>{vitals?.heartRate || '--'} <span className="text-[8px] opacity-60">HR</span></p>
        <p className={cn("text-xs font-black", isSelected ? "text-indigo-100" : "text-sky-600")}>{vitals?.oxygenLevel || '--'} <span className="text-[8px] opacity-60">O2</span></p>
      </div>

      {isSelected && (
        <motion.div
          layoutId="spark"
          className="absolute inset-0 bg-white/5 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
    </motion.button>
  );
}

function VitalCard({ label, value, unit, icon, color, data, trend }: {
  label: string; value: string | number; unit: string; icon: React.ReactNode;
  color: 'rose' | 'sky' | 'indigo' | 'orange'; data?: any[]; trend?: 'up' | 'down' | 'stable'
}) {
  const colors = {
    rose: "from-rose-500 to-rose-600 text-rose-500 shadow-rose-500/20 bg-rose-50",
    sky: "from-sky-500 to-sky-600 text-sky-500 shadow-sky-500/20 bg-sky-50",
    indigo: "from-indigo-500 to-indigo-600 text-indigo-500 shadow-indigo-500/20 bg-indigo-50",
    orange: "from-orange-500 to-orange-600 text-orange-500 shadow-orange-500/20 bg-orange-50"
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", colors[color].split(' ')[3])}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">{label}</p>
          {trend && (
            <div className={cn(
              "text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded uppercase inline-block",
              trend === 'down' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {trend}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-2 relative z-10">
        <span className="text-5xl font-black text-slate-900 tracking-tighter">{value}</span>
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{unit}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-24 opacity-[0.05] pointer-events-none overflow-hidden group-hover:opacity-[0.1] transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <YAxis hide domain={['auto', 'auto']} />
            <Area type="monotone" dataKey="val" stroke={color === 'rose' ? '#f43f5e' : color === 'sky' ? '#0ea5e9' : color === 'indigo' ? '#6366f1' : '#f97316'} fill={color === 'rose' ? '#f43f5e' : color === 'sky' ? '#0ea5e9' : color === 'indigo' ? '#6366f1' : '#f97316'} strokeWidth={0} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendItem({ label, color }: { label: string, color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 backdrop-blur-md">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">Telemetry Snap</p>
        <div className="space-y-2">
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <span className="text-xs font-bold" style={{ color: p.color }}>{p.name}:</span>
              <span className="text-sm font-black">{p.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function getTrend(data?: number[]) {
  if (!data || data.length < 5) return undefined;
  const last = data[data.length - 1];
  const prev = data[data.length - 5];
  if (last > prev + 2) return 'up';
  if (last < prev - 2) return 'down';
  return 'stable';
}
