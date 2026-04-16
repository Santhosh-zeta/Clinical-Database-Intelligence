"use client";

import React, { useEffect, useState } from 'react';
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

export default function ICUAllocationPage({ admissionId }: { admissionId?: number | null }) {
  const [allBeds, setAllBeds] = useState<BedStatus[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [showAddWard, setShowAddWard] = useState(false);
  const [showAddBed, setShowAddBed] = useState(false);
  const [wardForm, setWardForm] = useState({ name: '', ward_type: 'general' });
  const [bedForm, setBedForm] = useState({ bed_number: '', ward_id: '', is_icu: false });

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

  const fetchWards = async () => {
    try {
      const res = await fetch(`${API}/wards`, { headers: ah() });
      if (res.ok) {
        const d = await res.json();
        setWards(d.data || []);
      }
    } catch (_) { }
  };

  useEffect(() => {
    fetchBeds();
    fetchWards();
    const id = setInterval(fetchBeds, 10000);
    return () => clearInterval(id);
  }, []);

  const handleAddWard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/wards`, {
        method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify(wardForm)
      });
      if (res.ok) {
        setShowAddWard(false);
        setWardForm({ name: '', ward_type: 'general' });
        fetchWards();
      }
    } catch (_) { }
  };

  const handleAddBed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/beds`, {
        method: 'POST', headers: { ...ah(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bedForm, ward_id: parseInt(bedForm.ward_id) })
      });
      if (res.ok) {
        setShowAddBed(false);
        setBedForm({ bed_number: '', ward_id: '', is_icu: false });
        fetchBeds();
      }
    } catch (_) { }
  };

  const icuBeds = allBeds.filter(b => b.is_icu);
  const generalBeds = allBeds.filter(b => !b.is_icu);
  const occupiedIcu = icuBeds.filter(b => b.is_occupied).length;
  const critIcu = icuBeds.filter(b => b.risk_category === 'critical').length;

  const generalByWard = generalBeds.reduce<Record<string, BedStatus[]>>((acc, bed) => {
    const key = bed.ward_name || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(bed);
    return acc;
  }, {});

  return (
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-gray-900">
      <div className="border-b-2 border-blue-800 pb-2 mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 m-0 uppercase flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-900"></span>
            Hospital Bed Matrix
          </h1>
          <p className="text-xs font-bold text-gray-700 mt-1 uppercase tracking-tight italic">Facility Management & Occupancy Telemetry</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => setShowAddWard(true)} className="bg-indigo-700 text-white border border-indigo-900 px-3 py-1 font-bold text-xs shadow-sm hover:bg-indigo-800 uppercase tracking-tighter">+ Add Ward</button>
          <button onClick={() => setShowAddBed(true)} className="bg-emerald-700 text-white border border-emerald-900 px-3 py-1 font-bold text-xs shadow-sm hover:bg-emerald-800 uppercase tracking-tighter">+ Add Bed</button>
          <div className="h-6 w-px bg-gray-400 mx-1 hidden md:block"></div>
          <div className="text-[10px] font-bold bg-white border border-black px-2 py-1 flex items-center gap-3">
            <span className="text-red-700">CRIT: {critIcu}</span>
            <span className="text-blue-700">ICU: {occupiedIcu}/{icuBeds.length}</span>
          </div>
          <button
            onClick={fetchBeds}
            disabled={loading}
            className="bg-gray-200 border border-black px-3 py-1 font-bold text-xs shadow-sm hover:bg-gray-300 active:bg-gray-400 uppercase tracking-tighter"
          >
            {loading ? 'SYNCING...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {loading && allBeds.length === 0 ? (
        <div className="p-10 border border-black border-dashed bg-white font-bold text-center text-gray-500 uppercase">CONTACTING REGISTRY...</div>
      ) : allBeds.length === 0 ? (
        <div className="p-10 border border-black border-dashed bg-white font-bold text-center text-red-700 uppercase italic">NO ASSETS REGISTERED IN THIS SECTOR</div>
      ) : (
        <div className="flex flex-col gap-6">

          { }
          <div className="bg-gray-200 border border-black p-2 text-[10px] font-bold flex flex-wrap gap-4 items-center shadow-sm uppercase">
            <span>TELEMETRY LEGEND:</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-black"></div> VACANT</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-200 border border-black"></div> OCCUPIED</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-300 border border-black"></div> WARNING</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600 border border-black font-black flex items-center justify-center text-[8px] text-white">!</div> CRITICAL</span>
          </div>

          { }
          {icuBeds.length > 0 && (
            <div className="bg-white border-2 border-black shadow-md">
              <div className="bg-red-800 text-white font-black px-3 py-1.5 text-xs tracking-[0.2em] border-b-2 border-black uppercase flex justify-between items-center">
                <span>[SECTION_A] INTENSIVE CARE UNIT</span>
                <span className="bg-white text-red-800 px-2 py-0.5 text-[9px]">LIVE_DATA</span>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 bg-gray-300 border shadow-inner">
                {icuBeds.map((bed, i) => <BedCard key={bed.bed_id} bed={bed} index={i} />)}
              </div>
            </div>
          )}

          { }
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(generalByWard).map(([wardName, wardBeds]) => (
              <div key={wardName} className="bg-white border border-black shadow-sm flex flex-col">
                <div className="bg-gray-800 text-white font-bold px-3 py-1 text-[10px] flex justify-between uppercase tracking-widest">
                  <span>{wardName}</span>
                  <span>UTILIZATION: {Math.round((wardBeds.filter(b => b.is_occupied).length / wardBeds.length) * 100)}%</span>
                </div>
                <div className="p-2 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-8 gap-1 bg-white">
                  {wardBeds.map((bed, i) => <BedCard key={bed.bed_id} bed={bed} index={i} compact />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      { }
      {showAddWard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md border-2 border-black shadow-xl p-6">
            <h3 className="text-lg font-black uppercase mb-4 border-b border-black pb-1">Register New Ward</h3>
            <form onSubmit={handleAddWard} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-gray-600">Ward Designation / Name</label>
                <input required className="w-full border border-black px-2 py-1.5 font-bold text-sm" value={wardForm.name} onChange={e => setWardForm({ ...wardForm, name: e.target.value })} placeholder="e.g. Ward 3C - Oncology" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-gray-600">Ward Classification</label>
                <select className="w-full border border-black px-2 py-1.5 font-bold text-sm bg-white" value={wardForm.ward_type} onChange={e => setWardForm({ ...wardForm, ward_type: e.target.value })}>
                  <option value="general">General</option>
                  <option value="icu">ICU</option>
                  <option value="surgical">Surgical</option>
                  <option value="paediatric">Paediatric</option>
                  <option value="maternity">Maternity</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddWard(false)} className="flex-1 border border-black font-bold uppercase text-xs py-2 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="flex-1 bg-black text-white font-bold uppercase text-xs py-2 hover:bg-gray-800">Add Ward</button>
              </div>
            </form>
          </div>
        </div>
      )}

      { }
      {showAddBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md border-2 border-black shadow-xl p-6">
            <h3 className="text-lg font-black uppercase mb-4 border-b border-black pb-1">Commission New Bed</h3>
            <form onSubmit={handleAddBed} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-gray-600">Assigned Ward</label>
                <select required className="w-full border border-black px-2 py-1.5 font-bold text-sm bg-white" value={bedForm.ward_id} onChange={e => setBedForm({ ...bedForm, ward_id: e.target.value })}>
                  <option value="">Select Target Ward</option>
                  {wards.map((w: any) => <option key={w.id} value={w.id}>{w.name} ({w.ward_type.toUpperCase()})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-gray-600">Bed Number / Identifier</label>
                <input required className="w-full border border-black px-2 py-1.5 font-bold text-sm" value={bedForm.bed_number} onChange={e => setBedForm({ ...bedForm, bed_number: e.target.value })} placeholder="e.g. B-101" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="is_icu" checked={bedForm.is_icu} onChange={e => setBedForm({ ...bedForm, is_icu: e.target.checked })} />
                <label htmlFor="is_icu" className="text-xs font-bold uppercase cursor-pointer">Mark as Critical Care Unit (ICU)</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddBed(false)} className="flex-1 border border-black font-bold uppercase text-xs py-2 hover:bg-gray-100">Cancel</button>
                <button type="submit" className="flex-1 bg-black text-white font-bold uppercase text-xs py-2 hover:bg-gray-800">Add Bed Slot</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function BedCard({ bed, index, compact = false }: { bed: BedStatus; index: number; compact?: boolean }) {
  const isCrit = bed.risk_category === 'critical';
  const isHigh = bed.risk_category === 'high';

  let bgClass = "bg-white text-gray-500 border-gray-400";
  let contentClass = "text-gray-400";

  if (bed.is_occupied) {
    if (isCrit) {
      bgClass = "bg-red-600 text-white border-black font-bold blink_me_critical shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]";
      contentClass = "text-white animate-pulse";
    } else if (isHigh) {
      bgClass = "bg-yellow-300 text-black border-black font-bold";
      contentClass = "text-red-800";
    } else {
      bgClass = "bg-blue-200 text-black border-black font-bold";
      contentClass = "text-blue-900";
    }
  }

  const content = (
    <div className={`border ${bgClass} p-1 text-center h-[55px] flex flex-col justify-center items-center shadow-sm relative transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer z-10`} title={bed.is_occupied ? `${bed.patient_name} — ${bed.risk_category || 'stable'}` : 'Available'}>
      <span className="text-[8px] absolute top-0.5 left-1 font-black uppercase tracking-tighter opacity-70">{bed.bed_number || `B${index + 1}`}</span>
      {bed.is_occupied ? (
        <span className={`text-[9px] mt-3 leading-tight truncate w-full px-1 font-black ${contentClass}`}>
          {bed.patient_name?.split(' ')[0].toUpperCase()}
        </span>
      ) : (
        <span className="text-[9px] mt-2 opacity-50 font-bold italic tracking-tighter">VACANT</span>
      )}
      {isCrit && <style>{`
          .blink_me_critical { animation: blinker_crit 1s linear infinite; }
          @keyframes blinker_crit { 50% { background-color: #7f1d1d; } }
       `}</style>}
    </div>
  );

  if (bed.is_occupied && bed.admission_id) {
    return <Link href={`/patients/${bed.admission_id}`} className="block">{content}</Link>;
  }
  return content;
}
