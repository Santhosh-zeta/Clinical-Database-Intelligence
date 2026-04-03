"use client";

import React, { useState } from 'react';
import { useSimulation } from '../../contexts/SimulationContext';
import { cn } from '../../lib/utils';
import { Search, Filter, ChevronRight, Activity } from 'lucide-react';
import Link from 'next/link';
import { Patient } from '../../lib/types';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { RiskBadge } from '../../components/ui/RiskBadge';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function PatientsPage() {
  const { patients, vitalsHistory } = useSimulation();
  const { currentUser } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  if (currentUser?.role === 'patient') return null;

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.ward.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedPatients = React.useMemo(() => {
    let sortablePatients = [...filteredPatients];
    if (sortConfig !== null) {
      sortablePatients.sort((a, b) => {
        let aVal: any = a[sortConfig.key as keyof Patient];
        let bVal: any = b[sortConfig.key as keyof Patient];
        
        if (sortConfig.key === 'riskScore') {
          const riskWeight: Record<string, number> = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
          aVal = riskWeight[a.riskScore] || 0;
          bVal = riskWeight[b.riskScore] || 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortablePatients;
  }, [filteredPatients, sortConfig]);

  const totalPages = Math.ceil(sortedPatients.length / itemsPerPage);
  const paginatedPatients = sortedPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full h-full">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Patient Directory</h1>
          <p className="text-slate-500">View and manage all active admissions across departments.</p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 flex-1 md:w-72 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <Search className="w-5 h-5 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search by name, ID, ward..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <button className="bg-white border border-slate-200 shadow-sm p-2.5 rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all text-slate-500">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex-1">
        <div className="overflow-x-auto h-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 text-sm border-b border-slate-100">
                <th className="p-5 font-semibold pl-8 tracking-wide cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('name')}>Patient Name</th>
                <th className="p-5 font-semibold tracking-wide cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('admissionDate')}>ID & Admission</th>
                <th className="p-5 font-semibold tracking-wide cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('ward')}>Location</th>
                <th className="p-5 font-semibold tracking-wide cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => requestSort('riskScore')}>Risk Status</th>
                <th className="p-5 font-semibold tracking-wide w-40 hidden sm:table-cell">Live HR Trends</th>
                <th className="p-5 font-semibold text-right pr-8 tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPatients.map((patient) => (
                <PatientRow key={patient.id} patient={patient} history={vitalsHistory[patient.id] || []} />
              ))}
              {paginatedPatients.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 bg-slate-50/50">
                    No patients found matching your search criteria.
                  </td>
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

function PatientRow({ patient, history }: { patient: Patient, history: any[] }) {

  const currentHr = history.length > 0 ? history[history.length - 1].heartRate : '--';
  const isCriticalHr = currentHr !== '--' && (currentHr > 120 || currentHr < 50);

  return (
    <tr className="hover:bg-slate-50/80 transition-colors group relative cursor-pointer">
      <td className="p-4 pl-8">
        <div className="flex items-center gap-4">
          <img src={patient.avatarUrl} alt={patient.name} className="w-11 h-11 rounded-full border-2 border-slate-100 shadow-sm" />
          <div>
            <div className="font-bold text-slate-800 text-[15px] group-hover:text-indigo-600 transition-colors">{patient.name}</div>
            <div className="text-xs text-slate-500 font-medium tracking-wide mt-0.5">{patient.age} yrs • {patient.gender} • <span className="text-slate-600 font-semibold">{patient.diagnosis}</span></div>
          </div>
        </div>
      </td>
      <td className="p-4">
        <div className="text-sm font-bold text-slate-700 bg-slate-100 inline-block px-2.5 py-1 rounded-md mb-1 border border-slate-200/60">{patient.id}</div>
        <div className="text-xs text-slate-500 font-medium ml-1">Adm: {new Date(patient.admissionDate).toLocaleDateString()}</div>
      </td>
      <td className="p-4 text-sm text-slate-700 font-medium">
        <div>{patient.ward}</div>
        <div className="text-xs text-slate-500">{patient.bed}</div>
      </td>
      <td className="p-4">
        <RiskBadge score={patient.riskScore} />
      </td>
      <td className="p-4 hidden sm:table-cell">
        <div className="flex items-center justify-between gap-3 h-10 w-32 bg-slate-50 px-3 py-1.5 border border-slate-100 rounded-xl shadow-inner">
          <div className="flex-1 h-full opacity-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history.map(h => ({ val: h.heartRate }))}>
                <YAxis domain={['auto', 'auto']} hide />
                <Area type="monotone" dataKey="val" stroke={isCriticalHr ? '#f43f5e' : '#6366f1'} fill="none" strokeWidth={2.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <span className={cn("text-sm font-bold w-7 text-right tracking-tighter", isCriticalHr ? "text-rose-600" : "text-slate-700")}>{currentHr}</span>
        </div>
      </td>
      <td className="p-4 pr-8 text-right">
        <Link href={`/vitals`} className="inline-flex items-center justify-center p-2 rounded-full border bg-white border-slate-200 shadow-sm text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all mr-2">
          <ChevronRight className="w-5 h-5" />
        </Link>
      </td>
    </tr>
  );
}


