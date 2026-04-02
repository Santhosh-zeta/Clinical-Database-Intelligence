"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import {
    Users,
    Search,
    Plus,
    ShieldCheck,
    UserCircle,
    MoreVertical,
    Mail,
    Phone,
    Building2,
    Trash2,
    Edit2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Doctor {
    id: number;
    name: string;
    email: string;
    role: string;
    specialization: string;
    phone: string;
    is_active: boolean;
    department_name: string;
}

export default function UsersManagementPage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Redirect if not admin
    useEffect(() => {
        if (currentUser && currentUser.role !== 'admin') {
            router.push('/');
        }
    }, [currentUser, router]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('http://localhost:3001/api/doctors');
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data.data);
                }
            } catch (err) {
                console.error('Failed to fetch staff:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 w-full animate-in fade-in duration-500">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Staff Management</h1>
                    <p className="text-slate-500 font-medium">Manage clinical staff, access controls, and department assignments.</p>
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                >
                    <Plus size={20} />
                    Add Medical Staff
                </button>
            </div>

            <div className="flex gap-3 w-full">
                <div className="flex items-center bg-white border border-slate-200 shadow-sm rounded-2xl px-4 py-2.5 flex-1 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                    <Search className="w-5 h-5 text-slate-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Search by name, email, specialization..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-48 bg-white border border-slate-100 rounded-3xl animate-pulse shadow-sm" />
                    ))
                ) : (
                    filteredUsers.map(user => (
                        <StaffCard key={user.id} user={user} />
                    ))
                )}

                {!loading && filteredUsers.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No staff matches your search criteria.</p>
                    </div>
                )}
            </div>

            {/* Add User Mock Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 border border-slate-200 animate-in zoom-in-95 duration-300">
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">New Medical Staff</h3>
                        <p className="text-slate-500 text-sm mb-8">Register a new doctor or nurse to the hospital intelligence system.</p>

                        <div className="space-y-4">
                            <Input label="Full Name" placeholder="e.g. Dr. John Doe" />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Role" placeholder="doctor / nurse" />
                                <Input label="Department" placeholder="Cardiology" />
                            </div>
                            <Input label="Professional Email" placeholder="staff@intellicare.com" />
                        </div>

                        <div className="flex gap-3 mt-10">
                            <button onClick={() => setIsAddModalOpen(false)} className="flex-1 px-6 py-3 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                            <button onClick={() => setIsAddModalOpen(false)} className="flex-1 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Create Account</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StaffCard({ user }: { user: Doctor }) {
    return (
        <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all relative group">
            <div className="flex justify-between items-start mb-6">
                <div className={cn(
                    "p-3 rounded-2xl border transition-colors",
                    user.role === 'admin' ? "bg-purple-50 border-purple-100 text-purple-600" :
                        user.role === 'doctor' ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
                            "bg-emerald-50 border-emerald-100 text-emerald-600"
                )}>
                    {user.role === 'admin' ? <ShieldCheck size={24} /> : <UserCircle size={24} />}
                </div>
                <button className="text-slate-300 hover:text-slate-600 p-1 rounded-lg transition-colors">
                    <MoreVertical size={20} />
                </button>
            </div>

            <div className="mb-6">
                <h3 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{user.name}</h3>
                <p className="text-indigo-500 font-bold text-xs uppercase tracking-widest mt-1 opacity-80">{user.role}</p>
            </div>

            <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-slate-500">
                    <Building2 size={16} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">{user.department_name || 'N/A'} • {user.specialization || 'General'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-500">
                    <Mail size={16} className="text-slate-400" />
                    <span className="text-xs font-medium truncate">{user.email}</span>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                    <button className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"><Edit2 size={16} /></button>
                    <button className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"><Trash2 size={16} /></button>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVE
                </div>
            </div>
        </div>
    );
}

function Input({ label, ...props }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <input className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all text-sm font-medium text-slate-700" {...props} />
        </div>
    )
}
