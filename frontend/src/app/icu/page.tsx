"use client";

import React, { useMemo } from 'react';
import { BedDouble, AlertCircle, CheckCircle2, HeartPulse, UserCircle } from 'lucide-react';
import { useSimulation } from '../../contexts/SimulationContext';
import { cn } from '../../lib/utils';
import { RiskBadge } from '../../components/ui/RiskBadge';
import { Patient } from '../../lib/types';
import Link from 'next/link';

export default function ICUAllocationPage() {
  const { patients, vitalsHistory } = useSimulation();

  // Dynamic ICU floor plan setup
  const icuLayout = useMemo(() => {
    const icuPatients = patients.filter(p => p.ward && p.ward.includes('ICU'));
    
    // Extract unique ICU wards from active patients, fallback to default 'ICU' if none
    let icuWards = Array.from(new Set(icuPatients.map(p => p.ward)));
    if (icuWards.length === 0) {
       icuWards = ['ICU'];
    }

    return icuWards.map(wardName => {
      const activeInWard = icuPatients.filter(p => p.ward === wardName);
      
      // Dynamically generate beds for the ward based on occupied ones plus empty ones to make a grid of 5
      const beds = Array.from({ length: 7 }).map((_, i) => {
         const bedName = `ICU-0${i + 1}`;
         const occupant = activeInWard.find(p => p.bed === bedName || (p.bed && p.bed.includes(`0${i+1}`)));
         return { bedName, occupant };
      });
      return { name: wardName, beds };
    });
  }, [patients]);

  const handleDragStart = (e: React.DragEvent, patientId: string) => {
    e.dataTransfer.setData('patientId', patientId);
  };

  const handleDrop = async (e: React.DragEvent, targetBedName: string, targetWardName: string) => {
    e.preventDefault();
    const patientId = e.dataTransfer.getData('patientId');
    if (!patientId) return;
    alert(`Transferring Patient ${patientId} to ${targetWardName} - ${targetBedName}`);
    // A real implementation would call the backend here
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-10 w-full">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">ICU Map Allocation</h1>
        <p className="text-slate-500 text-lg">Live monitoring floor plan of critical care units.</p>
      </div>

      <div className="flex flex-col gap-12">
        {icuLayout.map((ward) => (
          <section key={ward.name} className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
               <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{ward.name}</h2>
               <div className="h-px bg-slate-200 flex-1 ml-4" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ward.beds.map((bed, idx) => {
                  const history = bed.occupant ? vitalsHistory[bed.occupant.id] : null;
                  const currentHr = history && history.length > 0 ? history[history.length - 1].heartRate : null;
                  const currentSpo2 = history && history.length > 0 ? history[history.length - 1].oxygenLevel : null;
                  const isCritical = bed.occupant && bed.occupant.riskScore === 'Critical';
                  
                  return (
                    <div 
                      key={idx} 
                      onDrop={(e) => !bed.occupant && handleDrop(e, bed.bedName, ward.name)}
                      onDragOver={handleDragOver}
                      draggable={!!bed.occupant}
                      onDragStart={(e) => bed.occupant && handleDragStart(e, bed.occupant.id)}
                      className={cn(
                      "relative rounded-[2rem] border p-6 flex flex-col h-64 transition-all group overflow-hidden cursor-grab active:cursor-grabbing",
                      bed.occupant 
                        ? "bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] hover:-translate-y-1" 
                        : "bg-slate-50/50 border-slate-200 border-dashed hover:bg-slate-50 hover:border-slate-300"
                    )}>
                       
                       {/* Absolute Background Accent for Critical */}
                       {isCritical && (
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.5)] z-0" />
                       )}
                       {bed.occupant && !isCritical && (
                          <div className={cn("absolute top-0 left-0 w-full h-1 z-0", 
                              bed.occupant.riskScore === 'High' ? "bg-orange-400" :
                              bed.occupant.riskScore === 'Medium' ? "bg-amber-400" : "bg-emerald-400"
                          )} />
                       )}

                       {/* Top row */}
                       <div className="flex justify-between items-start mb-5 relative z-10">
                          <div className="flex items-center gap-2">
                             <div className={cn("p-2 rounded-xl border", bed.occupant ? "bg-slate-50 border-slate-100 text-indigo-500" : "bg-white border-slate-200 text-slate-400")}>
                                <BedDouble className="w-5 h-5" />
                             </div>
                             <span className={cn("font-bold text-lg tracking-tight", bed.occupant ? "text-slate-800" : "text-slate-400")}>{bed.bedName}</span>
                          </div>
                          {bed.occupant ? (
                             <RiskBadge score={bed.occupant.riskScore} />
                          ) : (
                             <span className="text-xs bg-emerald-50 text-emerald-600 font-bold px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5 shadow-sm uppercase tracking-wider">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Available
                             </span>
                          )}
                       </div>

                       {/* Body */}
                       {bed.occupant ? (
                         <div className="flex-1 flex flex-col relative z-10">
                            <div className="flex items-center gap-4 mb-5">
                               <img src={bed.occupant.avatarUrl} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm bg-slate-100" alt="Avatar" />
                               <div className="min-w-0">
                                  <h3 className="font-extrabold text-slate-900 text-[15px] truncate">{bed.occupant.name}</h3>
                                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{bed.occupant.diagnosis}</p>
                               </div>
                            </div>
                            
                            {/* Mini Vitals readout */}
                            <div className="mt-auto grid grid-cols-2 gap-3">
                               <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col gap-1 relative overflow-hidden group-hover:bg-indigo-50/30 transition-colors">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest relative z-10">HR (bpm)</span>
                                  <span className="text-xl font-extrabold text-slate-800 leading-none flex items-center gap-1 relative z-10 tracking-tight">
                                     {currentHr} <HeartPulse className={cn("w-3.5 h-3.5", currentHr && (currentHr > 110 || currentHr < 50) ? "text-rose-500 animate-pulse" : "text-slate-300")} />
                                  </span>
                               </div>
                               <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col gap-1 relative overflow-hidden group-hover:bg-indigo-50/30 transition-colors">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest relative z-10">SpO2 (%)</span>
                                  <span className="text-xl font-extrabold text-slate-800 leading-none relative z-10 tracking-tight">
                                     {currentSpo2}
                                  </span>
                               </div>
                            </div>
                         </div>
                       ) : (
                         <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 relative z-10">
                            <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                               <UserCircle className="w-8 h-8 text-slate-300" />
                            </div>
                            <span className="text-sm font-semibold tracking-wide">Ready for admission</span>
                         </div>
                       )}

                       {/* Overlay Link */}
                       {bed.occupant && (
                          <Link href="/vitals" className="absolute inset-0 z-20" aria-label={`View ${bed.occupant.name} vitals`} />
                       )}
                    </div>
                  );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}


