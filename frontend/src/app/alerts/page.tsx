"use client";

import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

export default function AlertsManagementPage({ admissionId }: { admissionId?: number | null }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'high'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

  const fetchAlertData = useCallback(async () => {
    try {
      const [alRes, sumRes] = await Promise.all([
        fetch(`${API}/alerts`, { headers: ah() }),
        fetch(`${API}/admin/alerts-summary`, { headers: ah() })
      ]);

      if (alRes.ok) {
        const d = await alRes.json();
        setAlerts(d.rows || d.data || []);
      }
      if (sumRes.ok) {
        const d = await sumRes.json();
        setSummary(d.data);
      }
    } catch (_) { }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlertData();
    const id = setInterval(fetchAlertData, 5000);
    return () => clearInterval(id);
  }, [fetchAlertData]);

  const handleAcknowledge = async (id: number) => {
    setActionLoading(`ack-${id}`);
    try {
      const res = await fetch(`${API}/alerts/${id}/acknowledge`, {
        method: 'PATCH',
        headers: ah()
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
        fetchAlertData();
      }
    } catch (_) { }
    setActionLoading(null);
  };

  const runEscalation = async () => {
    setActionLoading('escalate');
    try {
      await fetch(`${API}/alerts/escalate`, { method: 'POST', headers: ah() });
      await fetchAlertData();
    } catch (_) { }
    setActionLoading(null);
  };

  const runCleanup = async () => {
    setActionLoading('cleanup');
    try {
      await fetch(`${API}/alerts/deduplicate`, { method: 'POST', headers: ah() });
      await fetchAlertData();
    } catch (_) { }
    setActionLoading(null);
  };

  const unack = alerts.filter(a => !a.is_acknowledged);
  const filtered = unack.filter(a => {
    const matchesSearch = !searchTerm ||
      a.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.message?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (admissionId && Number(a.admission_id) !== admissionId) return false;
    if (filter === 'all') return true;
    return a.severity?.toLowerCase() === filter.toLowerCase();
  });

  const criticalCount = unack.filter(a => a.severity === 'critical').length;
  const escCount = summary?.by_escalation.reduce((acc: number, cur: any) => acc + (cur.escalation_level > 1 ? parseInt(cur.count) : 0), 0) || 0;

  return (
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-gray-900">
      <div className="border-b-2 border-red-800 pb-2 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-red-900 m-0">Alert Command</h1>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={runEscalation}
            disabled={actionLoading === 'escalate'}
            className="bg-gray-200 border border-black px-3 py-1 font-bold shadow-sm hover:bg-gray-300 active:bg-gray-400 text-sm"
          >
            [ TRIGGER ESCALATION ]
          </button>
          <button
            onClick={runCleanup}
            disabled={actionLoading === 'cleanup'}
            className="bg-gray-200 border border-black px-3 py-1 font-bold shadow-sm hover:bg-gray-300 active:bg-gray-400 text-sm"
          >
            [ DEDUPLICATE ]
          </button>
        </div>
      </div>

      <p className="mb-4 text-sm font-bold text-gray-700">Real-time clinical incident monitoring and resolution.</p>

      <div className="flex bg-white border border-gray-400 mb-6 text-sm divide-x divide-gray-300 shadow-sm border-collapse">
        <div className="flex-1 p-2 bg-blue-100 flex flex-col justify-center items-center font-mono">
          <span className="font-bold text-blue-900 text-lg">{unack.length}</span>
          <span className="text-xs uppercase tracking-widest text-blue-800 font-bold">Live Incidents</span>
        </div>
        <div className={`flex-1 p-2 bg-red-100 flex flex-col justify-center items-center font-mono border-l border-gray-300 ${criticalCount > 0 ? 'blink_me_critical' : ''}`}>
          <span className="font-bold text-red-900 text-lg">{criticalCount}</span>
          <span className="text-xs uppercase tracking-widest text-red-800 font-bold">Critical Response</span>
        </div>
        <div className="flex-1 p-2 bg-yellow-100 flex flex-col justify-center items-center font-mono border-l border-gray-300">
          <span className="font-bold text-yellow-900 text-lg">{escCount}</span>
          <span className="text-xs uppercase tracking-widest text-yellow-800 font-bold">Escalated Levels</span>
        </div>
        <div className="flex-1 p-2 bg-gray-100 flex flex-col justify-center items-center font-mono border-l border-gray-300">
          <span className="font-bold text-gray-900 text-lg">{summary?.trend_alerts_24h || 0}</span>
          <span className="text-xs uppercase tracking-widest text-gray-800 font-bold">24h Trend</span>
        </div>
      </div>

      <div className="bg-white border border-gray-400 shadow-sm flex flex-col mb-6">
        <div className="bg-gray-200 border-b border-gray-400 p-2 text-sm flex justify-between items-center bg-gradient-to-b from-gray-100 to-gray-200">
          <div className="flex gap-4 items-center">
            <span className="font-bold">Mode:</span>
            <label className="flex items-center gap-1 font-bold"><input type="radio" checked={activeTab === 'live'} onChange={() => setActiveTab('live')} /> LIVE REGISTRY</label>
            <label className="flex items-center gap-1 font-bold"><input type="radio" checked={activeTab === 'history'} onChange={() => setActiveTab('history')} /> HISTORY</label>
          </div>
          <div className="flex gap-2 items-center">
            <span className="font-bold">Search:</span>
            <input type="text" className="border border-gray-400 px-2 py-0.5" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            <span className="font-bold ml-2">Severity:</span>
            <select className="border border-gray-400 px-2 py-0.5" value={filter} onChange={(e: any) => setFilter(e.target.value)}>
              <option value="all">ALL</option>
              <option value="critical">CRITICAL ONLY</option>
              <option value="high">HIGH ONLY</option>
              <option value="warning">WARNING</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-300 border-b border-gray-400">
                <th className="p-2 border-r border-gray-400 font-bold w-12 text-center">Lvl</th>
                <th className="p-2 border-r border-gray-400 font-bold w-24">Severity</th>
                <th className="p-2 border-r border-gray-400 font-bold">Patient / Subject</th>
                <th className="p-2 border-r border-gray-400 font-bold">Incident Detail</th>
                <th className="p-2 border-r border-gray-400 font-bold w-32">Timestamp</th>
                <th className="p-2 font-bold w-32 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && alerts.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500 italic font-bold">SYNCHRONIZING INCIDENT REGISTRY...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500 italic font-bold">NO INCIDENTS MATCH CRITERIA. REGISTRY HEALTHY.</td></tr>
              ) : (
                filtered.map((alert, idx) => {
                  const isCritical = alert.severity?.toLowerCase() === 'critical';
                  const escLevel = alert.escalation_level || 1;

                  return (
                    <tr key={alert.id} className={`border-b border-gray-200 hover:bg-yellow-50 ${isCritical ? 'bg-red-50' : ''}`}>
                      <td className="p-2 border-r border-gray-200 text-center font-bold font-mono">
                        {escLevel > 1 ? `L${escLevel}` : '--'}
                      </td>
                      <td className="p-2 border-r border-gray-200 font-bold font-mono text-xs">
                        <span className={`px-1 py-0.5 border ${isCritical ? 'bg-red-700 text-white border-red-900' : 'bg-gray-200 text-black border-gray-400'}`}>
                          {alert.severity?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="p-2 border-r border-gray-200 font-bold">
                        {alert.patient_name || 'System Level Alert'}
                        <div className="text-[10px] text-gray-600 font-normal uppercase">
                          Bed {alert.bed_number || 'N/A'} - {alert.ward_name || 'General'}
                        </div>
                      </td>
                      <td className="p-2 border-r border-gray-200 text-xs">
                        {alert.message}
                      </td>
                      <td className="p-2 border-r border-gray-200 text-xs font-mono">
                        {new Date(alert.triggered_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={actionLoading === `ack-${alert.id}`}
                          className="bg-gray-200 border border-black px-2 py-1 text-[11px] font-bold shadow-sm hover:bg-gray-300 active:bg-gray-400 disabled:opacity-50 w-full"
                        >
                          [ ACKNOWLEDGE ]
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-200 p-2 text-xs font-bold border-t border-gray-400 flex justify-between select-none font-mono">
          <span>ENGINE: ONLINE | POLLING: 5s</span>
          <span>SHOWING {filtered.length} OF {unack.length} ACTIVE RECORDS</span>
        </div>
      </div>

      <style>{`
         .blink_me_critical { animation: blinker_crit_bg 1s linear infinite; }
         @keyframes blinker_crit_bg { 50% { opacity: 0.7; border: 1px solid red; } }
      `}</style>
    </div>
  );
}
