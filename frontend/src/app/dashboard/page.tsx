"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Users, Activity, AlertTriangle, BedDouble, ArrowRight,
  TrendingDown, ShieldAlert, HeartPulse, LogOut, Loader2, RefreshCw,
  ClipboardList, Stethoscope, LayoutDashboard, Database, Settings,
  Calendar, Clock, UserCircle2, BookOpen, Thermometer, Wind
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';

// Import all sub-pages used as dashboard tabs
import PatientsPage from '../patients/page';
import VitalsPage from '../vitals/page';
import AlertsPage from '../alerts/page';
import IcuPage from '../icu/page';
import LogsPage from '../logs/page';
import SettingsPage from '../settings/page';
import UsersPage from '../users/page';
import CareOverview from '@/components/dashboard/CareOverview';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

// ── Role Specific Dashboard Components ─────────────────────────────────────

function DoctorDischargeTab() {
  return <div className="p-8 text-center bg-white rounded-3xl border">Doctor Discharge Management View</div>;
}

function DoctorConsultsTab() {
  return <div className="p-8 text-center bg-white rounded-3xl border">Specialist Consultation Request Hub</div>;
}

function NurseMedicationRoundTab() {
  return <div className="p-8 text-center bg-white rounded-3xl border">Nurse Admin: Real-time Medication Charting</div>;
}

function NurseHandoverTab() {
  return <div className="p-8 text-center bg-white rounded-3xl border">Inter-shift Clinical Handover Protocol</div>;
}

function PatientHistoryTab() {
  return <div className="p-8 text-center bg-white rounded-3xl border">Immutable Longitudinal Patient Record</div>;
}

function PatientAppointmentsTab() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!currentUser?.patientId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/patients/${currentUser.patientId}/appointments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` }
      });
      if (res.ok) {
        const d = await res.json();
        setData(d.data || []);
      }
    } catch (_) { }
    setLoading(false);
  }, [currentUser?.patientId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center mb-0">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-indigo-500" /> My Clinical Appointments
        </h2>
      </div>
      {loading ? (
        <p className="text-slate-400">Loading your schedule...</p>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 italic">
          No upcoming appointments scheduled.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(apt => (
            <div key={apt.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{apt.appointment_type}</div>
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase",
                  apt.status === 'scheduled' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                )}>
                  {apt.status}
                </span>
              </div>
              <div className="text-lg font-extrabold text-slate-800 mb-4">{new Date(apt.appointment_date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                <div className="w-8 h-8 rounded-full bg-slate-100 border flex items-center justify-center text-[10px] font-bold uppercase">{apt.doctor_name?.charAt(0)}</div>
                <div className="text-xs font-bold text-slate-600">Dr. {apt.doctor_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatientPrescriptionsTab() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.patientId) return;
    async function fetchItems() {
      try {
        const res = await fetch(`http://localhost:3001/api/patients/${currentUser.patientId}/prescriptions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` }
        });
        if (res.ok) {
          const d = await res.json();
          setData(d.data || []);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchItems();
  }, [currentUser?.patientId]);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center mb-0">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-500" /> My Current Treatments
        </h2>
      </div>
      {loading ? (
        <p className="text-slate-400">Loading your prescriptions...</p>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 italic">
          No active medication orders found.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {data.map(rx => (
            <div key={rx.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-800">{rx.medication_name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 uppercase">{rx.status}</span>
              </div>
              <p className="text-sm text-slate-600 mb-1 font-bold text-indigo-600">{rx.dose} · {rx.frequency}</p>
              <p className="text-xs text-slate-500">Prescribed by Dr. {rx.prescribed_by_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Patient-only Vitals Component ──────────────────────────────────────────
function PatientVitalsTab() {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.patientId) return;
    const fetchVitals = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/vitals/${currentUser.patientId}?limit=50`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` }
        });
        if (res.ok) {
          const d = await res.json();
          setHistory((d.data || []).reverse());
        }
      } catch (_) { }
      setLoading(false);
    };
    fetchVitals();
    const id = setInterval(fetchVitals, 10000);
    return () => clearInterval(id);
  }, [currentUser?.patientId]);

  if (loading) return <div className="py-20 text-center text-slate-400 bg-white border border-dashed rounded-3xl">Syncing vital telemetry...</div>;

  const latest = history[history.length - 1];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Vitals History</h1>
          <p className="text-slate-500 font-medium tracking-tight">Real-time health telemetry from ICU sensors.</p>
        </div>
        {latest && (
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
            Last Reading: {new Date(latest.recorded_at).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <VitalCard label="Heart Rate" value={latest?.heart_rate || '--'} unit="bpm" icon={<HeartPulse />} color="text-rose-500" bg="bg-rose-50" />
        <VitalCard label="Oxygen" value={latest?.spo2 || '--'} unit="%" icon={<Wind />} color="text-sky-500" bg="bg-sky-50" />
        <VitalCard label="Pressure" value={`${latest?.systolic_bp || '--'}/${latest?.diastolic_bp || '--'}`} unit="mmHg" icon={<Activity />} color="text-indigo-500" bg="bg-indigo-50" />
        <VitalCard label="Temp" value={latest?.temperature || '--'} unit="°C" icon={<Thermometer />} color="text-orange-500" bg="bg-orange-50" />
      </div>

      <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" /> Cardiovascular Trends
        </h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="recorded_at" hide />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Area type="monotone" dataKey="heart_rate" stroke="#6366f1" strokeWidth={3} fill="#6366f120" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function VitalCard({ label, value, unit, icon, color, bg }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className={cn("p-2 rounded-xl border border-transparent", bg, color)}>
          {React.cloneElement(icon as React.ReactElement, { size: 20 })}
        </div>
      </div>
      <div className="text-3xl font-black text-slate-800 tracking-tighter">
        {value} <span className="text-sm font-bold text-slate-400 tracking-normal ml-0.5">{unit}</span>
      </div>
    </div>
  );
}

// ── Main Dashboard Hub ─────────────────────────────────────────────────────

export default function UnifiedTabbedDashboard() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><Loader2 className="animate-spin inline-block mr-2" /> Loading Nexus...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();
  const role = currentUser?.role?.toLowerCase() || '';
  const tabParam = searchParams.get('tab');

  // Tab configurations per role
  const adminTabs = [
    { id: 'overview', label: 'Command Center', icon: LayoutDashboard, Component: CareOverview },
    { id: 'patients', label: 'Patient Directory', icon: Users, Component: PatientsPage },
    { id: 'staff', label: 'Staff Roster', icon: Stethoscope, Component: UsersPage },
    { id: 'icu', label: 'ICU Allocation', icon: BedDouble, Component: IcuPage },
    { id: 'alerts', label: 'Alerts Management', icon: AlertTriangle, Component: AlertsPage },
    { id: 'logs', label: 'Audit Logs', icon: Database, Component: LogsPage },
    { id: 'settings', label: 'Global Settings', icon: Settings, Component: SettingsPage },
  ];

  const staffTabs = [
    { id: 'overview', label: 'Care Overview', icon: LayoutDashboard, Component: CareOverview },
    { id: 'patients', label: 'Patient Directory', icon: Users, Component: PatientsPage },
    { id: 'vitals', label: 'Vitals Monitor', icon: Activity, Component: VitalsPage },
    { id: 'icu', label: 'ICU Allocation', icon: BedDouble, Component: IcuPage },
    { id: 'alerts', label: 'Alerts Management', icon: AlertTriangle, Component: AlertsPage },
  ];

  const patientTabs = [
    { id: 'overview', label: 'Recovery Summary', icon: HeartPulse, Component: CareOverview },
    { id: 'vitals', label: 'My Vitals', icon: Activity, Component: PatientVitalsTab },
    { id: 'appointments', label: 'Appointments', icon: Calendar, Component: PatientAppointmentsTab },
    { id: 'meds', label: 'Treatments', icon: ClipboardList, Component: PatientPrescriptionsTab },
    { id: 'docs', label: 'Medical History', icon: BookOpen, Component: PatientHistoryTab },
  ];

  const activeTabs = role === 'admin' ? adminTabs : role === 'patient' ? patientTabs : staffTabs;
  const activeId = tabParam || 'overview';
  const currentTab = activeTabs.find(t => t.id === activeId) || activeTabs[0];
  const ActiveComponent = currentTab.Component;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeId]);

  return (
    <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
      <div className="max-w-7xl mx-auto py-0">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
