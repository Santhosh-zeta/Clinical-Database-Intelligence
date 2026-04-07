"use client";

import React, { useEffect, useState, use, useCallback } from 'react';
import { VitalsChart } from '@/components/ui/VitalsChart';
import { AlertCard } from '@/components/ui/AlertCard';
import { EWSBadge } from '@/components/ui/EWSBadge';
import { PatientTimeline, TimelineEvent } from '@/components/ui/PatientTimeline';
import {
  ArrowLeft, UserCircle2, MapPin, Calendar, PlusCircle, LogOut,
  Pill, X, CheckCircle2, AlertTriangle, Loader2, Zap, ShieldAlert,
  TrendingUp, TrendingDown, Minus, Tag, ClipboardList, History
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const authHeader = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

// ── Helper: map backend event_type → PatientTimeline type ───────────────────
function mapEventType(t: string): TimelineEvent['type'] {
  if (t === 'admission') return 'admission';
  if (t === 'alert') return 'alert';
  if (t === 'prescription') return 'prescription';
  if (t === 'symptom') return 'symptom';
  if (t === 'ews_score' || t === 'vitals') return 'vitals_spike';
  return 'vitals_spike';
}

function mapSeverity(detail: any, type: string): TimelineEvent['severity'] {
  if (type === 'alert') {
    if (detail?.severity === 'critical') return 'critical';
    if (detail?.severity === 'high') return 'warning';
    return 'normal';
  }
  if (type === 'ews_score') {
    if (detail?.category === 'urgent') return 'critical';
    if (detail?.category === 'high') return 'warning';
  }
  return 'normal';
}

function buildTimelineTitle(ev: any) {
  switch (ev.event_type) {
    case 'admission': return `Admitted — ${ev.detail?.ward_name || ''} · ${ev.detail?.bed_number || ''}`;
    case 'alert': return `Alert: ${ev.detail?.alert_type || 'Clinical Alert'}`;
    case 'prescription': return `Prescribed: ${ev.detail?.medication_name || 'Medication'}`;
    case 'symptom': return `Symptom Recorded: ${ev.detail?.[0]?.name || 'Clinical Observation'}`;
    case 'ews_score': return `EWS Score Updated`;
    case 'diagnosis': return `Diagnosis: ${ev.detail?.diagnosis_text || ev.description}`;
    default: return ev.description || ev.event_type;
  }
}

function buildTimelineDesc(ev: any) {
  switch (ev.event_type) {
    case 'admission':
      return `${ev.detail?.diagnosis || ''} · Dr. ${ev.detail?.doctor_name || ''}`;
    case 'alert':
      return `${ev.detail?.message || ev.description} (${ev.detail?.severity || ''})`;
    case 'prescription':
      return `${ev.detail?.dose || ''} ${ev.detail?.frequency || ''} — by Dr. ${ev.detail?.prescribed_by || ''}`;
    case 'symptom':
      const list = Array.isArray(ev.detail) ? ev.detail : [];
      return list.map((s: any) => `${s.name} (${s.severity})`).join(', ');
    case 'ews_score':
      return `Score: ${ev.detail?.total_score ?? (ev.metadata?.total_score ?? '—')} · Category: ${ev.detail?.category ?? (ev.metadata?.category ?? '—')}`;
    default:
      return ev.description || '';
  }
}

export default function PatientDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [patient, setPatient] = useState<any>(null);
  const [vitals, setVitals] = useState<any[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [patientDbId, setPatientDbId] = useState<number | null>(null);

  // ── Fetch Patient data ────────────────────────────────────────────────────
  const fetchDynamic = useCallback(async () => {
    if (!patientDbId) return;
    try {
      const [vitalsRes, alertsRes] = await Promise.all([
        fetch(`${API}/vitals/${patientDbId}`, { headers: authHeader() }),
        fetch(`${API}/alerts/patient/${patientDbId}`, { headers: authHeader() })
      ]);
      if (vitalsRes.ok) {
        const vData = await vitalsRes.json();
        setVitals(vData.data || []);
      }
      if (alertsRes.ok) {
        const aData = await alertsRes.json();
        setActiveAlerts((aData.data || []).filter((a: any) => !a.is_acknowledged && a.status === 'active'));
      }
    } catch (_) { }
  }, [patientDbId]);

  useEffect(() => {
    fetchDynamic();
    const id = setInterval(fetchDynamic, 5000);
    return () => clearInterval(id);
  }, [fetchDynamic]);

  // ── Fetch Initial / Static Patient ────────────────────────────────────────
  useEffect(() => {
    async function fetchPatientData() {
      try {
        const admissionRes = await fetch(`${API}/admissions/${resolvedParams.id}`, { headers: authHeader() });
        if (admissionRes.ok) {
          const d = await admissionRes.json();
          const p = d.data;
          setPatient({
            id: String(p.id),
            name: p.patient_name,
            age: new Date().getFullYear() - new Date(p.date_of_birth).getFullYear(),
            gender: p.gender,
            ward: p.ward_name || 'Unassigned',
            bed: p.bed_number || 'Waitlist',
            diagnosis: p.diagnosis,
            riskScore: p.risk_category === 'critical' ? 'Critical' : p.risk_category === 'high' ? 'High' : (p.risk_category === 'medium' ? 'Medium' : 'Low')
          });
          setPatientDbId(p.patient_id);
        }
      } catch (_) { }
    }
    fetchPatientData();
  }, [resolvedParams.id]);

  const markAlertResolved = async (alertId: string) => {
    try {
      await fetch(`${API}/alerts/${alertId}/acknowledge`, { method: 'PATCH', headers: authHeader() });
      setActiveAlerts(prev => prev.filter(a => String(a.id) !== alertId));
    } catch (_) { }
  };

  // ── Prescriptions ─────────────────────────────────────────────────────────
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [rxLoading, setRxLoading] = useState(true);
  const [rxSuggestions, setRxSuggestions] = useState<any[]>([]);
  const [drugInteractions, setDrugInteractions] = useState<any[]>([]);
  const [showPrescribeModal, setShowPrescribeModal] = useState(false);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [isIssuingRx, setIsIssuingRx] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rxForm, setRxForm] = useState({ medicationId: '', dose: '', frequency: '', notes: '' });

  // ── Discharge ─────────────────────────────────────────────────────────────
  const [dischargeReady, setDischargeReady] = useState<boolean | null>(null);
  const [isDischarging, setIsDischarging] = useState(false);
  const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);

  // ── Real EWS ──────────────────────────────────────────────────────────────
  const [ewsData, setEwsData] = useState<{ total_score: number; category: string } | null>(null);

  // ── Real Timeline ─────────────────────────────────────────────────────────
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineSummary, setTimelineSummary] = useState<any>(null);
  const [timelineLoading, setTimelineLoading] = useState(true);

  // ── Vitals Trend ──────────────────────────────────────────────────────────
  const [trend, setTrend] = useState<any | null>(null);

  // ── Symptoms ──────────────────────────────────────────────────────────────
  const [showSymptomsModal, setShowSymptomsModal] = useState(false);
  const [symptoms, setSymptoms] = useState<{ name: string; severity: string }[]>([{ name: '', severity: 'moderate' }]);
  const [isSavingSymptoms, setIsSavingSymptoms] = useState(false);
  const [symptomsSuccess, setSymptomsSuccess] = useState(false);
  const fetchPrescriptions = useCallback(async () => {
    if (!patientDbId) return;
    setRxLoading(true);
    try {
      const res = await fetch(`${API}/prescriptions/${patientDbId}`, { headers: authHeader() });
      if (res.ok) { const d = await res.json(); setPrescriptions(d.data || []); }
    } catch (_) { }
    setRxLoading(false);
  }, [patientDbId]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  // ── Fetch EWS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!patient?.id) return;
    fetch(`${API}/vitals/ews/${patient.id}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { if (d.data) setEwsData(d.data); })
      .catch(() => { });
  }, [patient?.id]);

  // ── Fetch discharge-ready ─────────────────────────────────────────────────
  useEffect(() => {
    if (!patient?.id) return;
    fetch(`${API}/admissions/${patient.id}/discharge-ready`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => setDischargeReady(d.discharge_ready === true))
      .catch(() => { });
  }, [patient?.id]);

  // ── Fetch real timeline from backend ─────────────────────────────────────
  useEffect(() => {
    if (!patientDbId) return;
    setTimelineLoading(true);
    fetch(`${API}/patients/${patientDbId}/timeline?limit=50`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => {
        if (data.timeline) {
          setTimelineSummary(data.summary);
          const mapped: TimelineEvent[] = data.timeline.map((ev: any) => ({
            id: String(ev.id),
            type: mapEventType(ev.event_type),
            title: buildTimelineTitle(ev),
            description: buildTimelineDesc(ev),
            timestamp: ev.created_at,
            severity: mapSeverity(ev.detail, ev.event_type),
          }));
          setTimeline(mapped);
        }
      })
      .catch(() => { })
      .finally(() => setTimelineLoading(false));
  }, [patientDbId]);

  // ── Fetch vitals trend ────────────────────────────────────────────────────
  useEffect(() => {
    if (!patientDbId) return;
    fetch(`${API}/vitals/${patientDbId}/trend`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => { if (d.data) setTrend(d.data); })
      .catch(() => { });
  }, [patientDbId]);

  // ── Fetch suggestions when modal opens ───────────────────────────────────
  useEffect(() => {
    if (!showPrescribeModal || !patient?.diagnosis) return;
    fetch(`${API}/prescriptions/suggest?diagnosis=${encodeURIComponent(patient.diagnosis)}`, { headers: authHeader() })
      .then(r => r.json())
      .then(d => setRxSuggestions(d.data || []))
      .catch(() => setRxSuggestions([]));
  }, [showPrescribeModal, patient?.diagnosis]);

  // ── Drug interaction check ────────────────────────────────────────────────
  const handleInteractionCheck = async () => {
    if (!rxForm.medicationId) return;
    setCheckingInteractions(true);
    setDrugInteractions([]);
    try {
      const existingIds = prescriptions.filter((p: any) => p.status === 'active').map((p: any) => p.medication_id).filter(Boolean);
      const checkIds = [...new Set([...existingIds, parseInt(rxForm.medicationId)])];
      const res = await fetch(`${API}/prescriptions/check`, {
        method: 'POST', headers: authHeader(), body: JSON.stringify({ medicationIds: checkIds }),
      });
      const d = await res.json();
      setDrugInteractions(d.interactions || []);
    } catch (_) { }
    setCheckingInteractions(false);
  };

  // ── Cancel prescription ───────────────────────────────────────────────────
  const handleCancelPrescription = async (id: string) => {
    setCancellingId(id);
    try {
      await fetch(`${API}/prescriptions/${id}/cancel`, { method: 'PATCH', headers: authHeader() });
      await fetchPrescriptions();
    } catch (_) { }
    setCancellingId(null);
  };

  // ── Issue prescription ────────────────────────────────────────────────────
  const handleIssuePrescription = async () => {
    if (!rxForm.medicationId || !rxForm.dose || !rxForm.frequency) return;
    setIsIssuingRx(true);
    try {
      const res = await fetch(`${API}/prescriptions`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({
          admission_id: parseInt(patient!.id),
          medication_id: parseInt(rxForm.medicationId),
          dose: rxForm.dose, frequency: rxForm.frequency, notes: rxForm.notes,
        }),
      });
      const result = await res.json();
      if (result.interaction_warning && result.interactions?.length > 0) setDrugInteractions(result.interactions);
      await fetchPrescriptions();
      setShowPrescribeModal(false);
      setRxForm({ medicationId: '', dose: '', frequency: '', notes: '' });
      setDrugInteractions([]);
    } catch (_) { }
    setIsIssuingRx(false);
  };

  // ── Discharge ─────────────────────────────────────────────────────────────
  const handleDischarge = async () => {
    setIsDischarging(true);
    try {
      const res = await fetch(`${API}/admissions/${patient!.id}/discharge`, {
        method: 'PUT', headers: authHeader(),
        body: JSON.stringify({ discharge_notes: 'Discharge via IntelliCare dashboard.' }),
      });
      if (res.ok) router.push('/patients');
    } catch (_) { }
    setIsDischarging(false);
    setShowDischargeConfirm(false);
  };

  // ── Save symptoms ─────────────────────────────────────────────────────────
  const handleSaveSymptoms = async () => {
    const valid = symptoms.filter(s => s.name.trim());
    if (!valid.length || !patientDbId) return;
    setIsSavingSymptoms(true);
    try {
      const res = await fetch(`${API}/patients/${patientDbId}/symptoms`, {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ admission_id: parseInt(patient!.id), symptoms: valid }),
      });
      if (res.ok) {
        setSymptomsSuccess(true);
        // Trigger prescription suggestions based on saved symptoms
        if (!showPrescribeModal) {
          fetch(`${API}/prescriptions/suggest?diagnosis=${encodeURIComponent(valid.map(s => s.name).join(','))}`, { headers: authHeader() })
            .then(r => r.json())
            .then(d => setRxSuggestions(d.data || []))
            .catch(() => { });
        }
        setTimeout(() => { setSymptomsSuccess(false); setShowSymptomsModal(false); setSymptoms([{ name: '', severity: 'moderate' }]); }, 1500);
      }
    } catch (_) { }
    setIsSavingSymptoms(false);
  };

  if (!patient) {
    return <div className="p-10 text-center text-gray-500">Patient not found or loading...</div>;
  }

  const ewsCategory = ewsData?.category
    ? (ewsData.category === 'urgent' ? 'Critical' : ewsData.category === 'high' ? 'High' : ewsData.category === 'medium' ? 'Medium' : 'Low') as any
    : patient.riskScore;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full animate-in fade-in duration-700">

      {/* Header */}
      <div>
        <Link href="/patients" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 w-fit mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Patients
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <EWSBadge category={ewsCategory} score={ewsData?.total_score ?? null} />
          </div>

          <div className="flex items-center gap-5 relative z-10">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center shadow-inner overflow-hidden">
              <UserCircle2 className="w-12 h-12 text-slate-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-slate-600 font-medium">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> Age {patient.age} • {patient.gender}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {patient.ward} / {patient.bed}</span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs border border-slate-200">{patient.diagnosis || 'Observation'}</span>
              </div>
              {/* ── Vitals Trend Indicators ─────────────────────────────── */}
              {trend && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <TrendChip label="HR" value={trend.heart_rate} />
                  <TrendChip label="SpO₂" value={trend.spo2} />
                  <TrendChip label="BP Sys" value={trend.systolic_bp} />
                  <TrendChip label="Temp" value={trend.temperature} />
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 relative z-10">
            {dischargeReady === true && (
              <span className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold animate-pulse">
                <CheckCircle2 className="w-4 h-4" /> Ready for Discharge
              </span>
            )}
            <button onClick={() => setShowSymptomsModal(true)}
              className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-sm">
              <Tag className="w-4 h-4" /> Record Symptoms
            </button>
            <button onClick={() => setShowPrescribeModal(true)}
              className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-sm">
              <PlusCircle className="w-4 h-4" /> Issue Prescription
            </button>
            <button onClick={() => setShowDischargeConfirm(true)}
              className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-sm">
              <LogOut className="w-4 h-4" /> Discharge Patient
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <VitalsChart vitals={vitals} />

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div className="bg-rose-50/50 p-4 border border-rose-100 rounded-2xl flex flex-col gap-3">
              <h3 className="font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Active Critical Alerts ({activeAlerts.length})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {activeAlerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} onAcknowledge={markAlertResolved} />
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-500" /> Active Prescriptions
              </h3>
              <button onClick={() => setShowPrescribeModal(true)}
                className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            {rxLoading ? (
              <div className="flex items-center gap-3 py-8 justify-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading prescriptions...
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No prescriptions yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Medication</th>
                      <th className="px-4 py-3">Dosage</th>
                      <th className="px-4 py-3">Frequency</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 rounded-tr-lg text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prescriptions.map((rx: any) => (
                      <tr key={rx.id} className={cn('transition-colors', rx.status === 'cancelled' ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50/50')}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {rx.medication_name || `Med #${rx.medication_id}`}
                          {rx.interaction_warning && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                              <AlertTriangle className="w-3 h-3" /> Interaction
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{rx.dose}</td>
                        <td className="px-4 py-3">{rx.frequency}</td>
                        <td className="px-4 py-3">
                          <span className={cn('px-2 py-0.5 rounded-md text-xs font-bold border',
                            rx.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              rx.status === 'cancelled' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                'bg-blue-50 text-blue-700 border-blue-200')}>
                            {rx.status || 'active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {rx.status !== 'cancelled' && (
                            <button onClick={() => handleCancelPrescription(rx.id)} disabled={cancellingId === rx.id}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 ml-auto">
                              {cancellingId === rx.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real Timeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-500" /> Patient Timeline
            </h3>
            {timelineSummary && (
              <div className="flex gap-2 text-[10px] font-bold text-slate-500">
                <span className="bg-slate-100 px-2 py-1 rounded-lg">{timelineSummary.total_admissions} adm</span>
                <span className="bg-slate-100 px-2 py-1 rounded-lg">{timelineSummary.total_prescriptions} rx</span>
                <span className="bg-slate-100 px-2 py-1 rounded-lg">{timelineSummary.total_alerts} alerts</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {timelineLoading ? (
              <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading timeline...
              </div>
            ) : timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <ClipboardList className="w-10 h-10 opacity-30" />
                <p className="text-sm font-medium">No timeline events yet.</p>
                <p className="text-xs text-center opacity-70">Events appear automatically as vitals are recorded, alerts triggered, and prescriptions issued.</p>
              </div>
            ) : (
              <PatientTimeline events={timeline} />
            )}
          </div>
        </div>
      </div>

      {/* ── Issue Prescription Modal ─────────────────────────────────────────── */}
      {showPrescribeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-indigo-500" /> Issue Prescription
                </h3>
                <p className="text-slate-500 text-xs mt-1">Patient: {patient.name} · Admission #{patient.id}</p>
              </div>
              <button onClick={() => { setShowPrescribeModal(false); setDrugInteractions([]); setRxSuggestions([]); setRxForm({ medicationId: '', dose: '', frequency: '', notes: '' }); }}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              {/* Suggestions */}
              {rxSuggestions.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 border-l-2 border-indigo-400 pl-2">
                    Suggested for {patient.diagnosis}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rxSuggestions.map((s: any) => (
                      <button key={s.medication_id || s.id}
                        onClick={() => setRxForm(f => ({ ...f, medicationId: String(s.medication_id || s.id) }))}
                        className={cn('px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                          rxForm.medicationId === String(s.medication_id || s.id)
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700')}>
                        {s.medication_name || s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <RxInput label="Medication ID" type="number" placeholder="Enter medication ID..." value={rxForm.medicationId} onChange={v => setRxForm(f => ({ ...f, medicationId: v }))} />
                <div className="grid grid-cols-2 gap-3">
                  <RxInput label="Dose" placeholder="e.g. 500mg IV" value={rxForm.dose} onChange={v => setRxForm(f => ({ ...f, dose: v }))} />
                  <RxInput label="Frequency" placeholder="e.g. Twice daily" value={rxForm.frequency} onChange={v => setRxForm(f => ({ ...f, frequency: v }))} />
                </div>
                <RxInput label="Notes (optional)" placeholder="Special instructions..." value={rxForm.notes} onChange={v => setRxForm(f => ({ ...f, notes: v }))} />
              </div>
              {drugInteractions.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-amber-800 flex items-center gap-2 mb-2"><ShieldAlert className="w-4 h-4" /> Drug Interaction Warning ({drugInteractions.length})</p>
                  <ul className="space-y-1">
                    {drugInteractions.map((ix: any, idx: number) => (
                      <li key={idx} className="text-xs text-amber-700 font-medium">⚠ {ix.description || JSON.stringify(ix)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {drugInteractions.length === 0 && rxForm.medicationId && (
                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> No interaction warnings detected
                </p>
              )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={handleInteractionCheck} disabled={!rxForm.medicationId || checkingInteractions}
                className="flex-1 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 font-bold text-sm hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {checkingInteractions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Check Interactions
              </button>
              <button onClick={handleIssuePrescription} disabled={isIssuingRx || !rxForm.medicationId || !rxForm.dose || !rxForm.frequency}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isIssuingRx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pill className="w-4 h-4" />}
                Issue Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Symptoms Modal ─────────────────────────────────────────────────── */}
      {showSymptomsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-teal-500" /> Record Symptoms
                </h3>
                <p className="text-slate-500 text-xs mt-1">Symptoms will auto-suggest relevant prescriptions</p>
              </div>
              <button onClick={() => setShowSymptomsModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-3">
              {symptoms.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    placeholder={`Symptom ${i + 1} (e.g. fever, chest pain)`}
                    value={s.name}
                    onChange={e => setSymptoms(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-500/10 outline-none text-sm font-medium text-slate-800"
                  />
                  <select
                    value={s.severity}
                    onChange={e => setSymptoms(prev => prev.map((x, j) => j === i ? { ...x, severity: e.target.value } : x))}
                    className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-400 outline-none text-xs font-bold text-slate-600 cursor-pointer"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                  {symptoms.length > 1 && (
                    <button onClick={() => setSymptoms(prev => prev.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setSymptoms(prev => [...prev, { name: '', severity: 'moderate' }])}
                className="text-teal-600 text-sm font-bold hover:text-teal-700 flex items-center gap-1 mt-1">
                <PlusCircle className="w-4 h-4" /> Add another symptom
              </button>
              {symptomsSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Symptoms saved successfully!
                </div>
              )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setShowSymptomsModal(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button onClick={handleSaveSymptoms} disabled={isSavingSymptoms || !symptoms.some(s => s.name.trim())}
                className="flex-1 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-lg shadow-teal-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {isSavingSymptoms ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                {isSavingSymptoms ? 'Saving...' : 'Save Symptoms'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Discharge Confirm Modal ──────────────────────────────────────── */}
      {showDischargeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-200 p-8">
            <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-rose-200">
              <LogOut className="w-8 h-8 text-rose-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 text-center mb-2">Discharge Patient?</h3>
            <p className="text-slate-500 text-sm text-center mb-6">
              This will discharge <strong>{patient.name}</strong> from <strong>{patient.ward} / {patient.bed}</strong>. Bed will be freed and admission closed.
            </p>
            {dischargeReady === false && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Clinical system indicates patient may not be ready for discharge yet.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowDischargeConfirm(false)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleDischarge} disabled={isDischarging}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-lg shadow-rose-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {isDischarging ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                {isDischarging ? 'Discharging...' : 'Confirm Discharge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vitals Trend Chip ────────────────────────────────────────────────────────
function TrendChip({ label, value }: { label: string; value?: any }) {
  if (!value) return null;
  const dir = value.direction ?? (value.rate_of_change > 0 ? 'up' : value.rate_of_change < 0 ? 'down' : 'stable');
  const isUp = dir === 'up' || dir === 'increasing';
  const isDown = dir === 'down' || dir === 'decreasing';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border',
      isUp ? 'bg-rose-50 text-rose-700 border-rose-200' :
        isDown ? 'bg-blue-50 text-blue-700 border-blue-200' :
          'bg-slate-50 text-slate-600 border-slate-200'
    )}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : isDown ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {label}
    </span>
  );
}

// ── Prescription input helper ────────────────────────────────────────────────
function RxInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 border-l-2 border-indigo-400">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 outline-none text-sm font-medium text-slate-800" />
    </div>
  );
}
