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
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-gray-900">
      
      {/* Header */}
      <div className="mb-4">
        <Link href="/patients" className="text-sm font-bold text-blue-900 hover:underline mb-4 inline-block">
          &laquo; Back to Patient Directory
        </Link>
        <div className="bg-white border border-gray-400 p-4 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 border border-gray-400 bg-gray-100 flex items-center justify-center font-bold text-3xl text-gray-500">
              {patient.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 m-0">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-800 font-bold">
                <span>Age {patient.age} &bull; {patient.gender}</span>
                <span>Location: {patient.ward} / Bed {patient.bed}</span>
                <span className="bg-yellow-100 px-2 border border-yellow-400">Diagnosis: {patient.diagnosis || 'Observation'}</span>
              </div>
              {trend && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <TrendChip label="HR" value={trend.heart_rate} />
                  <TrendChip label="SpO2" value={trend.spo2} />
                  <TrendChip label="BP SYS" value={trend.systolic_bp} />
                  <TrendChip label="TEMP" value={trend.temperature} />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-4">
            <div className="border border-gray-400 bg-gray-100 p-2 text-center shadow-sm">
                <div className="text-xs font-bold text-gray-600 uppercase">EWS Level</div>
                <div className={cn("text-xl font-bold", ewsCategory === 'Critical' ? "text-red-700" : ewsCategory === 'High' ? "text-orange-600" : "text-green-700")}>
                    {ewsData?.total_score ?? '-'} ({ewsCategory})
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {dischargeReady === true && (
                <span className="px-3 py-1 bg-green-100 border border-green-700 text-green-900 text-sm font-bold shadow-sm">
                   READY FOR DISCHARGE
                </span>
              )}
              <button onClick={() => setShowSymptomsModal(true)}
                className="bg-gray-200 border border-gray-400 px-3 py-1 font-bold text-sm text-gray-800 hover:bg-gray-300 shadow-sm">
                Record Symptoms
              </button>
              <button onClick={() => setShowPrescribeModal(true)}
                className="bg-gray-200 border border-gray-400 px-3 py-1 font-bold text-sm text-gray-800 hover:bg-gray-300 shadow-sm">
                Issue Prescription
              </button>
              <button onClick={() => setShowDischargeConfirm(true)}
                className="bg-gray-200 border border-gray-400 px-3 py-1 font-bold text-sm text-gray-800 hover:bg-gray-300 shadow-sm">
                Discharge Patient
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column */}
        <div className="lg:flex-[2] flex flex-col gap-6">
          <div className="bg-white border border-gray-400 shadow-sm">
            <VitalsChart vitals={vitals} />
          </div>

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div className="bg-white border-2 border-red-700 p-4 shadow-sm flex flex-col gap-3">
              <h3 className="font-bold text-red-800 text-lg border-b border-red-200 pb-2">
                ACTIVE CLINICAL ALERTS ({activeAlerts.length})
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {activeAlerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} onAcknowledge={markAlertResolved} />
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions */}
          <div className="bg-white border border-gray-400 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4 border-b border-gray-300 pb-2">
              <h3 className="font-bold text-gray-900 text-lg">Active Prescriptions</h3>
              <button onClick={() => setShowPrescribeModal(true)}
                className="bg-gray-200 border border-gray-400 px-3 py-1 text-xs font-bold text-gray-800 hover:bg-gray-300 shadow-sm">
                + New Prescription
              </button>
            </div>
            {rxLoading ? (
              <div className="p-4 text-center font-bold text-gray-600">Loading prescriptions...</div>
            ) : prescriptions.length === 0 ? (
              <div className="p-4 text-center italic text-gray-500">No prescriptions recorded.</div>
            ) : (
              <div className="overflow-x-auto border border-gray-300">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-200 border-b border-gray-400 font-bold text-gray-800">
                    <tr>
                      <th className="p-2 border-r border-gray-300">Medication</th>
                      <th className="p-2 border-r border-gray-300">Dosage</th>
                      <th className="p-2 border-r border-gray-300">Frequency</th>
                      <th className="p-2 border-r border-gray-300 text-center">Status</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((rx: any) => (
                      <tr key={rx.id} className={cn('border-b border-gray-200', rx.status === 'cancelled' ? 'bg-gray-50 text-gray-500' : 'bg-white')}>
                        <td className="p-2 border-r border-gray-200 font-bold">
                          {rx.medication_name || `Med #${rx.medication_id}`}
                          {rx.interaction_warning && (
                            <span className="ml-2 font-bold text-red-700 bg-red-100 border border-red-300 px-1 text-[10px] uppercase">
                              Interaction Warning
                            </span>
                          )}
                        </td>
                        <td className="p-2 border-r border-gray-200">{rx.dose}</td>
                        <td className="p-2 border-r border-gray-200">{rx.frequency}</td>
                        <td className="p-2 border-r border-gray-200 text-center">
                          <span className="font-bold uppercase text-[10px]">{rx.status || 'ACTIVE'}</span>
                        </td>
                        <td className="p-2 text-center">
                          {rx.status !== 'cancelled' && (
                            <button onClick={() => handleCancelPrescription(rx.id)} disabled={cancellingId === rx.id}
                              className="text-xs font-bold text-red-800 bg-gray-200 border border-gray-400 px-2 py-1 shadow-sm hover:bg-gray-300 disabled:opacity-50">
                              {cancellingId === rx.id ? 'Cancelling...' : 'Cancel Rx'}
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
        <div className="lg:flex-1 bg-white border border-gray-400 shadow-sm p-4 flex flex-col h-[800px]">
          <div className="flex items-center justify-between mb-4 border-b border-gray-300 pb-2">
            <h3 className="font-bold text-gray-900 text-lg">System Audit Timeline</h3>
            {timelineSummary && (
              <div className="flex gap-2 text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-300 p-1">
                <span>{timelineSummary.total_admissions} ADM</span>
                <span>|</span>
                <span>{timelineSummary.total_prescriptions} RX</span>
                <span>|</span>
                <span>{timelineSummary.total_alerts} ALRT</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {timelineLoading ? (
              <div className="p-4 text-center font-bold text-gray-600">Loading timeline...</div>
            ) : timeline.length === 0 ? (
              <div className="p-4 text-center italic text-gray-500">No events logged in the system.</div>
            ) : (
              <PatientTimeline events={timeline} />
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      
      {/* Issue Prescription Modal */}
      {showPrescribeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-none">
          <div className="bg-white w-full max-w-lg border-2 border-black shadow-lg flex flex-col max-h-[90vh]">
            <div className="bg-blue-900 border-b border-black p-3 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg m-0">Issue Prescription</h3>
              <button onClick={() => { setShowPrescribeModal(false); setDrugInteractions([]); setRxSuggestions([]); setRxForm({ medicationId: '', dose: '', frequency: '', notes: '' }); }}
                className="font-bold text-white hover:text-gray-300">
                [X]
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex flex-col gap-4 bg-gray-100">
              {rxSuggestions.length > 0 && (
                <div className="bg-white border border-gray-400 p-3 shadow-sm">
                  <p className="text-xs font-bold text-gray-800 uppercase border-b border-gray-300 pb-1 mb-2">
                    System Prescriptions Mapped to Diagnosis
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rxSuggestions.map((s: any) => (
                      <button key={s.medication_id || s.id}
                        onClick={() => setRxForm(f => ({ ...f, medicationId: String(s.medication_id || s.id) }))}
                        className={cn('px-2 py-1 text-xs font-bold border',
                          rxForm.medicationId === String(s.medication_id || s.id)
                            ? 'bg-blue-800 text-white border-blue-900 shadow-sm'
                            : 'bg-gray-200 text-gray-800 border-gray-400 hover:bg-gray-300 shadow-sm')}>
                        {s.medication_name || s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="bg-white border border-gray-400 p-3 shadow-sm space-y-3">
                <RxInput label="Medication ID" type="number" placeholder="Enter ID..." value={rxForm.medicationId} onChange={v => setRxForm(f => ({ ...f, medicationId: v }))} />
                <div className="grid grid-cols-2 gap-3">
                  <RxInput label="Dose" placeholder="e.g. 500mg IV" value={rxForm.dose} onChange={v => setRxForm(f => ({ ...f, dose: v }))} />
                  <RxInput label="Frequency" placeholder="e.g. BID" value={rxForm.frequency} onChange={v => setRxForm(f => ({ ...f, frequency: v }))} />
                </div>
                <RxInput label="Notes (Optional)" placeholder="Specials..." value={rxForm.notes} onChange={v => setRxForm(f => ({ ...f, notes: v }))} />
              </div>

              {drugInteractions.length > 0 && (
                <div className="bg-white border-2 border-red-700 p-3 shadow-sm">
                  <p className="text-xs font-bold text-red-800 uppercase border-b border-red-200 pb-1 mb-2">DRUG INTERACTION WARNING</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {drugInteractions.map((ix: any, idx: number) => (
                      <li key={idx} className="text-xs font-bold text-red-900">{ix.description || JSON.stringify(ix)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {drugInteractions.length === 0 && rxForm.medicationId && (
                <p className="text-xs text-green-700 font-bold bg-green-50 border border-green-300 p-2 shadow-sm">
                  System Clearance: No strict contraindications found.
                </p>
              )}
            </div>
            <div className="p-4 bg-gray-200 border-t border-gray-400 flex gap-4">
              <button onClick={handleInteractionCheck} disabled={!rxForm.medicationId || checkingInteractions}
                className="flex-1 py-2 bg-yellow-100 border border-yellow-700 text-yellow-900 font-bold text-sm shadow-sm hover:bg-yellow-200 disabled:opacity-50">
                {checkingInteractions ? 'PROCESSING...' : 'RUN INTERACTION CHECK'}
              </button>
              <button onClick={handleIssuePrescription} disabled={isIssuingRx || !rxForm.medicationId || !rxForm.dose || !rxForm.frequency}
                className="flex-1 py-2 bg-blue-800 border border-blue-900 text-white font-bold text-sm shadow-sm hover:bg-blue-900 disabled:opacity-50">
                {isIssuingRx ? 'AUTHORIZING...' : 'COMMIT PRESCRIPTION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Symptoms Modal */}
      {showSymptomsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-none">
          <div className="bg-white w-full max-w-md border-2 border-black shadow-lg flex flex-col">
            <div className="bg-teal-800 border-b border-black p-3 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg m-0">Input Current Symptoms</h3>
              <button onClick={() => setShowSymptomsModal(false)}
                className="font-bold text-white hover:text-gray-300">
                [X]
              </button>
            </div>
            <div className="p-4 flex flex-col gap-4 bg-gray-100">
              <div className="bg-white border border-gray-400 p-3 shadow-sm flex flex-col gap-3">
                {symptoms.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      placeholder={`Symptom ${i + 1}`}
                      value={s.name}
                      onChange={e => setSymptoms(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="flex-1 px-2 py-1 bg-white border border-gray-400 outline-none text-sm font-bold text-gray-800"
                    />
                    <select
                      value={s.severity}
                      onChange={e => setSymptoms(prev => prev.map((x, j) => j === i ? { ...x, severity: e.target.value } : x))}
                      className="px-2 py-1 bg-white border border-gray-400 outline-none text-sm font-bold text-gray-800"
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                    </select>
                    {symptoms.length > 1 && (
                      <button onClick={() => setSymptoms(prev => prev.filter((_, j) => j !== i))} className="px-2 py-1 bg-gray-200 border border-gray-400 font-bold text-red-700 hover:bg-gray-300">
                        X
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setSymptoms(prev => [...prev, { name: '', severity: 'moderate' }])}
                  className="bg-gray-200 border border-gray-400 font-bold text-gray-800 text-xs py-1 px-3 w-fit shadow-sm hover:bg-gray-300">
                  + Add Line
                </button>
              </div>

              {symptomsSuccess && (
                <div className="bg-green-100 border border-green-700 text-green-900 text-sm font-bold p-2 text-center shadow-sm">
                  SYMPTOMS SAVED IN DATABASE
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-200 border-t border-gray-400 flex gap-4">
              <button onClick={() => setShowSymptomsModal(false)}
                className="flex-1 py-2 bg-gray-100 border border-gray-400 font-bold text-gray-800 shadow-sm hover:bg-gray-300">
                CANCEL
              </button>
              <button onClick={handleSaveSymptoms} disabled={isSavingSymptoms || !symptoms.some(s => s.name.trim())}
                className="flex-[2] py-2 bg-teal-800 border border-teal-900 text-white font-bold shadow-sm hover:bg-teal-900 disabled:opacity-50">
                {isSavingSymptoms ? 'SAVING...' : 'COMMIT SYMPTOMS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discharge Confirm Modal */}
      {showDischargeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-none">
          <div className="bg-white w-full max-w-sm border-2 border-red-900 shadow-lg p-6 text-center shadow-xl">
            <h3 className="text-xl font-bold text-red-900 mb-2 uppercase">Discharge Authorization</h3>
            <p className="text-gray-700 text-sm mb-6 font-bold">
              Release patient <strong>{patient.name}</strong> from <strong>{patient.ward}</strong>?<br/>This action finalizes the current admission record.
            </p>
            {dischargeReady === false && (
              <div className="bg-yellow-50 border border-yellow-400 p-2 mb-4 text-xs text-yellow-800 font-bold">
                WARNING: EWS SCORES INDICATE UNSTABLE VITALS.
              </div>
            )}
            <div className="flex gap-4">
              <button onClick={() => setShowDischargeConfirm(false)}
                className="flex-1 py-2 bg-gray-200 border border-gray-400 font-bold text-gray-800 shadow-sm hover:bg-gray-300">
                ABORT
              </button>
              <button onClick={handleDischarge} disabled={isDischarging}
                className="flex-1 py-2 bg-red-800 border border-red-900 text-white font-bold shadow-sm hover:bg-red-900 disabled:opacity-50">
                {isDischarging ? 'PROCESSING...' : 'CONFIRM RELEASE'}
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
      'px-1.5 py-0.5 border text-[10px] font-bold uppercase shadow-sm',
      isUp ? 'bg-red-50 text-red-800 border-red-400' :
        isDown ? 'bg-blue-50 text-blue-800 border-blue-400' :
          'bg-gray-100 text-gray-800 border-gray-400'
    )}>
      {label} {isUp ? '▲' : isDown ? '▼' : '▬'}
    </span>
  );
}

// ── Prescription input helper ────────────────────────────────────────────────
function RxInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-700 uppercase bg-gray-200 border border-gray-400 px-2 py-0.5 w-fit">{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-2 py-1 bg-white border border-gray-400 outline-none text-sm font-bold text-gray-800" />
    </div>
  );
}
