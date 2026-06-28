"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Search,
  Settings,
  Users,
  BedDouble,
  LayoutDashboard,
  LogOut,
  CheckCircle,
  Loader2,
  BellOff,
  Database,
  HeartPulse,
  Stethoscope,
  Clock,
  Calendar,
  ClipboardList,
  BookOpen,
  Menu,
  X,
  Ambulance
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const API = `https://clinical-database-intelligence.onrender.com/api`;
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const ah = () => ({ Authorization: `Bearer ${getToken()}` });

interface Notification {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
  patient_name?: string;
  notification_type?: string;
}

import { useRealtime } from '../../contexts/RealtimeContext';

export function Shell({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, hasPermission } = useAuth();
  const { socket } = useRealtime();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [criticalAlertCount, setCriticalAlertCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleNewAlert = (payload: any) => {
      if (payload.severity === 'critical') {
        setCriticalAlertCount(prev => prev + 1);
      }
    };

    const handleNewNotif = (payload: any) => {
      setNotifications(prev => [payload, ...prev].slice(0, 20));
    };

    socket.on('new-alert', handleNewAlert);
    socket.on('new-notification', handleNewNotif);

    return () => {
      socket.off('new-alert', handleNewAlert);
      socket.off('new-notification', handleNewNotif);
    };
  }, [socket]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || currentUser.role === 'patient') return;
    setNotifLoading(true);
    try {
      const [res, alRes] = await Promise.all([
        fetch(`${API}/notifications?limit=20`, { headers: ah() }),
        fetch(`${API}/alerts`, { headers: ah() })
      ]);
      if (res.status === 401 || alRes.status === 401) {
        logout();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
      if (alRes.ok) {
        const adata = await alRes.json();
        const activeAlerts = (adata.data || []).filter((a: any) => !a.is_acknowledged && a.status === 'active' && a.severity === 'critical');
        setCriticalAlertCount(activeAlerts.length);
      }
    } catch (_) { }
    setNotifLoading(false);
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 5000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    if (isNotifOpen) fetchNotifications();
  }, [isNotifOpen, fetchNotifications]);

  const markRead = async (notifId: number) => {
    try {
      await fetch(`${API}/notifications/${notifId}/read`, { method: 'PUT', headers: ah() });
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      );
    } catch (_) { }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => markRead(n.id)));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const totalBadgeCount = unreadCount + criticalAlertCount;

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans selection:bg-indigo-500/20">

      <aside className="w-20 lg:w-64 bg-slate-50/80 backdrop-blur-sm border-r border-slate-200 flex flex-col relative z-20">
        <Link href="/dashboard" className="h-16 flex items-center justify-center lg:justify-start lg:px-4 border-b border-slate-200 bg-white shadow-sm rounded-xl hover:bg-gray-400">
          <span className="hidden lg:block font-sans font-bold text-lg uppercase tracking-widest text-slate-800">INTELLICARE</span>
          <span className="lg:hidden font-sans font-bold text-xl text-slate-800">IC</span>
        </Link>

        <nav className="flex-1 py-4 flex flex-col gap-0 px-2 overflow-y-auto">

          {(hasPermission('VIEW_DASHBOARD') || currentUser?.role) && (
            <NavItem
              href="/dashboard"
              icon={<LayoutDashboard size={20} />}
              label="Home"
              active={pathname === '/' || pathname === '/dashboard'}
            />
          )}

          {(['admin', 'ultra_admin', 'hospital_admin'].includes(currentUser?.role?.toLowerCase() || '')) && (
            <>
              <NavItem href="/dashboard?tab=staff" icon={<Users size={20} />} label="Staff Members" active={pathname === '/dashboard' && tabParam === 'staff'} />
              <NavItem href="/dashboard?tab=patients" icon={<Users size={20} />} label="Patients" active={(pathname === '/dashboard' && tabParam === 'patients') || pathname.startsWith('/patients')} />
              <NavItem href="/dashboard?tab=appointments" icon={<Calendar size={20} />} label="Appointments" active={pathname === '/dashboard' && tabParam === 'appointments'} />
              <NavItem href="/dashboard?tab=ambulances" icon={<Ambulance size={20} />} label="Ambulances" active={pathname === '/dashboard' && tabParam === 'ambulances'} />
              <NavItem href="/dashboard?tab=labs" icon={<Database size={20} />} label="Lab Tests" active={pathname === '/dashboard' && tabParam === 'labs'} />
              <NavItem href="/dashboard?tab=billing" icon={<BookOpen size={20} />} label="Billing & Money" active={pathname === '/dashboard' && tabParam === 'billing'} />
              <NavItem href="/dashboard?tab=icu" icon={<BedDouble size={20} />} label="Beds & Rooms" active={pathname === '/dashboard' && tabParam === 'icu'} />
              <NavItem href="/dashboard?tab=alerts" icon={<AlertTriangle size={20} />} label="Alerts" active={pathname === '/dashboard' && tabParam === 'alerts'} />
              <NavItem href="/dashboard?tab=logs" icon={<Database size={20} />} label="History Logs" active={pathname === '/dashboard' && tabParam === 'logs'} />
            </>
          )}

          {(currentUser?.role?.toLowerCase() === 'doctor' || currentUser?.role?.toLowerCase() === 'nurse') && (
            <>
              <div className="h-px bg-slate-800 mx-1 my-2" />
              <p className="px-3 text-[10px] font-sans font-bold text-slate-500 uppercase mb-1">For Staff</p>

              <NavItem href="/dashboard?tab=patients" icon={<Users size={20} />} label="Patients" active={(pathname === '/dashboard' && tabParam === 'patients') || pathname.startsWith('/patients')} />
              <NavItem href="/dashboard?tab=appointments" icon={<Calendar size={20} />} label="Daily Rounds" active={pathname === '/dashboard' && tabParam === 'appointments'} />
              <NavItem href="/dashboard?tab=vitals" icon={<Activity size={20} />} label="Vitals Monitor" active={pathname === '/dashboard' && tabParam === 'vitals'} />
              <NavItem href="/dashboard?tab=labs" icon={<Database size={20} />} label="Lab Reports" active={pathname === '/dashboard' && tabParam === 'labs'} />
              <NavItem href="/dashboard?tab=icu" icon={<BedDouble size={20} />} label="Beds & Rooms" active={pathname === '/dashboard' && tabParam === 'icu'} />

              {currentUser?.role?.toLowerCase() === 'doctor' && (
                <>
                  <NavItem href="/dashboard?tab=consults" icon={<Stethoscope size={20} />} label="Referral Hub" active={pathname === '/dashboard' && tabParam === 'consults'} />
                  <NavItem href="/dashboard?tab=discharge" icon={<HeartPulse size={20} />} label="Discharges" active={pathname === '/dashboard' && tabParam === 'discharge'} />
                </>
              )}

              {currentUser?.role?.toLowerCase() === 'nurse' && (
                <>
                  <NavItem href="/dashboard?tab=meds" icon={<ClipboardList size={20} />} label="Medicines" active={pathname === '/dashboard' && tabParam === 'meds'} />
                  <NavItem href="/dashboard?tab=handover" icon={<Users size={20} />} label="Shift Change" active={pathname === '/dashboard' && tabParam === 'handover'} />
                </>
              )}

              <NavItem href="/dashboard?tab=billing" icon={<BookOpen size={20} />} label="Billing" active={pathname === '/dashboard' && tabParam === 'billing'} />
              <NavItem href="/dashboard?tab=alerts" icon={<AlertTriangle size={20} />} label="Alerts" active={pathname === '/dashboard' && tabParam === 'alerts'} />
            </>
          )}

          {currentUser?.role?.toLowerCase() === 'patient' && (
            <>
              <div className="h-px bg-slate-800 mx-1 my-2" />
              <p className="px-3 text-[10px] font-sans font-bold text-slate-500 uppercase mb-1">My Care Info</p>
              <NavItem href="/dashboard?tab=vitals" icon={<Activity size={20} />} label="My Body Vitals" active={pathname === '/dashboard' && tabParam === 'vitals'} />
              <NavItem href="/dashboard?tab=labs" icon={<Database size={20} />} label="My Lab Tests" active={pathname === '/dashboard' && tabParam === 'labs'} />
              <NavItem href="/dashboard?tab=meds" icon={<ClipboardList size={20} />} label="My Medicines" active={pathname === '/dashboard' && tabParam === 'meds'} />
              <NavItem href="/dashboard?tab=docs" icon={<BookOpen size={20} />} label="My Past Visits" active={pathname === '/dashboard' && tabParam === 'docs'} />
              <NavItem href="/dashboard?tab=appointments" icon={<Calendar size={20} />} label="My Appointments" active={pathname === '/dashboard' && tabParam === 'appointments'} />
              <NavItem href="/dashboard?tab=billing" icon={<Database size={20} />} label="My Bills" active={pathname === '/dashboard' && tabParam === 'billing'} />
            </>
          )}

        </nav>

        <div className="p-2 border-t border-slate-200 flex flex-col gap-1">
          {(['admin', 'ultra_admin', 'hospital_admin'].includes(currentUser?.role || '')) ? (
            <NavItem href="/dashboard?tab=settings" icon={<Settings size={16} />} label="Settings" active={pathname === '/dashboard' && tabParam === 'settings'} />
          ) : null}
          <button onClick={logout} className="w-full flex items-center justify-center lg:justify-start gap-2 px-2 py-1.5 border border-slate-200 shadow-sm rounded-xl bg-rose-600 rounded-xl shadow-sm text-white hover:bg-rose-700 font-sans text-xs uppercase font-bold active:translate-y-px">
            <LogOut size={14} />
            <span className="hidden lg:block text-xs">LOG OUT</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 relative z-10">

        <header className="h-16 bg-white shadow-sm rounded-xl border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-10 flex-shrink-0">

          <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-xl px-2 py-1 w-64 lg:w-96 shadow-inner rounded-xl">
            <Search className="w-4 h-4 text-slate-800 mr-2 opacity-50" />
            <input
              type="text"
              placeholder={currentUser?.role === 'patient' ? "SEARCH..." : "SEARCH FOR PATIENTS..."}
              className="bg-transparent border-none outline-none font-sans text-xs w-full text-slate-800 placeholder:text-slate-400 uppercase"
            />
          </div>

          <div className="flex items-center gap-4">
            {currentUser?.role !== 'patient' && (
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={cn(
                  "relative px-3 py-1 font-sans font-bold text-xs uppercase border border-slate-200 shadow-sm rounded-xl",
                  isNotifOpen
                    ? "bg-slate-800 text-white"
                    : "bg-slate-50/80 backdrop-blur-sm text-slate-800 shadow-md rounded-xl hover:bg-white shadow-sm rounded-xl active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                )}
              >
                NOTIFICATIONS
                {totalBadgeCount > 0 && (
                  <span className="ml-2 bg-rose-500 rounded-xl shadow-sm text-white px-1 border border-slate-200 shadow-sm rounded-xl">
                    {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                  </span>
                )}
              </button>
            )}

            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="font-sans text-xs font-bold text-slate-800 uppercase">{currentUser?.name}</p>
                <p className="font-sans text-[10px] text-slate-600 mt-0.5 uppercase">[{currentUser?.role}]</p>
              </div>
              <div className="w-8 h-8 bg-slate-800 flex items-center justify-center border border-gray-500 text-white font-sans font-bold text-sm">
                {currentUser?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        { }
        <div className="flex-1 overflow-auto scrollbar-hide relative bg-transparent p-4 md:p-6 lg:p-8">
          {children}

          <AnimatePresence>
            {isNotifOpen && currentUser?.role !== 'patient' && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsNotifOpen(false)}
                  className="fixed inset-0 bg-slate-800/50 z-40"
                />

                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  transition={{ type: "tween", duration: 0.15 }}
                  className="fixed right-0 top-0 h-full w-80 sm:w-96 bg-slate-50/80 backdrop-blur-sm z-50 flex flex-col border-l-4 border-indigo-500 rounded-l-2xl shadow-lg"
                >

                  <div className="p-3 border-b border-slate-200 bg-white shadow-sm rounded-xl flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-sans font-bold text-slate-800 flex items-center gap-2 text-sm uppercase">
                      NOTIFICATIONS
                      {unreadCount > 0 && (
                        <span className="ml-1 px-1 py-0 bg-rose-500 rounded-xl shadow-sm text-white border border-slate-200 shadow-sm rounded-xl text-xs font-bold">
                          {unreadCount} NEW
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="font-sans text-[10px] text-slate-800 hover:bg-slate-800 hover:text-white border border-slate-200 shadow-sm rounded-xl px-2 py-1 uppercase"
                        >
                          ACK ALL
                        </button>
                      )}
                      <button onClick={() => setIsNotifOpen(false)} className="font-sans text-xs text-slate-800 border border-slate-200 shadow-sm rounded-xl bg-white hover:bg-white shadow-sm rounded-xl px-2 py-1">[X]</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 custom-scrollbar bg-slate-50">
                    {notifLoading && notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-slate-800 gap-2 font-sans text-sm font-bold uppercase">
                        INITIALIZING RECEIVER...
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-800 gap-2 py-16 font-sans text-sm uppercase">
                        <p className="font-bold">SYSTEM OK</p>
                        <p className="text-[10px]">No unread alerts in the event log.</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <motion.div
                          layout
                          key={notif.id}
                          className={cn(
                            'p-2 border border-slate-200 shadow-sm rounded-xl font-sans text-[10px] break-words uppercase flex items-center justify-between',
                            notif.is_read
                              ? 'bg-white shadow-sm rounded-xl text-slate-600'
                              : 'bg-white text-slate-800 border-l-4 border-l-blue-600'
                          )}
                          onClick={() => !notif.is_read && markRead(notif.id)}
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            {notif.patient_name && (
                              <p className="font-bold border-b border-dashed border-slate-200 mb-1 inline-block text-blue-800">REF: {notif.patient_name}</p>
                            )}
                            <p className="leading-tight">{notif.message}</p>
                            <p className="text-[9px] text-slate-400 mt-1">
                              TS: {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <button
                              onClick={e => { e.stopPropagation(); markRead(notif.id); }}
                              className="bg-slate-800 text-white px-2 py-1 font-bold text-[9px] shrink-0"
                            >
                              DISMISS
                            </button>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>

                  { }
                  {criticalAlertCount > 0 && (
                    <div className="p-2 border-t border-slate-200 bg-rose-50">
                      <Link
                        href="/alerts"
                        onClick={() => setIsNotifOpen(false)}
                        className="flex items-center justify-between text-rose-700 font-sans font-bold text-xs uppercase"
                      >
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 animate-pulse" />
                          {criticalAlertCount} ACTIVE CRITICAL ALERTS
                        </span>
                        <span className="bg-rose-700 text-white px-1 border border-slate-200 shadow-sm rounded-xl">VIEW &gt;&gt;</span>
                      </Link>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, href, active = false }: { icon: React.ReactNode; label: string; href: string; active?: boolean }) {
  return (
    <Link href={href} className={cn(
      "w-full flex items-center lg:items-center justify-center lg:justify-start gap-2 px-2 py-2 border-b border-slate-200 rounded-xl font-sans text-xs uppercase font-bold transition-none",
      active
        ? "bg-blue-600 rounded-xl shadow-sm text-white"
        : "text-slate-800 hover:bg-blue-200 hover:text-slate-800 bg-white"
    )}>
      <span className={cn("hidden lg:inline", active ? "opacity-100" : "opacity-0")}>&gt;</span>
      <div className={cn("shrink-0", active ? "text-white" : "text-slate-800")}>
        {icon}
      </div>
      <span className="hidden lg:block leading-none tracking-tight">{label}</span>
    </Link>
  );
}
