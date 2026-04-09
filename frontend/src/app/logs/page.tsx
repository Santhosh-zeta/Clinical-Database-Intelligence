"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-gray-900">
      <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-black m-0 tracking-widest uppercase">System Audit Logs</h1>
        </div>
        <div className="flex gap-2 items-center">
            <button onClick={() => fetchLogs(currentPage)} disabled={loading} className="bg-gray-200 border border-black px-3 py-1 font-bold text-sm shadow-sm hover:bg-gray-300">
               [ REFRESH ]
            </button>
            <button onClick={exportCSV} className="bg-gray-200 border border-black px-3 py-1 font-bold text-sm shadow-sm hover:bg-gray-300">
               [ EXPORT CSV ]
            </button>
        </div>
      </div>

      <p className="mb-4 text-xs font-bold text-gray-700 uppercase">Immutable cryptographic record of all system changes. {lastRefreshed && `LAST SYNC: ${lastRefreshed.toLocaleTimeString()}`}</p>

      {/* KPI status bar */}
      <div className="flex bg-white border border-black mb-4 text-sm divide-x divide-black">
         <div className="flex-1 p-2 bg-gray-200 flex flex-col justify-center items-center font-mono">
            <span className="font-bold text-black text-lg">{loading ? '...' : totalCount}</span>
            <span className="text-xs uppercase font-bold">Total Audit Events</span>
         </div>
         <div className="flex-1 p-2 bg-gray-200 flex flex-col justify-center items-center font-mono">
            <span className="font-bold text-red-700 text-lg">{filtered.filter(l => l.action === 'DELETE').length}</span>
            <span className="text-xs uppercase font-bold text-red-900">Delete Records (Page)</span>
         </div>
         <div className="flex-1 p-2 bg-gray-200 flex flex-col justify-center items-center font-mono">
            <span className="font-bold text-black text-lg">{currentPage} / {totalPages || 1}</span>
            <span className="text-xs uppercase font-bold">Current Page</span>
         </div>
      </div>

      <div className="bg-white border border-black flex flex-col mb-6">
        {/* Toolbar */}
        <div className="bg-gray-300 border-b border-black p-2 text-sm flex flex-wrap gap-4 items-center">
           <div className="flex items-center gap-2">
              <span className="font-bold uppercase text-xs">Search:</span>
              <input type="text" className="border border-black px-2 py-0.5" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
           </div>
           <div className="flex items-center gap-2">
              <span className="font-bold uppercase text-xs">Table:</span>
              <select className="border border-black px-2 py-0.5 bg-white font-bold text-xs uppercase" value={filterTable} onChange={e => setFilterTable(e.target.value)}>
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
              <select className="border border-black px-2 py-0.5 bg-white font-bold text-xs uppercase" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
                <option value="">ALL ACTIONS</option>
                <option value="INSERT">INSERT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
           </div>
        </div>

        {/* Standard Data Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-200 border-b border-black">
                <th className="p-2 border-r border-black font-bold whitespace-nowrap">TIMESTAMP</th>
                <th className="p-2 border-r border-black font-bold">TABLE</th>
                <th className="p-2 border-r border-black font-bold text-center">OP</th>
                <th className="p-2 border-r border-black font-bold text-center">REC ID</th>
                <th className="p-2 border-r border-black font-bold w-1/2">DATA PAYLOAD</th>
                <th className="p-2 font-bold">AUTH USER</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center bg-white text-gray-700 italic font-bold">READING CLUSTER LOG FILE...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center bg-white text-red-700 italic font-bold">NO LOG ENTRY FOUND.</td></tr>
              ) : (
                filtered.map((log) => {
                  let actionClass = 'bg-gray-200 text-black border-black';
                  if (log.action === 'INSERT') actionClass = 'bg-green-700 text-white border-green-900';
                  if (log.action === 'UPDATE') actionClass = 'bg-blue-700 text-white border-blue-900';
                  if (log.action === 'DELETE') actionClass = 'bg-red-700 text-white border-red-900 blink_me_action';

                  return (
                    <tr key={log.id} className="border-b border-gray-300 hover:bg-yellow-50 bg-white">
                      <td className="p-2 border-r border-gray-300 font-mono whitespace-nowrap text-gray-700">
                        {new Date(log.changed_at).toLocaleString('en-GB')}
                      </td>
                      <td className="p-2 border-r border-gray-300 font-bold uppercase text-gray-800">
                         {log.table_name}
                      </td>
                      <td className="p-2 border-r border-gray-300 font-bold font-mono text-center">
                        <span className={`px-1 py-0.5 border ${actionClass} text-[10px]`}>
                           {log.action}
                        </span>
                      </td>
                      <td className="p-2 border-r border-gray-300 font-bold font-mono text-center">
                         #{log.record_id}
                      </td>
                      <td className="p-2 border-r border-gray-300 font-mono text-[9px] text-gray-800 tracking-tight break-all">
                         {JSON.stringify(log.changed_data || {})}
                      </td>
                      <td className="p-2 font-bold uppercase text-gray-800">
                        {log.changed_by_name || (log.changed_by ? `USER #${log.changed_by}` : 'SYSTEM BOT')}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
           <div className="bg-gray-300 p-2 border-t border-black flex justify-between items-center text-xs font-bold uppercase">
              <span>RECORD {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalCount)} OF {totalCount}</span>
              <div className="flex gap-2">
                 <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="bg-white border border-black px-2 py-1 disabled:opacity-50 hover:bg-gray-200">
                    [ &lt; PREV ]
                 </button>
                 <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="bg-white border border-black px-2 py-1 disabled:opacity-50 hover:bg-gray-200">
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
