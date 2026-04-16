"use client";

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

type TabType = 'profile' | 'thresholds' | 'notifications' | 'security';

export default function SettingsPage() {
   const { currentUser } = useAuth();
   const [activeTab, setActiveTab] = useState<TabType>('profile');
   const [isSaving, setIsSaving] = useState(false);
   const [showSaved, setShowSaved] = useState(false);

   const [settings, setSettings] = useState({
      ews_high_threshold: 5,
      ews_urgent_threshold: 7,
      escalation_wait_minutes: 10
   });

   React.useEffect(() => {
      const token = localStorage.getItem('__intellicare_token');
      fetch('http://localhost:3001/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
         .then(res => res.json())
         .then(res => {
            if (res.data) setSettings(res.data);
         })
         .catch(console.error);
   }, []);

   const [notifications, setNotifications] = useState({
      emailAlerts: true,
      smsAlerts: false,
      criticalOnly: true,
      weeklyReport: true,
      offDutyMute: false
   });

   const [security, setSecurity] = useState({
      twoFactor: true,
      biometric: false
   });

   const handleSave = async () => {
      setIsSaving(true);
      try {
         const token = localStorage.getItem('__intellicare_token');
         await fetch('http://localhost:3001/api/admin/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(settings)
         });
         setIsSaving(false);
         setShowSaved(true);
         setTimeout(() => setShowSaved(false), 3000);
      } catch (err) {
         console.error(err);
         setIsSaving(false);
      }
   };

   return (
      <div className="max-w-[1200px] mx-auto p-4 font-sans text-gray-900 relative">

         { }
         <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-end">
            <div>
               <h1 className="text-2xl font-bold text-black m-0 uppercase tracking-widest">System Configurations</h1>
            </div>
            <div className="flex gap-2">
               {showSaved && <span className="bg-green-700 text-white font-bold px-2 py-1 text-sm mr-4 animate-pulse">SETTINGS SAVED</span>}
               <button className="bg-gray-200 border border-black px-3 py-1 font-bold text-sm shadow-sm hover:bg-gray-300">
                  [ DISCARD ]
               </button>
               <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-800 text-white border border-black px-3 py-1 font-bold text-sm shadow-sm hover:bg-blue-900 disabled:opacity-50"
               >
                  {isSaving ? "[ SYNCING... ]" : "[ SAVE CONFIGURATION ]"}
               </button>
            </div>
         </div>

         <p className="mb-6 text-sm font-bold text-gray-700 uppercase">Manage global clinical thresholds, personal preferences, and data governance.</p>

         <div className="flex flex-col md:flex-row gap-6">

            { }
            <div className="w-full md:w-64 flex flex-col border border-black bg-white shadow-sm">
               <div className="bg-gray-300 font-bold p-2 text-sm border-b border-black uppercase text-center tracking-widest">
                  Menu Options
               </div>
               <MenuButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="1. Profile Settings" />
               <MenuButton active={activeTab === 'thresholds'} onClick={() => setActiveTab('thresholds')} label="2. Clinical Thresholds" />
               <MenuButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} label="3. Notification Rules" />
               <MenuButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} label="4. Data & Security" />
            </div>

            { }
            <div className="flex-1 min-h-[500px]">

               { }
               {activeTab === 'profile' && (
                  <div className="border border-black bg-white h-full shadow-sm">
                     <div className="bg-gray-300 font-bold p-2 text-sm border-b border-black uppercase tracking-widest">
                        Identity & Localization
                     </div>
                     <div className="p-6">
                        <div className="mb-6 flex items-center gap-4 border border-black p-4 bg-gray-100 max-w-sm">
                           <div className="w-16 h-16 bg-white border border-black flex items-center justify-center font-bold text-3xl font-mono">
                              {currentUser?.name?.charAt(0).toUpperCase() || '?'}
                           </div>
                           <div>
                              <div className="font-bold uppercase text-lg">{currentUser?.name}</div>
                              <div className="text-xs bg-green-200 border border-green-800 text-green-900 px-2 py-0.5 inline-block font-bold mt-1">ACTIVE DUTY</div>
                           </div>
                        </div>

                        <table className="w-full max-w-xl text-sm border-collapse">
                           <tbody>
                              <tr>
                                 <td className="p-2 font-bold uppercase w-1/3 bg-gray-200 border border-gray-400">Full Name</td>
                                 <td className="p-2 border border-gray-400">
                                    <input type="text" className="w-full border border-black px-2 py-1 bg-white font-mono" defaultValue={currentUser?.name || ''} />
                                 </td>
                              </tr>
                              <tr>
                                 <td className="p-2 font-bold uppercase w-1/3 bg-gray-200 border border-gray-400">Staff Designation</td>
                                 <td className="p-2 border border-gray-400">
                                    <input type="text" className="w-full border border-black px-2 py-1 bg-gray-200 font-mono text-gray-600" defaultValue={currentUser?.role.toUpperCase() || ''} disabled />
                                 </td>
                              </tr>
                              <tr>
                                 <td className="p-2 font-bold uppercase w-1/3 bg-gray-200 border border-gray-400">Secure Email</td>
                                 <td className="p-2 border border-gray-400">
                                    <input type="text" className="w-full border border-black px-2 py-1 bg-white font-mono" defaultValue={`${(currentUser?.name || 'user').toLowerCase().replace(' ', '.')}@intellicare.hospital`} />
                                 </td>
                              </tr>
                              <tr>
                                 <td className="p-2 font-bold uppercase w-1/3 bg-gray-200 border border-gray-400">Localization</td>
                                 <td className="p-2 border border-gray-400">
                                    <select className="w-full border border-black px-2 py-1 bg-white font-mono">
                                       <option>EN-US (System Default)</option>
                                       <option>EN-UK</option>
                                    </select>
                                 </td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               { }
               {activeTab === 'thresholds' && (
                  <div className="border border-black bg-white h-full shadow-sm">
                     <div className="bg-gray-300 font-bold p-2 text-sm border-b border-black uppercase tracking-widest">
                        Global Engine Triggers & EWS
                     </div>
                     <div className="p-6 flex flex-col gap-6">
                        <p className="text-sm font-bold mb-2">Adjust the bounds for Early Warning Score calculations.</p>

                        <div className="border border-black max-w-xl">
                           <div className="bg-orange-200 font-bold p-2 border-b border-black text-sm uppercase">EWS 'HIGH' ALERT (MIN: 3, MAX: 6)</div>
                           <div className="p-4 bg-gray-50 flex items-center gap-4">
                              <input type="number" min="3" max="6" value={settings.ews_high_threshold} onChange={(e) => setSettings({ ...settings, ews_high_threshold: parseInt(e.target.value) })} className="border border-black p-2 font-mono text-lg w-20 text-center" />
                              <span className="text-xs font-bold text-gray-600 uppercase">Points required to trigger High Alert workflow</span>
                           </div>
                        </div>

                        <div className="border border-black max-w-xl">
                           <div className="bg-red-200 font-bold p-2 border-b border-black text-sm uppercase">EWS 'URGENT' ALERT (MIN: 6, MAX: 10)</div>
                           <div className="p-4 bg-gray-50 flex items-center gap-4">
                              <input type="number" min="6" max="10" value={settings.ews_urgent_threshold} onChange={(e) => setSettings({ ...settings, ews_urgent_threshold: parseInt(e.target.value) })} className="border border-black p-2 font-mono text-lg w-20 text-center" />
                              <span className="text-xs font-bold text-gray-600 uppercase">Points required to trigger ICU Response Code</span>
                           </div>
                        </div>

                        <div className="border border-black max-w-xl">
                           <div className="bg-blue-200 font-bold p-2 border-b border-black text-sm uppercase">ESCALATION DELAY (MIN: 1, MAX: 30)</div>
                           <div className="p-4 bg-gray-50 flex items-center gap-4">
                              <input type="number" min="1" max="30" value={settings.escalation_wait_minutes} onChange={(e) => setSettings({ ...settings, escalation_wait_minutes: parseInt(e.target.value) })} className="border border-black p-2 font-mono text-lg w-20 text-center" />
                              <span className="text-xs font-bold text-gray-600 uppercase">Minutes before escalating from Nurse to Doctor</span>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               { }
               {activeTab === 'notifications' && (
                  <div className="border border-black bg-white h-full shadow-sm">
                     <div className="bg-gray-300 font-bold p-2 text-sm border-b border-black uppercase tracking-widest">
                        Dispatch Preferences & Routing
                     </div>
                     <div className="p-6">
                        <table className="w-full text-sm border-collapse border border-black mb-6">
                           <thead>
                              <tr className="bg-gray-200 border-b border-black text-left">
                                 <th className="p-2 font-bold w-12 text-center border-r border-black">STATE</th>
                                 <th className="p-2 font-bold uppercase border-r border-black">Rule Protocol</th>
                                 <th className="p-2 font-bold uppercase">Description</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-300">
                              <ToggleTableRow
                                 checked={notifications.emailAlerts}
                                 onChange={(v) => setNotifications({ ...notifications, emailAlerts: v })}
                                 title="Enterprise Email" desc="Send alerts directly to hospital email server"
                              />
                              <ToggleTableRow
                                 checked={notifications.smsAlerts}
                                 onChange={(v) => setNotifications({ ...notifications, smsAlerts: v })}
                                 title="SMS Override" desc="Push critical codes immediately via SMS"
                              />
                              <ToggleTableRow
                                 checked={notifications.criticalOnly}
                                 onChange={(v) => setNotifications({ ...notifications, criticalOnly: v })}
                                 title="Critical Tier Only" desc="Suppress medium/low warnings off-hours"
                              />
                              <ToggleTableRow
                                 checked={notifications.weeklyReport}
                                 onChange={(v) => setNotifications({ ...notifications, weeklyReport: v })}
                                 title="Weekly Compliance" desc="Receive Sunday PDF digest of resolved incidents"
                              />
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               { }
               {activeTab === 'security' && (
                  <div className="border border-black bg-white h-full shadow-sm">
                     <div className="bg-gray-300 font-bold p-2 text-sm border-b border-black uppercase tracking-widest">
                        Data & Security Auditing
                     </div>
                     <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div>
                           <div className="font-bold border-b-2 border-black pb-1 mb-4 uppercase text-sm">Auth Enforcement</div>
                           <div className="flex items-center gap-4 mb-4">
                              <input type="checkbox" checked={security.twoFactor} onChange={(e) => setSecurity({ ...security, twoFactor: e.target.checked })} className="w-5 h-5 border border-black" />
                              <div className="text-sm font-bold uppercase">Require 2FA (TOTP)</div>
                           </div>
                           <div className="flex items-center gap-4 mb-6">
                              <input type="checkbox" checked={security.biometric} onChange={(e) => setSecurity({ ...security, biometric: e.target.checked })} className="w-5 h-5 border border-black" />
                              <div className="text-sm font-bold uppercase">Enable Biometric Auth</div>
                           </div>

                           <div className="border border-black bg-gray-100 p-4">
                              <div className="font-bold text-sm mb-2">PASSWORD HEALTH</div>
                              <div className="text-xs font-mono mb-4 text-gray-700">Last rotated: 45 days ago. Max: 90 days.</div>
                              <button className="bg-white border border-black px-3 py-1 font-bold text-xs uppercase shadow-sm">
                                 [ RESET PASSWORD ]
                              </button>
                           </div>
                        </div>

                        <div>
                           <div className="font-bold border-b-2 border-black pb-1 mb-4 uppercase text-sm">Active Sessions</div>
                           <div className="border border-black bg-white p-3 mb-4">
                              <div className="flex justify-between items-start mb-2">
                                 <div className="font-bold text-sm">Browser Session (Primary)</div>
                                 <span className="bg-green-700 text-white px-2 py-0.5 text-[10px] font-bold">CURRENT</span>
                              </div>
                              <div className="font-mono text-xs text-gray-600">IP: 192.168.1.104</div>
                              <div className="font-mono text-xs text-gray-600">Started: 2 hours ago</div>
                           </div>

                           <button className="w-full bg-red-100 text-red-900 border border-red-900 px-3 py-2 font-bold text-xs uppercase shadow-sm hover:bg-red-200">
                              [ REVOKE OTHER SESSIONS ]
                           </button>

                           <div className="mt-8 border border-black bg-blue-50 p-4">
                              <div className="font-bold text-sm mb-2 uppercase">Compliance Export</div>
                              <div className="text-xs mb-4 text-gray-700">Download a cryptographically signed log package.</div>
                              <button className="w-full bg-black text-white border border-black px-3 py-2 font-bold text-xs uppercase shadow-sm">
                                 [ REQUEST AUDIT ZIP ]
                              </button>
                           </div>
                        </div>

                     </div>
                  </div>
               )}

            </div>
         </div>
      </div>
   );
}

function MenuButton({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
   return (
      <button
         onClick={onClick}
         className={`text-left p-3 border-b border-black text-sm font-bold uppercase tracking-wide transition-colors ${active ? "bg-black text-white" : "bg-white text-black hover:bg-gray-200"}`}
      >
         {label}
      </button>
   );
}

function ToggleTableRow({ checked, onChange, title, desc }: { checked: boolean, onChange: (v: boolean) => void, title: string, desc: string }) {
   return (
      <tr className="hover:bg-yellow-50">
         <td className="p-2 border-r border-black text-center">
            <button
               onClick={() => onChange(!checked)}
               className={`font-mono text-[10px] px-2 py-1 border border-black font-bold border-collapse shadow-sm ${checked ? 'bg-green-700 text-white' : 'bg-gray-200 text-gray-500'}`}
            >
               {checked ? 'ON' : 'OFF'}
            </button>
         </td>
         <td className="p-2 font-bold text-sm border-r border-black uppercase">{title}</td>
         <td className="p-2 text-xs font-mono text-gray-700 break-words">{desc}</td>
      </tr>
   )
}
