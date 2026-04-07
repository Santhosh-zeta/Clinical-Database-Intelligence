"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Activity, AlertTriangle, BedDouble, Loader2, RefreshCw,
  ShieldCheck, Database, Server, TrendingUp, BarChart3, Settings,
  ChevronRight, CheckCircle2, XCircle, Clock, Stethoscope, ArrowUp, ArrowDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, AreaChart, Area, Legend
} from 'recharts';

const API = 'http://localhost:3001/api';
const tok = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' });

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'beds', label: 'Bed Status', icon: BedDouble },
  { id: 'wards', label: 'Ward Analytics', icon: BarChart3 },
  { id: 'staff', label: 'Staff Performance', icon: Stethoscope },
  { id: 'discharges', label: 'Discharge Trends', icon: TrendingUp },
  { id: 'alerts', label: 'Alert Centre', icon: AlertTriangle },
  { id: 'settings', label: 'System Settings', icon: Settings },
];

export default function AdminHubPage() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="flex flex-col gap-0 w-full max-w-7xl mx-auto px-6 md:px-8 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Systems Admin Hub</h1>
          <p className="text-slate-500 mt-1">Hospital-wide intelligence, bed management & system controls.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold">
          <ShieldCheck className="w-4 h-4" /> Admin Privileges Active
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-hide border-b border-slate-100">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all',
                active ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              )}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {tab === 'overview' && <OverviewTab />}
          {tab === 'beds' && <BedStatusTab />}
          {tab === 'wards' && <WardAnalyticsTab />}
          {tab === 'staff' && <StaffPerformanceTab />}
          {tab === 'discharges' && <DischargeTrendsTab />}
          {tab === 'alerts' && <AlertCentreTab />}
          {tab === 'settings' && <SystemSettingsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── OVERVIEW TAB ──────────────────────────────────────────────── */
function OverviewTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshed, setRefreshed] = useState<Date | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ew] = await Promise.all([
        fetch(`${API}/admin/dashboard`, { headers: ah() }),
        fetch(`${API}/admin/ews-summary`, { headers: ah() }),
      ]);
      if (s.ok) setStats((await s.json()).data);
      setRefreshed(new Date());
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); const id = setInterval(fetch_, 15000); return () => clearInterval(id); }, [fetch_]);

  const kpis = [
    { label: 'Active Admissions', value: stats?.active_admissions ?? '—', color: 'indigo', icon: Users, sub: `${stats?.discharged_today ?? 0} discharged today` },
    { label: 'Critical Patients', value: stats?.critical_patients ?? '—', color: 'rose', icon: Activity, sub: `${stats?.urgent_ews_patients ?? 0} EWS urgent`, pulse: true },
    { label: 'Unack. Alerts', value: stats?.unacknowledged_alerts ?? '—', color: 'amber', icon: AlertTriangle, sub: `${stats?.critical_alerts ?? 0} critical` },
    { label: 'ICU Beds Free', value: stats?.available_icu_beds ?? '—', color: 'emerald', icon: BedDouble, sub: `of ${stats?.total_icu_beds ?? 0} total` },
    { label: 'Active Staff', value: stats?.active_doctors ?? '—', color: 'violet', icon: Stethoscope, sub: 'on duty now' },
    { label: 'Total Patients', value: stats?.total_patients ?? '—', color: 'slate', icon: Database, sub: 'in registry' },
  ];

  const colorMap: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400 font-medium">{refreshed ? `Last updated: ${refreshed.toLocaleTimeString()}` : 'Loading…'}</p>
        <button onClick={fetch_} disabled={loading} className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{k.label}</span>
                <div className={cn('p-2 rounded-xl border', colorMap[k.color])}><Icon className="w-4 h-4" /></div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-extrabold text-slate-800">{loading ? '—' : k.value}</span>
                {k.pulse && parseInt(k.value) > 0 && <span className="w-2 h-2 mb-2 rounded-full bg-rose-500 animate-pulse" />}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Backend telemetry card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <h3 className="font-bold text-indigo-300 mb-4 flex items-center gap-2"><Server className="w-4 h-4" /> Backend Telemetry</h3>
          <div className="space-y-3">
            {[
              { k: 'API Status', v: 'Healthy', c: 'text-emerald-400' },
              { k: 'DB Connection', v: 'PostgreSQL · Connected', c: 'text-emerald-400' },
              { k: 'Auto-refresh', v: 'Every 15s', c: 'text-indigo-300' },
            ].map(r => (
              <div key={r.k} className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-2.5 border border-white/10">
                <span className="text-slate-400 text-sm">{r.k}</span>
                <span className={cn('text-sm font-bold font-mono', r.c)}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-indigo-300 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Patient Risk Mix</h3>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Critical', value: stats?.critical_patients ?? 0, color: 'bg-rose-500' },
              { label: 'EWS Urgent', value: stats?.urgent_ews_patients ?? 0, color: 'bg-orange-500' },
              { label: 'EWS High', value: stats?.high_ews_patients ?? 0, color: 'bg-amber-400' },
              { label: 'Stable', value: stats?.stable_patients ?? 0, color: 'bg-emerald-500' },
            ].map(r => {
              const total = parseInt(stats?.active_admissions || '1') || 1;
              const pct = Math.round((parseInt(r.value) / total) * 100);
              return (
                <div key={r.label}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{r.label}</span><span className="font-bold text-white">{r.value}</span></div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', r.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── BED STATUS TAB ────────────────────────────────────────────── */
function BedStatusTab() {
  const [beds, setBeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'occupied' | 'free' | 'icu'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/bed-status`, { headers: ah() });
      if (r.ok) setBeds((await r.json()).data || []);
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id); }, [load]);

  const byWard = beds.reduce<Record<string, any[]>>((acc, b) => {
    const w = b.ward_name || 'General';
    (acc[w] = acc[w] || []).push(b);
    return acc;
  }, {});

  const filtered = Object.fromEntries(
    Object.entries(byWard).map(([w, bs]) => [w, bs.filter(b =>
      filter === 'all' ? true : filter === 'occupied' ? b.is_occupied : filter === 'free' ? !b.is_occupied : b.is_icu
    )])
  );

  const occupied = beds.filter(b => b.is_occupied).length;
  const free = beds.length - occupied;
  const icu = beds.filter(b => b.is_icu).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div className="flex gap-3">
          <Stat label="Total" value={beds.length} color="text-slate-700" />
          <Stat label="Occupied" value={occupied} color="text-rose-600" />
          <Stat label="Free" value={free} color="text-emerald-600" />
          <Stat label="ICU" value={icu} color="text-amber-600" />
        </div>
        <div className="flex gap-2 items-center">
          {(['all', 'occupied', 'free', 'icu'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold capitalize border transition-all', filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')}>{f}</button>
          ))}
          <button onClick={load} disabled={loading} className="ml-2 p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /></button>
        </div>
      </div>

      {loading && beds.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-3"><Loader2 className="w-6 h-6 animate-spin" /> Loading beds…</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filtered).filter(([, bs]) => bs.length > 0).map(([ward, bs]) => (
            <div key={ward} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <h4 className="font-extrabold text-slate-700 text-sm uppercase tracking-widest">{ward}</h4>
                <span className="text-xs text-slate-400 font-medium">{bs.filter(b => b.is_occupied).length}/{bs.length} occupied</span>
              </div>
              <div className="p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {bs.map((bed, i) => {
                  const crit = bed.risk_category === 'critical' || bed.risk_category === 'high';
                  return (
                    <div key={bed.bed_id || i} title={bed.is_occupied ? `${bed.patient_name} — ${bed.risk_category}` : 'Available'}
                      className={cn('h-16 rounded-xl flex flex-col items-center justify-center border text-xs font-bold cursor-default transition-all hover:scale-105 hover:shadow-md',
                        !bed.is_occupied ? 'bg-slate-50 border-dashed border-slate-200 text-slate-400'
                          : crit ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : bed.is_icu ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700')}>
                      <span className="leading-tight">{bed.bed_number || `B${i + 1}`}</span>
                      <span className={cn('text-[8px] mt-0.5 font-semibold uppercase', !bed.is_occupied ? 'text-slate-300' : crit ? 'text-rose-500' : 'text-indigo-400')}>
                        {bed.is_occupied ? (bed.risk_category || 'stable') : 'free'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        {[{ c: 'bg-slate-200 border-dashed', l: 'Free' }, { c: 'bg-indigo-200 border-indigo-300', l: 'Stable' }, { c: 'bg-amber-200 border-amber-300', l: 'ICU' }, { c: 'bg-rose-200 border-rose-300', l: 'Critical' }].map(x => (
          <div key={x.l} className="flex items-center gap-1.5"><div className={cn('w-4 h-4 rounded border', x.c)} /><span className="text-xs text-slate-500 font-medium">{x.l}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ── WARD ANALYTICS TAB ────────────────────────────────────────── */
function WardAnalyticsTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await fetch(`${API}/admin/ward-analytics`, { headers: ah() }); if (r.ok) setData((await r.json()).data || []); } catch (_) { }
      setLoading(false);
    })();
  }, []);

  const chartData = data.map(w => ({
    name: w.ward_name.length > 12 ? w.ward_name.slice(0, 12) + '…' : w.ward_name,
    occupied: parseInt(w.occupied_beds),
    available: parseInt(w.available_beds),
    icu: parseInt(w.icu_beds),
  }));

  return (
    <div className="flex flex-col gap-6">
      {loading ? <div className="flex items-center justify-center py-20 text-slate-400 gap-3"><Loader2 className="w-6 h-6 animate-spin" /> Loading ward data…</div> : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 mb-5">Bed Occupancy by Ward</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={20} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="occupied" name="Occupied" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" name="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="icu" name="ICU" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.map(w => {
              const total = parseInt(w.total_beds) || 1;
              const occ = parseInt(w.occupied_beds);
              const pct = Math.round((occ / total) * 100);
              const crit = parseInt(w.critical_count);
              return (
                <div key={w.ward_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-slate-800">{w.ward_name}</h4>
                      <span className="text-xs text-slate-400">{w.ward_type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-slate-800">{pct}%</span>
                      <p className="text-xs text-slate-400">occupancy</p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div className={cn('h-full rounded-full', pct > 85 ? 'bg-rose-500' : pct > 65 ? 'bg-amber-400' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{occ}/{parseInt(w.total_beds)} beds · {w.icu_beds} ICU</span>
                    {crit > 0 && <span className="text-rose-600 font-bold">{crit} critical</span>}
                    {parseInt(w.alert_count) > 0 && <span className="text-amber-600 font-bold">{w.alert_count} alerts</span>}
                    {w.avg_risk_score && <span>Avg risk: {w.avg_risk_score}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── STAFF PERFORMANCE TAB ─────────────────────────────────────── */
function StaffPerformanceTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try { const r = await fetch(`${API}/admin/staff-performance`, { headers: ah() }); if (r.ok) setData((await r.json()).data || []); } catch (_) { }
      setLoading(false);
    })();
  }, []);

  const filtered = data.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.specialization?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or specialization…"
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all" />
      </div>

      {loading ? <div className="flex items-center justify-center py-20 text-slate-400 gap-3"><Loader2 className="w-6 h-6 animate-spin" /> Loading staff data…</div> : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Doctor</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Specialization</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Active Patients</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Discharged (30d)</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Avg Risk</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-extrabold text-xs flex items-center justify-center shrink-0">{d.name.charAt(0)}</div>
                      <span className="font-semibold text-slate-800">{d.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{d.specialization || '—'}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn('font-extrabold', parseInt(d.active_patients) > 5 ? 'text-rose-600' : 'text-slate-800')}>{d.active_patients}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-600 font-medium hidden sm:table-cell">{d.discharged_30d}</td>
                  <td className="px-4 py-3.5 text-center hidden lg:table-cell">
                    {d.avg_patient_risk ? (
                      <span className={cn('font-bold', parseFloat(d.avg_patient_risk) > 70 ? 'text-rose-600' : parseFloat(d.avg_patient_risk) > 40 ? 'text-amber-600' : 'text-emerald-600')}>
                        {d.avg_patient_risk}
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase border', d.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200')}>
                      {d.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">No staff found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── DISCHARGE TRENDS TAB ──────────────────────────────────────── */
function DischargeTrendsTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await fetch(`${API}/admin/discharge-trends`, { headers: ah() }); if (r.ok) setData((await r.json()).data || []); } catch (_) { }
      setLoading(false);
    })();
  }, []);

  const chartData = data.map(d => ({
    day: new Date(d.day).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    Discharged: parseInt(d.discharged),
    Morning: parseInt(d.morning || 0),
    Afternoon: parseInt(d.afternoon || 0),
  }));

  const total = data.reduce((s, d) => s + parseInt(d.discharged), 0);
  const avg = data.length ? (total / data.length).toFixed(1) : '—';

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total (14 days)</p>
          <p className="text-3xl font-extrabold text-slate-800">{total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Daily Average</p>
          <p className="text-3xl font-extrabold text-slate-800">{avg}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm col-span-2 md:col-span-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Peak Day</p>
          <p className="text-3xl font-extrabold text-slate-800">
            {data.length ? new Date(data.reduce((m, d) => parseInt(d.discharged) > parseInt(m.discharged) ? d : m, data[0]).day).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center py-20 text-slate-400 gap-3"><Loader2 className="w-6 h-6 animate-spin" /> Loading trends…</div> : chartData.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-400 flex-col gap-2"><TrendingUp className="w-10 h-10 opacity-30" /><p>No discharge data for the last 14 days.</p></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="font-bold text-slate-800 mb-5">Daily Discharge Volume (14 days)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="dGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="Discharged" stroke="#6366f1" strokeWidth={3} fill="url(#dGrad)" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ── ALERT CENTRE TAB ──────────────────────────────────────────── */
function AlertCentreTab() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ar, sr] = await Promise.all([
        fetch(`${API}/alerts?limit=50`, { headers: ah() }),
        fetch(`${API}/admin/alerts-summary`, { headers: ah() }),
      ]);
      if (ar.ok) setAlerts((await ar.json()).data || []);
      if (sr.ok) setSummary((await sr.json()).data);
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const acknowledge = async (id: number) => {
    setAcking(id);
    try {
      await fetch(`${API}/alerts/${id}/acknowledge`, { method: 'PATCH', headers: ah() });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_acknowledged: true } : a));
    } catch (_) { }
    setAcking(null);
  };

  const sevColor: any = {
    critical: 'bg-rose-50 border-rose-200 text-rose-700',
    high: 'bg-orange-50 border-orange-200 text-orange-700',
    medium: 'bg-amber-50 border-amber-100 text-amber-700',
    low: 'bg-slate-50 border-slate-200 text-slate-500',
  };

  return (
    <div className="flex flex-col gap-5">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Critical (24h)', value: summary.by_severity?.filter((s: any) => s.severity === 'critical').reduce((a: number, s: any) => a + parseInt(s.count), 0) || 0, color: 'text-rose-600' },
            { label: 'High (24h)', value: summary.by_severity?.filter((s: any) => s.severity === 'high').reduce((a: number, s: any) => a + parseInt(s.count), 0) || 0, color: 'text-orange-600' },
            { label: 'Trend Alerts', value: summary.trend_alerts_24h ?? 0, color: 'text-amber-600' },
            { label: 'L3 Escalated', value: summary.by_escalation?.find((e: any) => e.escalation_level === 3)?.count || 0, color: 'text-violet-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={cn('text-2xl font-extrabold', s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Active Alerts</h3>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {loading && alerts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-3"><Loader2 className="w-6 h-6 animate-spin" /> Loading alerts…</div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.filter(a => !a.is_acknowledged).slice(0, 20).map(a => (
            <div key={a.id} className={cn('flex items-center justify-between gap-4 p-4 rounded-2xl border', sevColor[a.severity] || sevColor.low)}>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{a.message || a.alert_type}</p>
                <p className="text-xs opacity-70 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(a.triggered_at || a.created_at).toLocaleString()}
                  {a.patient_name && <> · {a.patient_name}</>}
                </p>
              </div>
              <button onClick={() => acknowledge(a.id)} disabled={acking === a.id}
                className="shrink-0 text-xs font-bold px-3 py-1.5 bg-white/70 border border-current rounded-xl hover:bg-white transition-all disabled:opacity-50 flex items-center gap-1">
                {acking === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Acknowledge
              </button>
            </div>
          ))}
          {alerts.filter(a => !a.is_acknowledged).length === 0 && (
            <div className="text-center py-16 text-slate-400 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-10 h-10 opacity-30 text-emerald-500" />
              <p className="font-medium">All alerts acknowledged. System clear.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── SYSTEM SETTINGS TAB ───────────────────────────────────────── */
function SystemSettingsTab() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/admin/settings`, { headers: ah() });
        if (r.ok) { const d = (await r.json()).data; setSettings(d); setForm(d); }
        else setError('Could not load settings. Check admin permissions.');
      } catch (_) { setError('Network error loading settings.'); }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const r = await fetch(`${API}/admin/settings`, { method: 'PATCH', headers: ah(), body: JSON.stringify(form) });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
      else setError('Failed to save settings.');
    } catch (_) { setError('Network error saving settings.'); }
    setSaving(false);
  };

  const fields = [
    { key: 'ews_high_threshold', label: 'EWS High Threshold', desc: 'Score at which a patient is flagged as EWS High', type: 'number' },
    { key: 'ews_urgent_threshold', label: 'EWS Urgent Threshold', desc: 'Score at which a patient triggers urgent escalation', type: 'number' },
    { key: 'alert_cooldown_minutes', label: 'Alert Cooldown (minutes)', desc: 'Minimum minutes between duplicate alerts for same patient', type: 'number' },
    { key: 'escalation_wait_minutes', label: 'Escalation Wait (minutes)', desc: 'Minutes before unacknowledged alert escalates to next level', type: 'number' },
    { key: 'icu_auto_assign', label: 'ICU Auto-Assign', desc: 'Automatically assign ICU bed for critical EWS patients', type: 'boolean' },
  ];

  if (loading) return <div className="flex items-center justify-center py-20 text-slate-400 gap-3"><Loader2 className="w-6 h-6 animate-spin" /> Loading settings…</div>;
  if (error && !settings) return <div className="py-16 text-center text-rose-600 font-medium">{error}</div>;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl px-5 py-3 text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" /> Changes apply immediately to the live clinical engine. Review carefully before saving.
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {fields.map(f => (
          <div key={f.key} className="flex flex-col sm:flex-row justify-between gap-4 p-5">
            <div className="flex-1">
              <p className="font-bold text-slate-800 text-sm">{f.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
            </div>
            {f.type === 'boolean' ? (
              <button onClick={() => setForm((p: any) => ({ ...p, [f.key]: !p[f.key] }))}
                className={cn('self-start sm:self-center px-4 py-2 rounded-xl text-sm font-bold border transition-all', form[f.key] ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200')}>
                {form[f.key] ? 'Enabled' : 'Disabled'}
              </button>
            ) : (
              <input type="number" value={form[f.key] ?? ''} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                className="w-24 self-start sm:self-center bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 text-center outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400" />
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-rose-600 text-sm font-medium">{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />} {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span className="text-emerald-600 font-bold text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved successfully</span>}
        <button onClick={() => setForm(settings)} className="text-slate-500 px-4 py-2.5 rounded-xl font-bold text-sm border border-slate-200 hover:bg-slate-50">Reset</button>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={cn('text-2xl font-extrabold', color)}>{value}</p>
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}
