"use client";

import React, { useState, useEffect } from 'react';
import { AlertCard } from '@/components/ui/AlertCard';
import { AlertTriangle, Filter, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

export default function AlertsManagementPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch(`${API}/alerts`, { headers: authHeader() });
        if (res.ok) {
          const data = await res.json();
          // Map backend alert to local structure if needed, or assume AlertCard uses db structure
          const mapped = (data.data || []).map((a: any) => ({
            id: String(a.id),
            patientId: String(a.admission_id), // Wait, admission_id or patient_id? We can use admission_id or patient_id, but the card just needs it for link maybe.
            patientName: a.patient_name || 'Patient',
            wardId: a.ward_name || '',
            bedId: a.bed_number || '',
            type: a.severity === 'critical' ? 'Critical' : 'Warning',
            message: a.message,
            timestamp: a.triggered_at,
            resolved: a.status === 'resolved' || a.is_acknowledged
          }));
          setAlerts(mapped);
        }
      } catch (_) { }
    }
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const markAlertResolved = async (alertId: string) => {
    try {
      await fetch(`${API}/alerts/${alertId}/acknowledge`, { method: 'PATCH', headers: authHeader() });
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
    } catch (_) { }
  };

  const filteredAlerts = alerts.filter(a => {
    if (a.resolved) return false;
    if (filter === 'critical') return a.type === 'Critical';
    if (filter === 'warning') return a.type === 'Warning';
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Alerts Management</h1>
          <p className="text-slate-500 text-lg">Central hub for reviewing and acknowledging active incidents.</p>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setFilter('all')}
            className={cn("px-4 py-2 rounded-lg font-medium text-sm transition-colors", filter === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
          >
            All Alerts ({alerts.filter(a => !a.resolved).length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={cn("px-4 py-2 rounded-lg font-medium text-sm transition-colors", filter === 'critical' ? 'bg-rose-50 border border-rose-100 shadow-sm text-rose-700' : 'text-slate-500 hover:text-rose-600')}
          >
            Critical
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={cn("px-4 py-2 rounded-lg font-medium text-sm transition-colors", filter === 'warning' ? 'bg-amber-50 border border-amber-100 shadow-sm text-amber-700' : 'text-slate-500 hover:text-amber-600')}
          >
            Warnings
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6 text-slate-800 font-bold text-lg border-b border-slate-100 pb-4">
          <AlertTriangle className="w-5 h-5 text-indigo-500" /> Active Incidents
        </div>

        {filteredAlerts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onAcknowledge={markAlertResolved} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center p-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200"
          >
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
              <Wind className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">Zero Active Alerts</h3>
            <p className="text-slate-500 max-w-md">The hospital ecosystem is currently stable. No incidents match your current filter criteria.</p>
          </motion.div>
        )}
      </div>

      {alerts.filter(a => a.resolved).length > 0 && (
        <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-500 mb-4 flex items-center gap-2"><Filter className="w-5 h-5" /> Recently Acknowledged</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 opacity-75">
            {alerts.filter(a => a.resolved).slice(0, 3).map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
