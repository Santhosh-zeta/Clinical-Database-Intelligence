"use client";

import { API } from '../../lib/config';

import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';

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

  useEffect(() => {
    const id = setInterval(() => {
      if (currentPage === 1 && !searchTerm) {
        fetchLogs(1);
      }
    }, 10000);
    return () => clearInterval(id);
  }, [currentPage, searchTerm, fetchLogs]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

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
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-slate-800">
      <div className="border-b border-slate-200 pb-2 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 m-0 tracking-widest uppercase">System Audit Logs</h1>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => fetchLogs(currentPage)} disabled={loading} className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-xl px-3 py-1 font-bold text-sm shadow-sm hover:bg-white shadow-sm rounded-xl">
            [ REFRESH ]
          </button>
          <button onClick={exportCSV} className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-xl px-3 py-1 font-bold text-sm shadow-sm hover:bg-white shadow-sm rounded-xl">
            [ EXPORT CSV ]
          </button>
        </div>
      </div>

      <p className="mb-4 text-xs font-bold text-slate-600 uppercase">Immutable cryptographic record of all system changes. {lastRefreshed && `LAST SYNC: ${lastRefreshed.toLocaleTimeString()}`}</p>

      { }
      <div className="flex bg-white border border-slate-200 shadow-sm rounded-xl mb-4 text-sm divide-x divide-black">
        <div className="flex-1 p-2 bg-slate-50/80 backdrop-blur-sm flex flex-col justify-center items-center font-sans">
          <span className="font-bold text-slate-800 text-lg">{loading ? '...' : totalCount}</span>
          <span className="text-xs uppercase font-bold">Total Audit Events</span>
        </div>
        <div className="flex-1 p-2 bg-slate-50/80 backdrop-blur-sm flex flex-col justify-center items-center font-sans">
          <span className="font-bold text-rose-600 text-lg">{filtered.filter(l => l.action === 'DELETE').length}</span>
          <span className="text-xs uppercase font-bold text-rose-700">Delete Records (Page)</span>
        </div>
        <div className="flex-1 p-2 bg-slate-50/80 backdrop-blur-sm flex flex-col justify-center items-center font-sans">
          <span className="font-bold text-slate-800 text-lg">{currentPage} / {totalPages || 1}</span>
          <span className="text-xs uppercase font-bold">Current Page</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col mb-6">
        { }
        <div className="bg-white shadow-sm rounded-xl border-b border-slate-200 rounded-xl p-2 text-sm flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-xs">Search:</span>
            <input type="text" className="border border-slate-200 shadow-sm rounded-xl px-2 py-0.5" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-xs">Table:</span>
            <select className="border border-slate-200 shadow-sm rounded-xl px-2 py-0.5 bg-white font-bold text-xs uppercase" value={filterTable} onChange={e => setFilterTable(e.target.value)}>
              <option value="">ALL TABLES</option>
              <option value="patients">PATIENTS</option>
              <option value="admissions">ADMISSIONS</option>
              <option value="vitals">VITALS</option>
              <option value="prescriptions">PRESCRIPTIONS</option>
              <option value="alerts">ALERTS</option>
              <option value="doctors">DOCTORS</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase text-xs">Action:</span>
            <select className="border border-slate-200 shadow-sm rounded-xl px-2 py-0.5 bg-white font-bold text-xs uppercase" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="">ALL ACTIONS</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>

        { }
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 rounded-xl">
                <th className="p-2 border-r border-slate-200 rounded-xl font-bold whitespace-nowrap">TIMESTAMP</th>
                <th className="p-2 border-r border-slate-200 rounded-xl font-bold">TABLE</th>
                <th className="p-2 border-r border-slate-200 rounded-xl font-bold text-center">OP</th>
                <th className="p-2 border-r border-slate-200 rounded-xl font-bold text-center">REC ID</th>
                <th className="p-2 border-r border-slate-200 rounded-xl font-bold w-1/2">DATA PAYLOAD</th>
                <th className="p-2 font-bold">AUTH USER</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center bg-white text-slate-600 italic font-bold">READING CLUSTER LOG FILE...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center bg-white text-rose-600 italic font-bold">NO LOG ENTRY FOUND.</td></tr>
              ) : (
                filtered.map((log) => {
                  let actionClass = 'bg-slate-50/80 backdrop-blur-sm text-slate-800 border-slate-200 rounded-xl';
                  if (log.action === 'INSERT') actionClass = 'bg-green-700 text-white border-green-900';
                  if (log.action === 'UPDATE') actionClass = 'bg-blue-700 text-white border-blue-900';
                  if (log.action === 'DELETE') actionClass = 'bg-rose-600 rounded-xl shadow-sm text-white border-red-900 blink_me_action';

                  return (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-yellow-50 bg-white">
                      <td className="p-2 border-r border-slate-100 font-sans whitespace-nowrap text-slate-600">
                        {new Date(log.changed_at).toLocaleString('en-GB')}
                      </td>
                      <td className="p-2 border-r border-slate-100 font-bold uppercase text-slate-700">
                        {log.table_name}
                      </td>
                      <td className="p-2 border-r border-slate-100 font-bold font-sans text-center">
                        <span className={`px-1 py-0.5 border ${actionClass} text-[10px]`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2 border-r border-slate-100 font-bold font-sans text-center">
                        #{log.record_id}
                      </td>
                      <td className="p-2 border-r border-slate-100 font-sans text-[9px] text-slate-700 tracking-tight break-all">
                        {JSON.stringify(log.changed_data || {})}
                      </td>
                      <td className="p-2 font-bold uppercase text-slate-700">
                        {log.changed_by_name || (log.changed_by ? `USER #${log.changed_by}` : 'SYSTEM BOT')}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        { }
        {totalPages > 1 && (
          <div className="bg-white shadow-sm rounded-xl p-2 border-t border-slate-200 rounded-xl flex justify-between items-center text-xs font-bold uppercase">
            <span>RECORD {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} OF {totalCount}</span>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="bg-white border border-slate-200 shadow-sm rounded-xl px-2 py-1 disabled:opacity-50 hover:bg-slate-50/80 backdrop-blur-sm">
                [ &lt; PREV ]
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="bg-white border border-slate-200 shadow-sm rounded-xl px-2 py-1 disabled:opacity-50 hover:bg-slate-50/80 backdrop-blur-sm">
                [ NEXT &gt; ]
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
         .blink_me_action { animation: blinker_act 2s linear infinite; }
         @keyframes blinker_act { 50% { opacity: 0.8; } }
      `}</style>
    </div>
  );
}
