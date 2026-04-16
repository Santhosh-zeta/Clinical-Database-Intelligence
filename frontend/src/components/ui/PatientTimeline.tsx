"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertCircle, Syringe, UserPlus } from 'lucide-react';
import clsx from 'clsx';

export type TimelineEventType = 'admission' | 'alert' | 'vitals_spike' | 'prescription' | 'symptom';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  timestamp: string;
  severity?: 'normal' | 'warning' | 'critical';
}

interface PatientTimelineProps {
  events: TimelineEvent[];
}

const getIconForType = (type: TimelineEventType, severity: TimelineEvent['severity']) => {
  switch (type) {
    case 'admission': return <UserPlus className="w-4 h-4 text-blue-600" />;
    case 'alert': return <AlertCircle className={clsx("w-4 h-4", severity === 'critical' ? 'text-red-600' : 'text-amber-600')} />;
    case 'vitals_spike': return <Activity className={clsx("w-4 h-4", severity === 'critical' ? 'text-red-600' : 'text-amber-600')} />;
    case 'prescription': return <Syringe className="w-4 h-4 text-purple-600" />;
    case 'symptom': return <Activity className="w-4 h-4 text-teal-600" />;
    default: return <Activity className="w-4 h-4 text-gray-600" />;
  }
};

const getBgForType = (type: TimelineEventType, severity: TimelineEvent['severity']) => {
  switch (type) {
    case 'admission': return 'bg-blue-100 border-blue-200';
    case 'alert': return severity === 'critical' ? 'bg-red-100 border-red-200' : 'bg-amber-100 border-amber-200';
    case 'vitals_spike': return severity === 'critical' ? 'bg-red-100 border-red-200' : 'bg-amber-100 border-amber-200';
    case 'prescription': return 'bg-purple-100 border-purple-200';
    case 'symptom': return 'bg-teal-100 border-teal-200';
    default: return 'bg-gray-100 border-gray-200';
  }
};

export function PatientTimeline({ events }: PatientTimelineProps) {
  if (!events || events.length === 0) {
    return <div className="text-gray-500 text-center py-4">No events found.</div>;
  }

  const sortedEvents = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="relative border-l border-gray-200 ml-3 md:ml-4 py-2 space-y-6">
      {sortedEvents.map((evt, idx) => (
        <motion.div
          key={evt.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="relative pl-6"
        >
          <span className={clsx("absolute -left-[14px] top-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center", getBgForType(evt.type, evt.severity))}>
            {getIconForType(evt.type, evt.severity)}
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-800">{evt.title}</h4>
              <time className="text-xs font-medium text-gray-500">
                {new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </time>
            </div>
            <p className="text-sm text-gray-600">{evt.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
