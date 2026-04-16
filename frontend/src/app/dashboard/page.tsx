"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import {
  Users, Activity, AlertTriangle, BedDouble, ArrowRight, Check, User,
  TrendingDown, ShieldAlert, HeartPulse, LogOut, Loader2, RefreshCw,
  ClipboardList, Stethoscope, LayoutDashboard, Database, Settings,
  Calendar, Clock, UserCircle2, BookOpen, Thermometer, Wind, CheckCircle,
  Ambulance, MapPin, Radio, Siren, Calculator, Navigation, FlaskConical, Trash2, ShieldCheck
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

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

function DoctorDischargeTab({ admissionId, patients }: { admissionId: number | null, patients: any[] }) {
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
          { }
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

          { }
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

function NurseMedicationRoundTab({ admissionId }: { admissionId?: number | null }) {
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

  const filteredItems = useMemo(() => {
    let list = items;
    if (admissionId) {
      list = list.filter(it => Number(it.admission_id) === admissionId);
    }
    if (selectedWard !== 'all') {
      list = list.filter(it => it.ward_name === selectedWard);
    }
    return list;
  }, [items, admissionId, selectedWard]);

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

function NurseHandoverTab({ admissionId, patients: allPatients }: { admissionId?: number | null, patients: any[] }) {
  const [wards, setWards] = useState<any[]>([]);
  const [selectedWard, setSelectedWard] = useState<number | null>(null);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => { fetchHandovers(); }, [fetchHandovers]);

  useEffect(() => {
    if (admissionId && allPatients.length > 0) {
      const pt = allPatients.find(p => p.id === admissionId);
      if (pt?.ward_id) {
        setSelectedWard(pt.ward_id);
      }
    }
  }, [admissionId, allPatients]);

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
        { }
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

        { }
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

      { }
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

function PatientHistoryTab({ admissionId, patients }: { admissionId: number | null, patients: any[] }) {
  const { currentUser } = useAuth();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pid = currentUser?.patientId;
    if (!pid && admissionId) {
      const adm = patients.find(p => p.id === admissionId);
      pid = adm?.patient_id;
    }
    if (!pid) return;

    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API}/patients/${pid}/timeline`, { headers: ah() });
        if (res.ok) {
          const d = await res.json();
          setTimeline(d.timeline || []);
          setSummary(d.summary || null);
        }
      } catch (_) { }
      setLoading(false);
    };
    fetchHistory();
  }, [currentUser?.patientId, admissionId, patients]);

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

function UnifiedAppointmentsTab({ admissionId }: { admissionId?: number | null }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [newAppt, setNewAppt] = useState({ doctor_id: '', appointment_at: '', reason: '', location: 'Clinic A' });
  const role = currentUser?.role?.toLowerCase();

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
        let items = d.data || d.rows || [];

        if (role !== 'patient') {
          const today = new Date().toISOString().split('T')[0];
          items.sort((a: any, b: any) => {
            const isTodayA = a.appointment_at.startsWith(today);
            const isTodayB = b.appointment_at.startsWith(today);
            if (isTodayA && !isTodayB) return -1;
            if (!isTodayA && isTodayB) return 1;
            return new Date(a.appointment_at).getTime() - new Date(b.appointment_at).getTime();
          });
        }
        setData(items);
      }
    } catch (_) { }
    setLoading(false);
  }, [currentUser?.patientId, currentUser?.role]);

  const filteredData = useMemo(() => {
    if (admissionId) {
      return data.filter(a => Number(a.admission_id) === admissionId);
    }
    return data;
  }, [data, admissionId]);

  useEffect(() => {
    fetchItems();
    fetch(`${API}/doctors`, { headers: ah() }).then(r => r.json()).then(d => setDocs(d.data || []));
  }, [fetchItems]);

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

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 border border-gray-100 bg-gray-50/30 min-h-screen">
      <div className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 m-0 uppercase tracking-tighter flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-800" />
            {role === 'doctor' ? 'Daily Rounds Schedule' : 'Clinical Visit Matrix'}
          </h1>
          <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest italic tracking-tight">Synchronized with Hospital Master Registry</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-900 text-white border-2 border-black px-3 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            ACTIVE VISITS: {data.filter(a => a.status === 'scheduled').length}
          </div>
          {role === 'patient' && (
            <button onClick={() => setIsBooking(true)} className="bg-blue-800 text-white border-2 border-black px-4 py-1 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform">
              + BOOK VISIT
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-20 text-center bg-white border-2 border-black border-dashed">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-800 border-t-transparent rounded-full mb-4" />
            <p className="font-bold text-gray-600 uppercase text-[10px] tracking-[0.2em]">Querying Schedule Telemetry...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-20 text-center bg-white border-2 border-black border-dashed">
            <p className="font-bold text-gray-400 uppercase text-[10px] tracking-[0.2em] italic">Queue Empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredData.map(a => {
              const isToday = a.appointment_at.startsWith(today);
              const isComp = a.status === 'completed';
              const isCan = a.status === 'cancelled';
              const apptDate = new Date(a.appointment_at);

              return (
                <div key={a.id} className={cn(
                  "bg-white border-2 border-black p-4 flex flex-col md:flex-row items-center gap-6 transition-all hover:bg-yellow-50/30 group",
                  isToday ? "border-l-[12px] border-l-blue-800" : "opacity-80 grayscale-[20%]",
                  isComp ? "bg-emerald-50/20 border-gray-300 opacity-60" : ""
                )}>
                  <div className="flex flex-col items-center justify-center min-w-[110px] border-r-2 border-gray-100 pr-6 text-center">
                    <span className="text-2xl font-black text-gray-900 tracking-tighter">{apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    <span className="text-[9px] font-black text-blue-800 uppercase tracking-widest">{apptDate.toLocaleDateString([], { month: 'short', day: '2-digit' })}</span>
                  </div>

                  <div className="flex-1 flex flex-col md:flex-row gap-4 justify-between w-full">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black bg-gray-100 border border-black px-1.5 py-0.5 uppercase">ID: #{a.id}</span>
                        {isToday && <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-sm font-black animate-pulse">LIVE ROUND</span>}
                      </div>
                      <h3 className="text-xl font-black text-gray-900 m-0 uppercase tracking-tighter">
                        {role === 'patient' ? `Dr. ${a.doctor_name}` : a.patient_name}
                      </h3>
                      <p className="text-xs font-bold text-gray-700 mt-2 bg-white/50 border border-dashed border-gray-300 p-2 italic leading-tight rounded">
                        "{a.reason}"
                      </p>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap self-end md:self-center">
                      <div className={cn(
                        "px-4 py-2 text-[10px] font-black uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
                        a.status === 'scheduled' ? "bg-blue-100 text-blue-900" :
                          isComp ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"
                      )}>
                        {a.status}
                      </div>

                      <div className="flex gap-2">
                        {role !== 'patient' && a.admission_id && (
                          <Link href={`/patients/${a.admission_id}`} className="bg-black text-white px-4 py-2 text-[10px] font-black hover:bg-gray-800 uppercase flex items-center gap-2 group-hover:scale-105 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]">
                            <User size={14} /> Open Chart
                          </Link>
                        )}
                        {a.status === 'scheduled' && (
                          <>
                            <button onClick={() => handleStatusUpdate(a.id, 'completed')} className="bg-white border-2 border-black px-4 py-2 text-[10px] font-black text-emerald-700 hover:bg-emerald-50 transition-all uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">Verify Visit</button>
                            <button onClick={() => handleStatusUpdate(a.id, 'cancelled')} className="bg-white border-2 border-black px-4 py-2 text-[10px] font-black text-rose-700 hover:bg-rose-50 transition-all uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">Abort</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isBooking && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-md">
          <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-xl p-10">
            <div className="flex justify-between items-center mb-8 border-b-4 border-black pb-4">
              <h3 className="text-3xl font-black uppercase tracking-tighter italic">Initialize Clinical Encounter</h3>
              <button onClick={() => setIsBooking(false)} className="bg-rose-600 text-white border-4 border-black px-4 py-1 text-xl font-black hover:bg-rose-700 active:translate-y-1 transition-all">X</button>
            </div>
            <form onSubmit={handleBook} className="space-y-8">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-700 bg-gray-200 border-2 border-black px-3 py-1 w-fit">Assigned Specialist</label>
                <select required className="w-full border-4 border-black p-3 font-black text-sm bg-white outline-none focus:bg-blue-50 transition-colors" value={newAppt.doctor_id} onChange={e => setNewAppt({ ...newAppt, doctor_id: e.target.value })}>
                  <option value="">-- SELECT ENTITY --</option>
                  {docs.map((d: any) => <option key={d.id} value={d.id}>DR. {d.name.toUpperCase()} ({d.specialty.toUpperCase()})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-700 bg-gray-200 border-2 border-black px-3 py-1 w-fit">Temporal Point (Date/Time)</label>
                <input type="datetime-local" required className="w-full border-4 border-black p-3 font-black text-sm bg-white outline-none focus:bg-blue-50 transition-colors" value={newAppt.appointment_at} onChange={e => setNewAppt({ ...newAppt, appointment_at: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-gray-700 bg-gray-200 border-2 border-black px-3 py-1 w-fit">Encounter Objective</label>
                <textarea placeholder="Describe clinical symptoms or reason for referral..." required className="w-full border-4 border-black p-3 font-black text-sm bg-white h-32 resize-none outline-none focus:bg-blue-50 transition-colors" value={newAppt.reason} onChange={e => setNewAppt({ ...newAppt, reason: e.target.value })} />
              </div>
              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsBooking(false)} className="flex-1 bg-gray-200 border-4 border-black font-black uppercase py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Abort</button>
                <button type="submit" className="flex-[2] bg-blue-800 text-white border-4 border-black font-black uppercase py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Commit Encounter</button>
              </div>
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
  const [allSymptoms, setAllSymptoms] = useState<any[]>([]);
  const [allMedications, setAllMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsult, setSelectedConsult] = useState<any>(null);
  const [resolution, setResolution] = useState({ findings: '', recommendations: '' });
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<number[]>([]);
  const [prescriptions, setPrescriptions] = useState<{ medication_id: number; dose: string; frequency: string; route: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'pending' | 'resolved'>('pending');

  const fetchConsults = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes, mRes] = await Promise.all([
        fetch(`${API}/consults`, { headers: ah() }),
        fetch(`${API}/symptoms`, { headers: ah() }),
        fetch(`${API}/medications`, { headers: ah() }),
      ]);
      if (cRes.ok) {
        const d = await cRes.json();
        setConsults(d.data || []);
      }
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

  const filteredItems = consults.filter(c => c.status === viewMode);

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 border border-gray-100 bg-gray-50/20 min-h-screen">
      <div className="border-b-4 border-slate-900 pb-2 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 m-0 uppercase tracking-tighter flex items-center gap-3">
            <Stethoscope className="w-8 h-8 text-indigo-700" />
            Clinical Consultations Hub
          </h1>
          <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest italic tracking-tight underline decoration-indigo-300 decoration-2">Inter-departmental Referrals & Specialized Encounters</p>
        </div>
        <div className="flex bg-slate-100 border-2 border-slate-900 p-1">
          <button
            onClick={() => { setViewMode('pending'); setSelectedConsult(null); }}
            className={cn("px-4 py-1 text-[10px] font-black uppercase transition-all", viewMode === 'pending' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200")}
          >
            Action Required ({consults.filter(c => c.status === 'pending').length})
          </button>
          <button
            onClick={() => { setViewMode('resolved'); setSelectedConsult(null); }}
            className={cn("px-4 py-1 text-[10px] font-black uppercase transition-all", viewMode === 'resolved' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200")}
          >
            History Archive ({consults.filter(c => c.status === 'resolved').length})
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        { }
        <div className="lg:flex-[1.2] w-full flex flex-col gap-4">
          <div className="bg-slate-900 text-white border border-slate-900 p-2 font-black text-[10px] shadow-md flex justify-between uppercase tracking-widest">
            <span>{viewMode} Encounters Feed</span>
            <span>Sector: {currentUser?.specialty || 'General'}</span>
          </div>
          {loading ? (
            <div className="p-20 text-center bg-white border-2 border-black border-dashed">
              <div className="animate-spin inline-block w-6 h-6 border-4 border-indigo-700 border-t-transparent rounded-full mb-2" />
              <p className="font-bold text-slate-500 uppercase text-[9px] tracking-widest">Syncing with medical records...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-20 text-center bg-white border-2 border-slate-200 border-dashed rounded-xl">
              <p className="font-bold text-slate-400 uppercase text-[10px] tracking-widest italic">Zero {viewMode} records in current vault</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredItems.map(c => (
                <div
                  key={c.id}
                  className={cn(
                    "border-2 border-slate-200 p-4 shadow-sm flex justify-between items-center bg-white cursor-pointer transition-all hover:border-slate-900 hover:bg-slate-50 relative overflow-hidden group",
                    c.id === selectedConsult?.id ? "border-indigo-600 ring-2 ring-indigo-100 bg-indigo-50/30" : ""
                  )}
                  onClick={() => { setSelectedConsult(c); setSelectedSymptomIds([]); setPrescriptions([]); setResolution({ findings: '', recommendations: '' }); }}
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-12 h-12 flex flex-col items-center justify-center border-2 font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                      c.priority === 'urgent' ? 'bg-orange-100 text-orange-900 border-orange-400' : c.priority === 'stat' ? 'bg-rose-600 text-white border-black animate-pulse' : 'bg-blue-100 text-blue-900 border-blue-400'
                    )}>
                      {c.priority}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-slate-400">ENCTR_#{c.id}</span>
                        {c.specialty && <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-1 border border-indigo-200">DEPT_{c.specialty.toUpperCase()}</span>}
                      </div>
                      <h4 className="font-black text-slate-900 text-lg m-0 uppercase tracking-tighter">{c.patient_name}</h4>
                      <p className="text-[10px] font-bold text-slate-600 uppercase mt-1">Requesting Physician: DR. {c.requesting_dr_name?.toUpperCase()}</p>
                      <p className="text-xs text-slate-700 mt-2 bg-white/60 border border-dashed border-slate-200 p-2 italic rounded line-clamp-2">"{c.reason}"</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0 ml-4">
                    {c.resolved_at ? (
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 border border-emerald-300 uppercase">Resolved: {new Date(c.resolved_at).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-1 border border-amber-300 uppercase animate-pulse">Pending Auth</span>
                    )}
                    {c.status === 'pending' && c.id !== selectedConsult?.id && (
                      <span className="text-xs font-black text-indigo-700 underline underline-offset-4 tracking-tighter uppercase group-hover:translate-x-1 transition-transform flex items-center gap-1">Select <Check size={12} /></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        { }
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

function PatientPrescriptionsTab({ admissionId, patients }: { admissionId: number | null, patients: any[] }) {
  const { currentUser } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [proposed, setProposed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pid = currentUser?.patientId;
    if (!pid && admissionId) {
      const adm = patients.find(p => p.id === admissionId);
      pid = adm?.patient_id;
    }
    if (!pid) return;

    async function fetchItems() {
      try {
        const [res, propRes] = await Promise.all([
          fetch(`${API}/patients/${pid}/prescriptions`, { headers: ah() }),
          fetch(`${API}/patients/${pid}/proposed-plan`, { headers: ah() })
        ]);

        if (res.ok) {
          const d = await res.json();
          setData(d.data || []);
        }
        if (propRes.ok) {
          const pd = await propRes.json();
          setProposed(pd.data || []);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchItems();
  }, [currentUser?.patientId, admissionId, patients]);

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 flex flex-col gap-8">

      { }
      <div className="flex flex-col gap-4">
        <div className="bg-white border-l-4 border-blue-800 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 m-0 uppercase flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-blue-900" />
              Active Care Plan
            </h1>
            <p className="text-sm font-bold text-gray-700 mt-1">Confirmed medication regimens and authorized medical orders.</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 px-4 py-2 text-center shadow-sm">
            <div className="text-xs font-bold text-blue-800 uppercase">Confirmed Items</div>
            <div className="text-lg font-bold text-blue-900 font-mono">{data.length}</div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
            Fetching Active Records...
          </div>
        ) : data.length === 0 ? (
          <div className="p-8 border border-dashed border-gray-400 text-center font-bold text-gray-500 uppercase">
            No active prescriptions on file.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map(rx => (
              <div key={rx.id} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0px_#000] flex flex-col">
                <div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-2">
                  <div className="bg-gray-100 p-1 border border-black text-black">
                    <CheckCircle size={24} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold uppercase text-white bg-blue-800 px-2 border border-black shadow-sm tracking-tighter">AUTHORIZED</span>
                    <span className="text-[10px] font-bold text-black uppercase bg-gray-200 px-2 border border-black shadow-sm">{rx.route}</span>
                  </div>
                </div>
                <div className="mb-4">
                  <h3 className="text-lg font-black text-black uppercase mb-2 leading-none">{rx.medication_name}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-black text-white px-2 py-0.5 text-xs font-bold shadow-sm uppercase">{rx.dose}</div>
                    <div className="text-xs font-bold text-gray-800 uppercase">{rx.frequency}</div>
                  </div>
                </div>
                <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-2 opacity-70">
                  <p className="text-[10px] font-bold text-gray-600 uppercase">Physician: Dr. {rx.prescribed_by_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      { }
      {proposed.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-yellow-900 m-0 uppercase flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-700" />
                Proposed Treatment Plan
              </h2>
              <p className="text-sm font-bold text-yellow-800 mt-1 italic">Awaiting final administrative verification and commitment.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proposed.map(p => (
              <div key={p.id} className="bg-yellow-50 border-2 border-dashed border-yellow-600 p-4 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-4 border-b border-yellow-200 pb-2">
                  <div className="bg-white p-1 border border-yellow-600 text-yellow-700">
                    <Activity size={24} />
                  </div>
                  <span className="text-[10px] font-bold uppercase text-yellow-900 bg-yellow-200 px-2 border border-yellow-600 shadow-sm">UNDER REVIEW</span>
                </div>

                <div className="mb-4">
                  <h3 className="text-md font-bold text-yellow-900 uppercase mb-2 leading-tight">SPECIALIST: {p.specialty}</h3>
                  <p className="text-[11px] font-bold text-yellow-800 leading-tight border-l-2 border-yellow-300 pl-2 mb-3">
                    {p.findings}
                  </p>

                  { }
                  <div className="flex flex-col gap-2">
                    {p.proposed_plan?.prescriptions?.map((rx: any, i: number) => (
                      <div key={i} className="text-[10px] font-bold bg-white/50 border border-yellow-300 p-1 flex justify-between uppercase">
                        <span>{rx.medication_name || 'Rx Item'} {rx.dose}</span>
                        <span>{rx.frequency}</span>
                      </div>
                    ))}
                    {p.proposed_plan?.labOrders?.map((lab: any, i: number) => (
                      <div key={i} className="text-[10px] font-bold bg-white/50 border border-yellow-300 p-1 flex items-center gap-2 uppercase">
                        <Database size={10} /> TEST REQ: {lab.test_id} ({lab.priority})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-yellow-200 flex items-center gap-2 opacity-70">
                  <p className="text-[10px] font-bold text-yellow-800 uppercase italic">Submitted By Dr. {p.doctor_name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] w-full max-w-md p-8 animate-in zoom-in duration-200">
        <h3 className="text-3xl font-black uppercase tracking-tighter italic mb-2">Request Analysis</h3>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8 border-b-2 border-slate-100 pb-2">Select investigation from clinical catalog</p>

        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Investigation Type</label>
            <select
              value={selectedTest}
              onChange={e => setSelectedTest(Number(e.target.value))}
              className="w-full bg-white border-2 border-black p-3 font-black text-xs uppercase outline-none focus:bg-slate-50"
            >
              <option value="">-- CHOOSE ANALYSIS --</option>
              {tests.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400">Priority Level</label>
            <div className="grid grid-cols-3 gap-3">
              {['routine', 'urgent', 'stat'].map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={cn(
                    "py-3 border-2 border-black text-[10px] font-black uppercase transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none",
                    priority === p ? "bg-slate-900 text-white translate-x-0.5 translate-y-0.5 shadow-none" : "bg-white text-slate-500"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={onClose} className="flex-1 bg-slate-100 border-2 border-black font-black uppercase py-4 text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Cancel</button>
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
                } catch (e) { }
                setOrdering(false);
              }}
              className="flex-1 bg-indigo-600 text-white border-2 border-black font-black uppercase py-4 text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
            >
              {ordering ? 'TRANSMITTING...' : 'CONFIRM ORDER'}
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] w-full max-w-xl p-8 animate-in zoom-in duration-200">
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-slate-100">
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter italic">Diagnostic Ledger</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{order.test_name} · CASE ID #{order.id}</p>
          </div>
          {order.priority === 'stat' && (
            <div className="bg-rose-600 text-white px-3 py-1 text-[10px] font-black uppercase animate-pulse border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              CRITICAL: STAT
            </div>
          )}
        </div>

        <div className="bg-slate-50 p-6 border-2 border-black mb-6">
          <div className="grid grid-cols-12 gap-4 mb-3 px-2">
            <span className="col-span-7 text-[10px] font-black uppercase text-slate-400">Parameter / Analyte</span>
            <span className="col-span-3 text-[10px] font-black uppercase text-slate-400">Result Value</span>
            <span className="col-span-2 text-[10px] font-black uppercase text-slate-400 text-center">Pathology</span>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {params.map((p, i) => (
              <div key={i} className="grid grid-cols-12 gap-3 items-center group">
                <div className="col-span-7 relative">
                  <input
                    placeholder="E.G. HEMOGLOBIN (HGB)"
                    className="w-full bg-white border-2 border-black p-2 font-black text-xs uppercase outline-none focus:bg-yellow-50"
                    value={p.name}
                    onChange={e => {
                      const n = [...params];
                      n[i].name = e.target.value;
                      setParams(n);
                    }}
                  />
                  {i > 0 && (
                    <button
                      onClick={() => setParams(params.filter((_, idx) => idx !== i))}
                      className="absolute -left-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="col-span-3">
                  <input
                    placeholder="VALUE"
                    className="w-full bg-white border-2 border-black p-2 font-black text-xs uppercase outline-none text-right focus:bg-yellow-50"
                    value={p.value}
                    onChange={e => {
                      const n = [...params];
                      n[i].value = e.target.value;
                      setParams(n);
                    }}
                  />
                </div>
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => {
                      const n = [...params];
                      n[i].abnormal = !n[i].abnormal;
                      setParams(n);
                    }}
                    className={cn(
                      "w-10 h-10 border-2 border-black flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                      p.abnormal ? "bg-rose-600 text-white translate-x-0.5 translate-y-0.5 shadow-none" : "bg-white text-slate-300"
                    )}
                  >
                    <Activity size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setParams([...params, { name: '', value: '', abnormal: false }])}
            className="w-full py-2 mt-6 border-2 border-black border-dashed font-black uppercase text-[10px] text-slate-500 hover:bg-slate-100 transition-all"
          >
            + APPEND PARAMETER FIELD
          </button>
        </div>

        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 bg-slate-100 border-2 border-black font-black uppercase py-4 text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Cancel</button>
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
              } catch (e) { }
              setSubmitting(false);
            }}
            className="flex-1 bg-slate-900 text-white border-2 border-black font-black uppercase py-4 text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all disabled:opacity-50"
          >
            {submitting ? 'COMMITTING...' : 'RELEASE VALIDATED REPORT'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LabReportTab({ admissionId, setAdmissionId, patients }: { admissionId: number | null, setAdmissionId: (id: number) => void, patients: any[] }) {
  const { currentUser } = useAuth();
  const [labData, setLabData] = useState<{ orders: any[], results: any[] }>({ orders: [], results: [] });
  const [loading, setLoading] = useState(false);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrderToVerify, setSelectedOrderToVerify] = useState<any>(null);

  const fetchLabs = useCallback(async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/labs/admission/${admissionId}`, { headers: ah() });
      if (res.ok) {
        const d = await res.json();
        setLabData(d.data || { orders: [], results: [] });
      }
    } catch (_) { }
    setLoading(false);
  }, [admissionId]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 bg-gray-50/20 min-h-screen">
      { }
      <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 m-0 uppercase tracking-tighter flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-indigo-700" />
            Diagnostic Reports
          </h1>
          <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest italic tracking-tight">Pathological Investigations · Verified Findings</p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          {currentUser?.role !== 'patient' && (
            <div className="flex items-center gap-2 bg-slate-100 border border-black px-3 py-1.5 rounded-sm">
              <span className="text-[10px] font-black uppercase text-slate-600">Active Case:</span>
              <select
                value={admissionId || ''}
                onChange={e => setAdmissionId(Number(e.target.value))}
                className="bg-transparent border-none font-black text-xs outline-none uppercase"
              >
                {patients.map(p => <option key={p.id} value={p.id}>{p.patient_name}</option>)}
              </select>
            </div>
          )}
          {currentUser?.role === 'doctor' && admissionId && (
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="bg-indigo-600 text-white border-2 border-black px-4 py-2 font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              + Request Analysis
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        { }
        <div className="xl:col-span-8">
          <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-slate-900 text-white p-3 font-black text-[10px] uppercase tracking-widest flex justify-between items-center">
              <span>Verified Results Archive</span>
              <BookOpen size={14} className="text-indigo-400" />
            </div>

            {loading ? (
              <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse italic">Querying Laboratory Database...</div>
            ) : labData.results.length === 0 ? (
              <div className="p-20 text-center border-2 border-dashed border-slate-100 m-6 font-black text-slate-300 uppercase italic text-xs tracking-widest">
                No diagnostic findings logged for this case.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-black">
                    <th className="p-4 border-r border-slate-200 font-black text-[10px] uppercase tracking-widest">Parameter / Analyte</th>
                    <th className="p-4 border-r border-slate-200 font-black text-[10px] uppercase tracking-widest">Recorded Value</th>
                    <th className="p-4 border-r border-slate-200 font-black text-[10px] uppercase tracking-widest">Investigation</th>
                    <th className="p-4 font-black text-[10px] uppercase tracking-widest">Verification Status</th>
                  </tr>
                </thead>
                <tbody>
                  {labData.results.map(r => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-yellow-50/50 transition-colors">
                      <td className="p-4 border-r border-slate-100 font-black text-slate-800 uppercase">{r.parameter_name}</td>
                      <td className="p-4 border-r border-slate-100">
                        <span className={cn(
                          "px-2 py-1 border-2 border-black font-mono font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] inline-block",
                          r.is_abnormal ? "bg-rose-100 text-rose-900" : "bg-emerald-50 text-emerald-900"
                        )}>
                          {r.result_value}
                        </span>
                        {r.is_abnormal && <span className="ml-2 text-[8px] font-black text-rose-600 uppercase italic">(!) Pathology Detected</span>}
                      </td>
                      <td className="p-4 border-r border-slate-100">
                        <p className="text-[10px] font-black text-slate-500 uppercase">{r.test_name}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <p className="text-[10px] font-black uppercase text-slate-900">Verified by {r.technician_name}</p>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase italic">{new Date(r.verified_at).toLocaleString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        { }
        <div className="xl:col-span-4">
          <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden h-fit">
            <div className="bg-indigo-700 text-white p-3 font-black text-[10px] uppercase tracking-widest flex justify-between items-center">
              <span>Pending Worklist</span>
              <Activity size={14} className="text-white animate-pulse" />
            </div>

            <div className="p-4 space-y-4">
              {labData.orders.filter(o => o.status !== 'completed').length === 0 ? (
                <div className="p-8 text-center text-slate-300 font-black uppercase text-[10px] italic">Queue empty. No pending analysis.</div>
              ) : (
                labData.orders.filter(o => o.status !== 'completed').map(o => (
                  <div key={o.id} className="bg-slate-50 border-2 border-black p-4 flex justify-between items-center group hover:bg-white transition-all hover:-translate-y-1">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          o.priority === 'stat' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse" : "bg-indigo-500"
                        )} />
                        <h4 className="text-xs font-black text-slate-900 uppercase">{o.test_name}</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-slate-400 uppercase italic">Requested At: {new Date(o.ordered_at).toLocaleTimeString()}</span>
                        <span className={cn(
                          "text-[8px] font-black px-1 uppercase",
                          o.priority === 'stat' ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-600"
                        )}>{o.priority}</span>
                      </div>

                      {currentUser?.role === 'admin' && (
                        <button
                          onClick={() => setSelectedOrderToVerify(o)}
                          className="mt-4 px-3 py-1 bg-slate-900 text-white border-2 border-black text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] hover:bg-indigo-600 transition-all"
                        >
                          Manual Result Entry &rarr;
                        </button>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-tighter italic">{o.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {admissionId && (
        <OrderLabModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          admissionId={admissionId}
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

function ManualItemModal({ isOpen, onClose, onAdd, invoiceId }: { isOpen: boolean, onClose: () => void, onAdd: () => void, invoiceId: number }) {
  const [form, setForm] = useState({ item_type: 'procedure', item_name: '', unit_price: '', quantity: '1' });
  const [adding, setAdding] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-md p-8">
        <h3 className="text-2xl font-black uppercase tracking-tighter mb-2 italic">Manual Charge Entry</h3>
        <p className="text-[10px] font-black text-slate-500 uppercase mb-6 tracking-widest border-b-2 border-slate-100 pb-2">Manual override for ad-hoc clinical services</p>

        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Category</label>
            <select
              value={form.item_type}
              onChange={e => setForm({ ...form, item_type: e.target.value })}
              className="w-full border-2 border-black p-2 font-black text-xs uppercase outline-none focus:bg-slate-50"
            >
              <option value="procedure">Clinical Procedure</option>
              <option value="equipment">Specialized Equipment</option>
              <option value="supply">Medical Supplies</option>
              <option value="other">Miscellaneous Fee</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-slate-400">Service Description</label>
            <input
              type="text"
              placeholder="E.G. BEDSIDE ULTRASOUND"
              className="w-full border-2 border-black p-2 font-black text-xs uppercase outline-none focus:bg-slate-50"
              value={form.item_name}
              onChange={e => setForm({ ...form, item_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Unit Rate ($)</label>
              <input
                type="number"
                className="w-full border-2 border-black p-2 font-black text-xs outline-none focus:bg-slate-50"
                value={form.unit_price}
                onChange={e => setForm({ ...form, unit_price: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase text-slate-400">Quantity</label>
              <input
                type="number"
                className="w-full border-2 border-black p-2 font-black text-xs outline-none focus:bg-slate-50"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button onClick={onClose} className="flex-1 bg-slate-100 border-2 border-black font-black uppercase py-3 text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">Cancel</button>
          <button
            disabled={adding || !form.item_name || !form.unit_price}
            onClick={async () => {
              setAdding(true);
              try {
                const res = await fetch(`${API}/billing/items`, {
                  method: 'POST',
                  headers: { ...ah(), 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    invoice_id: invoiceId,
                    item_type: form.item_type,
                    item_name: form.item_name,
                    unit_price: Number(form.unit_price),
                    quantity: Number(form.quantity)
                  })
                });
                if (res.ok) { onAdd(); onClose(); setForm({ item_type: 'procedure', item_name: '', unit_price: '', quantity: '1' }); }
              } catch (_) { }
              setAdding(false);
            }}
            className="flex-1 bg-slate-900 text-white border-2 border-black font-black uppercase py-3 text-[10px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            {adding ? '...' : 'Commit Charge'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BillingHubTab({ admissionId, setAdmissionId, patients }: { admissionId: number | null, setAdmissionId: (id: number) => void, patients: any[] }) {
  const { currentUser } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [unbilled, setUnbilled] = useState<{ labs: any[], consults: any[] }>({ labs: [], consults: [] });
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState<number | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!admissionId) return;
    setLoading(true);
    try {
      const [invRes, unbRes] = await Promise.all([
        fetch(`${API}/billing/admission/${admissionId}`, { headers: ah() }),
        fetch(`${API}/billing/admission/${admissionId}/unbilled`, { headers: ah() })
      ]);
      if (invRes.ok) {
        const d = await invRes.json();
        setInvoice(d.data || null);
      }
      if (unbRes.ok) {
        const d = await unbRes.json();
        setUnbilled(d.data || { labs: [], consults: [] });
      }
    } catch (_) { }
    setLoading(false);
  }, [admissionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBillItem = async (type: 'consultation' | 'laboratory', item: any) => {
    if (!invoice) return;
    setCommitting(item.id);
    try {
      const res = await fetch(`${API}/billing/items`, {
        method: 'POST',
        headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          item_type: type,
          item_name: type === 'consultation' ? `Specialist Consult: ${item.item_name}` : `Lab Analysis: ${item.item_name}`,
          unit_price: item.unit_price,
          quantity: 1,
          consult_id: type === 'consultation' ? item.id : null,
          lab_order_id: type === 'laboratory' ? item.id : null
        })
      });
      if (res.ok) fetchData();
    } catch (_) { }
    setCommitting(null);
  };

  if (!invoice && !loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-[0.2em] italic bg-white border-2 border-dashed border-slate-100 m-8">Initializing Fiscal Engine...</div>;

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 bg-gray-50/20 min-h-screen">
      <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 m-0 uppercase tracking-tighter flex items-center gap-3">
            <Database className="w-8 h-8 text-emerald-700" />
            Revenue Management Hub
          </h1>
          <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest italic tracking-tight">Financial Records · Settlement Registry</p>
        </div>
        <div className="flex gap-4 items-center flex-wrap">
          {(currentUser?.role?.toLowerCase() === 'doctor' || currentUser?.role?.toLowerCase() === 'admin') && invoice && (
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white border-2 border-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
            >
              + Manual Charge
            </button>
          )}
          {currentUser?.role !== 'patient' && (
            <div className="flex items-center gap-2 bg-slate-100 border border-black px-3 py-1.5 rounded-sm">
              <span className="text-[10px] font-black uppercase text-slate-600">Active Case:</span>
              <select
                value={admissionId || ''}
                onChange={e => setAdmissionId(Number(e.target.value))}
                className="bg-transparent border-none font-black text-xs outline-none uppercase"
              >
                {patients.map(p => <option key={p.id} value={p.id}>{p.patient_name}</option>)}
              </select>
            </div>
          )}
          <div className={cn(
            "px-4 py-2 border-2 border-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
            invoice?.status === 'paid' ? 'bg-emerald-100 text-emerald-900 border-emerald-900' : 'bg-amber-100 text-amber-900 border-amber-900'
          )}>
            STATUS: {invoice?.status || 'DRAFT'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        { }
        {currentUser?.role !== 'patient' && (
          <div className="xl:col-span-4 flex flex-col gap-6">
            <div className="bg-white border-2 border-black flex flex-col shadow-md overflow-hidden">
              <div className="bg-slate-900 text-white p-3 font-black text-[10px] uppercase tracking-widest flex justify-between items-center">
                <span>Pending Clinical Verification</span>
                <AlertTriangle size={14} className="text-amber-400" />
              </div>

              <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                { }
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 border-b-2 border-slate-100 pb-1">Unbilled Consultations</h4>
                  {unbilled.consults.length === 0 ? (
                    <p className="text-xs italic text-slate-400">No pending consult charges.</p>
                  ) : (
                    <div className="space-y-2">
                      {unbilled.consults.map(c => (
                        <div key={c.id} className="bg-slate-50 border border-slate-200 p-3 flex justify-between items-center group hover:border-black transition-colors">
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase">Consult: {c.item_name}</p>
                            <p className="text-[9px] font-bold text-slate-500">{new Date(c.date).toLocaleDateString()}</p>
                          </div>
                          <button
                            disabled={!!committing}
                            onClick={() => handleBillItem('consultation', c)}
                            className="bg-white border border-slate-300 px-2 py-1 text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white hover:border-black transition-all"
                          >
                            {committing === c.id ? '...' : '+ BILL $150'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                { }
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 border-b-2 border-slate-100 pb-1">Unbilled Lab Reports</h4>
                  {unbilled.labs.length === 0 ? (
                    <p className="text-xs italic text-slate-400">No pending lab charges.</p>
                  ) : (
                    <div className="space-y-2">
                      {unbilled.labs.map(l => (
                        <div key={l.id} className="bg-slate-50 border border-slate-200 p-3 flex justify-between items-center group hover:border-black transition-colors">
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase">{l.item_name}</p>
                            <p className="text-[9px] font-bold text-slate-500">{new Date(l.date).toLocaleDateString()}</p>
                          </div>
                          <button
                            disabled={!!committing}
                            onClick={() => handleBillItem('laboratory', l)}
                            className="bg-white border border-slate-300 px-2 py-1 text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white hover:border-black transition-all"
                          >
                            {committing === l.id ? '...' : `+ BILL $${l.unit_price}`}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        { }
        <div className={cn("flex flex-col gap-6", currentUser?.role === 'patient' ? "xl:col-span-8" : "xl:col-span-5")}>
          <div className="bg-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-slate-100 border-b-2 border-black p-3 font-black text-[10px] text-slate-900 uppercase flex justify-between items-center tracking-widest">
              <span>Itemized Settlement Ledger</span>
              <span>{invoice?.items?.length || 0} DEBITS</span>
            </div>

            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-black">
                  <th className="p-3 border-r border-slate-200 font-black text-[10px] uppercase tracking-widest w-24">Category</th>
                  <th className="p-3 border-r border-slate-200 font-black text-[10px] uppercase tracking-widest">Description</th>
                  <th className="p-3 font-black text-[10px] uppercase tracking-widest text-right w-28">Total Price</th>
                </tr>
              </thead>
              <tbody>
                {invoice?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-16 text-center text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] italic">No services attributed to this account</td>
                  </tr>
                ) : (
                  invoice?.items.map((item: any) => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-yellow-50/50 transition-colors">
                      <td className="p-3 border-r border-slate-100 flex flex-col">
                        <span className="text-[10px] font-black uppercase text-indigo-600">{item.item_type}</span>
                        {item.consult_id && <span className="text-[8px] font-black bg-emerald-100 text-emerald-800 px-1 w-fit rounded-sm mt-1">REFR_#{item.consult_id}</span>}
                        {item.lab_order_id && <span className="text-[8px] font-black bg-blue-100 text-blue-800 px-1 w-fit rounded-sm mt-1">LAB_#{item.lab_order_id}</span>}
                      </td>
                      <td className="p-3 border-r border-slate-100">
                        <p className="font-black text-slate-900 text-xs uppercase">{item.item_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">REC AT {new Date(item.recorded_at).toLocaleTimeString()}</span>
                          <span className="text-[9px] font-black text-slate-600">UNIT: ${item.unit_price} x {item.quantity}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-black text-slate-900 text-sm whitespace-nowrap tracking-tighter">${item.total_price}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        { }
        <div className="xl:col-span-3">
          <div className="bg-slate-900 text-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] p-6 font-mono sticky top-24">
            <div className="flex flex-col gap-6">
              <div className="text-center border-b-2 border-white/20 pb-4 mb-2">
                <h4 className="font-black text-sm tracking-[0.3em] uppercase opacity-60 mb-2">Institutional Invoice</h4>
                <p className="text-2xl font-black tracking-tighter">#INV-{invoice?.id ? String(invoice.id).padStart(5, '0') : '-----'}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center opacity-70 italic text-xs">
                  <span>GROSS CLINICAL CHARGES</span>
                  <span>${invoice?.total_amount || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center opacity-70 italic text-xs">
                  <span>DISCOUNTS / SUBSIDIES</span>
                  <span>-$0.00</span>
                </div>
                <div className="border-t border-white/20 pt-4 flex justify-between items-center">
                  <span className="font-black text-xs uppercase tracking-widest">Final Net Balance</span>
                  <span className="text-3xl font-black tracking-tighter text-amber-400">${invoice?.total_amount || '0.00'}</span>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 space-y-2 text-[10px] mt-4">
                <div className="flex justify-between">
                  <span className="opacity-50">PATIENT ID:</span>
                  <span className="font-black">#ADM-{invoice?.admission_id || '---'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-50">ISSUED ON:</span>
                  <span className="font-black">{invoice?.issued_at ? new Date(invoice.issued_at).toLocaleDateString() : 'DRAFT'}</span>
                </div>
              </div>

              {currentUser?.role?.toLowerCase() === 'admin' ? (
                <button
                  disabled={committing !== null || !invoice}
                  onClick={async () => {
                    if (!invoice) return;
                    try {
                      const res = await fetch(`${API}/billing/admission/${invoice.admission_id}/pay`, { method: 'POST', headers: ah() });
                      if (res.ok) fetchData();
                    } catch (_) { }
                  }}
                  className="mt-6 bg-amber-400 text-black border-4 border-black py-4 font-black text-sm uppercase hover:bg-amber-300 transition-all shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  Confirm Settlement &rarr;
                </button>
              ) : currentUser?.role?.toLowerCase() === 'nurse' ? (
                <div className="mt-6 bg-slate-100 border-2 border-dashed border-slate-400 p-6 text-center">
                  <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-800">Nurse Audit Active</p>
                  <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase">Financial commitment restricted to billing officers.</p>
                </div>
              ) : (
                <div className="mt-6 bg-slate-100 border-2 border-dashed border-slate-200 p-6 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Restricted View</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {invoice && (
        <ManualItemModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          onAdd={fetchData}
          invoiceId={invoice.id}
        />
      )}
    </div>
  );
}

function PatientVitalsTab({ admissionId, patients }: { admissionId: number | null, patients: any[] }) {
  const { currentUser } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVitals = useCallback(async () => {
    let pid = currentUser?.patientId;
    if (!pid && admissionId) {
      const adm = patients.find(p => p.id === admissionId);
      pid = adm?.patient_id;
    }
    if (!pid) return;

    try {
      const res = await fetch(`${API}/vitals/${pid}?limit=50`, { headers: ah() });
      if (res.ok) {
        const d = await res.json();
        setHistory((d.data || []).reverse());
      }
    } catch (_) { }
    setLoading(false);
  }, [currentUser?.patientId, admissionId, patients]);

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
      <div className="bg-white border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 m-0 uppercase flex items-center gap-2 tracking-tighter">
            <Calendar className="w-8 h-8 text-indigo-700" />
            My Appointments
          </h1>
          <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest italic tracking-tight">Manage your upcoming clinic visits · Verified Schedule</p>
        </div>
        <button
          onClick={() => setIsBooking(true)}
          className="bg-indigo-600 text-white border-2 border-black px-6 py-3 font-black text-xs uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center gap-2"
        >
          <Calendar size={16} /> Schedule New
        </button>
      </div>

      {loading ? (
        <div className="p-10 border-2 border-black bg-white text-center font-black text-slate-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] uppercase italic tracking-widest">
          Loading Schedule...
        </div>
      ) : data.length === 0 ? (
        <div className="p-10 border-2 border-dashed border-black bg-white text-center font-black text-slate-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] uppercase tracking-tighter">
          No Appointments On File
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

    fetch(`${API}/admissions?patient_id=${pid}`, { headers: ah() })
      .then(res => res.json())
      .then(d => {
        const list = d.data?.rows || d.rows || [];
        if (list.length > 0) {

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

      { }
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

function PatientBillingTab({ admissionId }: { admissionId: number | null }) {
  const { currentUser } = useAuth();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aid = admissionId;
    if (!aid) return;

    fetch(`${API}/billing/admission/${aid}`, { headers: ah() })
      .then(res => res.json())
      .then(d => {
        setInvoice(d.data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [admissionId]);

  if (loading) return (
    <div className="p-10 border border-gray-400 bg-white text-center font-bold text-gray-600 shadow-sm uppercase">
      Locating Invoice...
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900 flex flex-col gap-6">

      { }
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

function AmbulanceMonitorTab() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  });

  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAmbulances = useCallback(async () => {
    try {
      const res = await fetch(`${API}/ambulances`, { headers: ah() });
      if (res.ok) {
        const d = await res.json();
        setAmbulances(d.data || []);
      }
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAmbulances();
    const t = setInterval(fetchAmbulances, 4000);
    return () => clearInterval(t);
  }, [fetchAmbulances]);

  const containerStyle = { width: '100%', height: '500px' };
  const center = useMemo(() => ({ lat: 12.9716, lng: 77.5946 }), []);

  if (loading && ambulances.length === 0) return (
    <div className="p-4 font-sans text-gray-900 border border-gray-400 text-center font-bold bg-white m-4 flex flex-col items-center justify-center min-h-[400px]">
      <div className="animate-spin mb-4 text-black"><RefreshCw size={32} /></div>
      LOADING FLEET TELEMETRY SYSTEM...
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-gray-900 font-mono">
      <div className="border-b-2 border-red-800 pb-2 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-red-900 m-0 uppercase flex items-center gap-2">
            <Ambulance className="w-8 h-8" />
            Fleet Command Operations
          </h1>
        </div>
        <div className="bg-red-800 text-white font-bold px-3 py-1 flex items-center gap-2 shadow-sm border border-red-900 text-[10px]">
          <Radio className="w-3 h-3 animate-pulse" /> GPS ACTIVE
        </div>
      </div>

      <p className="mb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Live asset telemetry, hospital ETAs, and emergency routing protocols.</p>

      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="lg:w-2/3 bg-white border border-gray-400 shadow-sm flex flex-col overflow-hidden relative">
          <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-400 p-2 font-bold text-gray-800 text-[10px] uppercase flex justify-between items-center">
            <span>Live GPS Monitoring Interface</span>
            <span className="text-red-700 flex items-center gap-1"><MapPin size={10} /> SAT-LINK: ACTIVE</span>
          </div>
          <div className="relative w-full h-[500px] bg-gray-200 overflow-hidden border-t-0">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={13}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                  styles: [
                    { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#242f3e" }] },
                    { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f1e6" }] },
                    { "featureType": "landscape", "stylers": [{ "color": "#f5f5f5" }] },
                    { "featureType": "water", "stylers": [{ "color": "#c9c9c9" }] }
                  ]
                }}
              >
                {ambulances.map(a => (
                  <Marker
                    key={a.id}
                    position={{ lat: Number(a.lat), lng: Number(a.lng) }}
                    onClick={() => setSelected(a)}
                    title={a.id}
                    label={{
                      text: a.id.split('-')[1],
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 'black'
                    }}
                  />
                ))}

                {selected && (
                  <InfoWindow
                    position={{ lat: Number(selected.lat), lng: Number(selected.lng) }}
                    onCloseClick={() => setSelected(null)}
                  >
                    <div className="p-2 min-w-[150px] font-mono text-[10px]">
                      <div className="font-bold border-b border-gray-300 pb-1 mb-1 text-red-800 flex justify-between">
                        <span>{selected.id}</span>
                        <span>{selected.status}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-gray-800">
                        <div>ETA: {selected.eta}</div>
                        <div>DIST: {selected.dist}</div>
                        <div>PATIENT: {selected.patient}</div>
                        <div className="mt-1 bg-gray-100 p-1 border border-gray-300 text-center font-bold">
                          SPEED: {selected.speed}
                        </div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 font-bold text-gray-500 gap-2 border-2 border-dashed border-gray-300 m-4">
                <div className="animate-pulse font-mono text-sm tracking-tighter">SYNCHRONIZING WITH GLOBAL POSITIONING CONSTELLATION...</div>
                <div className="text-[10px] text-gray-400 font-mono">RECVING: NMEA-0183 DATAGRAMS</div>
              </div>
            )}

            <div className="absolute bottom-4 left-4 pointer-events-none z-10">
              <div className="bg-black/80 text-white p-2 border border-white/20 font-mono text-[10px] space-y-1 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  <span>CRITICAL ASSET TRACKING</span>
                </div>
                <div>LAT: {Number(ambulances[0]?.lat || 0).toFixed(4)}</div>
                <div>LNG: {Number(ambulances[0]?.lng || 0).toFixed(4)}</div>
              </div>
            </div>

            <div className="absolute bottom-4 right-4 bg-white/90 border border-black p-1 font-mono text-[9px] text-black shadow-lg z-10">
              SCALE: 1:25000 | GRID: WGS-84
            </div>
          </div>
        </div>

        <div className="lg:w-1/3 flex flex-col gap-4">
          <div className="bg-white border border-gray-400 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-400 p-2 font-bold text-gray-800 text-[10px] uppercase flex items-center gap-2">
              <Navigation size={12} /> Fleet Status Matrix
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-200 border-b border-gray-400 font-bold uppercase text-gray-600">
                    <th className="p-2 border-r border-gray-300">Unit</th>
                    <th className="p-2 border-r border-gray-300 text-center">Status</th>
                    <th className="p-2">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {ambulances.map(a => (
                    <tr key={a.id}
                      onClick={() => setSelected(a)}
                      className={cn(
                        "border-b border-gray-200 hover:bg-black hover:text-white cursor-pointer transition-all",
                        selected?.id === a.id ? "bg-black text-white" : ""
                      )}>
                      <td className="p-2 border-r border-gray-200 font-mono font-bold">{a.id}</td>
                      <td className="p-2 border-r border-gray-200 text-center">
                        <span className={cn(
                          "px-1 py-0.5 border text-[9px] uppercase font-bold",
                          a.status === 'Inbound' ? 'bg-red-100 text-red-700 border-red-300 blink_me' :
                            a.status === 'Available' ? 'bg-green-100 text-green-700 border-green-300' :
                              'bg-blue-100 text-blue-700 border-blue-300'
                        )}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-[9px] opacity-70">
                        {a.eta !== '--' ? `ETA ${a.eta}` : 'STATIC'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-black border border-gray-400 p-4 font-mono text-[10px] text-green-500 shadow-inner flex-1 flex flex-col relative overflow-hidden min-h-[150px]">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle,rgba(0,255,0,0.05)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none"></div>
            <div className="text-green-800 border-b border-green-900 mb-2 pb-1 font-bold">COMM-LINK ESTABLISHED</div>
            <div className="space-y-0.5">
              <div>[SYS] HANDSHAKE: DISPATCH-7... OK</div>
              <div>[SYS] {ambulances.filter(a => a.status !== 'Available').length} MOBILE UNITS ACTIVE</div>
              <div>[SYS] SIGNAL STRENGTH: -98dbm (GOOD)</div>
            </div>
            <div className="flex-1 mt-2 border-t border-green-900 pt-2 overflow-hidden flex flex-col justify-end gap-1">
              {ambulances.map(a => (
                <div key={a.id} className="flex justify-between items-center opacity-80 border-l border-green-900 pl-2">
                  <span>{a.id} &gt; {a.speed}</span>
                  <span className="text-[8px] text-green-700">SIG: {Math.floor(Math.random() * 15 + 85)}%</span>
                </div>
              ))}
              <div className="animate-pulse text-[9px] mt-1 text-green-300 uppercase">--- Standby for telemetry update ---</div>
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

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedAdm, setSelectedAdm] = useState<number | null>(null);

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

  const tabParam = searchParams.get('tab');

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
          <ActiveComponent
            admissionId={selectedAdm}
            setAdmissionId={setSelectedAdm}
            patients={patients}
          />
        </div>
      </div>
    </div>
  );
}
