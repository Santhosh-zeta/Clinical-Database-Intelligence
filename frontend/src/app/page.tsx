"use client";

import React from 'react';
import { Users, Activity, AlertTriangle, BedDouble, ArrowRight } from 'lucide-react';
import { useSimulation } from '../contexts/SimulationContext';
import { cn } from '../lib/utils';
import Link from 'next/link';

export default function DashboardSummary() {
  const { patients, alerts } = useSimulation();

  const totalPatients = patients.length;
  const criticalPatients = patients.filter(p => p.riskScore === 'Critical').length;
  const activeAlerts = alerts.filter(a => !a.resolved).length;
  const icuBedsOccupied = patients.filter(p => p.ward.includes('ICU')).length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full">
      
      <div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Command Center</h1>
        <p className="text-slate-500 text-lg">Live overview of critical systems and patient vitals.</p>
      </div>

      {/* KPI Grid - Soft Glass & Gradients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard 
           title="Total Admitted" 
           value={totalPatients} 
           icon={<Users className="w-6 h-6 text-indigo-600" />} 
           link="/patients" 
           gradient="from-indigo-50 to-white hover:from-indigo-100 hover:to-indigo-50"
           iconBg="bg-indigo-100/80"
           borderColor="border-indigo-100"
        />
        <KPICard 
           title="Critical Risk" 
           value={criticalPatients} 
           icon={<Activity className="w-6 h-6 text-rose-600" />} 
           link="/patients" 
           gradient={criticalPatients > 0 ? "from-rose-50 to-white hover:from-rose-100 hover:to-rose-50 border-rose-200" : "from-slate-50 to-white hover:from-slate-100 hover:to-slate-50 border-slate-200"}
           iconBg={criticalPatients > 0 ? "bg-rose-100/80 shadow-[0_0_15px_rgba(225,29,72,0.2)]" : "bg-slate-100/80"}
           borderColor={criticalPatients > 0 ? "border-rose-200" : "border-slate-200"}
           pulse={criticalPatients > 0}
        />
        <KPICard 
           title="ICU Utilization" 
           value={`${icuBedsOccupied}/10`} 
           icon={<BedDouble className="w-6 h-6 text-amber-600" />} 
           link="/icu" 
           gradient="from-amber-50 to-white hover:from-amber-100 hover:to-amber-50"
           iconBg="bg-amber-100/80"
           borderColor="border-amber-200"
        />
        <KPICard 
           title="Active Alerts" 
           value={activeAlerts} 
           icon={<AlertTriangle className="w-6 h-6 text-orange-600" />} 
           link="/logs" 
           gradient={activeAlerts > 0 ? "from-orange-50 to-white hover:from-orange-100 hover:to-orange-50 border-orange-200" : "from-slate-50 to-white hover:from-slate-100 border-slate-200"}
           iconBg={activeAlerts > 0 ? "bg-orange-100/80 shadow-[0_0_15px_rgba(249,115,22,0.2)]" : "bg-slate-100"}
           borderColor={activeAlerts > 0 ? "border-orange-200" : "border-slate-200"}
           pulse={activeAlerts > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Active Alerts Mini-feed */}
         <div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-3xl p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex-1">
             <div className="flex justify-between items-center mb-6">
                <div>
                   <h2 className="text-xl font-bold text-slate-800">Recent Security Logs</h2>
                   <p className="text-sm text-slate-500 mt-1">Latest automated trigger alerts</p>
                </div>
                <Link href="/logs" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-full transition-colors flex items-center gap-1">
                   View All <ArrowRight className="w-4 h-4" />
                </Link>
             </div>

             <div className="flex flex-col gap-3">
                {alerts.filter(a => !a.resolved).slice(0, 5).map(alert => (
                    <div key={alert.id} className={cn(
                       "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                       alert.type === 'Critical' ? 'bg-gradient-to-r from-rose-50/50 to-transparent border-rose-100/80 hover:border-rose-200 shadow-sm' : 
                       'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                    )}>
                       <div className="flex items-center gap-4">
                           <div className={cn("p-2.5 rounded-xl shrink-0", 
                               alert.type === 'Critical' ? 'bg-rose-100 text-rose-600' : 'bg-orange-100 text-orange-600'
                           )}>
                               <AlertTriangle className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="text-slate-800 font-bold">{alert.patientName} <span className="font-normal text-slate-500 text-sm ml-1">• {alert.metric}</span></p>
                              <p className="text-slate-600 text-sm mt-0.5">{alert.message}</p>
                           </div>
                       </div>
                       <div className="text-sm font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg whitespace-nowrap self-start sm:self-center border border-slate-200/50">
                           {new Date(alert.timestamp).toLocaleTimeString()}
                       </div>
                    </div>
                ))}
                {alerts.filter(a => !a.resolved).length === 0 && (
                   <div className="text-center p-10 text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                       <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-slate-100">
                          <Wind className="w-6 h-6 text-slate-300" />
                       </div>
                       All clear. No active alerts at this time.
                   </div>
                )}
             </div>
         </div>

         {/* Quick Actions / System Load */}
         <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-7 shadow-[0_8px_30px_rgba(99,102,241,0.2)] text-white flex flex-col justify-between">
             <div>
                <h2 className="text-xl font-bold mb-2">System Status</h2>
                <p className="text-indigo-100 text-sm">Real-time prediction Engine is online and evaluating {totalPatients} streams.</p>
             </div>
             <div className="mt-8 space-y-4">
                <div className="bg-white/10 rounded-2xl p-4 border border-white/20 backdrop-blur-md">
                   <div className="flex justify-between text-sm font-medium mb-1"><span>CPU Load</span><span>34%</span></div>
                   <div className="w-full bg-white/20 rounded-full h-1.5"><div className="bg-white h-1.5 rounded-full w-[34%]" /></div>
                </div>
                <div className="bg-white/10 rounded-2xl p-4 border border-white/20 backdrop-blur-md">
                   <div className="flex justify-between text-sm font-medium mb-1"><span>Memory Allocation</span><span>62%</span></div>
                   <div className="w-full bg-white/20 rounded-full h-1.5"><div className="bg-white h-1.5 rounded-full w-[62%]" /></div>
                </div>
             </div>
             <button className="w-full mt-6 bg-white text-indigo-600 font-bold rounded-xl py-3 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                Run Diagnostics
             </button>
         </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon, link, gradient, iconBg, borderColor, pulse }: { title: string, value: string | number, icon: React.ReactNode, link: string, gradient: string, iconBg: string, borderColor: string, pulse?: boolean }) {
    return (
        <Link href={link} className={cn(
            "p-6 rounded-3xl border bg-gradient-to-br transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] block relative overflow-hidden group",
            gradient, borderColor
        )}>
            <div className="flex justify-between items-start mb-6">
                <span className="text-slate-600 font-semibold text-sm">{title}</span>
                <div className={cn("p-2.5 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", iconBg)}>
                    {icon}
                </div>
            </div>
            <div className="flex items-end gap-3 z-10 relative">
               <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
                   {value}
               </div>
               {pulse && (
                  <div className="mb-2 flex items-center gap-1.5 px-2.5 py-1 bg-white/60 backdrop-blur border border-white rounded-full text-[10px] font-bold text-rose-500 uppercase">
                     <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping absolute" />
                     <span className="w-1.5 h-1.5 rounded-full bg-rose-500 relative" />
                     Live
                  </div>
               )}
            </div>

            {/* Subtlte gloss overlay */}
            <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-white/40 rounded-full blur-2xl pointer-events-none" />
        </Link>
    )
}
