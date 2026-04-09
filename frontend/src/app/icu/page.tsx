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
      <div className="border-b-2 border-blue-800 pb-2 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 m-0">ICU Allocation Map</h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-sm font-bold bg-white border border-black px-2 py-1 flex items-center gap-4">
             <span className="text-red-700">CRITICAL: {critIcu}</span>
             <span className="text-blue-700">ICU OCCUPANCY: {occupiedIcu}/{icuBeds.length}</span>
          </div>
          <button
            onClick={fetchBeds}
            disabled={loading}
            className="bg-gray-200 border border-black px-3 py-1 font-bold text-sm shadow-sm hover:bg-gray-300 active:bg-gray-400"
          >
            {loading ? 'SYNCING...' : 'REFRESH LIVE DATA'}
          </button>
        </div>
      </div>
      
      <p className="mb-6 text-sm font-bold text-gray-700">Live monitoring floor plan — data from database. {lastRefreshed && `LAST SYNC: ${lastRefreshed.toLocaleTimeString()}`}</p>
      
      {loading && allBeds.length === 0 ? (
        <div className="p-4 border border-black bg-white font-bold text-center">CONNECTING TO WARD REGISTRY...</div>
      ) : allBeds.length === 0 ? (
        <div className="p-4 border border-black bg-white font-bold text-center text-red-700">NO BED DATA RECEIVED FROM HOST.</div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* Legend */}
          <div className="bg-gray-200 border border-gray-400 p-2 text-xs font-bold flex gap-6 items-center shadow-sm">
             <span>MAP LEGEND:</span>
             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-black"></div> AVAILABLE</span>
             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-200 border border-black"></div> OCCUPIED</span>
             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-300 border border-black"></div> HIGH RISK</span>
             <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600 border border-black"></div> CRITICAL</span>
          </div>

          {/* ICU BEDS */}
          {icuBeds.length > 0 && (
             <div className="bg-white border border-gray-400 shadow-sm">
                <div className="bg-red-800 text-white font-bold px-2 py-1 text-sm tracking-widest border-b border-gray-400">
                   INTENSIVE CARE UNITS (ICU)
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1 bg-gray-100 border border-gray-400 shadow-inner mx-2 mb-2 mt-2">
                   {icuBeds.map((bed, i) => <BedCard key={bed.bed_id} bed={bed} index={i} />)}
                </div>
             </div>
          )}

          {/* GENERAL WARDS */}
          {Object.entries(generalByWard).map(([wardName, wardBeds]) => (
             <div key={wardName} className="bg-white border border-gray-400 shadow-sm">
                <div className="bg-gray-300 border-b border-gray-400 text-gray-900 font-bold px-2 py-1 text-sm flex justify-between">
                   <span>{wardName.toUpperCase()}</span>
                   <span>OCCUPANCY: {wardBeds.filter(b => b.is_occupied).length}/{wardBeds.length}</span>
                </div>
                <div className="p-2 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-1 bg-white">
                   {wardBeds.map((bed, i) => <BedCard key={bed.bed_id} bed={bed} index={i} compact />)}
                </div>
             </div>
          ))}

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
        bgClass = "bg-red-600 text-white border-black font-bold blink_me_critical";
        contentClass = "text-white";
     } else if (isHigh) {
        bgClass = "bg-yellow-300 text-black border-black font-bold";
        contentClass = "text-red-800";
     } else {
        bgClass = "bg-blue-200 text-black border-black font-bold";
        contentClass = "text-blue-900";
     }
  }

  const content = (
    <div className={`border ${bgClass} p-1 text-center h-[50px] flex flex-col justify-center items-center shadow-sm relative`} title={bed.is_occupied ? `${bed.patient_name} — ${bed.risk_category || 'stable'}` : 'Available'}>
       <span className="text-[10px] absolute top-0.5 left-1 font-mono">{bed.bed_number || `B${index + 1}`}</span>
       {bed.is_occupied ? (
          <span className={`text-[9px] mt-3 leading-tight truncate w-full px-1 ${contentClass}`}>
             {bed.patient_name?.split(' ')[0].toUpperCase()}
          </span>
       ) : (
          <span className="text-[9px] mt-2 opacity-50">FREE</span>
       )}
       {isCrit && <style>{`
          .blink_me_critical { animation: blinker_crit 1.5s linear infinite; }
          @keyframes blinker_crit { 50% { opacity: 0.8; background-color: #990000; } }
       `}</style>}
    </div>
  );

  if (bed.is_occupied && bed.admission_id) {
    return <Link href={`/patients/${bed.admission_id}`} className="block hover:border-black">{content}</Link>;
  }
  return content;
}
