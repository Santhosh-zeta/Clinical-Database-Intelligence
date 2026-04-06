"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Vitals } from '@/lib/types';
import { motion } from 'framer-motion';

interface VitalsChartProps {
  vitals: Vitals[];
}

export function VitalsChart({ vitals }: VitalsChartProps) {
  if (!vitals || vitals.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-100">
        <p className="text-gray-400 font-medium">No vitals history available</p>
      </div>
    );
  }

  // Format timestamp for display
  const data = vitals.map(v => ({
    time: new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    HR: v.heartRate,
    SBP: v.bloodPressure?.systolic ?? 0,
    DBP: v.bloodPressure?.diastolic ?? 0,
    SpO2: v.oxygenLevel,
    Temp: v.temperature
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4"
    >
      <h3 className="text-lg font-semibold text-gray-800">Vitals Trend</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
            <YAxis yAxisId="right" orientation="right" domain={[80, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
            <Tooltip
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '14px' }} />

            <Line yAxisId="left" type="monotone" dataKey="HR" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Heart Rate" />
            <Line yAxisId="left" type="monotone" dataKey="SBP" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} name="Systolic BP" />
            <Line yAxisId="left" type="monotone" dataKey="DBP" stroke="#93C5FD" strokeWidth={2} dot={{ r: 3 }} name="Diastolic BP" />
            <Line yAxisId="right" type="monotone" dataKey="SpO2" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="SpO2 (%)" />
            <Line yAxisId="left" type="monotone" dataKey="Temp" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} name="Temp (°C)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
