"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Users, Activity, AlertTriangle, BedDouble, ArrowRight,
  TrendingDown, ShieldAlert, HeartPulse, LogOut, Loader2, RefreshCw,
  ClipboardList, Stethoscope, LayoutDashboard, Database, Settings,
  Calendar, Clock, UserCircle2, BookOpen, Thermometer, Wind, CheckCircle
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
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Discharge Authorization</h1>
          <p className="text-slate-500 font-medium tracking-tight">Review and authorize patient departures based on clinical stability.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 font-bold text-xs uppercase tracking-widest">
          <CheckCircle className="w-4 h-4" />
          {suggestions.length} Suggested for Discharge
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm border-dashed">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Analyzing ward stability...</p>
        </div>
      ) : allActive.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">No active admissions</p>
          <p className="text-slate-400">All patients have been processed and discharged.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Suggestions First */}
          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 rounded-[3rem] border border-emerald-100/50">
              <div className="lg:col-span-2 flex items-center gap-2 px-2 text-emerald-800 font-black text-sm uppercase tracking-tighter">
                <ShieldAlert className="w-5 h-5 text-emerald-600" /> Clinical System Recommendations
              </div>
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
          )}

          {/* Remaining Active */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="lg:col-span-2 flex items-center gap-2 px-2 text-slate-400 font-black text-sm uppercase tracking-tighter">
              <Activity className="w-5 h-5" /> Other Active Admissions
            </div>
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
      )}
    </div>
  );
}

function DischargeCard({ admission, suggested, note, setNote, onDischarge, loading }: any) {
  return (
    <div className={cn(
      "bg-white border rounded-[2.5rem] p-6 shadow-sm transition-all hover:shadow-lg border-slate-200 relative overflow-hidden group",
      suggested ? "border-emerald-200 ring-2 ring-emerald-500/5" : "border-slate-100"
    )}>
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border",
            suggested ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
          )}>
            {admission.patient_name?.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{admission.patient_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500 uppercase">{admission.ward_name} · Bed {admission.bed_number}</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-tighter">{admission.diagnosis}</span>
            </div>
          </div>
        </div>
        {suggested && (
          <div className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 border border-emerald-200 animate-pulse">
            <CheckCircle size={12} /> Discharge Ready
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">System Risk</p>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-lg font-black tracking-tighter",
              admission.risk_category === 'low' ? 'text-emerald-500' : admission.risk_category === 'medium' ? 'text-amber-500' : 'text-rose-500'
            )}>
              {admission.risk_score?.toFixed(1) || '0.0'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{admission.risk_category}</span>
          </div>
        </div>
        <div className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100/50">
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">EWS Score</p>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-lg font-black tracking-tighter",
              admission.ews_category === 'low' ? 'text-emerald-500' : 'text-rose-500'
            )}>
              {admission.ews || '0'}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{admission.ews_category}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <textarea
          placeholder="Final clinical summary..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all resize-none"
          rows={2}
        />
        <button
          onClick={onDischarge}
          disabled={loading}
          className={cn(
            "w-full py-4 rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2",
            suggested
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50"
              : "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200"
          )}
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <LogOut className="w-4 h-4" />}
          Authorize Discharge
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
          <label className="text-[10px] font-black uppercase text-slate-400">Filter Ward:</label>
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
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed">
          <Loader2 className="animate-spin inline-block text-indigo-500" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <CheckCircle className="w-16 h-16 text-emerald-100 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">All medications administered</p>
          <p className="text-slate-400">There are no pending medication orders for the current round.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div key={item.prescription_id} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-indigo-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">{item.ward_name} · Bed {item.bed_number}</div>
                  <h3 className="text-lg font-bold text-slate-800">{item.patient_name}</h3>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <ClipboardList size={20} />
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-6">
                <p className="text-sm font-black text-slate-900">{item.medication_name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">{item.dose}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{item.route} · {item.frequency}</span>
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
                  className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 group/btn"
                >
                  <RefreshCw size={14} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                  Administer Dose
                </button>
              )}

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-medium text-slate-400">
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
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">Handover History</h3>
          {loading ? (
            <div className="p-20 text-center bg-white rounded-[2.5rem] border border-dashed"><Loader2 className="animate-spin inline-block text-indigo-500" /></div>
          ) : handovers.length === 0 ? (
            <div className="p-20 text-center bg-white rounded-[2.5rem] border border-slate-100 text-slate-400">No recent handovers recorded for this ward.</div>
          ) : (
            handovers.map(h => (
              <div key={h.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">{h.shift_name} Shift</span>
                    <span className="text-xs font-bold text-slate-800">By {h.author_name}</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">{new Date(h.created_at).toLocaleString()}</span>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 mb-4">
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
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-2">Active Patients</h3>
          <div className="flex flex-col gap-3">
            {patients.map(p => (
              <div key={p.id} className="bg-white border border-slate-50 p-4 rounded-2xl flex items-center justify-between group hover:border-indigo-100 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">{p.bed_number}</div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{p.patient_name}</p>
                    <p className="text-[10px] text-slate-400">{p.diagnosis}</p>
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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsCreating(false)} />
          <div className="bg-white rounded-[3rem] w-full max-w-2xl relative shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Shift Handover Record</h3>
                <p className="text-slate-500 text-sm font-medium">Record ward-level summaries and specific patient observations.</p>
              </div>
              <button onClick={() => setIsCreating(false)} className="bg-slate-50 p-2 rounded-xl text-slate-400">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Shift</label>
                  <select
                    value={formData.shift_name}
                    onChange={e => setFormData({ ...formData, shift_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold"
                  >
                    <option>Morning</option>
                    <option>Afternoon</option>
                    <option>Night</option>
                    <option>Emergency</option>
                  </select>
                </div>
                <div className="flex items-end pb-3 text-[10px] font-bold text-slate-400">
                  Ward: {wards.find(w => w.id === selectedWard)?.name}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">General Ward Summary</label>
                <textarea
                  required
                  placeholder="E.g. Ward is stable, 2 pending admissions, code blue earlier at 04:00..."
                  value={formData.summary}
                  onChange={e => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all min-h-[100px]"
                />
              </div>

              <div className="flex flex-col gap-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Critical Patient Updates</label>
                {patients.map(p => (
                  <div key={p.id} className="flex gap-4 items-start bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] mt-4"
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
    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-100 shadow-sm">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
      <p className="text-slate-400 font-medium">Reconstructing clinical history...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clinical Timeline</h1>
          <p className="text-slate-500 font-medium tracking-tight">Immutable longitudinal history of your medical journey.</p>
        </div>
        {summary && (
          <div className="flex gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-sm flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Admissions</span>
              <span className="text-xl font-black text-indigo-600 tracking-tighter">{summary.total_admissions}</span>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl px-5 py-3 shadow-sm flex flex-col items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Prescriptions</span>
              <span className="text-xl font-black text-emerald-600 tracking-tighter">{summary.total_prescriptions}</span>
            </div>
          </div>
        )}
      </div>

      {timeline.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <BookOpen className="w-16 h-16 text-slate-100 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">No history recorded yet</p>
          <p className="text-slate-400">Your clinical events will be indexed here in real-time.</p>
        </div>
      ) : (
        <div className="relative pl-8 border-l-2 border-slate-100/60 ml-4 flex flex-col gap-10">
          {timeline.map((ev) => (
            <div key={ev.id} className="relative group/time">
              {/* Timeline dot */}
              <div className={cn(
                "absolute -left-[41px] w-5 h-5 rounded-full border-4 border-white shadow-md ring-2 transition-transform group-hover/time:scale-125",
                ev.event_type === 'admission' ? 'bg-indigo-500 ring-indigo-50' :
                  ev.event_type === 'alert' ? 'bg-rose-500 ring-rose-50' :
                    ev.event_type === 'prescription' ? 'bg-emerald-500 ring-emerald-50' :
                      'bg-slate-400 ring-slate-50'
              )} />

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{new Date(ev.created_at).toLocaleDateString()}</span>
                  <span>{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm group-hover/time:shadow-lg transition-all max-w-2xl border-l-[6px] border-l-indigo-500/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center text-xs shadow-sm border",
                      ev.event_type === 'admission' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                        ev.event_type === 'alert' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-slate-50 text-slate-400 border-slate-100'
                    )}>
                      {ev.event_type === 'admission' ? <BedDouble size={20} /> :
                        ev.event_type === 'alert' ? <AlertTriangle size={20} /> :
                          ev.event_type === 'prescription' ? <ClipboardList size={20} /> :
                            <Activity size={20} />}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 tracking-tight capitalize">{ev.event_type} Registered</h4>
                      {ev.created_by_name && <p className="text-[10px] font-bold text-slate-400">By {ev.created_by_name}</p>}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {ev.description}
                  </p>

                  {ev.detail && ev.event_type === 'admission' && (
                    <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-6">
                      <div className="group/item">
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Attending Unit</span>
                        <span className="text-xs font-bold text-slate-700">{ev.detail.ward_name} · Bed {ev.detail.bed_number}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-1 tracking-widest">Initial Diagnosis</span>
                        <span className="text-xs font-bold text-slate-700">{ev.detail.diagnosis}</span>
                      </div>
                    </div>
                  )}

                  {ev.detail && ev.event_type === 'prescription' && (
                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center gap-4">
                      <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                        {ev.detail.medication_name} {ev.detail.dose}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{ev.detail.frequency} · {ev.detail.route}</span>
                    </div>
                  )}
                </div>
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
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clinical Calendar</h1>
          <p className="text-slate-500 font-medium tracking-tight">Manage patient visits and specialist availability.</p>
        </div>
        {role === 'patient' && (
          <button
            onClick={() => setIsBooking(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <Calendar size={14} /> Book New
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
        {loading ? (
          <div className="py-10 text-center"><Loader2 className="animate-spin inline-block text-indigo-500" /></div>
        ) : data.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No appointments scheduled.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Date & Time</th>
                  <th className="pb-4 text-[10px] font-black uppercase text-slate-400">{role === 'patient' ? 'Doctor' : 'Patient'}</th>
                  <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Reason</th>
                  <th className="pb-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                  <th className="pb-4 text-[10px] font-black uppercase text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map(a => (
                  <tr key={a.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 text-xs font-bold text-slate-700">
                      {new Date(a.appointment_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-900">
                      {role === 'patient' ? `Dr. ${a.doctor_name}` : (
                        <div>
                          <p className="font-black">{a.patient_name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">with Dr. {a.doctor_name}</p>
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-[11px] text-slate-500 italic max-w-xs truncate">"{a.reason}"</td>
                    <td className="py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                        a.status === 'scheduled' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                          a.status === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            "bg-rose-50 text-rose-600 border-rose-100"
                      )}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {a.status === 'scheduled' && (
                          <>
                            <button onClick={() => handleStatusUpdate(a.id, 'completed')} title="Complete" className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><CheckCircle size={14} /></button>
                            <button onClick={() => handleStatusUpdate(a.id, 'cancelled')} title="Cancel" className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"><LogOut size={14} className="rotate-90" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsBooking(false)} />
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg relative shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900">Book Appointment</h3>
              <button onClick={() => setIsBooking(false)} className="text-slate-400">✕</button>
            </div>
            <form onSubmit={handleBook} className="flex flex-col gap-5">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Specialist</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                  value={newAppt.doctor_id}
                  onChange={e => setNewAppt({ ...newAppt, doctor_id: e.target.value })}
                >
                  <option value="">Select Doctor</option>
                  {docs.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialty})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                  value={newAppt.appointment_at}
                  onChange={e => setNewAppt({ ...newAppt, appointment_at: e.target.value })}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block px-1">Reason for Visit</label>
                <textarea
                  placeholder="Brief clinical description..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm font-bold h-24 outline-none focus:ring-2 focus:ring-indigo-500/10"
                  value={newAppt.reason}
                  onChange={e => setNewAppt({ ...newAppt, reason: e.target.value })}
                />
              </div>
              <button type="submit" className="bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 mt-2 uppercase tracking-widest text-xs">Confirm Appointment</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


function DoctorConsultsTab() {
  const { currentUser } = useAuth();
  const [consults, setConsults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsult, setSelectedConsult] = useState<any>(null);
  const [resolution, setResolution] = useState({ findings: '', recommendations: '' });

  const fetchConsults = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/consults`, { headers: ah() });
      if (res.ok) {
        const d = await res.json();
        setConsults(d.data || []);
      }
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConsults();
  }, [fetchConsults]);

  const handleResolve = async () => {
    if (!selectedConsult) return;
    try {
      const res = await fetch(`${API}/consults/${selectedConsult.id}/resolve`, {
        method: 'POST',
        headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify(resolution)
      });
      if (res.ok) {
        setSelectedConsult(null);
        setResolution({ findings: '', recommendations: '' });
        fetchConsults();
      }
    } catch (_) { }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Specialist Consultations</h1>
          <p className="text-slate-500 font-medium">Inter-departmental referrals and clinical escalations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin inline-block text-indigo-500" /></div>
          ) : consults.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-slate-400">
              No pending consultation requests.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {consults.map(c => (
                <div
                  key={c.id}
                  className={cn(
                    "bg-white border p-6 rounded-[2rem] shadow-sm transition-all flex justify-between items-center group",
                    c.id === selectedConsult?.id ? "border-indigo-500 ring-4 ring-indigo-50" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xs uppercase",
                      c.priority === 'urgent' ? 'bg-rose-500' : 'bg-amber-500'
                    )}>
                      {c.priority === 'urgent' ? 'Stat' : 'High'}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 leading-none mb-1 uppercase text-sm">{c.specialty} Request</h4>
                      <p className="text-xs text-slate-400 font-medium">Patient: {c.patient_name} · From Dr. {c.requesting_dr_name}</p>
                      <p className="text-[11px] text-slate-600 mt-2 italic font-medium">"{c.reason}"</p>
                    </div>
                  </div>
                  {c.status === 'pending' && (
                    <button
                      onClick={() => setSelectedConsult(c)}
                      className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800"
                    >
                      Resolve Consult
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resolution Sidebar */}
        <div className="flex flex-col gap-6">
          {selectedConsult ? (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl animate-in slide-in-from-right-8 duration-500 flex flex-col gap-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-500" /> Resolution Plan
              </h3>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Clinical Findings</label>
                <textarea
                  value={resolution.findings}
                  onChange={e => setResolution(prev => ({ ...prev, findings: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none h-24"
                  placeholder="Enter key diagnostic observations..."
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Recommendations</label>
                <textarea
                  value={resolution.recommendations}
                  onChange={e => setResolution(prev => ({ ...prev, recommendations: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none h-24"
                  placeholder="Advised treatment / next steps..."
                />
              </div>
              <button
                onClick={handleResolve}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-100"
              >
                Submit Consultation
              </button>
              <button onClick={() => setSelectedConsult(null)} className="text-slate-400 text-[10px] font-bold uppercase transition-colors hover:text-slate-600">Cancel</button>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-10 text-center flex flex-col items-center gap-4">
              <Activity className="w-12 h-12 text-slate-200" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a consult to start resolution</p>
            </div>
          )}
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
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Current Treatments</h1>
          <p className="text-slate-500 font-medium tracking-tight">Active medication regimens and dosage protocols.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl border border-indigo-100 font-bold text-xs uppercase tracking-widest">
          <ClipboardList className="w-4 h-4" />
          {data.length} Active Orders
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed">
          <Loader2 className="animate-spin inline-block text-indigo-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <CheckCircle className="w-16 h-16 text-slate-100 mx-auto mb-4" />
          <p className="text-slate-500 font-bold text-lg">No active medications</p>
          <p className="text-slate-400">There are no currently pending treatments on your file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map(rx => (
            <div key={rx.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                  <Thermometer size={24} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 mb-1">{rx.status}</span>
                  <span className="text-[10px] font-bold text-slate-400">{rx.route}</span>
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2 group-hover:text-indigo-600 transition-colors uppercase">{rx.medication_name}</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-slate-50 px-3 py-1 rounded-xl text-xs font-black text-slate-600 tracking-tight">{rx.dose}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{rx.frequency}</div>
              </div>
              <div className="pt-4 border-t border-slate-50 flex items-center gap-2">
                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[8px] font-bold text-slate-500">
                  {rx.prescribed_by_name?.charAt(0)}
                </div>
                <p className="text-[9px] font-bold text-slate-400">Prescribed by <span className="text-slate-600">Dr. {rx.prescribed_by_name}</span></p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Patient-only Vitals Component ──────────────────────────────────────────
function LabReportTab() {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedAdm, setSelectedAdm] = useState<number | null>(null);
  const [labData, setLabData] = useState<{ orders: any[], results: any[] }>({ orders: [], results: [] });
  const [loading, setLoading] = useState(false);

  // For Staff: List active patients first
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
      // For Patient: Find their current admission
      fetch(`${API}/admissions?patient_id=${currentUser.patientId}&status=active`, { headers: ah() })
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
    fetch(`${API}/labs/admission/${selectedAdm}`, { headers: ah() })
      .then(res => res.json())
      .then(d => {
        setLabData(d.data || { orders: [], results: [] });
        setLoading(false);
      });
  }, [selectedAdm]);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Diagnostic Reports</h1>
          <p className="text-slate-500 font-medium">Laboratory investigations and pathological findings.</p>
        </div>
        {currentUser?.role !== 'patient' && (
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black uppercase text-slate-400">Select Patient:</label>
            <select
              value={selectedAdm || ''}
              onChange={e => setSelectedAdm(Number(e.target.value))}
              className="bg-white border rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none"
            >
              {patients.map(p => <option key={p.id} value={p.id}>{p.patient_name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 px-1">
            <ClipboardList className="w-5 h-5 text-indigo-500" /> Verified Results
          </h3>
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="animate-spin inline-block" /></div>
          ) : labData.results.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[2.5rem] border border-slate-100 shadow-sm text-slate-400">
              No results released for this admission period.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {labData.results.map(r => (
                <div key={r.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="font-black text-slate-800 text-sm uppercase">{r.parameter_name}</h4>
                    {r.is_abnormal && <span className="text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-100 uppercase">Abnormal</span>}
                  </div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className={cn("text-2xl font-black", r.is_abnormal ? "text-rose-500" : "text-emerald-500")}>{r.result_value}</span>
                    <span className="text-[10px] font-bold text-slate-400">per test protocol</span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 flex flex-col gap-1">
                    <span>Report: {r.test_name}</span>
                    <span>Verified by {r.technician_name} · {new Date(r.verified_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 px-1">
            <Clock className="w-5 h-5 text-indigo-500" /> Pending Orders
          </h3>
          <div className="flex flex-col gap-3">
            {labData.orders.filter(o => o.status !== 'completed').length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 rounded-[2rem] border border-dashed text-slate-400 text-xs font-bold uppercase tracking-widest">
                No pending lab tasks
              </div>
            ) : (
              labData.orders.filter(o => o.status !== 'completed').map(o => (
                <div key={o.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex justify-between items-center group">
                  <div>
                    <p className="text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase">{o.test_name}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{o.priority} · Ordered {new Date(o.ordered_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded-lg border border-indigo-100 uppercase">{o.status}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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

  if (!invoice && !loading) return <div className="py-20 text-center text-slate-400">Initializing invoice...</div>;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hospital Invoicing</h1>
          <p className="text-slate-500 font-medium">Real-time settlement and clinical service pricing.</p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser?.role !== 'patient' && (
            <select
              value={selectedAdm || ''}
              onChange={e => setSelectedAdm(Number(e.target.value))}
              className="bg-white border rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none"
            >
              {patients.map(p => <option key={p.id} value={p.id}>{p.patient_name}</option>)}
            </select>
          )}
          <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2 font-black text-xs uppercase">
            <ShieldAlert size={14} className="text-emerald-500" /> {invoice?.status || 'Draft'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Itemized List */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 border-b border-slate-50 pb-4">Itemized Services</h3>
          <div className="flex flex-col gap-4">
            {invoice?.items?.length === 0 ? (
              <p className="text-slate-400 italic py-10 text-center">No services recorded yet for this admission.</p>
            ) : (
              invoice?.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center py-4 border-b border-slate-50 group">
                  <div>
                    <span className="text-[9px] font-black uppercase text-indigo-500 tracking-widest block mb-0.5">{item.item_type}</span>
                    <p className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{item.item_name}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Qty: {item.quantity} · Rate: ${item.unit_price}</p>
                  </div>
                  <span className="text-sm font-black text-slate-900">${item.total_price}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Financial Summary Sidebar */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Financial Summary</h4>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-400 text-xs">Gross Amount</span>
                <span>${invoice?.total_amount}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-400 text-xs">Institutional Discount</span>
                <span className="text-emerald-400">-$0.00</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-400 text-xs">Applicable Tax</span>
                <span>$0.00</span>
              </div>
              <div className="h-px bg-slate-800 my-2" />
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-300">Net Balance Due</span>
                <span className="text-3xl font-black tracking-tighter">${invoice?.total_amount}</span>
              </div>
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl mt-10 transition-all shadow-lg shadow-indigo-500/20 text-xs uppercase tracking-widest">
              Settle Payment
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] p-6 text-sm">
            <h4 className="font-bold text-slate-800 mb-4">Patient Information</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Invoice ID</span>
                <span className="font-bold text-slate-700">#INV-2026-{invoice?.id ? String(invoice.id).padStart(4, '0') : '0000'}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Admission</span>
                <span className="font-bold text-slate-700">#ADM-{invoice?.admission_id || 'N/A'}</span>
              </div>

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
    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-100 shadow-sm">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
      <p className="text-slate-400 font-medium">Calibrating biometric streams...</p>
    </div>
  );

  const latest = history[history.length - 1];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Health Telemetry</h1>
          <p className="text-slate-500 font-medium tracking-tight">Real-time physiological insights from clinical ICU sensors.</p>
        </div>
        {latest && (
          <div className="flex items-center gap-3 bg-white border border-slate-100 px-5 py-3 rounded-2xl shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Syncing · {new Date(latest.recorded_at).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <VitalCard label="Heart Rate" value={latest?.heart_rate || '--'} unit="bpm" icon={<HeartPulse />} color="text-rose-500" bg="bg-rose-50" />
        <VitalCard label="Oxygen Sat" value={latest?.spo2 || '--'} unit="%" icon={<Wind />} color="text-sky-500" bg="bg-sky-50" />
        <VitalCard label="Blood Pressure" value={latest ? `${latest.systolic_bp}/${latest.diastolic_bp}` : '--'} unit="mmHg" icon={<Activity />} color="text-indigo-500" bg="bg-indigo-50" />
        <VitalCard label="Temperature" value={latest?.temperature || '--'} unit="°C" icon={<Thermometer />} color="text-orange-500" bg="bg-orange-50" />
      </div>

      <div className="bg-white border border-slate-200/60 rounded-[3rem] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.02)] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full -mr-32 -mt-32" />
        <h3 className="text-xl font-bold text-slate-800 mb-10 flex items-center gap-3 relative">
          <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <Activity size={20} />
          </div>
          Cardiovascular Trends
        </h3>
        <div className="h-[400px] min-h-[400px] w-full relative overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">

            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="recorded_at" hide />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
              <Tooltip
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', padding: '16px' }}
                itemStyle={{ fontWeight: 800, color: '#1e293b' }}
                labelStyle={{ display: 'none' }}
              />
              <Area type="monotone" dataKey="heart_rate" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorHr)" animationDuration={2000} />
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
        <div className={cn("p-2 rounded-xl border border-transparent flex items-center justify-center", bg, color)}>
          {icon && React.isValidElement(icon) ? icon : null}
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
    { id: 'appointments', label: 'Appointments', icon: Calendar, Component: UnifiedAppointmentsTab },
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
  ];

  const nurseTabs = [
    ...staffTabs,
    { id: 'meds', label: 'Medication Rounds', icon: ClipboardList, Component: NurseMedicationRoundTab },
    { id: 'handover', label: 'Shift Handover', icon: Users, Component: NurseHandoverTab },
  ];

  const patientTabs = [
    { id: 'overview', label: 'Recovery Summary', icon: HeartPulse, Component: CareOverview },
    { id: 'vitals', label: 'My Vitals', icon: Activity, Component: PatientVitalsTab },
    { id: 'appointments', label: 'Appointments', icon: Calendar, Component: UnifiedAppointmentsTab },
    { id: 'meds', label: 'Treatments', icon: ClipboardList, Component: PatientPrescriptionsTab },

    { id: 'labs', label: 'Lab Reports', icon: BookOpen, Component: LabReportTab },
    { id: 'billing', label: 'My Invoices', icon: Database, Component: BillingHubTab },
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
