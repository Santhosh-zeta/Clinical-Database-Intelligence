"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const API = `https://clinical-database-intelligence.onrender.com/api`;
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

interface Patient {
  id: string;
  patient_id: number;
  name: string;
  age: number;
  ward: string;
  bed: string;
  riskScore: string;
  avatarUrl: string;
  diagnosis: string;
}

interface VitalsData {
  timestamp: string;
  heartRate: number;
  systolicBp: number;
  diastolicBp: number;
  oxygenLevel: number;
  temperature: number;
  ews: number;
}

export default function VitalsMonitor({ admissionId }: { admissionId?: number | null }) {
  const { currentUser } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<Record<string, VitalsData[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('detailed');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admissions?status=active`, { headers: ah() });
      if (res.ok) {
        const data = await res.json();
        const mapped: Patient[] = (data.data?.rows || data.rows || []).map((a: any) => ({
          id: String(a.id),
          patient_id: a.patient_id,
          name: a.patient_name,
          age: new Date().getFullYear() - new Date(a.date_of_birth).getFullYear(),
          ward: a.ward_name || 'Unassigned',
          bed: a.bed_number || 'Waitlist',
          diagnosis: a.diagnosis || 'Fever Observation',
          riskScore: a.risk_category || 'low',
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(a.patient_name)}&background=random`
        }));
        setPatients(mapped);
        if (mapped.length > 0 && !selectedPatient) {
          setSelectedPatient(mapped[0]);
        }
      }
    } catch (_) { }
    setLoading(false);
  }, [selectedPatient]);

  const fetchVitals = useCallback(async (p: Patient) => {
    try {
      const res = await fetch(`${API}/vitals/${p.patient_id}?limit=60`, { headers: ah() });
      if (res.ok) {
        const data = await res.json();
        const mapped: VitalsData[] = (data.data || []).map((v: any) => ({
          timestamp: v.recorded_at,
          heartRate: Number(v.heart_rate),
          systolicBp: Number(v.systolic_bp),
          diastolicBp: Number(v.diastolic_bp),
          oxygenLevel: Number(v.spo2),
          temperature: Number(v.temperature),
          ews: Number(v.ews_score || 0)
        })).reverse();
        setVitalsHistory(prev => ({ ...prev, [p.id]: mapped }));
        setLastUpdate(new Date());
      }
    } catch (_) { }
  }, []);

  useEffect(() => {
    fetchPatients();
    const id = setInterval(fetchPatients, 10000);
    return () => clearInterval(id);
  }, [fetchPatients]);

  useEffect(() => {
    if (admissionId && patients.length > 0) {
      const target = patients.find(p => Number(p.id) === admissionId);
      if (target) setSelectedPatient(target);
    }
  }, [admissionId, patients]);

  useEffect(() => {
    if (!selectedPatient) return;
    fetchVitals(selectedPatient);
    const id = setInterval(() => fetchVitals(selectedPatient), 5000);
    return () => clearInterval(id);
  }, [selectedPatient, fetchVitals]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ward.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

  const latestVitals = selectedPatient ? vitalsHistory[selectedPatient.id]?.slice(-1)[0] : null;

  return (
    <div className="max-w-[1400px] mx-auto p-4 font-sans text-slate-800 h-[calc(100vh-64px)] flex flex-col">
      <div className="border-b-2 border-blue-200 pb-2 mb-4 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 m-0">Patient Monitor List</h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2 py-1">
            <span className="font-bold text-sm">Search:</span>
            <input
              type="text"
              className="border border-slate-200 px-2 py-1 text-sm w-48 bg-white outline-none"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">

        <aside className="w-80 border border-slate-200 bg-white shadow-sm flex flex-col shrink-0 overflow-hidden">
          <div className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 p-2 font-bold text-sm">
            Active Monitored Patients
          </div>
          <div className="flex-1 overflow-y-auto p-2 bg-white">
            {filteredPatients.map((p) => (
              <PatientSidebarCard
                key={p.id}
                patient={p}
                isSelected={selectedPatient?.id === p.id}
                onClick={() => setSelectedPatient(p)}
                vitals={vitalsHistory[p.id]?.slice(-1)[0]}
              />
            ))}
            {loading && (
              <div className="p-4 text-center text-slate-500 italic text-sm">Loading remote feed...</div>
            )}
          </div>
        </aside>

        <main className="flex-1 border border-slate-200 bg-white shadow-sm overflow-y-auto p-4 flex flex-col relative">
          {selectedPatient ? (
            <div className="flex flex-col gap-4 h-full">

              <div className="bg-slate-50 border border-slate-200 p-4 flex justify-between items-start shrink-0">
                <div className="flex gap-4 items-center">
                  <img
                    src={selectedPatient.avatarUrl}
                    className="w-20 h-20 border border-slate-200 bg-white"
                    alt="Patient Avatar"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedPatient.name}</h2>
                    <div className="mt-1 text-sm text-slate-600">
                      <strong>Location:</strong> {selectedPatient.ward} | {selectedPatient.bed} <br />
                      <strong>Age:</strong> {selectedPatient.age} Yrs
                    </div>
                    <div className="mt-2 text-sm">
                      <strong>Diagnosis:</strong> {selectedPatient.diagnosis}
                    </div>
                  </div>
                </div>

                <div className="text-right border-l border-slate-200 pl-4 h-full flex flex-col justify-end">
                  <p className="text-sm font-bold text-slate-500 mb-1">Live Feed Synchronized:</p>
                  <p className="text-lg font-bold mb-3 text-slate-700">{lastUpdate.toLocaleTimeString()}</p>
                  <div className={cn(
                    "px-4 py-1 text-sm font-bold border",
                    selectedPatient.riskScore === 'critical' || selectedPatient.riskScore === 'high' ? 'bg-rose-50 text-red-800 border-red-300' : 'bg-green-100 text-green-800 border-green-300'
                  )}>
                    Risk Status: {selectedPatient.riskScore}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                <VitalCard
                  label="Heart Rate"
                  value={latestVitals?.heartRate || '—'}
                  unit="BPM"
                />
                <VitalCard
                  label="Oxygen Saturation"
                  value={latestVitals?.oxygenLevel || '—'}
                  unit="%"
                />
                <VitalCard
                  label="Blood Pressure"
                  value={latestVitals ? `${latestVitals.systolicBp}/${latestVitals.diastolicBp}` : '—'}
                  unit="mmHg"
                />
                <VitalCard
                  label="Core Temperature"
                  value={latestVitals?.temperature?.toFixed(1) || '—'}
                  unit="°C"
                />
              </div>

              <div className="flex-1 bg-white border border-slate-200 p-4 flex flex-col relative min-h-[300px]">
                <div className="border-b border-slate-100 pb-2 mb-4 flex justify-between items-end">
                  <div>
                    <h3 className="text-md font-bold text-slate-700">Clinical Telemetry History</h3>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-sm font-bold text-slate-600"><span className="text-red-600">■</span> Heart Rate</div>
                    <div className="text-sm font-bold text-slate-600"><span className="text-blue-600">■</span> SpO2%</div>
                  </div>
                </div>

                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={vitalsHistory[selectedPatient.id]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="timestamp" hide />
                      <YAxis yAxisId="left" stroke="#374151" fontSize={12} domain={[40, 180]} />
                      <YAxis yAxisId="right" orientation="right" stroke="#374151" fontSize={12} domain={[85, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line yAxisId="left" type="monotone" dataKey="heartRate" stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line yAxisId="right" type="monotone" dataKey="oxygenLevel" stroke="#2563eb" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center text-slate-400 italic">Please select a patient from the list to view telemetry.</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PatientSidebarCard({ patient, isSelected, onClick, vitals }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-2 border flex items-start gap-3 transition-colors mb-2 text-left",
        isSelected
          ? "bg-blue-50 border-blue-400"
          : "bg-white border-slate-100 hover:bg-slate-50 text-slate-700"
      )}
    >
      <img src={patient.avatarUrl} className="w-10 h-10 border border-slate-200 bg-white" alt="" />
      <div className="flex-1 min-w-0 py-0.5">
        <p className="text-sm font-bold text-slate-800 overflow-hidden whitespace-nowrap overflow-ellipsis">{patient.name}</p>
        <p className={cn("text-xs text-slate-500 mt-1")}>
          Location: {patient.ward}
        </p>
      </div>
      {(vitals?.heartRate && vitals.heartRate > 120 || vitals?.heartRate < 50 || patient.riskScore === 'critical') && (
        <div className="mt-1 bg-rose-50 text-red-800 px-1.5 py-0.5 text-[10px] font-bold border border-red-300 rounded-sm">
          ALERT
        </div>
      )}
    </button>
  );
}

function VitalCard({ label, value, unit }: any) {
  return (
    <div className="bg-gray-50 border border-slate-200 p-3 shadow-sm flex flex-col justify-between">
      <div className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-1 mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-800">{value}</span>
        <span className="text-sm font-bold text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-2 text-sm shadow-sm">
        <div className="font-bold border-b border-slate-100 mb-2 pb-1 text-slate-700">Data Snapshot</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex justify-between gap-6 py-0.5">
            <span className="text-slate-500">{p.name}:</span>
            <span className="font-bold text-slate-800">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export { CustomTooltip };
