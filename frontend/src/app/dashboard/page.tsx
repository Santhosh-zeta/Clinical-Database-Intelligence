"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, Activity, AlertTriangle,
  Database, BedDouble, Settings, HeartPulse,
  Stethoscope, ClipboardList, ShieldAlert, BookOpen, Clock, UserCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Import sub-pages to act as tabs
import CareOverview from '@/components/dashboard/CareOverview';
import PatientsPage from '../patients/page';
import VitalsPage from '../vitals/page';
import IcuPage from '../icu/page';
import AlertsPage from '../alerts/page';
import LogsPage from '../logs/page';
import UsersPage from '../users/page';
import SettingsPage from '../settings/page';
import MyVitalsPage from '../my-vitals/page';


// ── New Expanded Features ────────────────────

function DoctorConsultsTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConsults() {
      try {
        const res = await fetch(`http://localhost:3001/api/admin/doctor/consults`, { headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` } });
        if (res.ok) {
          const d = await res.json();
          setData(d.data || []);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchConsults();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-indigo-500" /> Specialist Consultations
        </h2>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700">Request Consult</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {loading ? <p className="text-slate-400">Loading...</p> : data.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 italic">No pending consultation requests.</div>
        ) : (
          data.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">{c.specialty} Review</h3>
                  <p className="text-sm text-slate-500">Patient: {c.patient_name}</p>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-bold uppercase border",
                  c.priority === 'urgent' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
                )}>{c.priority}</span>
              </div>
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{c.reason}</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.status}</span>
                <button className="text-xs bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg font-bold border border-slate-200 hover:bg-slate-100">Review</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NurseHandoverTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHandovers() {
      try {
        const res = await fetch(`http://localhost:3001/api/handovers/ward/1`, { headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` } });
        if (res.ok) {
          const d = await res.json();
          setData(d.data || []);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchHandovers();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-500" /> Shift Handover
        </h2>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700">New Note</button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {loading ? <p className="p-10 text-slate-400">Loading...</p> : data.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">No handover notes recorded for this shift.</div>
        ) : (
          data.map(h => (
            <div key={h.id} className="p-5 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-800">{h.shift_name} Summary</h3>
                <p className="text-sm text-slate-500 mt-1">Written by {h.author_name}</p>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">{h.summary}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-slate-400">{new Date(h.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PatientHistoryTab() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdmissions() {
      if (!currentUser?.patientId) return setLoading(false);
      try {
        const res = await fetch(`http://localhost:3001/api/patients/${currentUser.patientId}/admissions`, { headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` } });
        if (res.ok) {
          const d = await res.json();
          setData(d.data || []);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchAdmissions();
  }, [currentUser]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><BookOpen className="w-6 h-6 text-indigo-500" /> Medical History</h2>
      <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
        {loading ? <p className="p-10 text-slate-400">Loading history...</p> : data.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">No previous admissions records found.</div>
        ) : (
          data.map(adm => (
            <div key={adm.id} className="p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">{adm.diagnosis}</h3>
                <p className="text-sm text-slate-500">
                  Admitted: {new Date(adm.admitted_at).toLocaleDateString()}
                  {adm.discharged_at ? ` · Discharged: ${new Date(adm.discharged_at).toLocaleDateString()}` : ` · Current Admission`}
                </p>
              </div>
              <button className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">View Summary</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DoctorDischargeTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDischargable() {
      try {
        const url = `http://localhost:3001/api/admin/discharge-board`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` } });
        if (res.ok) {
          const d = await res.json();
          setData(d.data || []);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchDischargable();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-indigo-500" /> Discharge Authority
          </h2>
          <p className="text-sm text-slate-500 mt-1">Patients flagged as medically stable for discharge.</p>
        </div>
      </div>
      {loading ? <p>Loading...</p> : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          No patients currently pending discharge approval.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Patient</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Location</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Risk Index</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(p => (
                <tr key={p.id}>
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-800">{p.patient_name}</div>
                    <div className="text-xs text-slate-500">{p.diagnosis}</div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{p.ward_name} · {p.bed_number}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 uppercase">
                      Score: {p.risk_score}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg">Approve Discharge</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NurseMedicationRoundTab() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMeds() {
      try {
        const url = `http://localhost:3001/api/admin/nurse/med-rounds`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` } });
        if (res.ok) {
          const d = await res.json();
          setData(d.data || []);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchMeds();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-500" /> Active Med Rounds
          </h2>
          <p className="text-sm text-slate-500 mt-1">Medication administration tasks for the current shift.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100 flex items-center gap-2">
          <Clock className="w-4 h-4" /> 09:00 AM Shift
        </div>
      </div>
      {loading ? <p>Loading...</p> : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          No medication administration pending for this ward.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(m => (
            <div key={m.prescription_id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-lg text-[10px] uppercase">{m.bed_number}</div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.route}</span>
                </div>
                <h3 className="font-extrabold text-slate-800 text-lg mb-1">{m.medication_name}</h3>
                <p className="text-sm font-bold text-emerald-600 mb-4">{m.dose} · {m.frequency}</p>
                <div className="flex items-center gap-2 mb-4 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">{m.patient_name[0]}</div>
                  <div className="text-xs font-bold text-slate-700">{m.patient_name}</div>
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-sm hover:shadow-lg transition-all">Confirm Administration</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PatientAppointmentsTab() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      if (!currentUser?.patientId) return setLoading(false);
      try {
        const res = await fetch(`http://localhost:3001/api/patients/${currentUser.patientId}/appointments`, { headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` } });
        if (res.ok) {
          const d = await res.json();
          setData(d.data || []);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchAppointments();
  }, [currentUser]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Clock className="w-6 h-6 text-indigo-500" /> Upcoming Appointments
        </h2>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700">Book New</button>
      </div>
      <div className="flex flex-col gap-4">
        {loading ? <p className="text-slate-400">Loading appointments...</p> : data.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 italic">
            No upcoming appointments found.
          </div>
        ) : (
          data.map(a => (
            <div key={a.id} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-white text-indigo-600 p-3 rounded-xl border border-indigo-100 text-center font-bold min-w-[70px]">
                  <div className="text-xs uppercase">{new Date(a.appointment_at).toLocaleString('default', { month: 'short' })}</div>
                  <div className="text-xl">{new Date(a.appointment_at).getDate()}</div>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{a.reason}</h3>
                  <p className="text-sm text-slate-600">{a.doctor_name} · {a.location}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="text-xs bg-white text-slate-600 px-3 py-2 rounded-lg font-bold border border-slate-200">Reschedule</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Placeholder for missing tabs requested 
function PlaceholderTab({ title, description }: { title: string, description: string }) {
  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto w-full flex flex-col items-center justify-center text-center mt-20">
      <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
        <Clock className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md">{description}</p>
    </div>
  );
}

// ── Real Endpoints Tabs ────────────────────────

function PatientPrescriptionsTab() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMeds() {
      if (!currentUser?.patientId) return setLoading(false);
      try {
        const url = `http://localhost:3001/api/prescriptions/${currentUser.patientId}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('__intellicare_token')}` } });
        if (res.ok) {
          const d = await res.json();
          setData(d.data || []);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchMeds();
  }, [currentUser]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-indigo-500" /> My Current Treatments
        </h2>
      </div>
      {loading ? (
        <p className="text-slate-400">Loading your prescriptions...</p>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 italic">
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

export default function UnifiedTabbedDashboard() {
  const { currentUser } = useAuth();
  const role = currentUser?.role?.toLowerCase() || '';

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

  const doctorTabs = [
    { id: 'overview', label: 'Care Overview', icon: LayoutDashboard, Component: CareOverview },
    { id: 'directory', label: 'My Patients', icon: Users, Component: PatientsPage },
    { id: 'vitals', label: 'Vitals Monitor', icon: Activity, Component: VitalsPage },
    { id: 'discharge', label: 'Discharge Auth.', icon: HeartPulse, Component: DoctorDischargeTab },
    { id: 'alerts', label: 'Alert Inbox', icon: AlertTriangle, Component: AlertsPage },
    { id: 'consults', label: 'Consultations', icon: ShieldAlert, Component: DoctorConsultsTab },
  ];

  const nurseTabs = [
    { id: 'overview', label: 'Ward Summary', icon: LayoutDashboard, Component: CareOverview },
    { id: 'meds', label: 'Medication Rounds', icon: ClipboardList, Component: NurseMedicationRoundTab },
    { id: 'vitals', label: 'Vitals Entry', icon: Activity, Component: VitalsPage },
    { id: 'alerts', label: 'Ward Alerts', icon: AlertTriangle, Component: AlertsPage },
    { id: 'beds', label: 'Bed Status', icon: BedDouble, Component: IcuPage },
    { id: 'handover', label: 'Shift Handover', icon: UserCircle2, Component: NurseHandoverTab },
  ];

  const patientTabs = [
    { id: 'overview', label: 'Recovery Status', icon: HeartPulse, Component: CareOverview },
    { id: 'my-vitals', label: 'Live Vitals', icon: Activity, Component: MyVitalsPage },
    { id: 'meds', label: 'My Treatments', icon: ClipboardList, Component: PatientPrescriptionsTab },
    { id: 'docs', label: 'Medical History', icon: BookOpen, Component: PatientHistoryTab },
    { id: 'appointments', label: 'Appointments', icon: Clock, Component: PatientAppointmentsTab },
  ];

  // Default to patient if unknown
  let availableTabs = patientTabs;
  if (['admin', 'ultra_admin', 'hospital_admin'].includes(role)) availableTabs = adminTabs;
  else if (role === 'doctor') availableTabs = doctorTabs;
  else if (role === 'nurse') availableTabs = nurseTabs;

  const [activeTab, setActiveTab] = useState(availableTabs[0].id);

  const ActiveComponent = availableTabs.find(t => t.id === activeTab)?.Component || CareOverview;

  return (
    <div className="flex flex-col h-screen bg-slate-50/50">
      {/* Tab Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 max-w-7xl mx-auto">
          {availableTabs.map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-extrabold whitespace-nowrap transition-all duration-300 outline-none",
                  isActive
                    ? "text-indigo-700 bg-indigo-50 shadow-sm border border-indigo-100 ring-4 ring-indigo-500/5"
                    : "text-slate-500 hover:bg-white hover:text-slate-800 border border-slate-200 shadow-sm"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-slate-400")} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-600 rounded-t-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="min-h-full"
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
