"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Users, Activity, AlertTriangle, BedDouble, ArrowRight,
  TrendingDown, ShieldAlert, HeartPulse, LogOut, Loader2, RefreshCw,
  ClipboardList, Stethoscope, LayoutDashboard, Database, Settings,
  Calendar, Clock, UserCircle2, BookOpen, Thermometer, Wind, CheckCircle,
  Ambulance, MapPin, Radio, Siren, Calculator
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
  const { currentUser } = useAuth();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [allActive, setAllActive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [notes, setNotes] = useState<{ [key: number]: string }>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sugRes, actRes] = await Promise.all([
        fetch(`${API}/admissions/suggestions`, { headers: ah() }),
        fetch(`${API}/admissions?status=active`, { headers: ah() })
      ]);

      if (sugRes.ok) {
        const d = await sugRes.json();
        setSuggestions(d.data || []);
      }
      if (actRes.ok) {
        const d = await actRes.json();
        setAllActive(d.rows || []);
      }
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDischarge = async (admissionId: number) => {
    setSubmitting(admissionId);
    try {
      const res = await fetch(`${API}/admissions/${admissionId}/discharge`, {
        method: 'PUT',
        headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ discharge_notes: notes[admissionId] || '' })
      });
      if (res.ok) {
        fetchData();
        setNotes(prev => {
          const next = { ...prev };
          delete next[admissionId];
          return next;
        });
      }
    } catch (_) { }
    setSubmitting(null);
  };

  const isSuggested = (id: number) => suggestions.some(s => s.id === id);

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900">
      <div className="border-b-2 border-blue-800 pb-2 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 m-0">Discharge Authorization</h1>
          <p className="text-sm font-bold text-gray-700 mt-1">Review and authorize patient departures.</p>
        </div>
        <div className="bg-white border border-gray-400 px-3 py-1 font-bold text-sm text-gray-800">
          Suggested Status: {suggestions.length} Patients
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center font-bold text-gray-600 bg-white border border-gray-400">
          Loading remote feed...
        </div>
      ) : allActive.length === 0 ? (
        <div className="p-10 text-center font-bold text-gray-600 bg-white border border-gray-400">
          No active admissions.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Suggestions First */}
          {suggestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-800 p-4">
              <div className="font-bold text-blue-900 mb-4 border-b border-blue-300 pb-2">
                 System Recommended Discharges
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {suggestions.map(s => (
                  <DischargeCard
                    key={s.id}
                    admission={s}
                    suggested={true}
                    note={notes[s.id] || ''}
                    setNote={(val: string) => setNotes({ ...notes, [s.id]: val })}
                    onDischarge={() => handleDischarge(s.id)}
                    loading={submitting === s.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Remaining Active */}
          <div className="bg-gray-100 border border-gray-400 p-4">
            <div className="font-bold text-gray-800 mb-4 border-b border-gray-300 pb-2">
               Other Active Admissions
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {allActive.filter(a => !isSuggested(a.id)).map(a => (
                <DischargeCard
                  key={a.id}
                  admission={a}
                  suggested={false}
                  note={notes[a.id] || ''}
                  setNote={(val: string) => setNotes({ ...notes, [a.id]: val })}
                  onDischarge={() => handleDischarge(a.id)}
                  loading={submitting === a.id}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DischargeCard({ admission, suggested, note, setNote, onDischarge, loading }: any) {
  return (
    <div className={cn(
      "bg-white border p-4 flex flex-col justify-between shadow-sm",
      suggested ? "border-blue-500 border-2" : "border-gray-400"
    )}>
      <div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-2">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{admission.patient_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-gray-700 bg-gray-200 px-2 py-0.5 border border-gray-400">{admission.ward_name} · Bed {admission.bed_number}</span>
            <span className="text-xs font-bold text-gray-700">{admission.diagnosis}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
            <div className="bg-gray-100 border border-gray-400 px-2 flex flex-col items-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Risk</div>
                <div className={cn("text-base font-bold", admission.risk_category === 'low' ? 'text-green-700' : admission.risk_category === 'medium' ? 'text-yellow-700' : 'text-red-700')}>
                     {admission.risk_score?.toFixed(1) || '0.0'}
                </div>
            </div>
            <div className="bg-gray-100 border border-gray-400 px-2 flex flex-col items-center">
                <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">EWS</div>
                <div className={cn("text-base font-bold", admission.ews_category === 'low' ? 'text-green-700' : 'text-red-700')}>
                     {admission.ews || '0'}
                </div>
            </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
           <label className="text-xs font-bold text-gray-700 mb-1 block">Clinical Authorization Summary</label>
           <textarea
             placeholder="Final notes..."
             value={note}
             onChange={(e) => setNote(e.target.value)}
             className="w-full bg-white border border-gray-400 p-2 text-sm outline-none resize-none"
             rows={2}
           />
        </div>
        <button
          onClick={onDischarge}
          disabled={loading}
          className={cn(
            "w-full py-2 px-4 shadow-sm font-bold text-sm",
            suggested
              ? "bg-blue-800 hover:bg-blue-900 text-white border border-blue-900"
              : "bg-gray-200 hover:bg-gray-300 border border-gray-400 text-gray-800"
          )}
        >
          {loading ? 'PROCESSING...' : 'AUTHORIZE DEPARTURE'}
        </button>
      </div>
    </div>
  );
}





function NurseMedicationRoundTab() {
  const [items, setItems] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [administering, setAdministering] = useState<number | null>(null);
  const [adminNote, setAdminNote] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [medRes, wardRes] = await Promise.all([
        fetch(`${API}/medications/pending`, { headers: ah() }),
        fetch(`${API}/wards`, { headers: ah() })
      ]);
      if (medRes.ok) {
        const d = await medRes.json();
        setItems(d.data || []);
      }
      if (wardRes.ok) {
        const d = await wardRes.json();
        setWards(d.data || []);
      }
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdminister = async (prescriptionId: number, status: string = 'given') => {
    try {
      const res = await fetch(`${API}/medications/administer`, {
        method: 'POST',
        headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescription_id: prescriptionId,
          status,
          notes: adminNote
        })
      });
      if (res.ok) {
        setAdministering(null);
        setAdminNote('');
        fetchData();
      }
    } catch (_) { }
  };

  const filteredItems = selectedWard === 'all'
    ? items
    : items.filter(i => i.ward_name === selectedWard);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Medication Rounds</h1>
          <p className="text-slate-500 font-medium">Verified administration tracking for active clinical prescriptions.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-black uppercase text-slate-500">Filter Ward:</label>
          <select
            value={selectedWard}
            onChange={e => setSelectedWard(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Wards</option>
            {wards.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center bg-white rounded-xl border border-dashed">
          <Loader2 className="animate-spin inline-block text-indigo-500" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-xl border border-slate-100 shadow-sm">
          <CheckCircle className="w-16 h-16 text-emerald-100 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">All medications administered</p>
          <p className="text-slate-500">There are no pending medication orders for the current round.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div key={item.prescription_id} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-indigo-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">{item.ward_name} · Bed {item.bed_number}</div>
                  <h3 className="text-lg font-bold text-slate-800">{item.patient_name}</h3>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl text-slate-500 group-hover:text-indigo-500 transition-colors">
                  <ClipboardList size={20} />
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <p className="text-sm font-black text-slate-900">{item.medication_name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">{item.dose}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{item.route} · {item.frequency}</span>
                </div>
              </div>

              {administering === item.prescription_id ? (
                <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                  <textarea
                    autoFocus
                    placeholder="Admin notes (optional)..."
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all resize-none"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAdminister(item.prescription_id, 'given')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-100"
                    >
                      Confirm Given
                    </button>
                    <button
                      onClick={() => setAdministering(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAdminister(item.prescription_id, 'refused')} className="flex-1 text-[8px] font-bold uppercase text-rose-500 hover:bg-rose-50 py-1 rounded-lg border border-rose-100">Patient Refused</button>
                    <button onClick={() => handleAdminister(item.prescription_id, 'held')} className="flex-1 text-[8px] font-bold uppercase text-amber-500 hover:bg-amber-50 py-1 rounded-lg border border-amber-100">Held by Doctor</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAdministering(item.prescription_id)}
                  className="w-full bg-white border border-slate-200 text-slate-800 hover:bg-indigo-600  py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 group/btn"
                >
                  <RefreshCw size={14} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                  Administer Dose
                </button>
              )}

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-medium text-slate-500">
                <span>Last Dose: {item.last_administered ? new Date(item.last_administered).toLocaleTimeString() : 'Never'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function NurseHandoverTab() {
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState<number | null>(null);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Create Handover State
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    shift_name: 'Morning',
    summary: '',
    patient_updates: {} as { [key: number]: string }
  });

  const fetchWards = useCallback(async () => {
    try {
      const res = await fetch(`${API}/wards`, { headers: ah() });
      if (res.ok) {
        const d = await res.json();
        const data = d.data || [];
        setWards(data);
        if (data.length > 0 && !selectedWard) {
          setSelectedWard(data[0].id);
        }
      }
    } catch (_) { }
  }, [selectedWard]);

  const fetchHandovers = useCallback(async () => {
    if (!selectedWard) return;
    setLoading(true);
    try {
      const [hRes, pRes] = await Promise.all([
        fetch(`${API}/handovers/ward/${selectedWard}`, { headers: ah() }),
        fetch(`${API}/admissions?status=active&ward_id=${selectedWard}`, { headers: ah() })
      ]);
      if (hRes.ok) {
        const d = await hRes.json();
        setHandovers(d.data || []);
      }
      if (pRes.ok) {
        const d = await pRes.json();
        setPatients(d.rows || []);
      }
    } catch (_) { }
    setLoading(false);
  }, [selectedWard]);

  useEffect(() => { fetchWards(); }, [fetchWards]);
  useEffect(() => { fetchHandovers(); }, [fetchHandovers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/handovers`, {
        method: 'POST',
        headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ward_id: selectedWard,
          ...formData
        })
      });
      if (res.ok) {
        setIsCreating(false);
        setFormData({ shift_name: 'Morning', summary: '', patient_updates: {} });
        fetchHandovers();
      }
    } catch (_) { }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Shift Handover</h1>
          <p className="text-slate-500 font-medium">Coordinate clinical care continuity between nursing shifts.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedWard || ''}
            onChange={e => setSelectedWard(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button
            onClick={() => setIsCreating(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <Users size={18} /> New Handover
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Previous Logs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Handover History</h3>
          {loading ? (
            <div className="p-20 text-center bg-white rounded-xl border border-dashed"><Loader2 className="animate-spin inline-block text-indigo-500" /></div>
          ) : handovers.length === 0 ? (
            <div className="p-20 text-center bg-white rounded-xl border border-slate-100 text-slate-500">No recent handovers recorded for this ward.</div>
          ) : (
            handovers.map(h => (
              <div key={h.id} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">{h.shift_name} Shift</span>
                    <span className="text-xs font-bold text-slate-800">By {h.author_name}</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">{new Date(h.created_at).toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-600 leading-relaxed italic">"{h.summary}"</p>
                </div>
                {h.patient_updates && Object.keys(h.patient_updates).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(h.patient_updates).map(([pid, note]: any) => {
                      return (
                        <div key={pid} className="px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-[10px] font-medium text-slate-500">
                          <span className="font-bold text-indigo-600">Patient #{pid}:</span> {note}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right Sidebar: Active Patients in Ward */}
        <div className="flex flex-col gap-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Active Patients</h3>
          <div className="flex flex-col gap-3">
            {patients.map(p => (
              <div key={p.id} className="bg-white border border-slate-50 p-4 rounded-lg flex items-center justify-between group hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">{p.bed_number}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{p.patient_name}</p>
                    <p className="text-[10px] text-slate-500">{p.diagnosis}</p>
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                  p.risk_category === 'low' ? 'bg-emerald-50 text-emerald-600' : p.risk_category === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                )}>
                  {p.risk_category}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* New Handover Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white border border-slate-200 text-slate-800/60 " onClick={() => setIsCreating(false)} />
          <div className="bg-white rounded-xl w-full max-w-2xl relative shadow-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Shift Handover Record</h3>
                <p className="text-slate-500 text-sm font-medium">Record ward-level summaries and specific patient observations.</p>
              </div>
              <button onClick={() => setIsCreating(false)} className="bg-slate-50 p-2 rounded-xl text-slate-500">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Shift</label>
                  <select
                    value={formData.shift_name}
                    onChange={e => setFormData({ ...formData, shift_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-5 py-3 text-sm font-bold"
                  >
                    <option>Morning</option>
                    <option>Afternoon</option>
                    <option>Night</option>
                    <option>Emergency</option>
                  </select>
                </div>
                <div className="flex items-end pb-3 text-[10px] font-bold text-slate-500">
                  Ward: {wards.find(w => w.id === selectedWard)?.name}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">General Ward Summary</label>
                <textarea
                  required
                  placeholder="E.g. Ward is stable, 2 pending admissions, code blue earlier at 04:00..."
                  value={formData.summary}
                  onChange={e => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-lg p-5 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all min-h-[100px]"
                />
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Critical Patient Updates</label>
                {patients.map(p => (
                  <div key={p.id} className="flex gap-4 items-start bg-slate-50/50 p-4 rounded-lg border border-slate-100/50">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">{p.bed_number}</div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-800 mb-2">{p.patient_name}</p>
                      <input
                        placeholder="Specific handover notes for this patient..."
                        value={formData.patient_updates[p.id] || ''}
                        onChange={e => setFormData({
                          ...formData,
                          patient_updates: { ...formData.patient_updates, [p.id]: e.target.value }
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] outline-none focus:ring-2 focus:ring-indigo-500/10"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-lg font-black shadow-md shadow-indigo-100 transition-all active:scale-[0.98] mt-4"
              >
                Submit Clinical Handover
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


function PatientHistoryTab() {
  const { currentUser } = useAuth();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.patientId) return;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API}/patients/${currentUser.patientId}/timeline`, { headers: ah() });
        if (res.ok) {
          const d = await res.json();
          setTimeline(d.timeline || []);
          setSummary(d.summary || null);
        }
      } catch (_) { }
      setLoading(false);
    };
    fetchHistory();
  }, [currentUser?.patientId]);

  if (loading) return (
    <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
      Reconstructing Medical Timeline...
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 flex flex-col gap-6">
      <div className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0 uppercase flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-gray-700" />
            Comprehensive Timeline
          </h1>
          <p className="text-sm font-bold text-gray-700 mt-1">Immutable longitudinal history of your medical journey.</p>
        </div>
        {summary && (
          <div className="flex gap-2">
            <div className="bg-gray-100 border border-gray-400 p-2 text-center shadow-sm">
              <div className="text-xs font-bold text-gray-600 uppercase">Admissions</div>
              <div className="text-lg font-bold text-gray-900 font-mono">{summary.total_admissions}</div>
            </div>
            <div className="bg-gray-100 border border-gray-400 p-2 text-center shadow-sm">
              <div className="text-xs font-bold text-gray-600 uppercase">Treatments</div>
              <div className="text-lg font-bold text-gray-900 font-mono">{summary.total_prescriptions}</div>
            </div>
          </div>
        )}
      </div>

      {timeline.length === 0 ? (
        <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
          No History Recorded
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {timeline.map((ev, idx) => (
            <div key={ev.id} className="bg-white border border-gray-400 shadow-sm flex flex-col md:flex-row">
              <div className={cn(
                "w-full md:w-48 p-4 border-b md:border-b-0 md:border-r border-gray-300 flex flex-col justify-center items-center text-center",
                ev.event_type === 'admission' ? 'bg-blue-100 text-blue-900' :
                  ev.event_type === 'alert' ? 'bg-red-100 text-red-900' :
                    ev.event_type === 'prescription' ? 'bg-green-100 text-green-900' :
                      'bg-gray-200 text-gray-900'
              )}>
                <div className="font-bold uppercase tracking-widest text-xs mb-1">{ev.event_type}</div>
                <div className="font-black text-sm uppercase">
                  {new Date(ev.created_at).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                </div>
                <div className="text-xs font-bold font-mono mt-1">
                  {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-2 border-b border-gray-300 pb-2 flex-wrap gap-2">
                  <h4 className="text-lg font-bold text-gray-900 tracking-tight uppercase m-0 leading-none">{ev.event_type} Recorded</h4>
                  {ev.created_by_name && <span className="bg-gray-200 border border-gray-400 px-2 py-0.5 text-[10px] font-bold text-gray-800 uppercase tracking-widest block shadow-sm">Authorized By {ev.created_by_name}</span>}
                </div>
                <p className="text-sm font-bold text-gray-700 leading-relaxed mb-4">
                  {ev.description}
                </p>

                {ev.detail && ev.event_type === 'admission' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-300 pt-4">
                    <div className="bg-gray-50 border border-gray-400 p-2 shadow-sm flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-gray-600 block">Attending Unit</span>
                      <span className="text-sm font-bold text-gray-900">{ev.detail.ward_name} &bull; Bed {ev.detail.bed_number}</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-400 p-2 shadow-sm flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase text-gray-600 block">Initial Diagnosis</span>
                      <span className="text-sm font-bold text-gray-900">{ev.detail.diagnosis}</span>
                    </div>
                  </div>
                )}

                {ev.detail && ev.event_type === 'prescription' && (
                  <div className="border-t border-gray-300 pt-4 mt-auto">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 bg-green-50 p-2 border border-green-300 shadow-sm">
                      <div className="bg-white text-green-900 border border-green-400 px-2 py-1 text-sm font-bold uppercase shadow-sm whitespace-nowrap">
                        {ev.detail.medication_name} {ev.detail.dose}
                      </div>
                      <span className="text-xs font-bold text-gray-600 uppercase">
                        {ev.detail.frequency} &bull; {ev.detail.route}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnifiedAppointmentsTab() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [newAppt, setNewAppt] = useState({ doctor_id: '', appointment_at: '', reason: '', location: 'Clinic A' });
  const role = currentUser?.role;

  const fetchItems = useCallback(async () => {
    const role = currentUser?.role?.toLowerCase();
    const pid = currentUser?.patientId;
    setLoading(true);
    try {
      const url = role === 'patient' && pid
        ? `${API}/patients/${pid}/appointments`
        : `${API}/appointments`;
      const res = await fetch(url, { headers: ah() });

      if (res.ok) {
        const d = await res.json();
        setData(d.data || d.rows || []);
      }
    } catch (_) { }
    setLoading(false);
  }, [currentUser?.patientId, role]);

  useEffect(() => {
    fetchItems();
    if (role !== 'patient') {
      fetch(`${API}/doctors`, { headers: ah() }).then(r => r.json()).then(d => setDocs(d.data || []));
    } else {
      fetch(`${API}/doctors`, { headers: ah() }).then(r => r.json()).then(d => setDocs(d.data || []));
    }
  }, [fetchItems, role]);

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      const res = await fetch(`${API}/appointments/${id}/status`, {
        method: 'PUT',
        headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchItems();
    } catch (_) { }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = currentUser?.patientId;
    if (!pid) return;
    try {
      const res = await fetch(`${API}/patients/${pid}/appointments`, {
        method: 'POST',
        headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppt)
      });
      if (res.ok) {
        setIsBooking(false);
        setNewAppt({ doctor_id: '', appointment_at: '', reason: '', location: 'Clinic A' });
        fetchItems();
      }
    } catch (_) { }
  };

  return (
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-gray-900">
      <div className="border-b-2 border-blue-800 pb-2 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 m-0">Clinical Calendar</h1>
        </div>
        <div>
          {role === 'patient' && (
            <button
              onClick={() => setIsBooking(true)}
              className="bg-gray-200 border border-gray-400 px-3 py-1 text-sm font-bold shadow-sm hover:bg-gray-300 active:bg-gray-400"
            >
              + Schedule New Appointment
            </button>
          )}
        </div>
      </div>
      
      <p className="mb-4 text-sm font-bold text-gray-700">Manage patient visits and specialist availability.</p>

      <div className="bg-white border border-gray-400 shadow-sm overflow-x-auto">
         <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-400 p-2 font-bold text-gray-800 text-sm">
             Scheduled Appointments List
         </div>
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-200 border-b border-gray-400">
              <th className="p-2 border-r border-gray-300 font-bold">Date & Time</th>
              <th className="p-2 border-r border-gray-300 font-bold">{role === 'patient' ? 'Doctor' : 'Patient'}</th>
              <th className="p-2 border-r border-gray-300 font-bold">Reason</th>
              <th className="p-2 border-r border-gray-300 font-bold">Status</th>
              <th className="p-2 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-600 italic">Accessing calendar records...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-600 italic">No appointments scheduled.</td>
              </tr>
            ) : (
                data.map(a => (
                  <tr key={a.id} className="border-b border-gray-200 hover:bg-yellow-50 transition-colors">
                    <td className="p-2 border-r border-gray-200">
                      {new Date(a.appointment_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-2 border-r border-gray-200 font-bold">
                      {role === 'patient' ? `Dr. ${a.doctor_name}` : a.patient_name}
                      {role !== 'patient' && <div className="text-xs font-normal text-gray-600">With: Dr. {a.doctor_name}</div>}
                    </td>
                    <td className="p-2 border-r border-gray-200 italic text-gray-700">"{a.reason}"</td>
                    <td className="p-2 border-r border-gray-200 font-bold">
                       <span className={
                         a.status === 'scheduled' ? 'text-blue-700' :
                         a.status === 'completed' ? 'text-green-700' : 'text-red-700'
                       }>{a.status.toUpperCase()}</span>
                    </td>
                    <td className="p-2 text-center">
                        {a.status === 'scheduled' && (
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleStatusUpdate(a.id, 'completed')} className="text-green-700 hover:underline font-bold text-xs">[ Complete ]</button>
                            <button onClick={() => handleStatusUpdate(a.id, 'cancelled')} className="text-red-700 hover:underline font-bold text-xs">[ Cancel ]</button>
                          </div>
                        )}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {isBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75">
          <div className="bg-white border-2 border-gray-600 shadow-xl w-full max-w-lg font-sans">
             <div className="bg-blue-800 text-white font-bold p-2 flex justify-between items-center text-sm">
                 <span>Book Appointment Interface</span>
                 <button onClick={() => setIsBooking(false)} className="bg-gray-300 border border-gray-500 text-black px-2 hover:bg-gray-400 font-bold">X</button>
             </div>
             <div className="p-4 text-sm">
                <form onSubmit={handleBook} className="space-y-4">
                   <div className="flex flex-col">
                      <label className="font-bold mb-1">Specialist *</label>
                      <select required className="border border-gray-400 p-1 bg-white" value={newAppt.doctor_id} onChange={e => setNewAppt({ ...newAppt, doctor_id: e.target.value })}>
                         <option value="">-- Select --</option>
                         {docs.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty})</option>)}
                      </select>
                   </div>
                   <div className="flex flex-col">
                      <label className="font-bold mb-1">Date & Time *</label>
                      <input type="datetime-local" required className="border border-gray-400 p-1 bg-white" value={newAppt.appointment_at} onChange={e => setNewAppt({ ...newAppt, appointment_at: e.target.value })}/>
                   </div>
                   <div className="flex flex-col">
                      <label className="font-bold mb-1">Reason for Visit *</label>
                      <textarea placeholder="Condition..." required className="border border-gray-400 p-1 bg-white h-24" value={newAppt.reason} onChange={e => setNewAppt({ ...newAppt, reason: e.target.value })} />
                   </div>
                   <div className="flex justify-end gap-2 mt-4 border-t border-gray-300 pt-4">
                      <button type="submit" className="bg-gray-200 border border-gray-400 px-4 py-1 font-bold shadow-sm hover:bg-gray-300">Submit Booking Data</button>
                   </div>
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}


function DoctorConsultsTab() {
  const { currentUser } = useAuth();
  const [consults, setConsults] = useState<any[]>([]);
  const [allSymptoms, setAllSymptoms] = useState<any[]>([]);
  const [allMedications, setAllMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsult, setSelectedConsult] = useState<any>(null);
  const [resolution, setResolution] = useState({ findings: '', recommendations: '' });
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<number[]>([]);
  const [prescriptions, setPrescriptions] = useState<{ medication_id: number; dose: string; frequency: string; route: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchConsults = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes, mRes] = await Promise.all([
        fetch(`${API}/consults`, { headers: ah() }),
        fetch(`${API}/symptoms`, { headers: ah() }),
        fetch(`${API}/medications`, { headers: ah() }),
      ]);
      if (cRes.ok) { const d = await cRes.json(); setConsults(d.data || []); }
      if (sRes.ok) { const d = await sRes.json(); setAllSymptoms(d.data || []); }
      if (mRes.ok) { const d = await mRes.json(); setAllMedications(d.data || []); }
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConsults(); }, [fetchConsults]);

  const toggleSymptom = (id: number) => {
    setSelectedSymptomIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const addPrescriptionLine = () => {
    if (allMedications.length === 0) return;
    setPrescriptions(prev => [...prev, { medication_id: allMedications[0].id, dose: '', frequency: 'OD', route: 'oral' }]);
  };

  const updateRx = (idx: number, key: string, val: string | number) => {
    setPrescriptions(prev => prev.map((rx, i) => i === idx ? { ...rx, [key]: val } : rx));
  };

  const removeRx = (idx: number) => {
    setPrescriptions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleResolve = async () => {
    if (!selectedConsult || !resolution.findings || !resolution.recommendations) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/consults/${selectedConsult.id}/resolve`, {
        method: 'POST',
        headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findings: resolution.findings,
          recommendations: resolution.recommendations,
          symptomIds: selectedSymptomIds,
          prescriptions: prescriptions.filter(rx => rx.dose.trim() !== '')
        })
      });
      if (res.ok) {
        setSelectedConsult(null);
        setResolution({ findings: '', recommendations: '' });
        setSelectedSymptomIds([]);
        setPrescriptions([]);
        fetchConsults();
      }
    } catch (_) { }
    setSubmitting(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900">
      <div className="border-b-2 border-blue-800 pb-2 mb-6">
          <h1 className="text-2xl font-bold text-blue-900 m-0">Specialist Consultations</h1>
          <p className="text-sm font-bold text-gray-700 mt-1">Inter-departmental referrals and clinical escalations.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Consults List */}
        <div className="lg:flex-[1.5] w-full flex flex-col gap-4">
          <div className="bg-gray-200 border border-gray-400 p-2 font-bold text-sm shadow-sm flex justify-between">
             <span>Pending Consultation Requests</span>
             <span>Total: {consults.length}</span>
          </div>
          {loading ? (
            <div className="p-10 text-center font-bold text-gray-600 bg-white border border-gray-400">Loading remote feed...</div>
          ) : consults.length === 0 ? (
            <div className="p-10 text-center font-bold text-gray-600 bg-white border border-gray-400">
              No pending consultation requests.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {consults.map(c => (
                <div
                  key={c.id}
                  className={cn(
                    "border border-gray-400 p-3 shadow-sm flex justify-between items-center bg-white cursor-pointer hover:bg-gray-50",
                    c.id === selectedConsult?.id ? "bg-blue-50 border-blue-500 border-2" : ""
                  )}
                  onClick={() => { setSelectedConsult(c); setSelectedSymptomIds([]); setPrescriptions([]); setResolution({ findings: '', recommendations: '' }); }}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "px-2 py-1 border font-bold text-xs uppercase",
                      c.priority === 'urgent' ? 'bg-red-100 text-red-800 border-red-400' : c.priority === 'stat' ? 'bg-red-200 text-red-900 border-red-500' : 'bg-yellow-100 text-yellow-800 border-yellow-400'
                    )}>
                      {c.priority === 'stat' ? 'STAT' : c.priority === 'urgent' ? 'URGENT' : 'ROUTINE'}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{c.specialty} Request</h4>
                      <p className="text-xs text-gray-700">Patient: {c.patient_name} · From Dr. {c.requesting_dr_name}</p>
                      <p className="text-xs text-gray-600 mt-1 italic">"{c.reason}"</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                    <span className={cn("text-xs font-bold px-2 py-1 border",
                      c.status === 'pending' ? "bg-yellow-50 text-yellow-800 border-yellow-300" : "bg-green-50 text-green-800 border-green-300"
                    )}>{c.status.toUpperCase()}</span>
                    {c.status === 'pending' && c.id !== selectedConsult?.id && (
                      <span className="text-sm font-bold text-blue-700 underline">Select</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Resolution Panel */}
        <div className="lg:flex-1 w-full bg-white border border-gray-400 shadow-sm flex flex-col min-h-[400px]">
          <div className="bg-gray-200 border-b border-gray-400 p-2 font-bold text-sm shadow-sm flex justify-between">
             <span>Resolution Plan</span>
             {selectedConsult && <span className="text-gray-600">ID: #{selectedConsult.id}</span>}
          </div>

          <div className="p-4 flex-col gap-4 flex bg-gray-50 h-full overflow-y-auto max-h-[85vh]">
            {selectedConsult ? (
              <>
                <div className="bg-white border border-gray-400 p-3 shadow-sm">
                  <label className="font-bold text-sm text-gray-800 block mb-1">Clinical Findings <span className="text-red-600">*</span></label>
                  <textarea
                    value={resolution.findings}
                    onChange={e => setResolution(prev => ({ ...prev, findings: e.target.value }))}
                    className="w-full border border-gray-300 p-2 text-sm outline-none bg-white min-h-[80px]"
                    placeholder="Enter key diagnostic observations..."
                  />
                </div>

                <div className="bg-white border border-gray-400 p-3 shadow-sm">
                  <label className="font-bold text-sm text-gray-800 block mb-1">Recommendations <span className="text-red-600">*</span></label>
                  <textarea
                    value={resolution.recommendations}
                    onChange={e => setResolution(prev => ({ ...prev, recommendations: e.target.value }))}
                    className="w-full border border-gray-300 p-2 text-sm outline-none bg-white min-h-[80px]"
                    placeholder="Advised treatment / next steps..."
                  />
                </div>

                <div className="bg-white border border-gray-400 p-3 shadow-sm">
                  <label className="font-bold text-sm text-gray-800 block mb-2">Presenting Symptoms (Tagging)</label>
                  <div className="flex flex-wrap gap-1 border border-gray-300 bg-gray-50 p-2">
                    {allSymptoms.map(sym => (
                      <button
                        key={sym.id}
                        onClick={() => toggleSymptom(sym.id)}
                        className={cn(
                          "px-2 py-1 text-xs font-bold border transition-colors",
                          selectedSymptomIds.includes(sym.id)
                            ? "bg-blue-600 text-white border-blue-800"
                            : "bg-white text-gray-700 border-gray-400 hover:bg-gray-200"
                        )}
                      >
                        {sym.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-400 p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-bold text-sm text-gray-800">Prescriptions</label>
                    <button
                      onClick={addPrescriptionLine}
                      className="text-xs font-bold bg-gray-200 border border-gray-400 px-3 py-1 shadow-sm hover:bg-gray-300"
                    >
                      + Add Single Drug
                    </button>
                  </div>
                  {prescriptions.length === 0 ? (
                    <div className="text-sm italic text-gray-500 py-2">No prescriptions mapped.</div>
                  ) : (
                    <div className="flex flex-col gap-2 border-t border-gray-300 pt-2 relative">
                      {prescriptions.map((rx, idx) => (
                        <div key={idx} className="bg-gray-100 border border-gray-300 p-2 flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-700">Line #{idx + 1}</span>
                            <button onClick={() => removeRx(idx)} className="text-red-700 font-bold text-xs underline hover:text-red-900">Remove</button>
                          </div>
                          <select
                            value={rx.medication_id}
                            onChange={e => updateRx(idx, 'medication_id', Number(e.target.value))}
                            className="bg-white border border-gray-400 p-1 text-sm outline-none w-full"
                          >
                            {allMedications.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.category})</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Dose (e.g. 500mg)"
                              value={rx.dose}
                              onChange={e => updateRx(idx, 'dose', e.target.value)}
                              className="bg-white border border-gray-400 p-1 text-sm outline-none flex-1"
                            />
                            <select
                              value={rx.frequency}
                              onChange={e => updateRx(idx, 'frequency', e.target.value)}
                              className="bg-white border border-gray-400 p-1 text-sm outline-none"
                            >
                              {['OD', 'BID', 'TID', 'QID', 'PRN', 'STAT', 'AC', 'HS'].map(f => <option key={f}>{f}</option>)}
                            </select>
                            <select
                              value={rx.route}
                              onChange={e => updateRx(idx, 'route', e.target.value)}
                              className="bg-white border border-gray-400 p-1 text-sm outline-none w-24"
                            >
                              {['oral', 'IV', 'IM', 'SQ', 'topical', 'inhaled', 'sublingual'].map(r => <option key={r}>{r}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex gap-4 pt-4 border-t border-gray-400 pb-4">
                  <button
                    onClick={handleResolve}
                    disabled={submitting || !resolution.findings || !resolution.recommendations}
                    className="flex-1 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 font-bold shadow-sm"
                  >
                    {submitting ? 'PROCESSING...' : 'SUBMIT RESOLUTION'}
                  </button>
                  <button 
                    onClick={() => setSelectedConsult(null)} 
                    className="px-4 bg-gray-200 border border-gray-400 text-gray-800 font-bold hover:bg-gray-300 shadow-sm"
                  >
                     CANCEL
                  </button>
                </div>
              </>
            ) : (
                <div className="h-full flex items-center justify-center font-bold text-gray-500 italic p-10 text-center border-2 border-dashed border-gray-300 bg-white min-h-[300px]">
                  PLEASE SELECT A SPECIALIST CONSULT TO REVIEW
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientPrescriptionsTab() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pid = currentUser?.patientId;
    if (!pid) return;

    async function fetchItems() {
      try {
        const res = await fetch(`${API}/patients/${pid}/prescriptions`, { headers: ah() });
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
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 flex flex-col gap-6">
      <div className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0 uppercase flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-gray-700" />
            My Treatment Plan
          </h1>
          <p className="text-sm font-bold text-gray-700 mt-1">Active medication regimens and prescribed dosage protocols.</p>
        </div>
        <div className="bg-gray-100 border border-gray-400 px-4 py-2 text-center shadow-sm">
          <div className="text-xs font-bold text-gray-600 uppercase">Active Orders</div>
          <div className="text-lg font-bold text-gray-900 font-mono">{data.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
          Fetching Treatments...
        </div>
      ) : data.length === 0 ? (
        <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
          No Active Medications
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(rx => (
            <div key={rx.id} className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col">
              <div className="flex justify-between items-start mb-4 border-b border-gray-300 pb-2">
                <div className="bg-gray-100 p-1 border border-gray-400 text-gray-700">
                  <Thermometer size={24} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-green-900 bg-green-100 px-2 border border-green-400 shadow-sm">{rx.status}</span>
                  <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest bg-gray-200 px-2 border border-gray-400 shadow-sm">{rx.route}</span>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 tracking-tight uppercase mb-2 leading-none">{rx.medication_name}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-white border text-gray-900 border-gray-400 px-2 py-0.5 text-xs font-bold shadow-sm uppercase whitespace-nowrap">{rx.dose}</div>
                  <div className="text-xs font-bold text-gray-700 uppercase">{rx.frequency}</div>
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-gray-300 flex items-center gap-2">
                <div className="bg-gray-200 border border-gray-400 px-2 py-1 text-[10px] font-bold text-gray-800 uppercase shadow-sm">
                  {rx.prescribed_by_name?.charAt(0)}
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  Physician: <span className="text-gray-900">Dr. {rx.prescribed_by_name}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Patient-only Vitals Component ──────────────────────────────────────────
function OrderLabModal({ isOpen, onClose, admissionId, onOrder }: { isOpen: boolean, onClose: () => void, admissionId: number, onOrder: () => void }) {
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<number | ''>('');
  const [priority, setPriority] = useState('routine');
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch(`${API}/labs/tests`, { headers: ah() }).then(res => res.json()).then(d => setTests(d.data || []));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white border border-slate-200 text-slate-800/40  z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-10 shadow-md animate-in fade-in zoom-in duration-300">
        <h3 className="text-2xl font-black text-slate-900 mb-2">Order Lab Test</h3>
        <p className="text-sm text-slate-500 mb-8">Select a diagnostic investigation from the clinical catalog.</p>
        
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Investigation Type</label>
            <select 
              value={selectedTest} 
              onChange={e => setSelectedTest(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
            >
              <option value="">-- Choose Analysis --</option>
              {tests.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['routine', 'urgent', 'stat'].map(p => (
                <button 
                  key={p} 
                  onClick={() => setPriority(p)}
                  className={cn(
                    "py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    priority === p ? "bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-500/20" : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={onClose} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-600 transition-colors">Cancel</button>
            <button 
              disabled={ordering || !selectedTest}
              onClick={async () => {
                setOrdering(true);
                try {
                  const res = await fetch(`${API}/labs/order`, {
                    method: 'POST',
                    headers: { ...ah(), 'Content-Type': 'application/json' },
                    body: JSON.stringify({ admission_id: admissionId, test_id: selectedTest, priority })
                  });
                  if (res.ok) { onOrder(); onClose(); }
                } catch(e) {}
                setOrdering(false);
              }}
              className="flex-1 bg-white border border-slate-200 text-slate-800  py-4 rounded-lg text-xs font-black uppercase tracking-widest shadow-md disabled:opacity-50"
            >
              {ordering ? 'Transmitting...' : 'Confirm Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordResultsModal({ isOpen, onClose, order, onComplete }: { isOpen: boolean, onClose: () => void, order: any, onComplete: () => void }) {
  const [params, setParams] = useState([{ name: '', value: '', abnormal: false }]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-white border border-slate-200 text-slate-800/40  z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-10 shadow-md animate-in fade-in zoom-in duration-300">
        <h3 className="text-2xl font-black text-slate-900 mb-2">Record Findings</h3>
        <p className="text-sm text-slate-500 mb-8 uppercase font-bold tracking-widest">{order.test_name} · Order #{order.id}</p>
        
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {params.map((p, i) => (
            <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <input 
                placeholder="Parameter (e.g. Hemoglobin)" 
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-300"
                value={p.name}
                onChange={e => {
                  const n = [...params];
                  n[i].name = e.target.value;
                  setParams(n);
                }}
              />
              <input 
                placeholder="Value" 
                className="w-20 bg-transparent border-none outline-none text-sm font-black text-indigo-600 placeholder:text-slate-300 text-right"
                value={p.value}
                onChange={e => {
                  const n = [...params];
                  n[i].value = e.target.value;
                  setParams(n);
                }}
              />
              <button 
                onClick={() => {
                  const n = [...params];
                  n[i].abnormal = !n[i].abnormal;
                  setParams(n);
                }}
                className={cn("w-6 h-6 rounded-lg flex items-center justify-center transition-all", p.abnormal ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-500")}
              >
                <AlertTriangle size={12} />
              </button>
            </div>
          ))}
        </div>

        <button 
          onClick={() => setParams([...params, { name: '', value: '', abnormal: false }])}
          className="w-full py-3 mt-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
        >
          + Add Parameter
        </button>

        <div className="flex gap-4 pt-8">
          <button onClick={onClose} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Cancel</button>
          <button 
            disabled={submitting || params.some(p => !p.name || !p.value)}
            onClick={async () => {
              setSubmitting(true);
              try {
                const res = await fetch(`${API}/labs/orders/${order.id}/verify`, {
                  method: 'POST',
                  headers: { ...ah(), 'Content-Type': 'application/json' },
                  body: JSON.stringify({ results: params.map(p => ({ parameter_name: p.name, result_value: p.value, is_abnormal: p.abnormal })) })
                });
                if (res.ok) { onComplete(); onClose(); }
              } catch(e) {}
              setSubmitting(false);
            }}
            className="flex-1 bg-indigo-600 text-white py-4 rounded-lg text-xs font-black uppercase tracking-widest shadow-md disabled:opacity-50"
          >
            {submitting ? 'Verifying...' : 'Release Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabReportTab() {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedAdm, setSelectedAdm] = useState<number | null>(null);
  const [labData, setLabData] = useState<{ orders: any[], results: any[] }>({ orders: [], results: [] });
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderToVerify, setSelectedOrderToVerify] = useState<any>(null);

  const fetchLabs = useCallback(async () => {
    if (!selectedAdm) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/labs/admission/${selectedAdm}`, { headers: ah() });
      if (res.ok) {
        const d = await res.json();
        setLabData(d.data || { orders: [], results: [] });
      }
    } catch (_) {}
    setLoading(false);
  }, [selectedAdm]);

  useEffect(() => {
    if (currentUser?.role !== 'patient') {
      fetch(`${API}/admissions?status=active`, { headers: ah() })
        .then(res => res.json())
        .then(d => {
          const list = d.data?.rows || d.rows || [];
          setPatients(list);
          if (list.length > 0 && !selectedAdm) setSelectedAdm(list[0].id);
        });
    } else if (currentUser?.patientId) {
      fetch(`${API}/admissions?patient_id=${currentUser.patientId}&status=active`, { headers: ah() })
        .then(res => res.json())
        .then(d => {
          const list = d.data?.rows || d.rows || [];
          if (list.length > 0) setSelectedAdm(list[0].id);
        });
    }
  }, [currentUser]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  return (
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-gray-900">
      <div className="border-b-2 border-blue-800 pb-2 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 m-0">Diagnostic Reports</h1>
        </div>
        <div className="flex gap-2 items-center">
          {currentUser?.role !== 'patient' && (
            <>
              <span className="font-bold text-sm">Patient Adm:</span>
              <select
                value={selectedAdm || ''}
                onChange={e => setSelectedAdm(Number(e.target.value))}
                className="border border-gray-400 bg-white px-2 py-1 text-sm font-bold shadow-sm"
              >
                {patients.map(p => <option key={p.id} value={p.id}>{p.patient_name}</option>)}
              </select>
              {currentUser?.role === 'doctor' && selectedAdm && (
                <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="bg-gray-200 border border-gray-400 px-3 py-1 text-sm font-bold shadow-sm hover:bg-gray-300 active:bg-gray-400 ml-2"
                >
                  + Order Analysis
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <p className="mb-4 text-sm font-bold text-gray-700">Laboratory investigations and pathological findings.</p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Verified Results */}
        <div className="lg:w-2/3 bg-white border border-gray-400 shadow-sm flex flex-col">
          <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-400 p-2 font-bold text-gray-800 text-sm">
             Verified Results Archive
          </div>
          {loading ? (
            <div className="p-4 text-center text-gray-600 italic">Querying laboratory database...</div>
          ) : labData.results.length === 0 ? (
            <div className="p-8 text-center text-gray-600 italic">No reports archived for this admission.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200 border-b border-gray-400">
                    <th className="p-2 border-r border-gray-300 font-bold">Parameter</th>
                    <th className="p-2 border-r border-gray-300 font-bold">Result Value</th>
                    <th className="p-2 border-r border-gray-300 font-bold">Test Type</th>
                    <th className="p-2 font-bold">Verified By / Date</th>
                  </tr>
                </thead>
                <tbody>
                  {labData.results.map(r => (
                    <tr key={r.id} className="border-b border-gray-200 hover:bg-yellow-50">
                      <td className="p-2 border-r border-gray-200 font-bold">{r.parameter_name}</td>
                      <td className="p-2 border-r border-gray-200 font-mono font-bold">
                        <span className={r.is_abnormal ? 'text-red-700 bg-red-100 px-1 border border-red-300' : 'text-green-700'}>
                          {r.result_value} {r.is_abnormal ? '[ABNORMAL]' : ''}
                        </span>
                      </td>
                      <td className="p-2 border-r border-gray-200">{r.test_name}</td>
                      <td className="p-2 text-xs">
                        {r.technician_name} <br/>
                        <span className="text-gray-500">{new Date(r.verified_at).toLocaleDateString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Worklist */}
        <div className="lg:w-1/3 bg-white border border-gray-400 shadow-sm flex flex-col h-fit">
          <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-400 p-2 font-bold text-gray-800 text-sm">
             Pending Worklist
          </div>
          <div className="flex flex-col">
            {labData.orders.filter(o => o.status !== 'completed').length === 0 ? (
              <div className="p-4 text-center text-gray-600 italic">Worklist queue clear.</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200 border-b border-gray-400">
                    <th className="p-2 border-r border-gray-300 font-bold">Test Order</th>
                    <th className="p-2 font-bold">Priority/Status</th>
                  </tr>
                </thead>
                <tbody>
                  {labData.orders.filter(o => o.status !== 'completed').map(o => (
                    <tr key={o.id} className="border-b border-gray-200 hover:bg-yellow-50">
                      <td className="p-2 border-r border-gray-200">
                        <div className="font-bold">{o.test_name}</div>
                        <div className="text-xs text-gray-600">{new Date(o.ordered_at).toLocaleTimeString()}</div>
                        {currentUser?.role === 'admin' && (
                          <button 
                            onClick={() => setSelectedOrderToVerify(o)}
                            className="mt-1 text-blue-700 hover:underline font-bold text-xs"
                          >
                            [ Update Results ]
                          </button>
                        )}
                      </td>
                      <td className="p-2">
                        <div className={`font-bold uppercase ${o.priority === 'stat' ? 'text-red-700' : 'text-blue-700'}`}>{o.priority}</div>
                        <div className="text-xs">{o.status}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {selectedAdm && (
        <OrderLabModal 
          isOpen={isOrderModalOpen} 
          onClose={() => setIsOrderModalOpen(false)} 
          admissionId={selectedAdm} 
          onOrder={fetchLabs} 
        />
      )}
      
      <RecordResultsModal 
        isOpen={!!selectedOrderToVerify} 
        onClose={() => setSelectedOrderToVerify(null)} 
        order={selectedOrderToVerify} 
        onComplete={fetchLabs} 
      />
    </div>
  );
}

function BillingHubTab() {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedAdm, setSelectedAdm] = useState<number | null>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser?.role !== 'patient') {
      fetch(`${API}/admissions?status=active`, { headers: ah() })
        .then(res => res.json())
        .then(d => {
          const list = d.data?.rows || d.rows || [];
          setPatients(list);
          if (list.length > 0) setSelectedAdm(list[0].id);
        });
    } else if (currentUser?.patientId) {
      fetch(`${API}/admissions?patient_id=${currentUser.patientId}`, { headers: ah() })
        .then(res => res.json())
        .then(d => {
          const list = d.data?.rows || d.rows || [];
          if (list.length > 0) setSelectedAdm(list[0].id);
        });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!selectedAdm) return;
    setLoading(true);
    fetch(`${API}/billing/admission/${selectedAdm}`, { headers: ah() })
      .then(res => res.json())
      .then(d => {
        setInvoice(d.data || null);
        setLoading(false);
      });
  }, [selectedAdm]);

  const [generating, setGenerating] = useState(false);

  if (!invoice && !loading) return <div className="p-4 border border-gray-400 m-4 font-bold text-center bg-gray-100 italic">Initializing invoice records...</div>;

  return (
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-gray-900">
      <div className="border-b-2 border-blue-800 pb-2 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 m-0">Hospital Invoicing</h1>
        </div>
        <div className="flex gap-2 items-center text-sm">
          {currentUser?.role !== 'patient' && (
            <>
              <span className="font-bold">Select Admission:</span>
              <select
                value={selectedAdm || ''}
                onChange={e => setSelectedAdm(Number(e.target.value))}
                className="border border-gray-400 bg-white px-2 py-1 font-bold shadow-sm"
              >
                {patients.map(p => <option key={p.id} value={p.id}>{p.patient_name}</option>)}
              </select>
              {selectedAdm && (
                <button
                  onClick={async () => {
                    setGenerating(true);
                    try {
                      const res = await fetch(`${API}/billing/admission/${selectedAdm}/generate`, { method: 'POST', headers: ah() });
                      if (res.ok) {
                        setSelectedAdm(null);
                        setTimeout(() => setSelectedAdm(selectedAdm), 10);
                        alert("Invoice Generated: All clinical charges have been aggregated.");
                      }
                    } catch (e) {}
                    setGenerating(false);
                  }}
                  disabled={generating}
                  className="bg-gray-200 border border-gray-400 px-3 py-1 font-bold shadow-sm hover:bg-gray-300 active:bg-gray-400 ml-2"
                >
                  {generating ? 'Processing...' : 'Generate Detailed Invoice'}
                </button>
              )}
            </>
          )}
          <span className={`px-2 py-1 border font-bold border-gray-400 uppercase ${invoice?.status === 'paid' ? 'bg-green-200 text-green-900' : 'bg-yellow-200 text-yellow-900'}`}>
            STATUS: {invoice?.status || 'DRAFT'}
          </span>
        </div>
      </div>

      <p className="mb-4 text-sm font-bold text-gray-700">Real-time settlement and clinical service pricing.</p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Itemized List */}
        <div className="lg:w-2/3 bg-white border border-gray-400 shadow-sm flex flex-col">
          <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-400 p-2 font-bold text-gray-800 text-sm flex justify-between">
            <span>Itemized Services</span>
            <span className="font-normal">{invoice?.items?.length || 0} Transactions</span>
          </div>
          
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200 border-b border-gray-400">
                <th className="p-2 border-r border-gray-300 font-bold w-24">Type</th>
                <th className="p-2 border-r border-gray-300 font-bold">Description</th>
                <th className="p-2 border-r border-gray-300 font-bold text-right w-20">Qty/Rate</th>
                <th className="p-2 font-bold text-right w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice?.items?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-600 italic">No services recorded yet for this admission.</td>
                </tr>
              ) : (
                invoice?.items.map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-yellow-50">
                    <td className="p-2 border-r border-gray-200 font-bold uppercase text-xs text-blue-800">{item.item_type}</td>
                    <td className="p-2 border-r border-gray-200 font-bold">{item.item_name}</td>
                    <td className="p-2 border-r border-gray-200 text-right text-xs">Qty: {item.quantity}<br/>${item.unit_price}</td>
                    <td className="p-2 text-right font-mono font-bold">${item.total_price}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary Sidebar */}
        <div className="lg:w-1/3 flex flex-col gap-6">
          <div className="bg-gray-100 border border-gray-400 shadow-sm p-4 font-mono text-sm h-fit">
            <h4 className="font-bold border-b border-black pb-2 mb-4 text-center tracking-widest uppercase">Financial Summary</h4>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span>Gross Amount:</span>
                <span>${invoice?.total_amount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Inst. Discount:</span>
                <span>-$0.00</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Applicable Tax:</span>
                <span>$0.00</span>
              </div>
              <div className="border-t border-black border-dashed my-2"></div>
              <div className="flex justify-between items-center font-bold text-lg">
                <span>NET BALANCE:</span>
                <span>${invoice?.total_amount}</span>
              </div>
              
              <div className="border-t border-black my-4"></div>
              
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                   <span>Invoice ID:</span>
                   <span>#INV-{invoice?.id ? String(invoice.id).padStart(4, '0') : '0000'}</span>
                </div>
                <div className="flex justify-between">
                   <span>Admission:</span>
                   <span>#ADM-{invoice?.admission_id || 'N/A'}</span>
                </div>
              </div>

              {invoice?.status === 'paid' ? (
                <div className="mt-6 border border-black p-2 text-center font-bold bg-green-200">
                   *** SETTLEMENT COMPLETE ***
                </div>
              ) : (
                <button
                  onClick={async () => {
                    if (!invoice) return;
                    try {
                      const res = await fetch(`${API}/billing/admission/${invoice.admission_id}/pay`, { method: 'POST', headers: ah() });
                      if (res.ok) {
                        setSelectedAdm(null);
                        setTimeout(() => setSelectedAdm(invoice.admission_id), 10);
                      }
                    } catch (_) { }
                  }}
                  className="mt-6 bg-gray-300 border border-black py-2 font-bold hover:bg-gray-400 active:bg-gray-500 w-full"
                >
                  SETTLE PAYMENT &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatientVitalsTab() {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVitals = useCallback(async () => {
    if (!currentUser?.patientId) return;
    try {
      const res = await fetch(`${API}/vitals/${currentUser.patientId}?limit=50`, { headers: ah() });
      if (res.ok) {
        const d = await res.json();
        setHistory((d.data || []).reverse());
      }
    } catch (_) { }
    setLoading(false);
  }, [currentUser?.patientId]);

  useEffect(() => {
    fetchVitals();
    const id = setInterval(fetchVitals, 10000);
    return () => clearInterval(id);
  }, [fetchVitals]);

  if (loading) return (
    <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm">
      LOADING HEALTH TELEMETRY...
    </div>
  );

  const latest = history[history.length - 1];

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 flex flex-col gap-6">
      <div className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0 uppercase flex items-center gap-2">
            <Activity className="w-6 h-6 text-gray-700" />
            Health Telemetry
          </h1>
          <p className="text-sm font-bold text-gray-700 mt-1">Real-time physiological insights from clinical ICU sensors.</p>
        </div>
        {latest && (
          <div className="border border-gray-400 bg-gray-100 p-2 text-center shadow-sm flex flex-col items-center">
            <div className="text-xs font-bold text-gray-600 uppercase">Live Sync</div>
            <div className="text-sm font-bold text-gray-900">
              {new Date(latest.recorded_at).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <VitalCard label="Heart Rate" value={latest?.heart_rate || '--'} unit="bpm" icon={<HeartPulse size={24} />} data={history.map(v => ({ val: v.heart_rate }))} />
        <VitalCard label="Oxygen Sat" value={latest?.spo2 || '--'} unit="%" icon={<Wind size={24} />} data={history.map(v => ({ val: v.spo2 }))} />
        <VitalCard label="Blood Pressure" value={latest ? `${latest.systolic_bp}/${latest.diastolic_bp}` : '--'} unit="mmHg" icon={<Activity size={24} />} data={history.map(v => ({ val: v.systolic_bp }))} />
        <VitalCard label="Temperature" value={latest?.temperature || '--'} unit="°C" icon={<Thermometer size={24} />} data={history.map(v => ({ val: v.temperature }))} />
      </div>

      <div className="bg-white border border-gray-400 shadow-sm p-4 relative flex flex-col h-[500px]">
        <h3 className="font-bold text-gray-900 text-lg border-b border-gray-300 pb-2 mb-4 flex items-center gap-2 uppercase">
          <Activity size={20} />
          Cardiovascular Trends
        </h3>
        <div className="flex-1 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#d1d5db" />
              <XAxis dataKey="recorded_at" hide />
              <YAxis axisLine={true} tickLine={true} tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 700 }} />
              <Tooltip
                contentStyle={{ border: '2px solid #1f2937', borderRadius: '0', backgroundColor: '#ffffff', padding: '8px', fontWeight: 'bold' }}
                itemStyle={{ color: '#111827' }}
                labelStyle={{ display: 'none' }}
              />
              <Area type="step" dataKey="heart_rate" stroke="#1f2937" strokeWidth={2} fillOpacity={0.1} fill="#9ca3af" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}


function VitalCard({ label, value, unit, icon, data }: any) {
  return (
    <div className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col relative h-32">
      <div className="flex justify-between items-start mb-2 border-b border-gray-300 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 border border-gray-400 bg-gray-100 flex items-center justify-center text-gray-700">
            {icon}
          </div>
          <span className="text-xs font-bold uppercase text-gray-800">{label}</span>
        </div>
        <div className="text-2xl font-bold text-gray-900 flex items-baseline gap-1 relative z-10">
          {value} <span className="text-xs font-bold text-gray-600 uppercase">{unit}</span>
        </div>
      </div>

      {data && (
        <div className="flex-1 w-full relative -mx-2 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <YAxis hide domain={['auto', 'auto']} />
              <Area type="step" dataKey="val" stroke="#4b5563" fill="#e5e7eb" strokeWidth={1} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Dedicated Patient Appts, Labs, Billing ─────────────────────────────────

function PatientApptsTab() {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [newAppt, setNewAppt] = useState({ doctor_id: '', appointment_at: '', reason: '', location: 'Clinic A' });

  const fetchItems = useCallback(async () => {
    const pid = currentUser?.patientId;
    if (!pid) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/patients/${pid}/appointments`, { headers: ah() });
      if (res.ok) {
        const d = await res.json();
        setData(d.data || []);
      }
    } catch (_) { }
    setLoading(false);
  }, [currentUser?.patientId]);

  useEffect(() => {
    fetchItems();
    fetch(`${API}/doctors`, { headers: ah() }).then(r => r.json()).then(d => setDocs(d.data || []));
  }, [fetchItems]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = currentUser?.patientId;
    if (!pid) return;
    try {
      const res = await fetch(`${API}/patients/${pid}/appointments`, {
        method: 'POST',
        headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppt)
      });
      if (res.ok) {
        setIsBooking(false);
        setNewAppt({ doctor_id: '', appointment_at: '', reason: '', location: 'Clinic A' });
        fetchItems();
      }
    } catch (_) { }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 flex flex-col gap-6">
      <div className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0 uppercase flex items-center gap-2">
            <Calendar className="w-6 h-6 text-gray-700" />
            My Appointments
          </h1>
          <p className="text-sm font-bold text-gray-700 mt-1">Manage your upcoming clinic visits.</p>
        </div>
        <button
          onClick={() => setIsBooking(true)}
          className="bg-gray-200 border border-gray-400 px-4 py-2 font-bold text-sm text-gray-800 hover:bg-gray-300 shadow-sm uppercase shadow-sm flex items-center gap-2"
        >
          <Calendar size={16} /> Schedule New
        </button>
      </div>

      {loading ? (
        <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
          Loading Schedule...
        </div>
      ) : data.length === 0 ? (
        <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
          No Appointments
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(a => (
            <div key={a.id} className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start border-b border-gray-300 pb-2">
                <div className="bg-gray-100 p-1 border border-gray-400 text-gray-700">
                  <UserCircle2 size={24} />
                </div>
                <div className={cn(
                  "px-2 py-0.5 text-[10px] font-bold uppercase border shadow-sm",
                  a.status === 'scheduled' ? "bg-blue-100 text-blue-800 border-blue-400" :
                    a.status === 'completed' ? "bg-green-100 text-green-800 border-green-400" :
                      "bg-red-100 text-red-800 border-red-400"
                )}>
                  {a.status}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-gray-600 mb-1">Consultation With</p>
                <h3 className="text-lg font-bold text-gray-900 m-0">Dr. {a.doctor_name}</h3>
              </div>
              <div className="bg-gray-100 p-2 border border-gray-300 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-700" />
                  <span className="text-xs font-bold text-gray-800">{new Date(a.appointment_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-700" />
                  <span className="text-xs font-bold text-gray-800">{new Date(a.appointment_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <p className="text-gray-700 font-bold text-xs italic line-clamp-2">"{a.reason}"</p>
            </div>
          ))}
        </div>
      )}

      {isBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-none">
          <div className="bg-white w-full max-w-lg border-2 border-black shadow-lg p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-gray-400 pb-2">
              <h3 className="text-xl font-bold text-gray-900 m-0 uppercase">Request Setup</h3>
              <button onClick={() => setIsBooking(false)} className="text-red-800 font-bold hover:bg-gray-200 px-2 border border-transparent hover:border-gray-400">[X]</button>
            </div>
            <form onSubmit={handleBook} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-gray-700 bg-gray-200 border border-gray-400 px-2 py-0.5 w-fit">Available Specialists</label>
                <select
                  required
                  className="w-full bg-white border border-gray-400 px-2 py-1 text-sm font-bold text-gray-800 outline-none"
                  value={newAppt.doctor_id}
                  onChange={e => setNewAppt({ ...newAppt, doctor_id: e.target.value })}
                >
                  <option value="">Select Doctor</option>
                  {docs.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-gray-700 bg-gray-200 border border-gray-400 px-2 py-0.5 w-fit">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full bg-white border border-gray-400 px-2 py-1 text-sm font-bold text-gray-800 outline-none"
                  value={newAppt.appointment_at}
                  onChange={e => setNewAppt({ ...newAppt, appointment_at: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase text-gray-700 bg-gray-200 border border-gray-400 px-2 py-0.5 w-fit">Reason for Visit</label>
                <textarea
                  placeholder="Describe your symptoms or reason..."
                  required
                  className="w-full bg-white border border-gray-400 px-2 py-1 text-sm font-bold text-gray-800 outline-none h-24 resize-none"
                  value={newAppt.reason}
                  onChange={e => setNewAppt({ ...newAppt, reason: e.target.value })}
                />
              </div>
              <div className="flex gap-4 mt-4">
                <button type="button" onClick={() => setIsBooking(false)} className="flex-1 bg-gray-200 border border-gray-400 text-gray-800 font-bold py-2 shadow-sm hover:bg-gray-300">ABORT</button>
                <button type="submit" className="flex-[2] bg-blue-800 border border-blue-900 text-white font-bold py-2 shadow-sm uppercase hover:bg-blue-900">Confirm Appointment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientLabsTab() {
  const { currentUser } = useAuth();
  const [labData, setLabData] = useState<{ orders: any[], results: any[] }>({ orders: [], results: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pid = currentUser?.patientId;
    if (!pid) return;

    // First find patient's active or latest admission
    fetch(`${API}/admissions?patient_id=${pid}`, { headers: ah() })
      .then(res => res.json())
      .then(d => {
        const list = d.data?.rows || d.rows || [];
        if (list.length > 0) {
          // Sort to get latest if multiple
          list.sort((a: any, b: any) => b.id - a.id);
          const admId = list[0].id;
          return fetch(`${API}/labs/admission/${admId}`, { headers: ah() });
        }
        throw new Error('No admissions');
      })
      .then(res => res.json())
      .then(d => {
        setLabData(d.data || { orders: [], results: [] });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [currentUser?.patientId]);

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 flex flex-col gap-6">
      
      {/* Header */}
      <div className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0 uppercase flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-900" />
            My Lab Results
          </h1>
          <p className="text-sm font-bold text-gray-700 mt-1">Pathology reports and diagnostic imaging parameters.</p>
        </div>
        <div className="border border-gray-400 bg-gray-100 p-2 text-center shadow-sm">
          <div className="text-xs font-bold text-gray-600 uppercase">Verified Results</div>
          <div className="text-lg font-bold text-blue-900">{labData.results.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
          Fetching Diagnostics...
        </div>
      ) : labData.results.length === 0 && labData.orders.length === 0 ? (
        <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
          No Reports Available
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h3 className="font-bold text-gray-900 text-lg border-b border-gray-300 pb-1 uppercase">Verified Clinical Parameters</h3>
            {labData.results.length === 0 ? (
              <div className="p-6 border border-gray-300 bg-gray-50 text-center text-gray-500 font-bold uppercase shadow-sm">
                Results are pending analysis...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {labData.results.map(r => (
                  <div key={r.id} className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-4 border-b border-gray-300 pb-2">
                      <h4 className="font-bold text-gray-900 text-sm uppercase">{r.parameter_name}</h4>
                      {r.is_abnormal && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-800 border border-red-400 px-2 py-0.5 uppercase shadow-sm">
                          Abnormal
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className={cn("text-3xl font-bold", r.is_abnormal ? "text-red-700" : "text-green-700")}>
                        {r.result_value}
                      </span>
                    </div>
                    <div className="bg-gray-100 p-2 border border-gray-300 flex flex-col gap-1 mt-auto">
                      <span className="text-[10px] font-bold uppercase text-gray-800">{r.test_name}</span>
                      <span className="text-xs font-bold text-gray-600">By {r.technician_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-gray-900 text-lg border-b border-gray-300 pb-1 uppercase">Pending Orders</h3>
            <div className="flex flex-col gap-2">
              {labData.orders.filter(o => o.status !== 'completed').map(o => (
                <div key={o.id} className="bg-white border border-gray-400 p-3 shadow-sm flex flex-col gap-2">
                  <p className="text-sm font-bold text-gray-900 uppercase">{o.test_name}</p>
                  <div className="flex items-center justify-between border-t border-gray-300 pt-2">
                    <span className="text-xs font-bold text-gray-600">{new Date(o.ordered_at).toLocaleDateString()}</span>
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-800 border border-gray-400 px-2 py-0.5 uppercase shadow-sm">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
              {labData.orders.filter(o => o.status !== 'completed').length === 0 && (
                <div className="p-4 border border-gray-300 bg-gray-50 text-center font-bold text-gray-500 text-xs uppercase shadow-sm">
                  No Pending Orders
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientBillingTab() {
  const { currentUser } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pid = currentUser?.patientId;
    if (!pid) return;

    fetch(`${API}/admissions?patient_id=${pid}`, { headers: ah() })
      .then(res => res.json())
      .then(d => {
        const list = d.data?.rows || d.rows || [];
        if (list.length > 0) {
          list.sort((a: any, b: any) => b.id - a.id);
          const admId = list[0].id;
          return fetch(`${API}/billing/admission/${admId}`, { headers: ah() });
        }
        throw new Error('No admissions');
      })
      .then(res => res.json())
      .then(d => {
        setInvoice(d.data || null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [currentUser?.patientId]);

  if (loading) return (
    <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
      Locating Invoice...
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 flex flex-col gap-6">
      
      {/* Header */}
      <div className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0 uppercase flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-gray-700" />
            My Billing
          </h1>
          <p className="text-sm font-bold text-gray-700 mt-1">Review and settle clinical care charges.</p>
        </div>
        {invoice && (
          <div className={cn(
            "border p-2 text-center shadow-sm text-sm font-bold uppercase",
            invoice.status === 'paid' ? "bg-green-100 text-green-900 border-green-700" : "bg-red-100 text-red-900 border-red-700"
          )}>
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} /> {invoice.status === 'paid' ? 'Settled' : 'Payment Required'}
            </div>
          </div>
        )}
      </div>

      {!invoice ? (
        <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
          No Active Invoices
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-[2] bg-white border border-gray-400 p-4 shadow-sm">
            <h3 className="font-bold text-gray-900 text-lg border-b border-gray-300 pb-2 mb-4 uppercase">Itemized Charges</h3>
            {invoice.items?.length === 0 ? (
              <p className="text-center text-gray-500 py-10 font-bold uppercase text-sm">No services recorded in this invoice.</p>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-200 border-b border-gray-400 font-bold text-gray-800">
                  <tr>
                    <th className="p-2 border-r border-gray-300">Type</th>
                    <th className="p-2 border-r border-gray-300">Description</th>
                    <th className="p-2 border-r border-gray-300 text-right">Qty &times; Unit</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item: any) => (
                    <tr key={item.id} className="border-b border-gray-200 bg-white hover:bg-gray-50">
                      <td className="p-2 border-r border-gray-200 font-bold uppercase text-xs text-gray-600">
                        {item.item_type}
                      </td>
                      <td className="p-2 border-r border-gray-200 font-bold text-gray-900">
                        {item.item_name}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-right text-gray-700 font-mono">
                        {item.quantity} &times; ${item.unit_price}
                      </td>
                      <td className="p-2 text-right font-bold text-gray-900 font-mono">
                        ${item.total_price}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex-1 bg-white border border-gray-400 shadow-sm p-4 h-fit sticky top-4">
            <h4 className="font-bold text-gray-900 text-lg border-b border-gray-300 pb-2 mb-4 uppercase">Amount Due</h4>

            <div className="flex flex-col gap-2 mb-6 text-sm font-bold text-gray-800">
              <div className="flex justify-between">
                <span>Services Total</span>
                <span className="font-mono">${invoice.total_amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount applied</span>
                <span className="text-green-700 font-mono">-$0.00</span>
              </div>
              <div className="h-px w-full bg-gray-400 my-2" />
              <div className="flex justify-between items-end border-b-2 border-gray-900 pb-2">
                <span className="text-lg font-bold uppercase text-gray-900">Total</span>
                <span className="text-2xl font-black font-mono">${invoice.total_amount}</span>
              </div>
            </div>

            {invoice.status === 'paid' ? (
              <div className="bg-green-100 text-green-900 border border-green-700 p-3 text-center text-sm font-bold uppercase shadow-sm">
                 Paid in Full
              </div>
            ) : (
              <button className="w-full bg-blue-800 hover:bg-blue-900 text-white font-bold py-3 shadow-sm uppercase shadow-sm">
                Process Payment
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fleet Command / Ambulance Tracking ─────────────────────────────────

function AmbulanceMonitorTab() {
  const [ambulances, setAmbulances] = useState([
    { id: 'AMB-101', status: 'Inbound', eta: '4 mins', dist: '1.2 km', patient: 'Critical - Trauma', speed: '65 km/h' },
    { id: 'AMB-102', status: 'Dispatched', eta: '12 mins', dist: '5.8 km', patient: 'Cardiac Arrest', speed: '80 km/h' },
    { id: 'AMB-104', status: 'Available', eta: '--', dist: '--', patient: '--', speed: '0 km/h' },
    { id: 'AMB-107', status: 'Returning', eta: '18 mins', dist: '7.4 km', patient: '--', speed: '55 km/h' },
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  if (loading) return (
    <div className="p-4 font-sans text-gray-900 border border-gray-400 text-center font-bold bg-white m-4">
      Loading Fleet Telemetry System...
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-gray-900">
      <div className="border-b-2 border-red-800 pb-2 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-red-900 m-0">Fleet Command Operations</h1>
        </div>
        <div className="bg-red-800 text-white font-bold px-2 py-1 flex items-center gap-2">
          <Radio className="w-4 h-4 animate-pulse" /> GPS ACTIVE
        </div>
      </div>
      
      <p className="mb-4 text-sm font-bold text-gray-700">Live ambulance telemetry, ETA, and emergency routing.</p>

      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="lg:w-2/3 bg-white border border-gray-400 shadow-sm flex flex-col">
          <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-400 p-2 font-bold text-gray-800 text-sm">
             Live GPS Map View
          </div>
          <div className="relative w-full h-[500px] bg-gray-300 overflow-hidden border-t-0">
             <div className="absolute inset-0 grayscale opacity-80" style={{ backgroundImage: 'url(/map_mockup.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
             
             {ambulances.map(a => {
                const top = a.id === 'AMB-101' ? '45%' : a.id === 'AMB-102' ? '20%' : a.id === 'AMB-104' ? '80%' : '55%';
                const left = a.id === 'AMB-101' ? '30%' : a.id === 'AMB-102' ? '55%' : a.id === 'AMB-104' ? '85%' : '40%';
                if(a.status === 'Available') return null;
                return (
                   <div key={a.id} className="absolute border border-black shadow px-1.5 py-0.5 text-[10px] font-bold" style={{ top, left, backgroundColor: a.status === 'Inbound' ? '#b91c1c' : '#1d4ed8', color: 'white' }}>
                       ♦ {a.id}
                   </div>
                );
             })}
             
             <div className="absolute bottom-2 right-2 bg-white border border-black px-1 font-mono text-[10px] text-black">
                 SCALE: 1:10000 | SAT LINK OK
             </div>
          </div>
        </div>
        
        <div className="lg:w-1/3 flex flex-col gap-4">
           <div className="bg-white border border-gray-400 shadow-sm overflow-x-auto flex-1">
             <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-400 p-2 font-bold text-gray-800 text-sm">
                  Fleet List
             </div>
             <table className="w-full text-left border-collapse text-xs">
               <thead>
                 <tr className="bg-gray-200 border-b border-gray-400">
                   <th className="p-2 border-r border-gray-300 font-bold">Unit ID</th>
                   <th className="p-2 border-r border-gray-300 font-bold">Status</th>
                   <th className="p-2 font-bold">ETA</th>
                 </tr>
               </thead>
               <tbody>
                 {ambulances.map(a => (
                    <tr key={a.id} className="border-b border-gray-200 hover:bg-yellow-50">
                      <td className="p-2 border-r border-gray-200 font-bold">{a.id}</td>
                      <td className="p-2 border-r border-gray-200 font-bold text-center">
                         <span className={a.status === 'Inbound' ? 'text-red-700 blink_me' : a.status === 'Available' ? 'text-green-700' : 'text-blue-700'}>
                           {a.status.toUpperCase()}
                         </span>
                      </td>
                      <td className="p-2 font-bold font-mono">{a.eta}</td>
                    </tr>
                 ))}
               </tbody>
             </table>
           </div>
           
           <div className="bg-gray-100 border border-gray-400 p-4 font-mono text-xs text-green-600 bg-black shadow-inner flex-1 flex flex-col justify-end">
              <div>[SYS] CONNECTING TO DISPATCH... OK</div>
              <div>[SYS] RECEIVING TELEMETRY... OK</div>
              <div>[SYS] {ambulances.length} ASSETS CURRENTLY TRACKED.</div>
              <div className="mt-2 border-t border-green-800 pt-2 text-green-500 overflow-hidden h-[100px] flex flex-col justify-end">
                  {ambulances.map(a => (
                      <div key={a.id}>{a.id} :: POS: {Math.random().toFixed(4)}, {Math.random().toFixed(4)} :: SGNL: {Math.floor(Math.random()*20+80)}%</div>
                  ))}
              </div>
           </div>
        </div>
      </div>
      <style>{`
         .blink_me { animation: blinker 1s linear infinite; }
         @keyframes blinker { 50% { opacity: 0.3; } }
      `}</style>
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
    { id: 'appointments', label: 'Appointments', icon: Calendar, Component: UnifiedAppointmentsTab },
    { id: 'ambulances', label: 'Fleet Command', icon: Ambulance, Component: AmbulanceMonitorTab },
    { id: 'staff', label: 'Staff Roster', icon: Stethoscope, Component: UsersPage },

    { id: 'icu', label: 'ICU Allocation', icon: BedDouble, Component: IcuPage },
    { id: 'labs', label: 'Lab Reports', icon: Database, Component: LabReportTab },
    { id: 'billing', label: 'Billing Hub', icon: BookOpen, Component: BillingHubTab },
    { id: 'alerts', label: 'Alerts Management', icon: AlertTriangle, Component: AlertsPage },
    { id: 'logs', label: 'Audit Logs', icon: Database, Component: LogsPage },
    { id: 'settings', label: 'Global Settings', icon: Settings, Component: SettingsPage },
  ];

  const staffTabs = [
    { id: 'overview', label: 'Care Overview', icon: LayoutDashboard, Component: CareOverview },
    { id: 'patients', label: 'Patient Directory', icon: Users, Component: PatientsPage },
    { id: 'appointments', label: 'Appointments', icon: Calendar, Component: UnifiedAppointmentsTab },
    { id: 'vitals', label: 'Vitals Monitor', icon: Activity, Component: VitalsPage },

    { id: 'labs', label: 'Lab Reports', icon: Database, Component: LabReportTab },
    { id: 'icu', label: 'ICU Allocation', icon: BedDouble, Component: IcuPage },
    { id: 'alerts', label: 'Alerts Management', icon: AlertTriangle, Component: AlertsPage },
  ];

  const doctorTabs = [
    ...staffTabs,
    { id: 'consults', label: 'Consultations', icon: Stethoscope, Component: DoctorConsultsTab },
    { id: 'discharge', label: 'Discharge Auth', icon: HeartPulse, Component: DoctorDischargeTab },
    { id: 'billing', label: 'Billing/Invoicing', icon: BookOpen, Component: BillingHubTab },
  ];

  const nurseTabs = [
    ...staffTabs,
    { id: 'meds', label: 'Medication Rounds', icon: ClipboardList, Component: NurseMedicationRoundTab },
    { id: 'handover', label: 'Shift Handover', icon: Users, Component: NurseHandoverTab },
  ];

  const patientTabs = [
    { id: 'overview', label: 'Recovery Summary', icon: HeartPulse, Component: CareOverview },
    { id: 'vitals', label: 'My Vitals', icon: Activity, Component: PatientVitalsTab },
    { id: 'appointments', label: 'Appointments', icon: Calendar, Component: PatientApptsTab },
    { id: 'meds', label: 'Treatments', icon: ClipboardList, Component: PatientPrescriptionsTab },

    { id: 'labs', label: 'Lab Reports', icon: BookOpen, Component: PatientLabsTab },
    { id: 'billing', label: 'My Invoices', icon: Database, Component: PatientBillingTab },
    { id: 'docs', label: 'Medical History', icon: BookOpen, Component: PatientHistoryTab },
  ];


  const activeTabs =
    role === 'admin' ? adminTabs :
      role === 'patient' ? patientTabs :
        role === 'doctor' ? doctorTabs :
          role === 'nurse' ? nurseTabs :
            staffTabs;

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
