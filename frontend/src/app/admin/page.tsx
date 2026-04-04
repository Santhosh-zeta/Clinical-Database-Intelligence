"use client";

import React, { useEffect, useState } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { Users, Activity, TrendingUp, AlertTriangle, ShieldCheck, Database, Server, BedDouble, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

interface BedStatus {
  bed_id: number;
  bed_number: string;
  ward_name: string;
  ward_type: string;
  is_occupied: boolean;
  is_icu: boolean;
  patient_name?: string;
  risk_category?: string;
  risk_score?: number;
  admission_id?: number;
}

export default function AdminHubPage() {
  const { patients, alerts } = useSimulation();
  const [bedStatuses, setBedStatuses] = useState<BedStatus[]>([]);
  const [bedLoading, setBedLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const metrics = {
    totalPatients: patients.length,
    criticalCount: patients.filter(p => p.riskScore === 'Critical').length,
    activeAlerts: alerts.filter(a => !a.resolved).length,
    dbLatency: '14ms',
    uptime: '99.99%',
    cpuUsage: '28%'
  };

  // ── Fetch real bed status from backend ─────────────────────────────────
  const fetchBedStatus = async () => {
    setBedLoading(true);
    try {
      const res = await fetch(`${API}/admin/bed-status`, { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setBedStatuses(data.data || []);
        setLastRefreshed(new Date());
      }
    } catch (_) {}
    setBedLoading(false);
  };

  useEffect(() => {
    fetchBedStatus();
    const id = setInterval(fetchBedStatus, 15000); // refresh every 15s
    return () => clearInterval(id);
  }, []);

  // Group beds by ward (if available), otherwise show flat list
  const bedsByWard = bedStatuses.reduce<Record<string, BedStatus[]>>((acc, bed) => {
    const ward = bed.ward_name || 'General';
    if (!acc[ward]) acc[ward] = [];
    acc[ward].push(bed);
    return acc;
  }, {});

  const wardNames = Object.keys(bedsByWard);

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
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-indigo-200"><Server className="w-5 h-5" /> Backend Telemetry</h3>
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

      {/* ── Real Bed Status Heatmap ─────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-6 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-indigo-500" /> Hospital Bed Status
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {lastRefreshed ? `Live — Last updated: ${lastRefreshed.toLocaleTimeString()}` : 'Loading live data...'}
            </p>
          </div>
          <button
            onClick={fetchBedStatus}
            disabled={bedLoading}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', bedLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        <div className="p-6">
          {bedLoading && bedStatuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">Fetching live bed status from database...</p>
            </div>
          ) : bedStatuses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <BedDouble className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No bed data available. Make sure the backend is running.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {wardNames.map(wardName => (
                <div key={wardName}>
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-sm font-extrabold text-slate-600 uppercase tracking-widest">{wardName}</h4>
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-xs text-slate-400 font-medium">
                      {bedsByWard[wardName].filter(b => b.is_occupied).length} / {bedsByWard[wardName].length} occupied
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-2.5">
                    {bedsByWard[wardName].map((bed, i) => {
                      const isCritical = bed.risk_category === 'critical' || bed.risk_category === 'high';
                      const isIcu = bed.is_icu;
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.015 }}
                          key={bed.bed_id || i}
                          title={bed.is_occupied ? `${bed.patient_name || 'Patient'} — ${bed.risk_category || 'stable'}` : 'Available'}
                          className={cn(
                            'h-20 rounded-2xl flex flex-col items-center justify-center border font-bold text-xs cursor-default transition-all hover:scale-105 hover:shadow-md',
                            !bed.is_occupied
                              ? 'bg-slate-50 border-slate-200 text-slate-400 border-dashed'
                              : isCritical
                              ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm shadow-rose-100'
                              : isIcu
                              ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                          )}
                        >
                          <span className="truncate max-w-full px-1 text-center">{bed.bed_number || `B${i + 1}`}</span>
                          {bed.is_occupied && (
                            <span className={cn(
                              'text-[9px] font-bold mt-1 uppercase tracking-wide',
                              isCritical ? 'text-rose-500' : 'text-indigo-500'
                            )}>
                              {bed.risk_category || 'stable'}
                            </span>
                          )}
                          {!bed.is_occupied && (
                            <span className="text-[9px] font-medium opacity-60 mt-1">Free</span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          {bedStatuses.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Legend:</span>
              <LegendDot color="bg-slate-200 border-dashed" label="Available" />
              <LegendDot color="bg-indigo-200 border-indigo-300" label="Occupied — Stable" />
              <LegendDot color="bg-amber-200 border-amber-300" label="ICU" />
              <LegendDot color="bg-rose-200 border-rose-300" label="Critical / High Risk" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-4 h-4 rounded-md border', color)} />
      <span className="text-xs text-slate-500 font-medium">{label}</span>
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
        <div className={cn('p-2 rounded-xl', styles[color])}>{icon}</div>
      </div>
      <div className="flex items-center gap-3 relative z-10">
        <span className="text-4xl font-extrabold text-slate-800 tracking-tight">{value}</span>
        {pulse && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />}
      </div>
      <div className={cn('absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20 pointer-events-none transition-all group-hover:scale-150', styles[color].split(' ')[0])} />
    </div>
  );
}
