"use client";

import React, { useState } from 'react';
import { AlertTriangle, Search, Filter, ShieldAlert, CheckCircle2, ChevronDown } from 'lucide-react';
import { useSimulation } from '../../contexts/SimulationContext';
import { cn } from '../../lib/utils';
import { Alert } from '../../lib/types';

export default function IncidentLogsPage() {
  const { alerts, markAlertResolved } = useSimulation();
  const [filterType, setFilterType] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlerts = alerts.filter(alert => {
    const matchesType = filterType === 'All' || alert.type === filterType;
    const matchesSearch = alert.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          alert.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          alert.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  const criticalCount = alerts.filter(a => a.type === 'Critical' && !a.resolved).length;
  const warningCount = alerts.filter(a => a.type === 'Warning' && !a.resolved).length;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const reversed = filteredAlerts.slice().reverse();
  const totalPages = Math.ceil(reversed.length / itemsPerPage);
  const paginatedAlerts = reversed.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resolveAll = async () => {
     for (const alert of filteredAlerts) {
        if (!alert.resolved) {
           markAlertResolved(alert.id);
        }
     }
  };

  const exportCSV = () => {
    const header = ['Timestamp', 'Severity', 'Patient', 'Metric', 'Message', 'Status'].join(',');
    const rows = filteredAlerts.map(a => [
      `"${new Date(a.timestamp).toLocaleString()}"`,
      `"${a.type}"`,
      `"${a.patientName} (${a.patientId})"`,
      `"${a.metric}"`,
      `"${a.message}"`,
      `"${a.resolved ? 'Resolved' : 'Active'}"`
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'incident_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-8 w-full h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Automated Incident Logs</h1>
          <p className="text-slate-500">Chronological history of all automated system triggers and critical alerts.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 flex-1 md:w-72 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search by patient, ID, message..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400 font-medium"
            />
          </div>
          <div className="relative">
             <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none bg-white border border-slate-200 shadow-sm pl-4 pr-10 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 font-semibold text-sm cursor-pointer"
             >
                <option value="All">All Severities</option>
                <option value="Critical">Critical Only</option>
                <option value="Warning">Warning Only</option>
              </select>
             <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
          <button onClick={exportCSV} className="bg-white border border-slate-200 shadow-sm px-4 py-2 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all text-slate-600">Export CSV</button>
          <button onClick={resolveAll} className="bg-indigo-600 border border-indigo-700 shadow-sm px-4 py-2 text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all text-white">Acknowledge All</button>
        </div>
      </div>

      {/* Stats Summary - Soft Light Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[1.5rem] p-5 flex items-center gap-5">
           <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm"><ShieldAlert className="w-7 h-7 text-indigo-600" /></div>
           <div><div className="text-3xl font-extrabold text-slate-800 tracking-tight">{alerts.length}</div><div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Total Events Logged</div></div>
        </div>
        <div className="bg-white border border-rose-100/80 shadow-[0_4px_20px_rgba(244,63,94,0.04)] rounded-[1.5rem] p-5 flex items-center gap-5 relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-r from-rose-50 to-transparent opacity-50 z-0" />
           <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-sm relative z-10"><AlertTriangle className="w-7 h-7 text-rose-500" /></div>
           <div className="relative z-10"><div className={cn("text-3xl font-extrabold text-slate-800 tracking-tight", criticalCount > 0 && "text-rose-600 animate-pulse")}>{criticalCount}</div><div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Active Critical Tasks</div></div>
        </div>
        <div className="bg-white border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-[1.5rem] p-5 flex items-center gap-5">
           <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 shadow-sm"><AlertTriangle className="w-7 h-7 text-orange-500" /></div>
           <div><div className="text-3xl font-extrabold text-slate-800 tracking-tight">{warningCount}</div><div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Active Warnings Logged</div></div>
        </div>
      </div>

      {/* Log Table - Clean modern list */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex-1">
        <div className="overflow-x-auto h-full max-h-[calc(100vh-360px)] custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 z-10">
              <tr className="text-slate-500 text-sm">
                <th className="p-5 font-semibold pl-8 tracking-wide">Timestamp</th>
                <th className="p-5 font-semibold tracking-wide">Severity</th>
                <th className="p-5 font-semibold tracking-wide">Patient</th>
                <th className="p-5 font-semibold tracking-wide">Metric Trigger</th>
                <th className="p-5 font-semibold tracking-wide w-1/3">Detailed Event Message</th>
                <th className="p-5 font-semibold text-right pr-8 tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedAlerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onResolve={() => markAlertResolved(alert.id)} />
              ))}
              {paginatedAlerts.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-16 text-center text-slate-500 bg-slate-50/50">No incident logs matching your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
            <span className="text-sm text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 shadow-sm"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert, onResolve }: { alert: Alert, onResolve: () => void }) {
  const isCritical = alert.type === 'Critical';
  
  return (
    <tr className={cn("hover:bg-slate-50/80 transition-colors group", alert.resolved ? 'opacity-[0.6] grayscale-[0.5] bg-slate-50/50' : '')}>
      <td className="p-5 pl-8 text-sm text-slate-500 font-medium">
         {new Date(alert.timestamp).toLocaleString()}
      </td>
      <td className="p-5">
         <span className={cn("px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-widest uppercase inline-flex items-center gap-1.5 shadow-sm border",
            isCritical ? "bg-rose-50 text-rose-600 border-rose-200" : 
            alert.type === 'Warning' ? "bg-orange-50 text-orange-600 border-orange-200" : 
            "bg-blue-50 text-blue-600 border-blue-200"
         )}>
            <AlertTriangle className={cn("w-3.5 h-3.5", isCritical && !alert.resolved && "animate-pulse")} /> {alert.type}
         </span>
      </td>
      <td className="p-5">
        <div className="font-bold text-slate-800">{alert.patientName}</div>
        <div className="text-xs text-slate-500 font-medium">{alert.patientId}</div>
      </td>
      <td className="p-5 text-sm">
         <span className="bg-slate-100 border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg text-slate-600 font-bold uppercase tracking-wider text-[11px]">{alert.metric}</span>
      </td>
      <td className="p-5 text-sm font-semibold text-slate-600">
         {alert.message}
      </td>
      <td className="p-5 pr-8 text-right">
         {alert.resolved ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 text-[13px] font-bold uppercase tracking-wide bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
               <CheckCircle2 className="w-4 h-4" /> Resolved
            </span>
         ) : (
            <button 
               onClick={onResolve}
               className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 shadow-sm rounded-xl text-sm transition-all font-bold tracking-wide"
            >
               Dismiss Alert
            </button>
         )}
      </td>
    </tr>
  );
}
