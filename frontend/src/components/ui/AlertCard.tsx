"use client";

import React from 'react';
import { Alert } from '@/lib/types';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AlertCardProps {
  alert: Alert;
  onAcknowledge?: (id: string) => void;
}

export function AlertCard({ alert, onAcknowledge }: AlertCardProps) {
  const isCritical = alert.type === 'Critical';
  const isWarning = alert.type === 'Warning';
  

  const styles = alert.resolved 
    ? {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: <CheckCircle2 className="w-5 h-5 text-gray-400" />,
        text: 'text-gray-500',
        title: 'text-gray-700 font-medium line-through'
      }
    : {
        bg: isCritical ? 'bg-red-50' : isWarning ? 'bg-amber-50' : 'bg-blue-50',
        border: isCritical ? 'border-red-200' : isWarning ? 'border-amber-200' : 'border-blue-200',
        icon: isCritical ? <ShieldAlert className="w-6 h-6 text-red-600" /> : 
              isWarning ? <AlertTriangle className="w-6 h-6 text-amber-600" /> : 
              <Info className="w-6 h-6 text-blue-600" />,
        text: isCritical ? 'text-red-700' : isWarning ? 'text-amber-800' : 'text-blue-700',
        title: isCritical ? 'text-red-900 font-bold' : isWarning ? 'text-amber-900 font-bold' : 'text-blue-900 font-bold'
      };

  const timeString = new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = new Date(alert.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-4 rounded-xl border ${styles.bg} ${styles.border} flex flex-col gap-2 transition-all`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{styles.icon}</div>
          <div>
            <h4 className={`text-sm ${styles.title}`}>
              {alert.message}
            </h4>
            <p className={`text-xs mt-1 ${styles.text}`}>
              Patient: {alert.patientName || 'Unknown'} • {dateString} at {timeString}
            </p>
          </div>
        </div>
        
        {!alert.resolved && onAcknowledge && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all flexshrink-0
              ${isCritical 
                ? 'bg-red-100 border-red-200 text-red-700 hover:bg-red-200' 
                : isWarning 
                ? 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200' 
                : 'bg-blue-100 border-blue-200 text-blue-700 hover:bg-blue-200'}`}
          >
            Acknowledge
          </button>
        )}
        {alert.resolved && (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
            Resolved
          </span>
        )}
      </div>
    </motion.div>
  );
}
