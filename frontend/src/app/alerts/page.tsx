"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, Filter, Wind, ShieldAlert, CheckCircle2,
  ArrowRight, Clock, Trash2, RefreshCw, Zap, BellRing, Users,
  History, Settings, Info, ChevronRight, Activity, BellOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

export default function AlertsManagementPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'high'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

  // ── Data Fetching ───────────────────────────────────────────────────────
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

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleAcknowledge = async (id: number) => {
    setActionLoading(`ack-${id}`);
    try {
      const res = await fetch(`${API}/alerts/${id}/acknowledge`, {
        method: 'PATCH',
        headers: ah()
      });
      if (res.ok) {
        setAlerts(prev => prev.filter(a => a.id !== id));
        fetchAlertData(); // Refresh summary too
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

  // ── Filtering ────────────────────────────────────────────────────────────
  const unack = alerts.filter(a => !a.is_acknowledged);
  const filtered = unack.filter(a => {
    const matchesSearch = !searchTerm ||
      a.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.message?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    return a.severity?.toLowerCase() === filter.toLowerCase();
  });

  const criticalCount = unack.filter(a => a.severity === 'critical').length;
  const escCount = summary?.by_escalation.reduce((acc: number, cur: any) => acc + (cur.escalation_level > 1 ? parseInt(cur.count) : 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-1000">

      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-3">
            <BellRing className="w-10 h-10 text-indigo-500 animate-pulse" />
            Alert Command
          </h1>
          <p className="text-slate-500 text-lg font-medium">Real-time clinical incident monitoring and resolution.</p>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button
            onClick={runEscalation}
            disabled={actionLoading === 'escalate'}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-50"
          >
            {actionLoading === 'escalate' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            Trigger Escalation
          </button>
          <button
            onClick={runCleanup}
            disabled={actionLoading === 'cleanup'}
            className="p-3 bg-white border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-50 hover:text-slate-700 transition-all active:scale-90 shadow-sm"
            title="Deduplicate Alerts"
          >
            {actionLoading === 'cleanup' ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Live Incidents" value={unack.length} sub="Pending review" icon={<AlertTriangle />} color="bg-indigo-50 text-indigo-700 border-indigo-100" />
        <StatCard label="Critical Response" value={criticalCount} sub="Immediate action required" icon={<ShieldAlert />} color="bg-rose-50 text-rose-700 border-rose-200" pulse={criticalCount > 0} />
        <StatCard label="Escalated Levels" value={escCount} sub="High priority routing" icon={<Zap />} color="bg-amber-50 text-amber-700 border-amber-200" />
        <StatCard label="24h Trend" value={summary?.trend_alerts_24h || 0} sub="New incidents today" icon={<Activity />} color="bg-slate-50 text-slate-700 border-slate-200" />
      </div>

      {/* Workspace Area */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col min-h-[600px]">

        {/* Toolbar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <TabBtn active={activeTab === 'live'} label="Active Registry" onClick={() => setActiveTab('live')} />
            <TabBtn active={activeTab === 'history'} label="Incident History" onClick={() => setActiveTab('history')} />
          </div>

          <div className="flex flex-1 w-full md:w-auto items-center gap-3">
            <div className="relative flex-1 group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search patient or message..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 rounded-2xl outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-medium"
              />
            </div>
            <select
              value={filter}
              onChange={(e: any) => setFilter(e.target.value)}
              className="bg-white border border-slate-200 px-4 py-3 rounded-2xl outline-none focus:border-indigo-400 text-sm font-bold text-slate-700 cursor-pointer shadow-sm transition-all"
            >
              <option value="all">Severity: All</option>
              <option value="critical">Critical Only</option>
              <option value="high">High Only</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto min-h-[400px]">
          <AnimatePresence mode="wait">
            {loading && alerts.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-[400px] text-slate-400 gap-4">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="font-bold tracking-wide">Synchronizing alert state...</p>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-[400px] text-slate-400 gap-6 text-center px-10">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                  <BellOff className="w-10 h-10 text-slate-200" />
                </div>
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-800 mb-2">Workspace Healthy</h3>
                  <p className="max-w-md mx-auto text-slate-500 font-medium leading-relaxed">No pending alerts match your current filter criteria. All registered incidents have been acknowledged or resolved.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 grid grid-cols-1 gap-4"
              >
                {filtered.map((alert, idx) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    idx={idx}
                    onAcknowledge={handleAcknowledge}
                    loading={actionLoading === `ack-${alert.id}`}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Alert Engine: Online
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Polling Interval: 5s
            </span>
          </div>
          <div>
            Showing {filtered.length} of {unack.length} Active Records
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Supporting Components ──────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color, pulse }: any) {
  return (
    <div className={cn("p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group transition-all hover:shadow-md", color)}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{label}</span>
        <div className="p-2.5 rounded-xl bg-white/40 group-hover:bg-white/60 transition-colors">
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-5 h-5" })}
        </div>
      </div>
      <div className="text-4xl font-black tracking-tighter flex items-end gap-2">
        {value}
        {pulse && (
          <div className="mb-2 flex items-center gap-1.5 px-2 py-0.5 bg-white/60 border border-white rounded-full text-[9px] font-black uppercase text-rose-600 animate-pulse">
            <span className="w-1 w-1 bg-rose-600 rounded-full animate-ping" />
            Live
          </div>
        )}
      </div>
      <p className="text-[11px] font-bold mt-2 opacity-60">{sub}</p>
    </div>
  );
}

function TabBtn({ active, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-5 py-2.5 rounded-xl text-xs font-black transition-all",
        active ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function AlertRow({ alert, idx, onAcknowledge, loading }: any) {
  const isCritical = alert.severity?.toLowerCase() === 'critical';
  const isHigh = alert.severity?.toLowerCase() === 'high';
  const escLevel = alert.escalation_level || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className={cn(
        "p-5 rounded-3xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/50 group bg-white",
        isCritical && "bg-rose-50/30 border-rose-100 hover:border-rose-300"
      )}
    >
      <div className="flex items-center gap-5 min-w-0 flex-1">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-transform group-hover:rotate-3",
          isCritical ? "bg-rose-100 border-rose-200 text-rose-600" :
            isHigh ? "bg-orange-100 border-orange-200 text-orange-600" :
              "bg-slate-100 border-slate-200 text-slate-600"
        )}>
          {isCritical ? <ShieldAlert className="w-7 h-7" /> : <Info className="w-7 h-7" />}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors truncate">
              {alert.patient_name || 'System Alert'}
            </h3>
            <span className={cn(
              "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border",
              isCritical ? "bg-rose-500 text-white border-rose-600" :
                isHigh ? "bg-orange-400 text-white border-orange-500" :
                  "bg-slate-200 text-slate-600 border-slate-300"
            )}>
              {alert.severity}
            </span>
            {escLevel > 1 && (
              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-indigo-600 text-white border border-indigo-700 animate-pulse">
                Escalated L{escLevel}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 font-medium leading-relaxed line-clamp-2">
            {alert.message}
          </p>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-300" /> Bed {alert.bed_number || 'N/A'} · {alert.ward_name || 'General'}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-300" /> {new Date(alert.triggered_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
        <button
          onClick={() => onAcknowledge(alert.id)}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all shadow-sm active:scale-95 disabled:opacity-50",
            isCritical ? "bg-rose-600 text-white hover:bg-rose-700 hover:shadow-rose-200" :
              "bg-slate-900 text-white hover:bg-slate-800 hover:shadow-slate-200"
          )}
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Acknowledge
        </button>
        <button className="p-3 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 hover:border-indigo-200 transition-all active:scale-95">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
