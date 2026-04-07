"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Activity, AlertTriangle, BedDouble, ArrowRight, Wind,
  TrendingDown, ShieldAlert, HeartPulse, LogOut, Loader2, RefreshCw,
  ClipboardList, Stethoscope, Calendar, User, MapPin, Clock,
  BriefcaseMedical, KeyRound, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import SymptomLogger from '@/components/patient/SymptomLogger';

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
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboard = async () => {
    try {
      const [statsRes, critRes, alertRes] = await Promise.all([
        fetch(`${API}/admin/dashboard`, { headers: ah() }),
        fetch(`${API}/admin/critical-patients`, { headers: ah() }),
        fetch(`${API}/admin/alerts-summary`, { headers: ah() }),
      ]);

      if (statsRes.status === 401 || critRes.status === 401 || alertRes.status === 401) {
        logout();
        return;
      }

      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.data);
      }
      if (critRes.ok) {
        const d = await critRes.json();
        setCriticalPatients(d.data || []);
      }
      if (alertRes.ok) {
        const d = await alertRes.json();
        setAlertsSummary(d.data);
      }
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
    return <PatientDashboardView />;
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-700">

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
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

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

// ── Patient Dashboard Sub-component ──────────────────────────────────────────

// ── Patient Dashboard Sub-component ──────────────────────────────────────────
function PatientDashboardView() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  const [admission, setAdmission] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchPatientData = useCallback(async () => {
    if (!currentUser?.patientId) return;
    try {
      // 1. Get active admission
      const admRes = await fetch(`${API}/admissions?patient_id=${currentUser.patientId}&status=active`, { headers: ah() });
      if (admRes.ok) {
        const admData = await admRes.json();
        const activeAdm = (admData.rows || admData.data || [])[0];
        setAdmission(activeAdm);

        if (activeAdm) {
          // Parallel fetch: Vitals, Alerts, Prescriptions
          const [vRes, alRes, prRes] = await Promise.all([
            fetch(`${API}/vitals/${currentUser.patientId}?limit=1`, { headers: ah() }),
            fetch(`${API}/alerts/patient/${currentUser.patientId}`, { headers: ah() }),
            fetch(`${API}/prescriptions/${currentUser.patientId}`, { headers: ah() })
          ]);

          if (vRes.ok) {
            const vData = await vRes.json();
            setVitals((vData.rows || vData.data || [])[0]);
          }
          if (alRes.ok) {
            const alData = await alRes.json();
            setAlerts((alData.data || []).slice(0, 5)); // Latest 5 alerts
          }
          if (prRes.ok) {
            const prData = await prRes.json();
            setPrescriptions((prData.data || []).filter((p: any) => p.status === 'active').slice(0, 4));
          }
        }
      }
      setLastRefreshed(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchPatientData();
    const interval = setInterval(fetchPatientData, 10000); // 10s real-time polling
    return () => clearInterval(interval);
  }, [fetchPatientData]);

  if (loading && !admission) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      <p className="text-slate-500 font-bold tracking-tight">Synchronizing Clinical Telemetry...</p>
    </div>
  );

  if (!admission) return (
    <div className="p-12 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 m-8 flex flex-col items-center gap-4">
      <div className="p-4 bg-white rounded-full shadow-sm">
        <HeartPulse className="w-12 h-12 text-slate-300" />
      </div>
      <div>
        <h2 className="text-2xl font-black text-slate-800">Observation Not Active</h2>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto">Your patient ID is registered, but you aren't currently checked into a clinical ward. Please contact the front desk if this is an error.</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Recovery Mode</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none mb-3">Recovery Hub</h1>
          <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
            <span className="bg-slate-100 px-3 py-1 rounded-full text-slate-700 font-bold">#{currentUser.patientId}</span>
            <span className="opacity-40">|</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Updated: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: Vitals & Alerts (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-8">

          {/* Main Vitals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col justify-between min-h-[300px] shadow-2xl shadow-indigo-500/10">
              <div className="relative z-10">
                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Clinical Risk Intelligence</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-5xl font-black italic tracking-tighter uppercase">{admission.risk_category || 'STABLE'}</h3>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                    <p className="text-xs text-slate-300 font-medium uppercase tracking-tight">Vitals Synchronized every 10s</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <p className="text-xs text-slate-300 font-medium">Automatic Deterioration Monitoring Active</p>
                  </div>
                </div>
              </div>
              <Activity className="absolute -right-12 -bottom-12 w-64 h-64 text-white/5" />
              <Link href="/my-vitals" className="relative z-10 group w-fit flex items-center gap-3 px-6 py-4 bg-white text-slate-950 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all hover:shadow-[0_8px_20px_rgba(255,255,255,0.2)]">
                VIEW LIVE TELEMETRY <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <MiniVitalCard icon={<HeartPulse className="w-5 h-5 text-rose-500" />} label="Heart Rate" value={vitals?.heart_rate || '--'} unit="bpm" color="rose" />
              <MiniVitalCard icon={<Activity className="w-5 h-5 text-indigo-500" />} label="BP Level" value={vitals ? `${vitals.systolic_bp}/${vitals.diastolic_bp}` : '--'} unit="mmHg" color="indigo" />
              <MiniVitalCard icon={<Wind className="w-5 h-5 text-blue-500" />} label="Oxygen (SpO2)" value={vitals?.spo2 || '--'} unit="%" color="blue" />
            </div>
          </div>

          {/* Active Alerts Feed */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="p-2 bg-rose-50 rounded-xl"><AlertTriangle className="w-5 h-5 text-rose-500" /></div>
                Recent Clinical Alerts
              </h3>
              <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase tracking-widest">Last 24 Hours</span>
            </div>
            {alerts.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center gap-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
                <p className="text-slate-500 font-bold text-sm">No abnormal findings recorded.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert, idx) => (
                  <div key={idx} className={cn(
                    "flex items-center gap-4 p-5 rounded-3xl border transition-all",
                    alert.severity === 'critical' ? 'bg-rose-50/50 border-rose-100' : 'bg-amber-50/50 border-amber-100'
                  )}>
                    <div className={cn(
                      "p-3 rounded-2xl shadow-sm",
                      alert.severity === 'critical' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                    )}>
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-800 tracking-tight capitalize">{alert.alert_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">{alert.message}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400">{new Date(alert.triggered_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Care Team & Meds (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-8">

          {/* Care Team & Ward */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3 uppercase tracking-tighter">
              <Users className="w-5 h-5 text-indigo-500" /> Care Ensemble
            </h3>
            <div className="space-y-8">
              <InfoItem icon={<User className="w-4 h-4" />} label="Primary Physician" value={admission.doctor_name || 'Medical Director'} desc="On-Call Specialist" />
              <InfoItem icon={<MapPin className="w-4 h-4" />} label="Current Location" value={`${admission.ward_name}`} desc={`Bed Reference: ${admission.bed_number}`} />
              <InfoItem icon={<Calendar className="w-4 h-4" />} label="Admission Date" value={new Date(admission.admitted_at).toLocaleDateString()} desc="Current stay duration: Active" />
            </div>
          </div>

          {/* Upcoming Medication */}
          <div className="bg-indigo-600 rounded-[3rem] p-8 text-white shadow-xl shadow-indigo-500/20">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 uppercase tracking-tighter">
              <BriefcaseMedical className="w-5 h-5 text-indigo-200" /> Medication Plan
            </h3>
            {prescriptions.length === 0 ? (
              <p className="text-indigo-200 text-sm font-medium">No active medications scheduled currently.</p>
            ) : (
              <div className="space-y-5">
                {prescriptions.map((pr, idx) => (
                  <div key={idx} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-all">
                      <Activity className="w-4 h-4 text-indigo-200" />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight">{pr.medication_name}</p>
                      <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">{pr.dose} · {pr.frequency}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/10">
                <KeyRound className="w-4 h-4 text-indigo-300" />
                <p className="text-[10px] leading-tight text-indigo-100 font-medium italic">Please verify your dosage with your attending nurse before administration.</p>
              </div>
            </div>
          </div>

          {/* Quick Symptom Report */}
          <SymptomLogger onSuccess={fetchPatientData} />

        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value, desc }: { icon: any, label: string, value: string, desc?: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 p-2 bg-slate-50 rounded-2xl text-slate-400 border border-slate-100 group-hover:text-indigo-500 transition-colors">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-slate-900 font-black tracking-tight leading-none text-lg mb-1">{value}</p>
        {desc && <p className="text-xs text-slate-500 font-medium">{desc}</p>}
      </div>
    </div>
  );
}

function MiniVitalCard({ icon, label, value, unit, color }: { icon: any, label: string, value: any, unit: string, color: string }) {
  const colorMap: any = {
    rose: 'hover:border-rose-300 shadow-rose-500/5 hover:bg-rose-50/10',
    indigo: 'hover:border-indigo-300 shadow-indigo-500/5 hover:bg-indigo-50/10',
    blue: 'hover:border-blue-300 shadow-blue-500/5 hover:bg-blue-50/10'
  };

  return (
    <div className={cn(
      "bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col justify-between shadow-sm transition-all duration-300 h-full",
      colorMap[color]
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
        <div className="h-4 w-12 bg-slate-50 rounded-full overflow-hidden flex items-center justify-center">
          <div className={cn("w-full h-1 animate-pulse",
            color === 'rose' ? 'bg-rose-400/30' : color === 'blue' ? 'bg-blue-400/30' : 'bg-indigo-400/30'
          )} />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-black text-slate-900 leading-none">{value}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unit}</span>
        </div>
      </div>
    </div>
  );
}
