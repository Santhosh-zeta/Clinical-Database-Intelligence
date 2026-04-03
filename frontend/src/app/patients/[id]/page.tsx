"use client";

import React, { useEffect, useState, use } from 'react';
import { useSimulation } from '@/contexts/SimulationContext';
import { VitalsChart } from '@/components/ui/VitalsChart';
import { AlertCard } from '@/components/ui/AlertCard';
import { EWSBadge } from '@/components/ui/EWSBadge';
import { PatientTimeline, TimelineEvent } from '@/components/ui/PatientTimeline';
import { ArrowLeft, UserCircle2, MapPin, Calendar, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function PatientDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { patients, vitalsHistory, alerts, markAlertResolved } = useSimulation();
  
  const patient = patients.find(p => p.id === resolvedParams.id);
  const vitals = vitalsHistory[resolvedParams.id] || [];
  const patientAlerts = alerts.filter(a => a.patientId === resolvedParams.id);
  const activeAlerts = patientAlerts.filter(a => !a.resolved);

  // Generate timeline events from Admission, Alerts, and Mock Vitals Spikes
  const timelineEvents = React.useMemo(() => {
    if (!patient) return [];

    const events: TimelineEvent[] = [];
    
    // 1. Admission Event
    if (patient.admissionDate) {
      events.push({
        id: `adm-${patient.id}`,
        type: 'admission',
        title: 'Admitted to Hospital',
        description: `Assigned to ${patient.ward} - ${patient.bed}. Reason: ${patient.diagnosis}`,
        timestamp: patient.admissionDate,
        severity: 'normal'
      });
    }

    // 2. Alert Events
    patientAlerts.forEach(a => {
      events.push({
        id: `alert-${a.id}`,
        type: 'alert',
        title: 'System Alert',
        description: a.message,
        timestamp: a.timestamp,
        severity: a.type === 'Critical' ? 'critical' : 'warning'
      });
    });

    // 3. Mock Prescriptions
    if (patient.admissionDate) {
      events.push({
        id: `rx-1-${patient.id}`,
        type: 'prescription',
        title: 'Prescription Administered',
        description: 'IV Fluids (Normal Saline 1L) started',
        timestamp: new Date(new Date(patient.admissionDate).getTime() + 1000 * 60 * 60 * 2).toISOString(),
        severity: 'normal'
      });
    }

    return events;
  }, [patient, patientAlerts]);

  if (!patient) {
    return <div className="p-10 text-center text-gray-500">Patient not found or loading...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full animate-in fade-in duration-700">
      
      {/* Header & Back Link */}
      <div>
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 w-fit mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 overflow-hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
          <div className="absolute top-0 right-0 p-4">
            <EWSBadge category={patient.riskScore} score={patient.riskScore === 'Critical' ? 8 : patient.riskScore === 'High' ? 6 : patient.riskScore === 'Medium' ? 4 : 1} />
          </div>
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-20 h-20 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center shadow-inner overflow-hidden">
              <UserCircle2 className="w-12 h-12 text-slate-400" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{patient.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-sm text-slate-600 font-medium w-full">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> Age {patient.age} • {patient.gender}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {patient.ward} / {patient.bed}</span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs border border-slate-200">{patient.diagnosis || 'Observation'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors text-sm shadow-sm">
               <PlusCircle className="w-4 h-4" /> Add Note
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Vitals & Prescriptions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <VitalsChart vitals={vitals} />
          
          {/* Active Alerts Section */}
          {activeAlerts.length > 0 && (
            <div className="bg-rose-50/50 p-4 border border-rose-100 rounded-2xl flex flex-col gap-3">
              <h3 className="font-bold text-rose-900 flex items-center gap-2">
                Active Critical Alerts ({activeAlerts.length})
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {activeAlerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} onAcknowledge={markAlertResolved} />
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions (Static Demo) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Active Prescriptions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Medication</th>
                    <th className="px-4 py-3">Dosage</th>
                    <th className="px-4 py-3">Frequency</th>
                    <th className="px-4 py-3 rounded-tr-lg">Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">Epinephrine (Adrenaline)</td>
                    <td className="px-4 py-3">1 mg IV</td>
                    <td className="px-4 py-3">Q3-5 mins PRN</td>
                    <td className="px-4 py-3 text-red-600 font-medium">Elevates HR</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">Ceftriaxone</td>
                    <td className="px-4 py-3">2 g IV</td>
                    <td className="px-4 py-3">Daily</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">Safe</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
          <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Patient Timeline</h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <PatientTimeline events={timelineEvents} />
          </div>
        </div>
        
      </div>
    </div>
  );
}
