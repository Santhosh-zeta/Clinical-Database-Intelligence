"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Search, Download, ChevronDown, Loader2, RefreshCw, Database, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

const API = 'http://localhost:3001/api';
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

interface AuditLog {
  id: number;
  table_name: string;
  action: string;
  record_id: number;
  changed_data: Record<string, any>;
  changed_at: string;
  organization_id: string;
  changed_by?: number;
  changed_by_name?: string;
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
  DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
};

const TABLE_COLORS: Record<string, string> = {
  patients: 'bg-indigo-50 text-indigo-700',
  admissions: 'bg-purple-50 text-purple-700',
  vitals: 'bg-sky-50 text-sky-700',
  prescriptions: 'bg-teal-50 text-teal-700',
  alerts: 'bg-orange-50 text-orange-700',
  doctors: 'bg-violet-50 text-violet-700',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const itemsPerPage = 25;

  const fetchLogs = useCallback(async (page = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(itemsPerPage),
        ...(filterTable && { table_name: filterTable }),
        ...(filterAction && { action: filterAction }),
      });
      const res = await fetch(`${API}/admin/audit-logs?${params}`, { headers: ah() });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setTotalCount(data.count || 0);
        setLastRefreshed(new Date());
      }
    } catch (_) { }
    setLoading(false);
  }, [filterTable, filterAction, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchLogs(1);
  }, [filterTable, filterAction]);

  // Real-time polling
  useEffect(() => {
    const id = setInterval(() => {
      // Only auto-refresh if on first page and not searching (to avoid UX jumps)
      if (currentPage === 1 && !searchTerm) {
        fetchLogs(1);
      }
    }, 10000);
    return () => clearInterval(id);
  }, [currentPage, searchTerm, fetchLogs]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Client-side search filter (on top of server filter)
  const filtered = logs.filter(l =>
    !searchTerm ||
    l.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.changed_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(l.record_id).includes(searchTerm)
  );

  const exportCSV = () => {
    const header = ['Timestamp', 'Table', 'Action', 'Record ID', 'Changed By'].join(',');
    const rows = filtered.map(l => [
      `"${new Date(l.changed_at).toLocaleString()}"`,
      `"${l.table_name}"`,
      `"${l.action}"`,
      `"${l.record_id}"`,
      `"${l.changed_by_name || l.changed_by || 'System'}"`,
    ].join(','));
    const csv = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 w-full h-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2 flex items-center gap-2">
            <Database className="w-7 h-7 text-indigo-500" /> Audit Logs
          </h1>
          <p className="text-slate-500">
            Immutable cryptographic record of all system changes.
            {lastRefreshed && <span className="ml-2 text-slate-400 text-xs">Last refreshed: {lastRefreshed.toLocaleTimeString()}</span>}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-2 flex-1 md:w-64 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>

          {/* Table filter */}
          <div className="relative">
            <select
              value={filterTable}
              onChange={e => setFilterTable(e.target.value)}
              className="appearance-none bg-white border border-slate-200 shadow-sm pl-4 pr-10 py-2.5 rounded-xl text-slate-600 outline-none focus:border-indigo-400 font-semibold text-sm cursor-pointer"
            >
              <option value="">All Tables</option>
              <option value="patients">patients</option>
              <option value="admissions">admissions</option>
              <option value="vitals">vitals</option>
              <option value="prescriptions">prescriptions</option>
              <option value="alerts">alerts</option>
              <option value="doctors">doctors</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Action filter */}
          <div className="relative">
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="appearance-none bg-white border border-slate-200 shadow-sm pl-4 pr-10 py-2.5 rounded-xl text-slate-600 outline-none focus:border-indigo-400 font-semibold text-sm cursor-pointer"
            >
              <option value="">All Actions</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          <button onClick={() => fetchLogs(currentPage)} disabled={loading} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4 text-slate-500', loading && 'animate-spin')} />
          </button>
          <button onClick={exportCSV} className="bg-white border border-slate-200 shadow-sm px-4 py-2 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all text-slate-600 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard icon={<Database className="w-7 h-7 text-indigo-600" />} value={loading ? '...' : totalCount} label="Total Audit Events" color="bg-indigo-50 border-indigo-100" />
        <StatCard icon={<ShieldAlert className="w-7 h-7 text-rose-500" />} value={filtered.filter(l => l.action === 'DELETE').length} label="Delete Records (page)" color="bg-rose-50 border-rose-100" />
        <StatCard icon={<Clock className="w-7 h-7 text-slate-500" />} value={lastRefreshed?.toLocaleTimeString() || '...'} label="Last Synced" color="bg-slate-50 border-slate-200" />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] overflow-hidden shadow-sm flex-1">
        <div className="overflow-x-auto max-h-[calc(100vh-380px)] custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50/90 backdrop-blur-md border-b border-slate-100 z-10">
              <tr className="text-slate-500 text-sm">
                <th className="p-5 pl-8 font-semibold">Timestamp</th>
                <th className="p-5 font-semibold">Table</th>
                <th className="p-5 font-semibold">Action</th>
                <th className="p-5 font-semibold">Record ID</th>
                <th className="p-5 font-semibold w-1/3">Changed Data</th>
                <th className="p-5 pr-8 font-semibold">Changed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading audit logs from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No audit logs match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-5 pl-8 text-sm text-slate-500 font-medium whitespace-nowrap">
                      {new Date(log.changed_at).toLocaleString()}
                    </td>
                    <td className="p-5">
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold', TABLE_COLORS[log.table_name] || 'bg-slate-100 text-slate-600')}>
                        {log.table_name}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className={cn('px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase border', ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600 border-slate-200')}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-5 text-sm font-bold text-slate-600 font-mono">#{log.record_id}</td>
                    <td className="p-5 text-sm text-slate-500 max-w-xs">
                      <span className="font-mono text-[11px] bg-slate-50 border border-slate-100 px-2 py-1 rounded-md block truncate" title={JSON.stringify(log.changed_data || {})}>
                        {(JSON.stringify(log.changed_data || {})).slice(0, 80)}{(JSON.stringify(log.changed_data || {})).length > 80 ? '…' : ''}
                      </span>
                    </td>
                    <td className="p-5 pr-8 text-sm font-medium text-slate-700">
                      {log.changed_by_name || (log.changed_by ? `User #${log.changed_by}` : <span className="text-slate-400 italic">System</span>)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-4 border-t border-slate-100 bg-slate-50">
            <span className="text-sm text-slate-500 font-medium">
              Page {currentPage} of {totalPages} · {totalCount} total records
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 shadow-sm font-medium"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm disabled:opacity-50 hover:bg-slate-50 shadow-sm font-medium"
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

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  return (
    <div className={cn('border rounded-[1.5rem] p-5 flex items-center gap-5', color)}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">{label}</div>
      </div>
    </div>
  );
}
