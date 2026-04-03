"use client";

import React from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { Users, Activity, TrendingUp, AlertTriangle, ShieldCheck, Database, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function AdminHubPage() {
  const { patients, alerts } = useSimulation();

  const metrics = {
    totalPatients: patients.length,
    criticalCount: patients.filter(p => p.riskScore === 'Critical').length,
    activeAlerts: alerts.filter(a => !a.resolved).length,
    dbLatency: '14ms',
    uptime: '99.99%',
    cpuUsage: '28%'
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 overflow-hidden">
        <div className="relative">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Systems Admin Hub</h1>
          <p className="text-slate-500 text-lg">Hospital-wide intelligence overview and system health.</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
           <ShieldCheck className="w-5 h-5" /> Admin Privileges Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid grid-cols-2 gap-6">
          <AdminStatCard title="Total Admitted" value={metrics.totalPatients} icon={<Users />} color="blue" />
          <AdminStatCard title="Critical Queue" value={metrics.criticalCount} icon={<Activity />} color="rose" pulse={metrics.criticalCount > 0} />
          <AdminStatCard title="Active Incidents" value={metrics.activeAlerts} icon={<AlertTriangle />} color="amber" pulse={metrics.activeAlerts > 0} />
          <AdminStatCard title="System Uptime" value={metrics.uptime} icon={<TrendingUp />} color="emerald" />
        </div>

        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
           <div className="relative z-10">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-indigo-200"><Server className="w-5 h-5"/> Backend Telemetry</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10 text-sm">
                    <span className="text-slate-400">Database Latency</span>
                    <span className="font-bold text-emerald-400 font-mono">{metrics.dbLatency}</span>
                 </div>
                 <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10 text-sm">
                    <span className="text-slate-400">Sim Polling Rate</span>
                    <span className="font-bold text-indigo-300 font-mono">3000ms</span>
                 </div>
                 <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10 text-sm">
                    <span className="text-slate-400">CPU Usage</span>
                    <span className="font-bold text-amber-300 font-mono">{metrics.cpuUsage}</span>
                 </div>
              </div>
           </div>
           <Database className="absolute -right-10 -bottom-10 w-48 h-48 text-white/5 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-6 flex justify-between items-center">
           <h3 className="font-bold text-slate-800 text-lg">Hospital Bed Heatmap</h3>
           <span className="text-sm font-medium text-slate-500">Live Occupation</span>
        </div>
        <div className="p-6">
           <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Array.from({length: 20}).map((_, i) => {
                 const bedName = `ICU-${i+1 < 10 ? '0'+(i+1) : (i+1)}`;
                 const occupant = patients.find(p => p.bed === bedName) || patients[i % patients.length]; // Fake populate for demo
                 const isOccupied = i < metrics.totalPatients;
                 const isCrit = isOccupied && Math.random() > 0.8;

                 return (
                    <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       transition={{ delay: i * 0.02 }}
                       key={i} 
                       className={cn(
                          "h-24 rounded-2xl flex flex-col items-center justify-center border font-bold text-sm",
                          !isOccupied ? "bg-slate-50 border-slate-200 text-slate-400 border-dashed" :
                          isCrit ? "bg-rose-50 border-rose-200 text-rose-700 shadow-sm" :
                          "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                       )}
                    >
                       <span>{bedName}</span>
                       {isOccupied && <span className="text-[10px] font-medium opacity-70 mt-1">{isCrit ? 'Critical' : 'Stable'}</span>}
                    </motion.div>
                 )
              })}
           </div>
        </div>
      </div>
    </div>
  );
}

function AdminStatCard({ title, value, icon, color, pulse }: any) {
  const styles: any = {
     blue: 'bg-blue-50 border-blue-100 text-blue-600',
     rose: 'bg-rose-50 border-rose-100 text-rose-600',
     amber: 'bg-amber-50 border-amber-100 text-amber-600',
     emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
  };
  
  return (
     <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between overflow-hidden relative group">
        <div className="flex justify-between items-start mb-4 relative z-10">
           <span className="font-semibold text-slate-500 text-sm">{title}</span>
           <div className={cn("p-2 rounded-xl", styles[color])}>
              {icon}
           </div>
        </div>
        <div className="flex items-center gap-3 relative z-10">
           <span className="text-4xl font-extrabold text-slate-800 tracking-tight">{value}</span>
           {pulse && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />}
        </div>
        <div className={cn("absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none transition-all group-hover:scale-150", styles[color].split(' ')[0])} />
     </div>
  )
}
