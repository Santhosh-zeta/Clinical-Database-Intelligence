"use client";

import React, { useEffect, useState } from 'react';
import {
  Users, Activity, AlertTriangle, BedDouble, ArrowRight, Wind,
  TrendingDown, ShieldAlert, HeartPulse, LogOut, Loader2, RefreshCw,
  ClipboardList, Stethoscope, PieChart as PieIcon, BarChart as BarIcon,
  TrendingUp, Clock, Settings, Database
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

// ── Data shapes from backend ─────────────────────────────────────────────────
interface DashboardStats {
  active_admissions: string;
  discharged_today: string;
  total_patients: string;
  unacknowledged_alerts: string;
  critical_alerts: string;
  available_icu_beds: string;
  total_icu_beds: string;
  active_doctors: string;
  urgent_ews_patients: string;
  high_ews_patients: string;
  critical_patients: string;
  stable_patients: string;
}

interface CriticalPatient {
  patient_id: number;
  patient_name: string;
  admission_id: number;
  diagnosis: string;
  doctor_name: string;
  ward_name: string;
  bed_number: string;
  is_icu: boolean;
  risk_score: number;
  risk_category: string;
  ews: number;
  ews_category: string;
  active_critical_alerts: string;
}

interface AlertsSummary {
  by_severity: { severity: string; status: string; count: string }[];
  by_escalation: { escalation_level: number; level_label: string; count: string }[];
  trend_alerts_24h: number;
}

export default function DashboardSummary() {
  const { currentUser, logout } = useAuth();

  // ── Real API data ───────────────────────────────────────────────────────
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [criticalPatients, setCriticalPatients] = useState<CriticalPatient[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<AlertsSummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [wardAnalytics, setWardAnalytics] = useState<any[]>([]);
  const [dischargeTrends, setDischargeTrends] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboard = async () => {
    try {
      const [statsRes, critRes, alertRes, logsRes, wardRes, trendRes, staffRes] = await Promise.all([
        fetch(`${API}/admin/dashboard`, { headers: ah() }),
        fetch(`${API}/admin/critical-patients`, { headers: ah() }),
        fetch(`${API}/admin/alerts-summary`, { headers: ah() }),
        fetch(`${API}/admin/audit-logs?limit=10`, { headers: ah() }),
        fetch(`${API}/admin/ward-analytics`, { headers: ah() }),
        fetch(`${API}/admin/discharge-trends`, { headers: ah() }),
        fetch(`${API}/admin/staff-performance`, { headers: ah() }),
      ]);

      if (statsRes.status === 401 || critRes.status === 401 || alertRes.status === 401) {
        logout();
        return;
      }

      const results = await Promise.all([
        statsRes.ok ? statsRes.json() : null,
        critRes.ok ? critRes.json() : null,
        alertRes.ok ? alertRes.json() : null,
        logsRes.ok ? logsRes.json() : null,
        wardRes.ok ? wardRes.json() : null,
        trendRes.ok ? trendRes.json() : null,
        staffRes.ok ? staffRes.json() : null,
      ]);

      if (results[0]) setStats(results[0].data);
      if (results[1]) setCriticalPatients(results[1].data || []);
      if (results[2]) setAlertsSummary(results[2].data);
      if (results[3]) setAuditLogs(results[3].data || []);
      if (results[4]) setWardAnalytics(results[4].data || []);
      if (results[5]) setDischargeTrends(results[5].data || []);
      if (results[6]) setStaffPerformance(results[6].data || []);

      setLastRefreshed(new Date());
    } catch (_) { }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
    const id = setInterval(fetchDashboard, 5000); // refresh every 5s
    return () => clearInterval(id);
  }, []);

  // ── Patient role view ───────────────────────────────────────────────────
  if (currentUser?.role === 'patient') {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">My Health Dashboard</h1>
            <p className="text-slate-500 text-lg">Your live recovery status and hospital facilities.</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-500" /> Recovery Status
          </h2>
          <Link href="/my-vitals" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
            View Full Vital History <ArrowRight className="w-5 h-5 text-slate-400" />
          </Link>
        </div>
      </div>
    );
  }

  // ── KPI values — prefer real API, fall back to simulation count ─────────
  const activeAdmissions = stats ? parseInt(stats.active_admissions) : 0;
  const criticalCount = stats ? parseInt(stats.critical_patients) : 0;
  const activeAlerts = stats ? parseInt(stats.unacknowledged_alerts) : 0;
  const criticalAlerts = stats ? parseInt(stats.critical_alerts) : 0;
  const availIcu = stats ? parseInt(stats.available_icu_beds) : 0;
  const totalIcu = stats ? parseInt(stats.total_icu_beds) : 0;
  const urgentEws = stats ? parseInt(stats.urgent_ews_patients) : 0;
  const highEws = stats ? parseInt(stats.high_ews_patients) : 0;
  const activeDoctors = stats ? parseInt(stats.active_doctors) : 0;
  const dischargedToday = stats ? parseInt(stats.discharged_today) : 0;

  // Escalation breakdown
  const escL3 = alertsSummary?.by_escalation.find(e => e.escalation_level === 3);
  const escL2 = alertsSummary?.by_escalation.find(e => e.escalation_level === 2);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="relative">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
            {currentUser?.role === 'admin' ? 'Command Center' : 'Care Overview'}
          </h1>
          <p className="text-slate-500 text-lg font-medium">
            {loading
              ? 'Loading live hospital data...'
              : `${activeAdmissions} active admissions · ${criticalCount} critical · ${activeDoctors} staff on duty`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser?.role === 'doctor' && (
            <div className="flex gap-2">
              <Link href="/patients" className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all shadow-md">
                <Stethoscope className="w-4 h-4" /> Start Rounding
              </Link>
            </div>
          )}
          {currentUser?.role === 'nurse' && (
            <div className="flex gap-2">
              <button className="flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl transition-all shadow-md">
                <ClipboardList className="w-4 h-4" /> Begin Med Rounds
              </button>
            </div>
          )}
          {lastRefreshed && (
            <span className="text-xs text-slate-400 font-medium hidden md:block">
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── KPI Grid — all real data ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Active Admissions"
          value={loading ? '—' : activeAdmissions}
          sub={loading ? '' : `${dischargedToday} discharged today`}
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          link="/patients"
          gradient="from-indigo-50 to-white hover:from-indigo-100"
          iconBg="bg-indigo-100/80"
          borderColor="border-indigo-100"
        />
        <KPICard
          title="Critical Risk"
          value={loading ? '—' : criticalCount}
          sub={loading ? '' : `${urgentEws} EWS urgent · ${highEws} high`}
          icon={<Activity className="w-5 h-5 text-rose-600" />}
          link="/patients?filter=critical"
          gradient={criticalCount > 0 ? 'from-rose-50 to-white hover:from-rose-100' : 'from-slate-50 to-white'}
          iconBg={criticalCount > 0 ? 'bg-rose-100/80' : 'bg-slate-100/80'}
          borderColor={criticalCount > 0 ? 'border-rose-200' : 'border-slate-200'}
          pulse={criticalCount > 0}
        />
        <KPICard
          title="ICU Occupancy"
          value={loading ? '—' : `${totalIcu - availIcu}/${totalIcu}`}
          sub={loading ? '' : `${availIcu} bed${availIcu !== 1 ? 's' : ''} free`}
          icon={<BedDouble className="w-5 h-5 text-amber-600" />}
          link="/icu"
          gradient="from-amber-50 to-white hover:from-amber-100"
          iconBg="bg-amber-100/80"
          borderColor="border-amber-200"
        />
        <KPICard
          title="Unack. Alerts"
          value={loading ? '—' : activeAlerts}
          sub={loading ? '' : `${criticalAlerts} critical severity`}
          icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
          link="/alerts"
          gradient={activeAlerts > 0 ? 'from-orange-50 to-white hover:from-orange-100' : 'from-slate-50 to-white'}
          iconBg={activeAlerts > 0 ? 'bg-orange-100/80' : 'bg-slate-100'}
          borderColor={activeAlerts > 0 ? 'border-orange-200' : 'border-slate-200'}
          pulse={criticalAlerts > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Critical Patients Panel (real data) ───────────────────────── */}
        <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-3xl p-7 shadow-sm">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" /> Priority Patients
              </h2>
              <p className="text-sm text-slate-500 mt-1">High & critical risk — live from DB</p>
            </div>
            <Link href="/patients" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-colors flex items-center gap-1">
              All Patients <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-3">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading critical patients...
            </div>
          ) : criticalPatients.length === 0 ? (
            <div className="text-center p-10 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
              <Wind className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              All clear — no critical or high-risk patients at this time.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {criticalPatients.slice(0, 6).map(pt => {
                const isCrit = pt.risk_category === 'critical';
                const isUrgentEws = pt.ews_category === 'urgent';
                return (
                  <Link
                    href={`/patients/${pt.admission_id}`}
                    key={pt.admission_id}
                    className={cn(
                      'p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all hover:shadow-sm',
                      isCrit
                        ? 'bg-gradient-to-r from-rose-50/60 to-transparent border-rose-100 hover:border-rose-200'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        'p-2.5 rounded-xl shrink-0',
                        isCrit ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'
                      )}>
                        {isUrgentEws ? <HeartPulse className="w-5 h-5 animate-pulse" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">{pt.patient_name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {pt.diagnosis} · {pt.ward_name} {pt.bed_number} · Dr. {pt.doctor_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pt.active_critical_alerts > '0' && (
                        <span className="text-[10px] font-bold px-2 py-1 bg-rose-100 text-rose-700 rounded-md border border-rose-200">
                          {pt.active_critical_alerts} alerts
                        </span>
                      )}
                      <div className={cn(
                        'text-xs font-bold px-2.5 py-1 rounded-lg border uppercase',
                        isCrit ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                      )}>
                        EWS {pt.ews ?? '—'}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Alerts Summary + System Stats ─────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Alerts Summary from backend */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 opacity-80" /> Alert Escalations
              </h2>
              <p className="text-indigo-100 text-xs opacity-70 mb-5">Active unacknowledged alerts by level</p>
              <div className="space-y-3">
                <EscBadge level="L3: ICU/Admin" count={parseInt(escL3?.count || '0')} color="bg-rose-400/30 border-rose-300/40" />
                <EscBadge level="L2: Doctor" count={parseInt(escL2?.count || '0')} color="bg-orange-400/30 border-orange-300/40" />
                {alertsSummary && (
                  <div className="bg-white/10 border border-white/20 rounded-xl p-3 text-xs flex justify-between">
                    <span className="text-indigo-200">Trend alerts (24h)</span>
                    <span className="font-bold text-white">{alertsSummary.trend_alerts_24h}</span>
                  </div>
                )}
              </div>
              <Link href="/alerts" className="mt-5 w-full bg-white text-indigo-600 font-bold rounded-xl py-2.5 block text-center text-sm hover:shadow-lg transition-all">
                View All Alerts
              </Link>
            </div>
            <Activity className="absolute -right-16 -bottom-16 w-64 h-64 text-white/5 opacity-20 pointer-events-none" />
          </div>

          {/* Quick stats cards */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Active Staff" value={loading ? '—' : activeDoctors} icon={<Stethoscope className="w-4 h-4" />} color="text-indigo-600 bg-indigo-50 border-indigo-100" />
            <MiniStat label="Discharged (24h)" value={loading ? '—' : dischargedToday} icon={<LogOut className="w-4 h-4" />} color="text-emerald-600 bg-emerald-50 border-emerald-100" />
            <MiniStat label="EWS Urgent" value={loading ? '—' : urgentEws} icon={<HeartPulse className="w-4 h-4" />} color="text-rose-600 bg-rose-50 border-rose-100" />
            <MiniStat label="Total Patients" value={loading ? '—' : (stats?.total_patients ?? '—')} icon={<ClipboardList className="w-4 h-4" />} color="text-slate-600 bg-slate-50 border-slate-200" />
          </div>
        </div>
      </div>

      {/* ── Admin Analytical Deep Dive (Real Trends) ───────────────────────── */}
      {currentUser?.role === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Discharge Trends (14-day history) */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-7 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" /> Patient Lifecycle
                </h2>
                <p className="text-sm text-slate-500 mt-1">14-day operational discharge throughput</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dischargeTrends}>
                  <defs>
                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Distribution (Pie) */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-7 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-rose-500" /> Risk Stratification
                </h2>
                <p className="text-sm text-slate-500 mt-1">Current patient population by EWS score</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row items-center gap-8">
              <div className="h-[240px] w-[240px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: parseInt(stats?.critical_patients || '0'), color: '#f43f5e' },
                        { name: 'High', value: parseInt(stats?.high_ews_patients || '0'), color: '#f59e0b' },
                        { name: 'Urgent', value: parseInt(stats?.urgent_ews_patients || '0'), color: '#ea580c' },
                        { name: 'Stable', value: parseInt(stats?.stable_patients || '0'), color: '#10b981' },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[0, 1, 2, 3].map((entry, index) => <Cell key={`cell-${index}`} fill={['#f43f5e', '#f59e0b', '#ea580c', '#10b981'][index]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-1 gap-3 w-full">
                <RiskLegend color="bg-rose-500" label="Critical" value={stats?.critical_patients || 0} />
                <RiskLegend color="bg-orange-600" label="Urgent" value={stats?.urgent_ews_patients || 0} />
                <RiskLegend color="bg-amber-500" label="High" value={stats?.high_ews_patients || 0} />
                <RiskLegend color="bg-emerald-500" label="Stable" value={stats?.stable_patients || 0} />
              </div>
            </div>
          </div>

          {/* Staff Performance (Bar) */}
          <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-[2rem] p-7 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" /> Medical Staff Workload
                </h2>
                <p className="text-sm text-slate-500 mt-1">Active patients per doctor vs. case complexity</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffPerformance.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="doctor_name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
                  <Bar dataKey="active_patients" name="Active Case Load" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="avg_ews" name="Avg Patient Risk" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Live Audit Trail Section ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200/60 rounded-[2rem] p-7 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-500" /> Live Audit Trail
            </h2>
            <p className="text-sm text-slate-500 mt-1">Real-time immutable ledger of system activity</p>
          </div>
          <Link href="/dashboard?tab=logs" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-all">
            Full Audit History
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading && auditLogs.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching ledger...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="col-span-full py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 uppercase tracking-widest text-[10px] font-bold">
              No recent system activity detected.
            </div>
          ) : (
            auditLogs.slice(0, 6).map(log => (
              <div key={log.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col gap-2 transition-all hover:bg-white hover:shadow-sm">
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase border",
                    log.action === 'INSERT' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      log.action === 'UPDATE' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                        "bg-rose-50 text-rose-600 border-rose-100"
                  )}>
                    {log.action}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(log.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{log.table_name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">#{log.record_id}</span>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1 italic">
                  Change by {log.changed_by_name || 'System'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Icons (removed duplicate) ──────────────────────────────────────────────

// ── Sub-components ─────────────────────────────────────────────────────────

function RiskLegend({ color, label, value }: { color: string; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="flex items-center gap-2">
        <div className={cn("w-3 h-3 rounded-full", color)} />
        <span className="text-sm font-bold text-slate-600">{label}</span>
      </div>
      <span className="text-sm font-extrabold text-slate-900">{value}</span>
    </div>
  );
}

function KPICard({ title, value, sub, icon, link, gradient, iconBg, borderColor, pulse }: {
  title: string; value: string | number; sub?: string; icon: React.ReactNode;
  link: string; gradient: string; iconBg: string; borderColor: string; pulse?: boolean;
}) {
  return (
    <Link href={link} className={cn(
      'p-5 rounded-3xl border bg-gradient-to-br transition-all hover:shadow-md block relative overflow-hidden group',
      gradient, borderColor
    )}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-slate-600 font-semibold text-xs uppercase tracking-wider">{title}</span>
        <div className={cn('p-2 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', iconBg)}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-end gap-2">
        {value}
        {pulse && (
          <span className="mb-1 flex items-center gap-1 px-2 py-0.5 bg-white/60 border border-white rounded-full text-[10px] font-bold text-rose-500 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping absolute" />
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 relative" />
            Live
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-slate-500 mt-1 font-medium">{sub}</p>}
      <div className="absolute top-0 right-0 -m-6 w-24 h-24 bg-white/40 rounded-full blur-2xl pointer-events-none" />
    </Link>
  );
}

function EscBadge({ level, count, color }: { level: string; count: number; color: string }) {
  return (
    <div className={cn('flex items-center justify-between rounded-xl px-3 py-2.5 border text-sm', color)}>
      <span className="text-white/80 font-medium text-xs">{level}</span>
      <span className={cn('font-extrabold text-white', count > 0 && 'animate-pulse')}>{count}</span>
    </div>
  );
}

function MiniStat({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
      <div className={cn('w-8 h-8 rounded-xl border flex items-center justify-center', color)}>{icon}</div>
      <div className="text-xl font-extrabold text-slate-800">{value}</div>
      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</div>
    </div>
  );
}
