"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Search, Filter, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import { RiskBadge } from '../../components/ui/RiskBadge';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '../../components/layout/PermissionGuard';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

export default function PatientsPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'critical' | 'stable' | 'icu'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    async function fetchAdmissions() {
      try {
        const res = await fetch(`${API}/admissions?status=active&limit=200`, { headers: ah() });
        if (res.ok) {
          const data = await res.json();
          const mapped = (data.data?.rows || data.rows || []).map((a: any) => ({
            id: String(a.id),
            patient_id: a.patient_id,
            admission_id: a.id,
            name: a.patient_name,
            age: new Date().getFullYear() - new Date(a.date_of_birth).getFullYear(),
            gender: a.gender,
            diagnosis: a.diagnosis,
            ward: a.ward_name || 'Unassigned',
            bed: a.bed_number || 'Waitlist',
            riskScore: a.risk_category === 'critical' ? 'Critical' : a.risk_category === 'high' ? 'High' : (a.risk_category === 'medium' ? 'Medium' : 'Low'),
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(a.patient_name)}&background=random`,
            admissionDate: a.admitted_at,
            doctor: a.doctor_name
          }));
          setPatients(mapped);
        }
      } catch (_) { }
      setLoading(false);
    }
    fetchAdmissions();
  }, []);

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ward.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterMode === 'critical') return p.riskScore === 'Critical' || p.riskScore === 'High';
    if (filterMode === 'stable') return p.riskScore === 'Low' || p.riskScore === 'Medium';
    if (filterMode === 'icu') return p.ward.includes('ICU');
    return true;
  });

  const sortedPatients = React.useMemo(() => {
    let sortablePatients = [...filteredPatients];
    if (sortConfig !== null) {
      sortablePatients.sort((a, b) => {
        let aVal: any = a[sortConfig.key];
        let bVal: any = b[sortConfig.key];

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
    <PermissionGuard requiredPermission="VIEW_ALL_PATIENTS">
      <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full h-full">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Patient Directory</h1>
            <p className="text-slate-500">View and manage all active admissions across departments.</p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
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

            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setFilterMode('all')}
                className={cn("px-3 py-1.5 rounded-lg font-medium text-xs transition-colors", filterMode === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700')}
              >
                All
              </button>
              <button
                onClick={() => setFilterMode('critical')}
                className={cn("px-3 py-1.5 rounded-lg font-medium text-xs transition-colors border divide-transparent", filterMode === 'critical' ? 'bg-rose-50 border-rose-100 shadow-sm text-rose-700' : 'border-transparent text-slate-500 hover:text-rose-600')}
              >
                Critical
              </button>
              <button
                onClick={() => setFilterMode('stable')}
                className={cn("px-3 py-1.5 rounded-lg font-medium text-xs transition-colors border divide-transparent", filterMode === 'stable' ? 'bg-emerald-50 border-emerald-100 shadow-sm text-emerald-700' : 'border-transparent text-slate-500 hover:text-emerald-600')}
              >
                Stable
              </button>
              <button
                onClick={() => setFilterMode('icu')}
                className={cn("px-3 py-1.5 rounded-lg font-medium text-xs transition-colors border divide-transparent", filterMode === 'icu' ? 'bg-indigo-50 border-indigo-100 shadow-sm text-indigo-700' : 'border-transparent text-slate-500 hover:text-indigo-600')}
              >
                ICU
              </button>
            </div>
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
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500 bg-slate-50/50">Loading patients...</td>
                  </tr>
                )}
                {!loading && paginatedPatients.map((patient) => (
                  <PatientRow key={patient.id} patient={patient} patientDbId={patient.patient_id} />
                ))}
                {!loading && paginatedPatients.length === 0 && (
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
    </PermissionGuard>
  );
}

function PatientRow({ patient, patientDbId }: { patient: any; patientDbId?: string | number }) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!patientDbId) return;
    async function fetchTrend() {
      try {
        const res = await fetch(`${API}/vitals/${patientDbId}?limit=12`, { headers: ah() });
        if (res.ok) {
          const d = await res.json();
          setHistory(Array.isArray(d.data) ? d.data : []);
        }
      } catch (_) { }
    }
    fetchTrend();
  }, [patientDbId]);

  const currentHr = history.length > 0 ? history[history.length - 1].heart_rate : '--';
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
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={history.map(h => ({ val: h.heart_rate }))}>
                <YAxis domain={['auto', 'auto']} hide />
                <Area type="monotone" dataKey="val" stroke={isCriticalHr ? '#f43f5e' : '#6366f1'} fill="none" strokeWidth={2.5} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <span className={cn("text-sm font-bold w-7 text-right tracking-tighter", isCriticalHr ? "text-rose-600" : "text-slate-700")}>{currentHr}</span>
        </div>
      </td>
      <td className="p-4 pr-8 text-right">
        <Link href={`/patients/${patient.id}`} className="inline-flex items-center justify-center p-2 rounded-full border bg-white border-slate-200 shadow-sm text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all mr-2">
          <ChevronRight className="w-5 h-5" />
        </Link>
      </td>
    </tr>
  );
}


