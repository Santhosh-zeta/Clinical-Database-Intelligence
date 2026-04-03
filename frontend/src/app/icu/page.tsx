"use client";

import React, { useMemo } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { BedStatusGrid, BedData } from '../../components/ui/BedStatusGrid';

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
      const beds: BedData[] = Array.from({ length: 7 }).map((_, i) => {
         const bedName = `ICU-0${i + 1}`;
         const occupant = activeInWard.find(p => p.bed === bedName || (p.bed && p.bed.includes(`0${i+1}`)));
         
         const history = occupant ? vitalsHistory[occupant.id] : null;
         const currentVitals = history && history.length > 0 ? history[history.length - 1] : undefined;

         return { bedName, occupant, currentVitals };
      });
      return { name: wardName, beds };
    });
  }, [patients, vitalsHistory]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-10 w-full animate-in fade-in duration-700">
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">ICU Map Allocation</h1>
        <p className="text-slate-500 text-lg">Live monitoring floor plan of critical care units.</p>
      </div>

      <div className="flex flex-col gap-12">
        {icuLayout.map((ward) => (
          <BedStatusGrid key={ward.name} wardName={ward.name} beds={ward.beds} />
        ))}
      </div>
    </div>
  );
}
