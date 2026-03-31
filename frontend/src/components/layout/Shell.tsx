"use client";

import React, { useState } from 'react';
import { 
  Activity, 
  HeartPulse, 
  Thermometer, 
  Wind, 
  AlertTriangle,
  Bell,
  Search,
  Settings,
  Users,
  BedDouble,
  Clock4,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimulation } from '../../contexts/SimulationContext';
import { cn } from '../../lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Shell({ children }: { children: React.ReactNode }) {
  const { alerts, markAlertResolved } = useSimulation();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const pathname = usePathname();

  const activeAlertsCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans selection:bg-indigo-500/20">
      
      {/* Sidebar - Pure white, extremely soft shadow */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col transition-all duration-300 relative z-20">
        <Link href="/" className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
          <div className="p-1.5 bg-indigo-50 rounded-xl mr-3 hidden lg:block border border-indigo-100/50">
             <Activity className="w-6 h-6 text-indigo-500 shrink-0" />
          </div>
          <Activity className="w-8 h-8 text-indigo-500 shrink-0 lg:hidden" />
          <span className="hidden lg:block font-bold text-xl tracking-tight text-slate-900">IntelliCare</span>
        </Link>
        
        <nav className="flex-1 py-6 flex flex-col gap-1.5 px-3">
          <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={pathname === '/'} />
          <NavItem href="/patients" icon={<Users size={20} />} label="Patients" active={pathname === '/patients'} />
          <NavItem href="/vitals" icon={<Activity size={20} />} label="Vitals Monitor" active={pathname === '/vitals'} />
          <NavItem href="/icu" icon={<BedDouble size={20} />} label="ICU Allocation" active={pathname === '/icu'} />
          <NavItem href="/logs" icon={<AlertTriangle size={20} />} label="Incident Logs" active={pathname === '/logs'} />
        </nav>

        <div className="p-4 border-t border-slate-100">
           <NavItem href="#" icon={<Settings size={20} />} label="Settings" active={false} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        
        {/* Top Navbar - Glassy faint effect */}
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-10 flex-shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.01)]">
          
          <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-full px-4 py-1.5 w-64 lg:w-96 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search patients, wards..." 
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAlertOpen(!isAlertOpen)}
              className={cn("relative p-2.5 rounded-full transition-all focus:outline-none", isAlertOpen ? "bg-indigo-50 text-indigo-600" : "bg-white border border-slate-200 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 hover:shadow-md")}
            >
              <Bell className="w-5 h-5" />
              {activeAlertsCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
              )}
              {activeAlertsCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 border-2 border-white bg-rose-500 rounded-full" />
              )}
            </button>
            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200">
               <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 leading-none">Dr. Sarah Connor</p>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">Chief Cardiologist</p>
               </div>
               <img src="https://i.pravatar.cc/150?u=Dr.Sarah" className="w-9 h-9 rounded-full border border-slate-200 shadow-sm object-cover" />
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto scrollbar-hide relative bg-transparent">
          {children}

          {/* Global Alerts Sidebar Overlay - Light / Soft Design */}
          <AnimatePresence>
            {isAlertOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsAlertOpen(false)}
                  className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
                />
                
                <motion.div 
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed right-0 top-0 h-full w-80 sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
                >
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-10">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-500">
                        <Bell className="w-5 h-5" />
                      </div>
                      Active Alerts
                    </h3>
                    <button onClick={() => setIsAlertOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">✕</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-slate-50/50">
                    {alerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                         <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Bell className="w-6 h-6 text-slate-300" />
                         </div>
                         <p className="font-medium text-slate-500">No alerts history.</p>
                      </div>
                    ) : (
                      alerts.map(alert => (
                        <motion.div 
                          layout
                          key={alert.id} 
                          className={cn(
                            "p-3.5 rounded-2xl border flex items-start gap-3.5 transition-all shadow-sm bg-white",
                            alert.resolved ? 'opacity-60 bg-slate-50 border-slate-200 shadow-none' :
                            alert.type === 'Critical' ? 'border-rose-200/60 shadow-[0_4px_12px_rgba(244,63,94,0.06)]' :
                            alert.type === 'Warning' ? 'border-orange-200/60 shadow-[0_4px_12px_rgba(249,115,22,0.06)]' :
                            'border-blue-200/60 shadow-[0_4px_12px_rgba(59,130,246,0.06)]'
                          )}
                        >
                          <div className={cn(
                             "p-2 rounded-xl mt-0.5 shrink-0",
                             alert.resolved ? "bg-slate-100 text-slate-400" :
                             alert.type === 'Critical' ? "bg-rose-50 text-rose-500" :
                             alert.type === 'Warning' ? "bg-orange-50 text-orange-500" :
                             "bg-blue-50 text-blue-500"
                          )}>
                             {alert.resolved ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                               <div className="font-semibold text-slate-800 text-sm truncate">{alert.patientName}</div>
                               {!alert.resolved && (
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); markAlertResolved(alert.id); }}
                                      className="text-[10px] px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 rounded-full border border-slate-200 shadow-sm transition-all font-medium shrink-0 hover:text-indigo-600 hover:border-indigo-200"
                                   >
                                      Dismiss
                                   </button>
                               )}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 leading-snug">{alert.message}</div>
                            <div className="text-[10px] text-slate-400 mt-2 font-medium">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                          </div>
                        </motion.div>
                      )).reverse() // Show newest first
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode, label: string, href: string, active?: boolean }) {
  return (
    <Link href={href} className={cn(
      "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 relative group font-medium",
      active ? "bg-indigo-50/80 text-indigo-700 shadow-sm border border-indigo-100/50" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent"
    )}>
      <div className={cn("transition-colors", active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")}>
         {icon}
      </div>
      <span className="hidden lg:block text-sm leading-none">{label}</span>
      {active && <motion.div layoutId="nav-indicator-light" className="hidden lg:block absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" />}
    </Link>
  );
}

// Added missing icon for layout shell
function CheckCircle({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
}
