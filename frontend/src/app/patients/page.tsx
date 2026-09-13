"use client";

import { API } from '../../lib/config';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { PermissionGuard } from '../../components/layout/PermissionGuard';
import { cn } from '@/lib/utils';

const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

export default function PatientsPage({ admissionId, setAdmissionId }: { admissionId?: number | null, setAdmissionId?: (id: number) => void }) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'critical' | 'stable' | 'icu'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
      <div className="max-w-[1200px] mx-auto p-4 font-sans text-slate-800">

        <div className="border-b-2 border-blue-200 pb-2 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-blue-900 m-0">Patient Directory</h1>
          </div>
          <div className="text-sm font-bold text-slate-600">
            Total Active Admissions: {filteredPatients.length}
          </div>
        </div>

        { }
        <div className="bg-slate-50 border border-slate-200 p-2 mb-4 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Search:</span>
            <input
              type="text"
              className="border border-slate-200 px-2 py-1 text-sm w-64 bg-white"
              placeholder="Search by name, ID, ward..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border-l border-slate-200 pl-4 flex items-center gap-2">
            <span className="font-bold text-sm">View Filter:</span>
            <select
              className="border border-slate-200 px-2 py-1 text-sm bg-white cursor-pointer"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
            >
              <option value="all">All Admissions</option>
              <option value="critical">Critical / High Risk</option>
              <option value="stable">Stable / Low Risk</option>
              <option value="icu">ICU Wards</option>
            </select>
          </div>
        </div>

        { }
        <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200">
                <th className="p-2 border-r border-slate-100 font-bold" onClick={() => requestSort('name')}>
                  Patient Name {sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="p-2 border-r border-slate-100 font-bold" onClick={() => requestSort('id')}>
                  Registry ID {sortConfig?.key === 'id' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="p-2 border-r border-slate-100 font-bold" onClick={() => requestSort('ward')}>
                  Location {sortConfig?.key === 'ward' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="p-2 border-r border-slate-100 font-bold">Primary Diagnosis</th>
                <th className="p-2 border-r border-slate-100 font-bold text-center" onClick={() => requestSort('riskScore')}>
                  Risk Score {sortConfig?.key === 'riskScore' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th className="p-2 border-r border-slate-100 font-bold text-center">Current HR (BPM)</th>
                <th className="p-2 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500 italic">Searching database...</td>
                </tr>
              )}
              {!loading && paginatedPatients.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500 italic">No matching records found.</td>
                </tr>
              )}
              {!loading && paginatedPatients.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  patientDbId={patient.patient_id}
                  isSelected={Number(patient.admission_id) === admissionId}
                  onSelect={setAdmissionId ? () => setAdmissionId(Number(patient.admission_id)) : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>

        { }
        {totalPages > 1 && (
          <div className="bg-slate-50 border border-t-0 border-slate-200 p-2 flex justify-between items-center text-sm">
            <div className="font-bold">Page {currentPage} of {totalPages}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 px-3 py-1 font-bold shadow-sm hover:bg-white shadow-sm rounded-xl active:bg-gray-400 disabled:opacity-50"
              >
                &laquo; Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 px-3 py-1 font-bold shadow-sm hover:bg-white shadow-sm rounded-xl active:bg-gray-400 disabled:opacity-50"
              >
                Next &raquo;
              </button>
            </div>
          </div>
        )}

      </div>
    </PermissionGuard>
  );
}

function PatientRow({ patient, patientDbId, isSelected, onSelect }: { patient: any; patientDbId?: string | number; isSelected?: boolean; onSelect?: () => void }) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!patientDbId) return;
    async function fetchTrend() {
      try {
        const res = await fetch(`${API}/vitals/${patientDbId}?limit=1`, { headers: ah() });
        if (res.ok) {
          const d = await res.json();
          setHistory(Array.isArray(d.data) ? d.data : []);
        }
      } catch (_) { }
    }
    fetchTrend();
  }, [patientDbId]);

  const currentHr = history.length > 0 ? history[history.length - 1].heart_rate : 'N/A';
  const isCriticalHr = currentHr !== 'N/A' && (currentHr > 120 || currentHr < 50);

  return (
    <tr className="border-b border-slate-100 hover:bg-yellow-50 text-sm">
      <td className="p-2 border-r border-slate-100 font-bold">
        {patient.name}
        <div className="text-xs font-normal text-slate-500">{patient.age} yrs, {patient.gender}</div>
      </td>
      <td className="p-2 border-r border-slate-100">
        <span className="font-bold">{patient.id}</span>
        <div className="text-xs text-slate-500">Admitted: {new Date(patient.admissionDate).toLocaleDateString()}</div>
      </td>
      <td className="p-2 border-r border-slate-100">
        <span className="font-bold">{patient.ward}</span>
        <div className="text-xs text-slate-500">{patient.bed}</div>
      </td>
      <td className="p-2 border-r border-slate-100">
        {patient.diagnosis}
        <div className="text-xs text-slate-500">Attn: Dr. {patient.doctor}</div>
      </td>
      <td className="p-2 border-r border-slate-100 text-center font-bold">
        <span className={
          patient.riskScore === 'Critical' ? 'text-rose-600' :
            patient.riskScore === 'High' ? 'text-orange-700' :
              patient.riskScore === 'Medium' ? 'text-blue-700' :
                'text-green-700'
        }>
          {patient.riskScore}
        </span>
      </td>
      <td className="p-2 border-r border-slate-100 text-center">
        <span className={`font-bold ${isCriticalHr ? 'text-rose-600 bg-rose-50 border border-red-400 px-1' : 'text-slate-800'}`}>
          {currentHr}
        </span>
      </td>
      <td className="p-2 text-center flex flex-col gap-1 items-center">
        {onSelect && (
          <button
            onClick={onSelect}
            className={cn(
              "text-[10px] font-bold uppercase px-2 py-1 border border-slate-200 shadow-sm rounded-xl shadow-md rounded-xl transition-all",
              isSelected ? "bg-slate-900 text-white" : "bg-white text-slate-900 hover:bg-slate-50"
            )}
          >
            {isSelected ? "SELECTED" : "SELECT CASE"}
          </button>
        )}
        <Link href={`/patient?id=${patient.id}`} className="text-blue-600 hover:underline font-bold text-[10px] uppercase">
          Open Chart &rarr;
        </Link>
      </td>
    </tr>
  );
}
