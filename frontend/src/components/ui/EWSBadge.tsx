"use client";

import React from 'react';
import { RiskLevel } from '@/lib/types';
import { Activity } from 'lucide-react';
import clsx from 'clsx';

interface EWSBadgeProps {
  score?: number | null;
  category: RiskLevel;
  className?: string;
}

export function EWSBadge({ score, category, className }: EWSBadgeProps) {
  const styles = {
    Critical: 'bg-red-100 text-red-800 border-red-200',
    High: 'bg-orange-100 text-orange-800 border-orange-200',
    Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Low: 'bg-green-100 text-green-800 border-green-200'
  };

  const bgStyle = styles[category] || styles.Low;

  return (
    <div className={clsx(`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold`, bgStyle, className)}>
      <Activity className="w-4 h-4" />
      <span>EWS: {score !== undefined && score !== null ? score : '-'}</span>
      <span className="opacity-75 font-medium ml-1">({category})</span>
    </div>
  );
}
