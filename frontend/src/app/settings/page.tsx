"use client";

import React, { useState } from 'react';
import { 
  User, 
  Bell, 
  Shield, 
  Activity, 
  Save,
  CheckCircle2,
  Smartphone,
  Mail,
  Database,
  AlertTriangle,
  KeyRound,
  MonitorSmartphone,
  Download,
  HeartPulse,
  Thermometer,
  Stethoscope,
  RefreshCw,
  Fingerprint,
  Moon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

type TabType = 'profile' | 'thresholds' | 'notifications' | 'security';

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  // Settings State Example
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
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto flex flex-col gap-8 w-full h-full relative">
      
      {/* Dynamic Saving Toast Overlay */}
      <div className={cn(
        "fixed top-8 right-8 bg-slate-900 border border-slate-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-all duration-500 z-50 backdrop-blur-xl",
        showSaved ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-12 scale-95 pointer-events-none"
      )}>
         <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
         </div>
         <div>
            <h4 className="font-bold text-sm">Configuration Applied</h4>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Your settings have been securely synchronized.</p>
         </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">System Configurations</h1>
          <p className="text-slate-500 text-lg">Manage global clinical thresholds, personal preferences, and data governance.</p>
        </div>
        <div className="flex gap-3">
             <button className="px-6 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl transition-all shadow-sm">
                Discard Changes
             </button>
             <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(79,70,229,0.3)] flex items-center gap-2 disabled:opacity-70 disabled:cursor-wait"
             >
                {isSaving ? (
                   <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                   <Save className="w-4 h-4" />
                )}
                {isSaving ? "Synchronizing..." : "Save Configuration"}
             </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start h-full">
        
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-72 flex flex-col gap-2 shrink-0 sticky top-24">
          <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User className="w-5 h-5" />} label="Profile Settings" desc="Identity & Localization" />
          <TabButton active={activeTab === 'thresholds'} onClick={() => setActiveTab('thresholds')} icon={<Activity className="w-5 h-5" />} label="Clinical Thresholds" desc="Global Engine Triggers" />
          <TabButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell className="w-5 h-5" />} label="Notification Rules" desc="Dispatch Preferences" />
          <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} icon={<Shield className="w-5 h-5" />} label="Data & Security" desc="2FA & Active Sessions" />
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 w-full min-h-[600px] pb-24">
          
          {/* ----- Profile Section ----- */}
          {activeTab === 'profile' && (
             <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-white border border-slate-200/80 rounded-[2rem] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8 md:p-10 relative overflow-hidden">
                   {/* Decorative background flare */}
                   <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full opacity-50 z-0 pointer-events-none" />
                   
                   <div className="relative z-10 flex flex-col md:flex-row gap-10 items-start">
                      <div className="flex flex-col items-center gap-4">
                         <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-indigo-100 to-white border-4 border-white shadow-xl flex items-center justify-center text-indigo-600 font-black text-5xl relative group">
                            {currentUser?.name.charAt(0)}
                            <div className="absolute inset-0 bg-slate-900/60 rounded-[1.75rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                               <RefreshCw className="w-8 h-8 text-white" />
                            </div>
                         </div>
                         <div className="text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Duty
                            </span>
                         </div>
                      </div>

                      <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
                         <InputField icon={<User />} label="Full Name" defaultValue={currentUser?.name || ''} />
                         <InputField icon={<Stethoscope />} label="Staff Designation" defaultValue={currentUser?.role.toUpperCase() || ''} disabled />
                         <InputField icon={<Mail />} label="Secure Email" defaultValue={`${currentUser?.name.toLowerCase().replace(' ', '.')}@intellicare.hospital`} />
                         <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 border-l-2 border-indigo-400">Localization Setting</label>
                            <select className="w-full bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-xl outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-700 font-semibold cursor-pointer shadow-inner">
                               <option>English (United States)</option>
                               <option>English (United Kingdom)</option>
                               <option>Hindi (India)</option>
                            </select>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* ----- Thresholds Section ----- */}
          {activeTab === 'thresholds' && (
             <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-white border border-slate-200/80 rounded-[2rem] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8 md:p-10">
                   <div className="mb-10">
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                         <Activity className="w-7 h-7 text-rose-500" /> Physiological Baseline & EWS Engine
                      </h2>
                      <p className="text-slate-500 mt-2 font-medium">Fine-tune the mathematical bounds for Intellicare's Early Warning Score (EWS) system and alert escalation behavior. These govern global risk calculations.</p>
                   </div>

                   <div className="grid grid-cols-1 gap-8">
                      {/* EWS High Threshold */}
                      <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 hover:border-slate-300 transition-colors">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                               <h3 className="font-extrabold text-slate-800 flex items-center gap-2">EWS 'High' Alert Threshold <AlertTriangle className="w-4 h-4 text-orange-500" /></h3>
                               <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">Minimum Score for High Alert</p>
                            </div>
                            <div className="bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl text-orange-600 font-black text-lg">
                               {settings.ews_high_threshold} <span className="text-[10px] text-slate-400 uppercase">Points</span>
                            </div>
                         </div>
                         <input 
                            type="range" min="3" max="6" step="1" 
                            value={settings.ews_high_threshold}
                            onChange={(e) => setSettings({...settings, ews_high_threshold: parseInt(e.target.value)})}
                            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-orange-600 transition-all shadow-inner"
                         />
                      </div>

                      {/* EWS Urgent Threshold */}
                      <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 hover:border-slate-300 transition-colors">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                               <h3 className="font-extrabold text-slate-800 flex items-center gap-2">EWS 'Urgent' Alert Threshold <Activity className="w-4 h-4 text-rose-500" /></h3>
                               <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">Score triggering critical ICU response</p>
                            </div>
                            <div className="bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl text-rose-600 font-black text-lg">
                               {settings.ews_urgent_threshold} <span className="text-[10px] text-slate-400 uppercase">Points</span>
                            </div>
                         </div>
                         <input 
                            type="range" min="6" max="10" step="1" 
                            value={settings.ews_urgent_threshold}
                            onChange={(e) => setSettings({...settings, ews_urgent_threshold: parseInt(e.target.value)})}
                            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-600 transition-all shadow-inner"
                         />
                      </div>

                      {/* Escalation Wait Minutes */}
                      <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100 hover:border-slate-300 transition-colors">
                         <div className="flex justify-between items-start mb-6">
                            <div>
                               <h3 className="font-extrabold text-slate-800 flex items-center gap-2">Alert Escalation Delay <Bell className="w-4 h-4 text-indigo-500" /></h3>
                               <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">Time before escalating from Nurse to Doctor / ICU</p>
                            </div>
                            <div className="bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl text-indigo-600 font-black text-lg">
                               {settings.escalation_wait_minutes} <span className="text-[10px] text-slate-400 uppercase">Minutes</span>
                            </div>
                         </div>
                         <input 
                            type="range" min="1" max="30" step="1" 
                            value={settings.escalation_wait_minutes}
                            onChange={(e) => setSettings({...settings, escalation_wait_minutes: parseInt(e.target.value)})}
                            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600 transition-all shadow-inner"
                         />
                      </div>

                   </div>
                </div>
             </div>
          )}

          {/* ----- Notifications Section ----- */}
          {activeTab === 'notifications' && (
             <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-white border border-slate-200/80 rounded-[2rem] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8 md:p-10">
                   <div className="mb-10">
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                         <Bell className="w-7 h-7 text-amber-500" /> Notification Engine Rules
                      </h2>
                      <p className="text-slate-500 mt-2 font-medium">Control omni-channel dispatch preferences. Intelligent routing will fallback to secondary methods if primary deliveries fail.</p>
                   </div>

                   <div className="flex flex-col gap-3">
                      <ToggleRow 
                         icon={<Mail className="w-5 h-5 text-indigo-500" />} 
                         title="Enterprise Email Notifications" 
                         subtitle="Send rich-HTML alerts directly to your verified hospital email server." 
                         checked={notifications.emailAlerts}
                         onChange={(c) => setNotifications({...notifications, emailAlerts: c})}
                      />
                      <ToggleRow 
                         icon={<Smartphone className="w-5 h-5 text-emerald-500" />} 
                         title="SMS Mobile Overrides" 
                         subtitle="Push code-blue alerts immediately via terrestrial SMS text messages to your phone." 
                         checked={notifications.smsAlerts}
                         onChange={(c) => setNotifications({...notifications, smsAlerts: c})}
                      />
                      
                      <div className="mx-4 my-2 border-t border-dashed border-slate-200" />
                      
                      <ToggleRow 
                         icon={<AlertTriangle className="w-5 h-5 text-rose-500" />} 
                         title="Escalation: Critical Tier Only" 
                         subtitle="Apply a suppression filter to silence medium/low warnings and only ring for life-threatening anomalies." 
                         checked={notifications.criticalOnly}
                         onChange={(c) => setNotifications({...notifications, criticalOnly: c})}
                      />
                      <ToggleRow 
                         icon={<Moon className="w-5 h-5 text-purple-500" />} 
                         title="Off-Duty Silence Protocol" 
                         subtitle="Automatically mute all non-critical pager pings during scheduled off-shift hours." 
                         checked={notifications.offDutyMute}
                         onChange={(c) => setNotifications({...notifications, offDutyMute: c})}
                      />

                      <div className="mx-4 my-2 border-t border-dashed border-slate-200" />

                      <ToggleRow 
                         icon={<Database className="w-5 h-5 text-slate-500" />} 
                         title="Weekly Compliance Report" 
                         subtitle="Receive a consolidated Sunday PDF digest of all resolved incidents for administrative auditing." 
                         checked={notifications.weeklyReport}
                         onChange={(c) => setNotifications({...notifications, weeklyReport: c})}
                      />
                   </div>
                </div>
             </div>
          )}

          {/* ----- Data & Security Section ----- */}
          {activeTab === 'security' && (
             <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
                
                <div className="bg-white border border-slate-200/80 rounded-[2rem] shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-8 md:p-10">
                   <div className="mb-10">
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                         <Shield className="w-7 h-7 text-emerald-500" /> Security & Access Management
                      </h2>
                      <p className="text-slate-500 mt-2 font-medium">Protect patient data integrity by enforcing strict authentication constraints and auditing active logins.</p>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      {/* Auth Options */}
                      <div className="flex flex-col gap-4">
                         <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Authentication Enforcement</h3>
                         <ToggleRow 
                            icon={<KeyRound className="w-5 h-5 text-indigo-500" />} 
                            title="Two-Factor Auth (2FA)" 
                            subtitle="Require TOTP app verification on all new device logins." 
                            checked={security.twoFactor}
                            onChange={(c) => setSecurity({...security, twoFactor: c})}
                            compact
                         />
                         <ToggleRow 
                            icon={<Fingerprint className="w-5 h-5 text-slate-500" />} 
                            title="Biometric Verification" 
                            subtitle="Use FaceID/TouchID when available to unlock sensitive charts." 
                            checked={security.biometric}
                            onChange={(c) => setSecurity({...security, biometric: c})}
                            compact
                         />
                         <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <h4 className="font-bold text-slate-800 text-sm mb-1">Password Management</h4>
                            <p className="text-xs text-slate-500 mb-4 font-medium">Last rotated 45 days ago. HIPAA compliance enforces 90-day cycles.</p>
                            <button className="w-full py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 shadow-sm transition-colors">
                               Initiate Password Reset
                            </button>
                         </div>
                      </div>

                      {/* Active Sessions */}
                      <div className="flex flex-col gap-4">
                         <h3 className="font-bold text-slate-800 text-sm uppercase tracking-widest mb-2 border-b border-slate-100 pb-2">Active Session Tracking</h3>
                         <div className="flex flex-col gap-3">
                            <SessionCard
                               device={`Browser — ${currentUser?.name || 'Current User'}`}
                               location={`Role: ${currentUser?.role?.toUpperCase() || 'N/A'} · Active Session`}
                               isCurrent
                               time="Active Now"
                               icon={<MonitorSmartphone className="w-5 h-5 text-indigo-500" />}
                            />
                         </div>
                         <button className="mt-2 w-full py-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> Revoke All Other Sessions
                         </button>
                      </div>
                   </div>

                   {/* Audit Logs Download */}
                   <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-indigo-50 rounded-full border border-indigo-100">
                            <Database className="w-6 h-6 text-indigo-500" />
                         </div>
                         <div>
                            <h4 className="font-bold text-slate-800">Compliance Audit Export</h4>
                            <p className="text-xs text-slate-500 font-medium">Download a cryptographic sign record of all your system actions.</p>
                         </div>
                      </div>
                      <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all shrink-0 border border-slate-700 hover:border-slate-600">
                         <Download className="w-4 h-4" /> Request Log Package
                      </button>
                   </div>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ----- Helper Components -----

function TabButton({ active, onClick, icon, label, desc }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, desc: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-start w-full px-5 py-4 rounded-[1.25rem] transition-all border group text-left",
        active 
          ? "bg-white border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] ring-1 ring-indigo-500/10" 
          : "bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-200/50"
      )}
    >
      <div className="flex items-center gap-4 w-full">
         <div className={cn("p-2.5 rounded-xl transition-all border", active ? "bg-indigo-50 border-indigo-100 shadow-inner text-indigo-600" : "bg-white border-slate-200 shadow-sm text-slate-400 group-hover:text-slate-600")}>
            {icon}
         </div>
         <div>
            <div className={cn("font-extrabold text-[15px] tracking-tight transition-colors", active ? "text-indigo-900" : "text-slate-600 group-hover:text-slate-900")}>{label}</div>
            <div className="text-[11px] text-slate-400 font-bold tracking-wide mt-0.5">{desc}</div>
         </div>
      </div>
    </button>
  );
}

function InputField({ label, defaultValue, disabled = false, icon }: { label: string, defaultValue: string, disabled?: boolean, icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1 border-l-2 border-indigo-400">{label}</label>
      <div className="relative group">
         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 [&_svg]:w-5 [&_svg]:h-5 group-focus-within:text-indigo-500 transition-colors">
            {icon}
         </div>
         <input 
           type="text" 
           defaultValue={defaultValue} 
           disabled={disabled}
           className="w-full bg-slate-50 border border-slate-200/80 pl-11 pr-4 py-3 rounded-xl outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-800 font-bold tracking-wide disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
         />
      </div>
    </div>
  );
}

function ToggleRow({ icon, title, subtitle, checked, onChange, compact = false }: { icon: React.ReactNode, title: string, subtitle: string, checked: boolean, onChange: (c: boolean) => void, compact?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between rounded-2xl hover:bg-slate-50/80 transition-colors border border-transparent cursor-pointer group", compact ? "p-3" : "p-4 border-slate-100/50 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md")} onClick={() => onChange(!checked)}>
       <div className="flex items-center gap-4">
          <div className={cn("bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-center shrink-0", compact ? "p-2" : "p-3")}>
             {icon}
          </div>
          <div className="pr-4">
             <h4 className={cn("font-bold text-slate-800 tracking-tight", compact ? "text-sm" : "text-[15px]")}>{title}</h4>
             <p className={cn("font-medium text-slate-500 mt-0.5 leading-snug", compact ? "text-[10px]" : "text-xs")}>{subtitle}</p>
          </div>
       </div>
       <div className={cn(
         "rounded-full relative transition-colors duration-300 shrink-0 shadow-inner border border-slate-200/50",
         checked ? "bg-indigo-500 border-indigo-600/50" : "bg-slate-200",
         compact ? "w-10 h-5" : "w-14 h-7"
       )}>
          <div className={cn(
            "absolute rounded-full bg-white transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] shadow-[0_2px_4px_rgba(0,0,0,0.2)]",
            compact ? "w-3 h-3 top-0.5" : "w-5 h-5 top-0.5",
            checked ? (compact ? "left-6" : "left-8") : "left-0.5"
          )} />
       </div>
    </div>
  );
}

function SessionCard({ device, location, time, isCurrent, icon }: { device: string, location: string, time: string, isCurrent: boolean, icon: React.ReactNode }) {
   return (
      <div className={cn("flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm transition-colors")}>
         <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 shadow-inner">
            {icon}
         </div>
         <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
               <h5 className="font-bold text-slate-800 text-sm truncate">{device}</h5>
               {isCurrent && <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-md text-[10px] font-bold uppercase tracking-widest shrink-0 shadow-sm">Current</span>}
            </div>
            <p className="text-[11px] text-slate-500 font-bold tracking-wide truncate mt-0.5">{location}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{time}</p>
         </div>
      </div>
   );
}
