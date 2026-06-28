"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const API = `https://clinical-database-intelligence.onrender.com/api`;
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

export default function DashboardSummary() {
  const { currentUser, logout } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [criticalPatients, setCriticalPatients] = useState<any[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboard = async () => {
    try {
      const [statsRes, critRes, alertRes, logsRes] = await Promise.all([
        fetch(`${API}/admin/dashboard`, { headers: ah() }),
        fetch(`${API}/admin/critical-patients`, { headers: ah() }),
        fetch(`${API}/admin/alerts-summary`, { headers: ah() }),
        fetch(`${API}/admin/audit-logs?limit=10`, { headers: ah() })
      ]);

      if (statsRes.status === 401) {
        logout();
        return;
      }

      const results = await Promise.all([
        statsRes.ok ? statsRes.json() : null,
        critRes.ok ? critRes.json() : null,
        alertRes.ok ? alertRes.json() : null,
        logsRes.ok ? logsRes.json() : null
      ]);

      if (results[0]) setStats(results[0].data);
      if (results[1]) setCriticalPatients(results[1].data || []);
      if (results[2]) setAlertsSummary(results[2].data);
      if (results[3]) setAuditLogs(results[3].data || []);

      setLastRefreshed(new Date());
    } catch (_) { }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard();
    const id = setInterval(fetchDashboard, 10000);
    return () => clearInterval(id);
  }, []);

  if (currentUser?.role?.toLowerCase() === 'patient') {
    return <PatientDashboard />;
  }

  const activeAdmissions = stats ? parseInt(stats.active_admissions) : 0;
  const criticalCount = stats ? parseInt(stats.critical_patients) : 0;
  const activeAlerts = stats ? parseInt(stats.unacknowledged_alerts) : 0;
  const availIcu = stats ? parseInt(stats.available_icu_beds) : 0;
  const totalIcu = stats ? parseInt(stats.total_icu_beds) : 0;
  const activeDoctors = stats ? parseInt(stats.active_doctors) : 0;
  const dischargedToday = stats ? parseInt(stats.discharged_today) : 0;

  return (
    <div className="max-w-[1200px] mx-auto p-4 font-sans text-slate-800">

      <div className="border-b-2 border-blue-200 pb-2 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-blue-900 m-0">
            {currentUser?.role === 'admin' ? 'System Administration Dashboard' : 'Clinical Overview Dashboard'}
          </h1>
        </div>
        <div className="text-sm text-slate-500 font-bold">
          {lastRefreshed ? `Last Updated: ${lastRefreshed.toLocaleTimeString()}` : 'Loading data...'}
          <button
            onClick={fetchDashboard}
            className="ml-4 bg-slate-50/80 backdrop-blur-sm border border-slate-200 px-3 py-1 text-sm font-bold shadow-sm hover:bg-white shadow-sm rounded-xl active:bg-gray-400"
          >
            Refresh Data
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <StatBox label="Active Admissions" value={loading ? '...' : activeAdmissions} subtext={`Discharged today: ${dischargedToday}`} />
        <StatBox label="Critical Risk Patients" value={loading ? '...' : criticalCount} isAlert={criticalCount > 0} />
        <StatBox label="ICU Beds Available" value={loading ? '...' : `${availIcu} / ${totalIcu}`} isAlert={availIcu === 0} />
        <StatBox label="Unacknowledged Alerts" value={loading ? '...' : activeAlerts} isAlert={activeAlerts > 0} />
        <StatBox label="Staff On Duty" value={loading ? '...' : activeDoctors} />
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">

        <div className="flex-1 flex flex-col gap-6">
          <Panel title="Priority Patient Watchlist">
            {criticalPatients.length === 0 ? (
              <div className="p-4 text-slate-400 italic">No priority patients at this time.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-sm">
                    <th className="p-2 border-r border-slate-100">Patient Name</th>
                    <th className="p-2 border-r border-slate-100">Location</th>
                    <th className="p-2 border-r border-slate-100">Diagnosis</th>
                    <th className="p-2 border-r border-slate-100 text-center">EWS Score</th>
                    <th className="p-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalPatients.map((pt, index) => (
                    <tr key={index} className="border-b border-slate-100 hover:bg-yellow-50 text-sm">
                      <td className="p-2 border-r border-slate-100 font-bold text-slate-800">{pt.patient_name}</td>
                      <td className="p-2 border-r border-slate-100">{pt.ward_name} - Bed {pt.bed_number}</td>
                      <td className="p-2 border-r border-slate-100">{pt.diagnosis}</td>
                      <td className="p-2 border-r border-slate-100 text-center">
                        <span className={`font-bold ${pt.risk_category === 'critical' ? 'text-rose-600' : 'text-orange-700'}`}>
                          {pt.ews || 'N/A'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <Link href={`/patient?id=${pt.admission_id}`} className="text-blue-600 hover:underline font-bold">
                          View Chart
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="bg-slate-50 p-2 border-t border-slate-100 text-right">
              <Link href="/patients" className="text-blue-700 hover:underline text-sm font-bold">Open Full Directory &raquo;</Link>
            </div>
          </Panel>
        </div>

        <div className="lg:w-1/3 flex flex-col gap-6">
          <Panel title="Recent System Alerts">
             <div className="p-4 flex flex-col gap-2">
               <p className="font-bold text-rose-600 mb-2">Total Unresolved: {activeAlerts}</p>
               <hr className="border-slate-100 my-1" />
               <ul className="list-disc pl-5 text-sm space-y-1">
                 {alertsSummary?.by_escalation?.map((esc: any, i: number) => (
                   <li key={i}>
                     Escalation L{esc.escalation_level}: <strong>{esc.count}</strong>
                   </li>
                 ))}
               </ul>
             </div>
             <div className="bg-slate-50 p-2 border-t border-slate-100 text-right">
                <Link href="/alerts" className="text-blue-700 hover:underline text-sm font-bold">Manage Alerts &raquo;</Link>
             </div>
          </Panel>

          <Panel title="Latest Audit Logs">
            {auditLogs.length === 0 ? (
               <div className="p-4 text-slate-400 italic">Logs empty or loading.</div>
             ) : (
               <ul className="text-sm divide-y divide-gray-200">
                 {auditLogs.slice(0, 5).map(log => (
                   <li key={log.id} className="p-2">
                     <div className="font-bold">{log.action} - {log.table_name}</div>
                     <div className="text-slate-500">ID: {log.record_id} | Time: {new Date(log.changed_at).toLocaleTimeString()}</div>
                   </li>
                 ))}
               </ul>
             )}
            <div className="bg-slate-50 p-2 border-t border-slate-100 text-right">
              <Link href="/logs" className="text-blue-700 hover:underline text-sm font-bold">View All Logs &raquo;</Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PatientDashboard() {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.patientId) return;
    fetch(`${API}/patients/${currentUser.patientId}/summary`, { headers: ah() })
      .then(r => r.json())
      .then(d => { setSummary(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser?.patientId]);

  if (loading) return (
    <div className="p-6 text-slate-500 font-bold font-sans">
      Loading Medical Record...
    </div>
  );

  const adm = summary?.active_admission;
  const vitals = summary?.latest_vitals;

  return (
    <div className="max-w-[900px] mx-auto p-4 font-sans text-slate-800 border border-slate-200 shadow-sm rounded-xl shadow mt-4 bg-white">
      <div className="border-b-4 border-blue-900 pb-2 mb-4">
        <h1 className="text-3xl font-bold text-slate-800 m-0">IntelliCare Patient Portal</h1>
        <p className="font-bold text-slate-500 m-0">Patient File: {currentUser?.name}</p>
      </div>

      <div className="flex gap-6 mb-6">
         <div className="w-1/2">
           <Panel title="Admission Details">
             <div className="p-4">
               {adm ? (
                 <table className="w-full text-left text-sm">
                   <tbody>
                     <tr className="border-b">
                       <th className="py-2 pr-4 text-slate-500">Condition</th>
                       <td className="py-2 font-bold text-slate-800">{adm.diagnosis}</td>
                     </tr>
                     <tr className="border-b">
                       <th className="py-2 pr-4 text-slate-500">Admitting Physician</th>
                       <td className="py-2">Dr. {adm.doctor_name}</td>
                     </tr>
                     <tr className="border-b">
                       <th className="py-2 pr-4 text-slate-500">Location</th>
                       <td className="py-2">{adm.ward_name}, Bed {adm.bed_number}</td>
                     </tr>
                     <tr>
                       <th className="py-2 pr-4 text-slate-500">Admission Date</th>
                       <td className="py-2">{new Date(adm.admitted_at).toLocaleDateString()}</td>
                     </tr>
                   </tbody>
                 </table>
               ) : (
                 <p className="italic text-slate-500">No active admission found.</p>
               )}
             </div>
           </Panel>
         </div>
         <div className="w-1/2">
           <Panel title="Recent Vitals">
             <div className="p-4">
               {vitals ? (
                 <table className="w-full text-left text-sm border border-slate-100">
                    <thead>
                      <tr className="bg-slate-50/80 backdrop-blur-sm">
                        <th className="border border-slate-100 p-2">Measurement</th>
                        <th className="border border-slate-100 p-2">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-100 p-2">Heart Rate</td>
                        <td className="border border-slate-100 p-2 font-bold">{vitals.heart_rate} BPM</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-100 p-2">Blood Pressure</td>
                        <td className="border border-slate-100 p-2 font-bold">{vitals.systolic_bp} / {vitals.diastolic_bp}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-100 p-2">Oxygen (SpO2)</td>
                        <td className="border border-slate-100 p-2 font-bold">{vitals.spo2} %</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-100 p-2">Temperature</td>
                        <td className="border border-slate-100 p-2 font-bold">{vitals.temperature} °C</td>
                      </tr>
                    </tbody>
                 </table>
               ) : (
                 <p className="italic text-slate-500">No recent vitals measurements.</p>
               )}
             </div>
           </Panel>
         </div>
      </div>

      <Panel title="Medical History Log">
         <div className="p-4">
            {summary?.recent_activity?.length > 0 ? (
              <table className="w-full text-left border-collapse border border-slate-100 text-sm">
                <thead>
                  <tr className="bg-slate-50/80 backdrop-blur-sm">
                    <th className="border border-slate-100 p-2">Date</th>
                    <th className="border border-slate-100 p-2">Record Type</th>
                    <th className="border border-slate-100 p-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent_activity.map((act: any, i: number) => (
                    <tr key={i} className="hover:bg-yellow-50">
                      <td className="border border-slate-100 p-2 whitespace-nowrap">{new Date(act.date).toLocaleDateString()}</td>
                      <td className="border border-slate-100 p-2 uppercase object-contain max-w-[100px]">{act.type}</td>
                      <td className="border border-slate-100 p-2 font-bold">{act.name} {act.value ? `(${act.value})` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="italic text-slate-500">No medical history entries found.</p>
            )}
         </div>
      </Panel>
    </div>
  )
}

function Panel({ title, children }: any) {
  return (
    <div className="bg-white border border-slate-200 shadow-sm">
      <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-slate-200 p-2 font-bold text-slate-700 text-sm">
        {title}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}

function StatBox({ label, value, subtext, isAlert }: any) {
  return (
    <div className={`flex-1 border p-3 flex flex-col justify-center items-center shadow-sm ${isAlert ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-white'}`}>
      <span className="text-3xl font-bold mb-1 text-slate-800">{value}</span>
      <span className="text-xs uppercase text-slate-600 font-bold text-center">{label}</span>
      {subtext && <span className="text-xs text-slate-400 mt-1">{subtext}</span>}
    </div>
  );
}
