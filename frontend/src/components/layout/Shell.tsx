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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const API = 'http://localhost:3001/api';
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

export function Shell({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, hasPermission } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const pathname = usePathname();

  // ── Real Notifications ─────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  const [criticalAlertCount, setCriticalAlertCount] = useState(0);

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

  // Fetch on open + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 5000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Fetch fresh when dropdown opens
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

      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200/80 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col transition-all duration-300 relative z-20">
        <Link href="/" className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
          <div className="p-1.5 bg-indigo-50 rounded-xl mr-3 hidden lg:block border border-indigo-100/50">
            <Activity className="w-6 h-6 text-indigo-500 shrink-0" />
          </div>
          <Activity className="w-8 h-8 text-indigo-500 shrink-0 lg:hidden" />
          <span className="hidden lg:block font-bold text-xl tracking-tight text-slate-900">IntelliCare</span>
        </Link>

        <nav className="flex-1 py-6 flex flex-col gap-1.5 px-3">
          {/* Main Entry Point (Dashboard) */}
          {(hasPermission('VIEW_DASHBOARD') || currentUser?.role) && (
            <NavItem
              href="/"
              icon={<LayoutDashboard size={20} />}
              label={
                ['admin', 'hospital_admin', 'ultra_admin'].includes(currentUser?.role || '') ? 'Command Center' :
                  currentUser?.role === 'doctor' ? 'Care Overview' :
                    currentUser?.role === 'nurse' ? 'Ward Summary' :
                      'Recovery Hub'
              }
              active={pathname === '/'}
            />
          )}

          {/* Administrative Section */}
          {(['admin', 'ultra_admin'].includes(currentUser?.role || '')) && (
            <NavItem href="/users" icon={<Users size={20} />} label="Staff Registry" active={pathname === '/users'} />
          )}

          {/* Clinical Workspace */}
          {(currentUser?.role === 'doctor' || currentUser?.role === 'nurse' || ['admin', 'hospital_admin'].includes(currentUser?.role || '')) && (
            <>
              <NavItem href="/patients" icon={<Stethoscope size={20} />} label="Patient Directory" active={pathname === '/patients'} />
              <NavItem href="/vitals" icon={<Activity size={20} />} label="Continuous Monitoring" active={pathname === '/vitals'} />
              <NavItem href="/icu" icon={<BedDouble size={20} />} label="ICU & Bed Status" active={pathname === '/icu'} />
            </>
          )}

          {/* Incident Management */}
          {(currentUser?.role !== 'patient') && (
            <NavItem href="/alerts" icon={<AlertTriangle size={20} />} label="Alert Management" active={pathname === '/alerts'} />
          )}

          {/* Audit Section */}
          {(['admin', 'ultra_admin', 'hospital_admin'].includes(currentUser?.role || '')) && (
            <NavItem href="/logs" icon={<Database size={20} />} label="Audit Trail" active={pathname === '/logs'} />
          )}

          {/* Patient Self-Care */}
          {currentUser?.role === 'patient' && (
            <NavItem href="/my-vitals" icon={<HeartPulse size={20} />} label="Live Telemetry" active={pathname === '/my-vitals'} />
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-1">
          {hasPermission('MANAGE_SETTINGS') || ['admin', 'ultra_admin', 'hospital_admin', 'doctor'].includes(currentUser?.role || '') ? (
            <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" active={pathname === '/settings'} />
          ) : null}
          <button onClick={logout} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 text-rose-500 hover:bg-rose-50 font-medium">
            <LogOut size={20} />
            <span className="hidden lg:block text-sm leading-none">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">

        {/* Top Navbar */}
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-10 flex-shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.01)]">

          <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-full px-4 py-1.5 w-64 lg:w-96 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder={currentUser?.role === 'patient' ? "Search..." : "Search patients, wards..."}
              className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-4">
            {currentUser?.role !== 'patient' && (
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={cn(
                  "relative p-2.5 rounded-full transition-all focus:outline-none",
                  isNotifOpen
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-white border border-slate-200 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 hover:shadow-md"
                )}
              >
                <Bell className="w-5 h-5" />
                {totalBadgeCount > 0 && (
                  <>
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white px-0.5">
                      {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                    </span>
                  </>
                )}
              </button>
            )}

            <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800 leading-none">{currentUser?.name}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">{currentUser?.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 text-indigo-600 font-bold">
                {currentUser?.name?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto scrollbar-hide relative bg-transparent p-4 md:p-6 lg:p-8">
          {children}

          {/* ── Notifications Dropdown ──────────────────────────────────── */}
          <AnimatePresence>
            {isNotifOpen && currentUser?.role !== 'patient' && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsNotifOpen(false)}
                  className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
                />

                <motion.div
                  initial={{ x: 400, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 400, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed right-0 top-0 h-full w-80 sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
                >
                  {/* Header */}
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur-xl sticky top-0 z-10">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                      <div className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-500">
                        <Bell className="w-5 h-5" />
                      </div>
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-rose-100 text-rose-600 border border-rose-200 text-xs font-extrabold rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <button onClick={() => setIsNotifOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors">✕</button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 custom-scrollbar bg-slate-50/50">
                    {notifLoading && notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <p className="text-sm font-medium">Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-16">
                        <BellOff className="w-12 h-12 opacity-30" />
                        <p className="font-medium text-slate-500">No notifications yet.</p>
                        <p className="text-xs text-slate-400 text-center px-4">Notifications appear here when alerts, admissions, or prescriptions are created.</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <motion.div
                          layout
                          key={notif.id}
                          className={cn(
                            'p-4 rounded-2xl border flex items-start gap-3 transition-all cursor-pointer',
                            notif.is_read
                              ? 'bg-white border-slate-100 opacity-60'
                              : 'bg-white border-indigo-100 shadow-sm shadow-indigo-50'
                          )}
                          onClick={() => !notif.is_read && markRead(notif.id)}
                        >
                          <div className={cn(
                            'p-2 rounded-xl mt-0.5 shrink-0',
                            notif.is_read ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-500'
                          )}>
                            {notif.is_read
                              ? <CheckCircle className="w-4 h-4" />
                              : <Bell className="w-4 h-4" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            {!notif.is_read && (
                              <span className="inline-block w-2 h-2 bg-indigo-500 rounded-full mb-1 mr-1 align-middle" />
                            )}
                            {notif.patient_name && (
                              <p className="text-xs font-bold text-indigo-600 mb-0.5">{notif.patient_name}</p>
                            )}
                            <p className="text-sm text-slate-700 font-medium leading-snug">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <button
                              onClick={e => { e.stopPropagation(); markRead(notif.id); }}
                              className="text-[10px] px-2 py-1 bg-white hover:bg-slate-50 text-slate-500 rounded-full border border-slate-200 shadow-sm font-medium shrink-0 ml-auto mt-0.5"
                            >
                              Dismiss
                            </button>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {/* Critical alerts summary at the bottom */}
                  {criticalAlertCount > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-rose-50">
                      <Link
                        href="/alerts"
                        onClick={() => setIsNotifOpen(false)}
                        className="flex items-center justify-between text-rose-700 font-bold text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 animate-pulse" />
                          {criticalAlertCount} unacknowledged critical alert{criticalAlertCount > 1 ? 's' : ''}
                        </span>
                        <span className="text-xs bg-rose-600 text-white px-2.5 py-1 rounded-full">View →</span>
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
      "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 relative group font-medium",
      active
        ? "bg-indigo-50/80 text-indigo-700 shadow-sm border border-indigo-100/50"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent"
    )}>
      <div className={cn("transition-colors", active ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600")}>
        {icon}
      </div>
      <span className="hidden lg:block text-sm leading-none">{label}</span>
      {active && <motion.div layoutId="nav-indicator-light" className="hidden lg:block absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.4)]" />}
    </Link>
  );
}
