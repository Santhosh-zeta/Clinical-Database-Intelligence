"use client";

import React, { useEffect, useState } from 'react';
import { BedDouble, Loader2, RefreshCw, HeartPulse, AlertTriangle, User, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import Link from 'next/link';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

interface BedStatus {
  bed_id: number;
  bed_number: string;
  ward_name: string;
  ward_type: string;
  is_occupied: boolean;
  is_icu: boolean;
  patient_name?: string;
  admission_id?: number;
  risk_score?: number;
  risk_category?: string;
  ews_category?: string;
}

export default function ICUAllocationPage() {
  const [allBeds, setAllBeds] = useState<BedStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchBeds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/bed-status`, { headers: ah() });
      if (res.ok) {
        const data = await res.json();
        setAllBeds(data.data || []);
        setLastRefreshed(new Date());
      }
    } catch (_) { }
    setLoading(false);
  };

  useEffect(() => {
    fetchBeds();
    const id = setInterval(fetchBeds, 10000);
    return () => clearInterval(id);
  }, []);

  // ── Show ALL beds — group ICU separately at top, then general ────────────
  const icuBeds = allBeds.filter(b => b.is_icu);
  const generalBeds = allBeds.filter(b => !b.is_icu);

  const occupiedIcu = icuBeds.filter(b => b.is_occupied).length;
  const critIcu = icuBeds.filter(b => b.risk_category === 'critical').length;

  // Group general beds by ward
  const generalByWard = generalBeds.reduce<Record<string, BedStatus[]>>((acc, bed) => {
    const key = bed.ward_name || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(bed);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 w-full animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">ICU Allocation Map</h1>
          <p className="text-slate-500 text-lg">
            Live monitoring floor plan — data from database
            {lastRefreshed && <span className="ml-2 text-slate-400 text-sm">· updated {lastRefreshed.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && icuBeds.length > 0 && (
            <div className="flex gap-3">
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {critIcu} Critical
              </div>
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <BedDouble className="w-4 h-4" /> {occupiedIcu}/{icuBeds.length} Occupied
              </div>
            </div>
          )}
          <button
            onClick={fetchBeds}
            disabled={loading}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading && allBeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="text-sm font-medium">Fetching live bed status from database...</p>
        </div>
      ) : allBeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3 bg-white rounded-3xl border border-dashed border-slate-200">
          <BedDouble className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">No bed data available. Make sure the backend is running.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">

          {/* ── ICU Beds ───────────────────────────────────────────────── */}
          {icuBeds.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-lg">
                  <Activity className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-wider">Intensive Care Units (ICU)</h2>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                {icuBeds.map((bed, i) => (
                  <BedCard key={bed.bed_id} bed={bed} index={i} />
                ))}
              </div>
            </section>
          )}

          {/* ── General Wards ──────────────────────────────────────────── */}
          {Object.entries(generalByWard).map(([wardName, wardBeds]) => (
            <section key={wardName}>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-slate-100 text-slate-600 border border-slate-200 p-1.5 rounded-lg">
                  <BedDouble className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-wider">{wardName}</h2>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400 font-medium">
                  {wardBeds.filter(b => b.is_occupied).length}/{wardBeds.length} occupied
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 gap-3">
                {wardBeds.map((bed, i) => (
                  <BedCard key={bed.bed_id} bed={bed} index={i} compact />
                ))}
              </div>
            </section>
          ))}

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Legend:</span>
            <LegendDot cls="border-dashed bg-slate-50 border-slate-300" label="Available" />
            <LegendDot cls="bg-indigo-50 border-indigo-300" label="Occupied — Stable" />
            <LegendDot cls="bg-amber-50 border-amber-300" label="High Risk" />
            <LegendDot cls="bg-rose-50 border-rose-300" label="Critical" />
          </div>
        </div>
      )}
    </div>
  );
}

function BedCard({ bed, index, compact = false }: { bed: BedStatus; index: number; compact?: boolean }) {
  const isCrit = bed.risk_category === 'critical';
  const isHigh = bed.risk_category === 'high';
  const isUrgentEws = bed.ews_category === 'urgent';

  const cardClass = cn(
    'rounded-2xl flex flex-col items-center justify-center border font-bold text-xs cursor-default transition-all hover:scale-105 hover:shadow-md',
    compact ? 'h-16' : 'h-28',
    !bed.is_occupied
      ? 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
      : isCrit
        ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm shadow-rose-100'
        : isHigh
          ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm'
          : 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
  );

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.015 }}
      title={bed.is_occupied ? `${bed.patient_name} — ${bed.risk_category || 'stable'}` : 'Available'}
      className={cardClass}
    >
      {!compact && bed.is_occupied && (
        <div className={cn('p-1 rounded-lg mb-1', isCrit ? 'text-rose-500' : isHigh ? 'text-amber-500' : 'text-indigo-500')}>
          {(isCrit || isUrgentEws) ? <HeartPulse className="w-4 h-4 animate-pulse" /> : <User className="w-4 h-4" />}
        </div>
      )}
      <span className="truncate max-w-full px-1.5 text-center text-[11px]">{bed.bed_number || `B${index + 1}`}</span>
      {bed.is_occupied && !compact && (
        <>
          <span className="text-[9px] font-medium opacity-70 mt-0.5 truncate max-w-full px-1 text-center">
            {bed.patient_name?.split(' ')[0] || 'Occupied'}
          </span>
          <span className={cn('text-[9px] font-bold mt-0.5 uppercase', isCrit ? 'text-rose-500' : isHigh ? 'text-amber-500' : 'text-indigo-500')}>
            {bed.risk_category || 'stable'}
          </span>
        </>
      )}
      {!bed.is_occupied && !compact && (
        <span className="text-[10px] font-medium opacity-50 mt-1">Free</span>
      )}
    </motion.div>
  );

  // Make occupied beds clickable if we have an admission ID
  if (bed.is_occupied && bed.admission_id) {
    return <Link href={`/patients/${bed.admission_id}`}>{content}</Link>;
  }
  return content;
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-5 h-5 rounded-lg border', cls)} />
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  );
}
