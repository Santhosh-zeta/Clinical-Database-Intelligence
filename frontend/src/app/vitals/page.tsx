"use client";

import React, { useState } from 'react';
import { 
  Activity, 
  HeartPulse, 
  Thermometer, 
  Wind, 
  BedDouble,
  Clock4
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { useSimulation } from '../../contexts/SimulationContext';
import { Patient, RiskLevel } from '../../lib/types';
import { cn } from '../../lib/utils';
import { RiskBadge } from '../../components/ui/RiskBadge';

export default function VitalsMonitor() {
  const { patients, vitalsHistory } = useSimulation();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patients[0]);
  
  return (
    <div className="p-6 h-full flex flex-col lg:flex-row gap-6">
      {/* Left Column: Patients List */}
      <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col gap-4 sticky top-0 custom-scrollbar pr-2 lg:border-r border-slate-200/60 lg:pr-6">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight px-1">Active Patients</h2>
        <div className="flex flex-col gap-3 overflow-y-auto pb-6 flex-1 h-[calc(100vh-140px)] custom-scrollbar">
          {patients.map(p => {
             const history = vitalsHistory[p.id];
             const latest = history ? history[history.length - 1] : undefined;
             return (
              <PatientCard 
                key={p.id} 
                patient={p} 
                isActive={selectedPatient?.id === p.id}
                onClick={() => setSelectedPatient(p)}
                latestVitals={latest}
              />
            )
          })}
        </div>
      </div>

      {/* Right Column: Vitals Overview */}
      <div className="flex-1 flex flex-col gap-6 w-full lg:pl-2">
        {selectedPatient && vitalsHistory[selectedPatient.id] ? (
          <>
            <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center shadow-[0_4px_30px_rgba(0,0,0,0.03)] relative overflow-hidden shrink-0 group">
              {/* Soft decorative background gradient mapped to risk */}
              <div className={cn(
                  "absolute inset-0 opacity-[0.03] transition-colors duration-500",
                  selectedPatient.riskScore === 'Critical' ? 'bg-rose-500' : 
                  selectedPatient.riskScore === 'High' ? 'bg-orange-500' : 
                  selectedPatient.riskScore === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
              )} />
              
              <div className="flex items-center gap-5 z-10 w-full">
                 <div className="relative">
                    <img src={selectedPatient.avatarUrl} alt={selectedPatient.name} className="w-20 h-20 rounded-2xl border flex-shrink-0 object-cover shadow-sm bg-slate-50 border-slate-200" />
                    {selectedPatient.riskScore === 'Critical' && (
                       <span className="absolute -bottom-2 -right-2 bg-rose-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Critical
                       </span>
                    )}
                 </div>
                 <div className="flex-1">
                   <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{selectedPatient.name}</h1>
                   <div className="flex flex-wrap items-center gap-4 text-sm font-semibold mt-2">
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
                          <BedDouble className="w-4 h-4 text-indigo-500"/> {selectedPatient.ward} - {selectedPatient.bed}
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-500">
                          <Clock4 className="w-4 h-4"/> {selectedPatient.age} yrs
                      </span>
                   </div>
                 </div>
              </div>
              <div className="mt-6 md:mt-0 z-10 hidden sm:block">
                 <RiskBadge score={selectedPatient.riskScore} />
              </div>
            </div>

            {/* Vitals Grid */}
            {vitalsHistory[selectedPatient.id] && vitalsHistory[selectedPatient.id].length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 shrink-0">
              <VitalStatCard 
                title="Heart Rate" 
                value={vitalsHistory[selectedPatient.id][vitalsHistory[selectedPatient.id].length - 1].heartRate} 
                unit="bpm" 
                icon={<HeartPulse className="text-rose-500 w-5 h-5" />} 
                data={vitalsHistory[selectedPatient.id].map(v => ({ time: v.timestamp, val: v.heartRate }))}
                color="#f43f5e"
              />
              <VitalStatCard 
                title="Blood Pressure" 
                value={`${vitalsHistory[selectedPatient.id][vitalsHistory[selectedPatient.id].length - 1].bloodPressure.systolic}/${vitalsHistory[selectedPatient.id][vitalsHistory[selectedPatient.id].length - 1].bloodPressure.diastolic}`} 
                unit="mmHg" 
                icon={<Activity className="text-indigo-500 w-5 h-5" />} 
                data={vitalsHistory[selectedPatient.id].map(v => ({ time: v.timestamp, val: v.bloodPressure.systolic }))}
                color="#6366f1"
              />
              <VitalStatCard 
                title="Oxygen Level" 
                value={vitalsHistory[selectedPatient.id][vitalsHistory[selectedPatient.id].length - 1].oxygenLevel} 
                unit="SpO2 %" 
                icon={<Wind className="text-sky-500 w-5 h-5" />} 
                data={vitalsHistory[selectedPatient.id].map(v => ({ time: v.timestamp, val: v.oxygenLevel }))}
                color="#0ea5e9"
              />
              <VitalStatCard 
                title="Core Temp" 
                value={vitalsHistory[selectedPatient.id][vitalsHistory[selectedPatient.id].length - 1].temperature.toFixed(1)} 
                unit="°C" 
                icon={<Thermometer className="text-orange-500 w-5 h-5" />} 
                data={vitalsHistory[selectedPatient.id].map(v => ({ time: v.timestamp, val: v.temperature }))}
                color="#f97316"
              />
            </div>
            ) : (
                <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-8 text-center text-slate-400">
                    Waiting for initial telemetry data stream...
                </div>
            )}

            {/* Main Graph */}
            <div className="flex-1 min-h-[400px] lg:min-h-0 bg-white border border-slate-200/80 rounded-[2rem] p-6 lg:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)] flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center mb-8 shrink-0 relative z-10">
                <h3 className="text-xl font-bold text-slate-800">Advanced Telemetry</h3>
                <div className="flex items-center gap-4 text-xs font-semibold bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                    <span className="flex items-center gap-2 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span> HR History</span>
                    <span className="flex items-center gap-2 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]"></span> O2 Saturation</span>
                </div>
              </div>
              <div className="flex-1 min-h-0 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={vitalsHistory[selectedPatient.id]}>
                    <defs>
                      <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorO2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="timestamp" tickFormatter={(time) => time ? new Date(time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : ''} stroke="#94a3b8" fontSize={10} tickMargin={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" domain={['auto', 'auto']} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                    <YAxis yAxisId="right" orientation="right" domain={[80, 100]} stroke="#0ea5e9" fontSize={12} tickLine={false} axisLine={false} tickMargin={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#e2e8f0', borderRadius: '12px', color: '#0f172a', backdropFilter: 'blur(8px)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                      labelStyle={{ color: '#64748b', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}
                      labelFormatter={(label) => label ? new Date(label).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) : ''}
                    />
                    {/* Changed HR color to indigo for better light mode contrast instead of rose */}
                    <Area yAxisId="left" type="monotone" dataKey="heartRate" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHr)" isAnimationActive={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} name="HR (bpm)" />
                    <Area yAxisId="right" type="monotone" dataKey="oxygenLevel" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorO2)" isAnimationActive={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#0ea5e9' }} name="SpO2 (%)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 border-dashed rounded-[2rem]">
            <Activity className="w-12 h-12 text-slate-200 mb-4" />
            <p className="font-medium text-lg">Select a patient to view telemetry</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Subcomponents

function PatientCard({ patient, isActive, onClick, latestVitals }: { patient: Patient, isActive: boolean, onClick: () => void, latestVitals?: any }) {
  const isCritical = latestVitals?.heartRate && (latestVitals.heartRate > 120 || latestVitals.heartRate < 50);

  return (
    <motion.button 
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full text-left p-3.5 rounded-2xl border flex items-center justify-between transition-all shrink-0 group shadow-sm",
        isActive ? "bg-white border-indigo-200 shadow-[0_4px_20px_rgba(99,102,241,0.08)] ring-1 ring-indigo-100" : "bg-white border-slate-100/80 hover:bg-slate-50 hover:border-slate-200"
      )}
    >
      <div className="flex items-center gap-4 w-full">
         <div className="relative shrink-0">
            <img src={patient.avatarUrl} alt={patient.name} className="w-12 h-12 rounded-[10px] object-cover bg-slate-100 border border-slate-200 shadow-sm" />
            {isCritical && <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-500 border-2 border-white rounded-full animate-pulse z-10 shadow-sm" />}
         </div>
         <div className="flex-1 min-w-0 pr-2">
           <p className={cn("text-[15px] font-bold truncate transition-colors", isActive ? "text-indigo-900" : "text-slate-800 group-hover:text-indigo-600")}>{patient.name}</p>
           <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{patient.ward} <span className="mx-1">•</span> {patient.bed}</p>
         </div>
         <div className="shrink-0 pl-1 border-l border-slate-100">
             <ChevronRight className={cn("w-5 h-5", isActive ? "text-indigo-400" : "text-slate-300")} />
         </div>
      </div>
    </motion.button>
  );
}



function VitalStatCard({ title, value, unit, icon, data, color }: { title: string, value: string | number, unit: string, icon: React.ReactNode, data: any[], color: string }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all">
      <div className="flex justify-between items-start mb-3 relative z-10">
        <span className="text-[13px] text-slate-500 font-bold uppercase tracking-wider">{title}</span>
        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 relative z-10 mt-1">
        <span className="text-3xl font-extrabold text-slate-800 tracking-tighter">{value}</span>
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">{unit}</span>
      </div>
      
      {/* Mini Sparkline Background */}
      <div className="absolute inset-x-0 bottom-0 h-16 opacity-[0.08] transition-opacity group-hover:opacity-[0.15] pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <YAxis domain={['auto', 'auto']} hide />
            <Area type="monotone" dataKey="val" stroke={color} fill={color} strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"></polyline></svg>
}
