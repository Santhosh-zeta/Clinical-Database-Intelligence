"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient, Vitals, Alert, RiskLevel } from '../lib/types';

interface SimulationContextType {
  patients: Patient[];
  vitalsHistory: Record<string, Vitals[]>;
  alerts: Alert[];
  markAlertResolved: (id: string) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const API_BASE = 'http://localhost:3001/api';

// Utility to calculate age from DOB
function calculateAge(dobStr: string | null) {
  if (!dobStr) return 45; // Default mock age
  const dob = new Date(dobStr);
  const diff_ms = Date.now() - dob.getTime();
  const age_dt = new Date(diff_ms);
  return Math.abs(age_dt.getUTCFullYear() - 1970);
}

// Map DB risk categories to frontend categories
function mapRiskCategory(category: string | null): RiskLevel {
  if (!category) return 'Low';
  const c = category.toLowerCase();
  if (c === 'critical') return 'Critical';
  if (c === 'high') return 'High';
  if (c === 'moderate') return 'Medium';
  return 'Low';
}

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vitalsHistory, setVitalsHistory] = useState<Record<string, Vitals[]>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // We will poll everything from the backend every 2s
    let isMounted = true;

    const fetchState = async () => {
      try {
        // 1. Fetch Active Admissions (Patients)
        const admitRes = await fetch(`${API_BASE}/admissions?status=active`);
        if (!admitRes.ok) return;
        const admitData = await admitRes.json();

        const fetchedPatients: Patient[] = admitData.data.map((a: any) => ({
          id: String(a.id), // We map admission_id to frontend Patient.id
          patientIdForVitals: a.patient_id, // Store for fetching vitals
          name: a.patient_name,
          age: calculateAge(a.date_of_birth),
          gender: a.gender || 'Unknown',
          ward: a.ward_name || 'General',
          bed: a.bed_number || 'TBD',
          admissionDate: a.admitted_at,
          diagnosis: a.diagnosis || 'Observation',
          riskScore: mapRiskCategory(a.risk_category),
        }));

        // 2. Fetch Vitals History for each patient
        const newVitalsHistory: Record<string, Vitals[]> = {};
        for (const p of fetchedPatients) {
          try {
            const vitalsRes = await fetch(`${API_BASE}/vitals/${(p as any).patientIdForVitals}?limit=20`);
            if (vitalsRes.ok) {
              const vitalsData = await vitalsRes.json();
              // Backend returns DESC, we want ASC for charts (left-to-right)
              const sorted = (vitalsData.data || []).reverse();
              newVitalsHistory[p.id] = sorted.map((v: any) => ({
                patientId: p.id,
                timestamp: v.recorded_at,
                heartRate: v.heart_rate,
                bloodPressure: {
                  systolic: v.systolic_bp,
                  diastolic: v.diastolic_bp,
                },
                oxygenLevel: parseFloat(v.spo2),
                temperature: parseFloat(v.temperature),
              }));
            }
          } catch (e) {
            console.error('Failed to fetch vitals for', p.id);
          }
        }

        // 3. Fetch Unacknowledged Alerts
        try {
          const alertsRes = await fetch(`${API_BASE}/alerts?limit=50`);
          if (alertsRes.ok) {
            const alertsData = await alertsRes.json();
            const fetchedAlerts: Alert[] = (alertsData.data || []).map((a: any) => ({
              id: String(a.id),
              patientId: String(a.admission_id),
              patientName: a.patient_name,
              timestamp: a.triggered_at,
              type: a.severity === 'high' || a.severity === 'critical' ? 'Critical' : 'Warning',
              message: a.message,
              metric: 'Multiple', // Defaulting as backend message holds specifics
              resolved: a.is_acknowledged === true,
            }));
            if (isMounted) setAlerts(fetchedAlerts);
          }
        } catch (e) { /* ignore */ }

        if (isMounted) {
          setPatients(fetchedPatients);
          setVitalsHistory(newVitalsHistory);
        }
      } catch (err) {
        console.error('Backend fetch error:', err);
      }
    };

    fetchState();
    const intervalId = setInterval(fetchState, 3000); // 3 seconds poll

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const markAlertResolved = async (id: string) => {
    try {
      // Optimistic URL Update
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
      await fetch(`${API_BASE}/alerts/${id}/acknowledge`, { method: 'PUT' });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SimulationContext.Provider value={{ patients, vitalsHistory, alerts, markAlertResolved }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
}
