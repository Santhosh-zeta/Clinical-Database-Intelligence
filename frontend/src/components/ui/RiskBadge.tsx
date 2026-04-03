import React from 'react';
import { cn } from '../../lib/utils';
import { RiskLevel } from '../../lib/types';

export function RiskBadge({ score }: { score: string }) {
  const isCritical = score === 'Critical';
  const styles: Record<string, string> = {
    Critical: 'bg-rose-50 text-rose-600 border-rose-200 shadow-[0_2px_10px_rgba(244,63,94,0.1)]',
    High: 'bg-orange-50 text-orange-600 border-orange-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-slate-50 text-slate-600 border-slate-200 font-semibold',
  };

  return (
    <div className={cn("px-3 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-widest border flex items-center gap-2 shadow-sm", styles[score] || styles.Low)}>
      <div className={cn("w-2 h-2 rounded-full", 
        score === 'Critical' ? 'bg-rose-500 animate-pulse' :
        score === 'High' ? 'bg-orange-500' :
        score === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'
      )} />
      {score}
    </div>
  );
}
