"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Patient, Vitals, Alert, RiskLevel } from '../lib/types';
import { mockPatients, generateHistoricalVitals, generateNextVitals, evaluateAlerts } from '../lib/mockData';

interface SimulationContextType {
  patients: Patient[];
  vitalsHistory: Record<string, Vitals[]>;
  alerts: Alert[];
  markAlertResolved: (id: string) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [patients] = useState<Patient[]>(mockPatients);
  const [vitalsHistory, setVitalsHistory] = useState<Record<string, Vitals[]>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Custom Hook to manage simulation
  useEffect(() => {
    // Initialize Historical Vitals mapping
    const historyMap: Record<string, Vitals[]> = {};
    patients.forEach(p => {
        historyMap[p.id] = generateHistoricalVitals(p, 15);
    });
    setVitalsHistory(historyMap);

    // Initial alerts detection
    const initialAlerts: Alert[] = [];
    patients.forEach(p => {
       const latest = historyMap[p.id][historyMap[p.id].length - 1];
       const alert = evaluateAlerts(latest, p);
       if (alert) initialAlerts.push(alert);
    });
    setAlerts(initialAlerts);

    const interval = setInterval(() => {
      let newlyGeneratedAlerts: Alert[] = [];
      
      setVitalsHistory(prev => {
        const nextMap = { ...prev };
        
        patients.forEach(p => {
          const currentHistory = nextMap[p.id];
          if (!currentHistory) return;
          const latestVitals = currentHistory[currentHistory.length - 1];
          const newVitals = generateNextVitals(latestVitals, p.riskScore);
          
          // Keep only last 20 data points
          const updatedHistory = [...currentHistory.slice(-19), newVitals];
          nextMap[p.id] = updatedHistory;

          // Check for alerts
          const alert = evaluateAlerts(newVitals, p);
          if (alert) {
              newlyGeneratedAlerts.push(alert);
          }
        });

        return nextMap;
      });

      if (newlyGeneratedAlerts.length > 0) {
        setAlerts(curr => {
            const filteredNew = newlyGeneratedAlerts.filter(newAlert => 
                !curr.some(a => !a.resolved && a.patientId === newAlert.patientId && a.metric === newAlert.metric)
            );
            if (filteredNew.length === 0) return curr;
            return [...filteredNew, ...curr].slice(0, 100); // Keep last 100 alerts globally
        });
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [patients]);

  const markAlertResolved = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
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
