"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

const API = `https://clinical-database-intelligence.onrender.com/api`;
const getToken = () => localStorage.getItem('__intellicare_token') || '';
const authHeader = () => ({
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
});

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

const DEFAULT_FORM = { name: '', email: '', password: '', role: 'doctor', specialization: '', phone: '' };

export default function UsersManagementPage() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<Doctor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        if (currentUser?.role?.toLowerCase() !== 'admin') {
            router.push('/');
        }
    }, [currentUser, router]);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/admin/staff`, { headers: authHeader() });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch staff:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) {
            setCreateError('Name, email, and password are required.');
            return;
        }
        setIsCreating(true);
        setCreateError('');
        try {
            const res = await fetch(`${API}/admin/staff`, {
                method: 'POST',
                headers: authHeader(),
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                setCreateError(data.error || data.message || 'Failed to create staff member.');
            } else {
                setIsAddModalOpen(false);
                setForm(DEFAULT_FORM);
                await fetchStaff();
            }
        } catch (err) {
            setCreateError('Network error. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUserId) return;
        setIsCreating(true);
        setCreateError('');
        try {
            const res = await fetch(`${API}/admin/staff/${editingUserId}`, {
                method: 'PATCH',
                headers: authHeader(),
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                setCreateError(data.error || data.message || 'Failed to update staff member.');
            } else {
                setIsEditModalOpen(false);
                setEditingUserId(null);
                setForm(DEFAULT_FORM);
                await fetchStaff();
            }
        } catch (err) {
            setCreateError('Network error. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteStaff = async (id: number) => {
        if (!confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) return;
        try {
            const res = await fetch(`${API}/admin/staff/${id}`, {
                method: 'DELETE',
                headers: authHeader(),
            });
            if (res.ok) {
                await fetchStaff();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete staff member.');
            }
        } catch (err) {
            alert('Network error. Please try again.');
        }
    };

    const openEditModal = (user: Doctor) => {
        setEditingUserId(user.id);
        setForm({
            name: user.name,
            email: user.email,
            password: '', // Don't show password
            role: user.role,
            specialization: user.specialization || '',
            phone: user.phone || '',
            is_active: user.is_active
        } as any);

        setCreateError('');
        setIsEditModalOpen(true);
    };

    return (
        <div className="max-w-[1200px] mx-auto p-4 font-sans text-slate-800">

            <div className="border-b-2 border-blue-200 pb-2 mb-6 flex justify-between items-end">
                <h1 className="text-2xl font-bold text-blue-900 m-0">Staff & Access Management</h1>
                <button
                    onClick={() => { setIsAddModalOpen(true); setCreateError(''); setForm(DEFAULT_FORM); }}
                    className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 px-3 py-1 text-sm font-bold shadow-sm hover:bg-white shadow-sm rounded-xl active:bg-gray-400"
                >
                    + Add New Medical Staff
                </button>
            </div>

            <div className="mb-4 bg-slate-50 border border-slate-200 p-2 shadow-sm flex gap-2 items-center">
                <span className="text-sm font-bold ml-2">Search Directory:</span>
                <input
                    type="text"
                    className="border border-slate-200 px-2 py-1 flex-1 max-w-sm text-sm"
                    placeholder="Enter name, email, or spec..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white border border-slate-200 shadow-sm">
                <div className="bg-gradient-to-b from-gray-100 to-gray-200 border-b border-slate-200 p-2 font-bold text-slate-700 text-sm">
                    Medical Staff Directory
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-sm">
                                <th className="p-2 border-r border-slate-100">Name</th>
                                <th className="p-2 border-r border-slate-100">Role</th>
                                <th className="p-2 border-r border-slate-100">Department / Spec</th>
                                <th className="p-2 border-r border-slate-100">Email</th>
                                <th className="p-2 border-r border-slate-100">Phone</th>
                                <th className="p-2 border-r border-slate-100 text-center">Status</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-4 text-center italic text-slate-500">Loading directory...</td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-4 text-center italic text-slate-500">No staff found matching criteria.</td>
                                </tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="border-b border-slate-100 hover:bg-yellow-50 text-sm">
                                        <td className="p-2 border-r border-slate-100 font-bold">{user.name}</td>
                                        <td className="p-2 border-r border-slate-100 uppercase">{user.role}</td>
                                        <td className="p-2 border-r border-slate-100">{user.department_name || 'General'} - {user.specialization || 'N/A'}</td>
                                        <td className="p-2 border-r border-slate-100">
                                            <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">{user.email}</a>
                                        </td>
                                        <td className="p-2 border-r border-slate-100">{user.phone || '—'}</td>
                                        <td className="p-2 border-r border-slate-100 text-center font-bold">
                                            {user.is_active ? <span className="text-green-700">ACTIVE</span> : <span className="text-rose-600">INACTIVE</span>}
                                        </td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => openEditModal(user)} className="text-blue-600 hover:underline mx-1 font-bold">Edit</button>
                                            <button onClick={() => handleDeleteStaff(user.id)} className="text-red-600 hover:underline mx-1 font-bold">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            { }
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75">
                    <div className="bg-white border-2 border-gray-600 shadow-xl w-full max-w-lg font-sans">

                        { }
                        <div className="bg-blue-600 rounded-xl shadow-sm text-white font-bold p-2 flex justify-between items-center text-sm">
                            <span>Add New Medical Staff</span>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="bg-white shadow-sm rounded-xl border border-gray-500 text-slate-800 px-2 hover:bg-gray-400 font-bold"
                            >
                                X
                            </button>
                        </div>

                        <div className="p-4">
                            <p className="text-sm font-bold mb-4 border-b border-slate-100 pb-2">Enter the details for the new personnel below.</p>

                            <form onSubmit={handleCreateStaff} className="space-y-3 text-sm">
                                <div className="flex flex-col">
                                    <label className="font-bold mb-1">Full Name *</label>
                                    <input required type="text" className="border border-slate-200 p-1 bg-white" placeholder="Dr. John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col w-1/2">
                                        <label className="font-bold mb-1">Role *</label>
                                        <select className="border border-slate-200 p-1 bg-white" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                            <option value="doctor">Doctor</option>
                                            <option value="nurse">Nurse</option>
                                            <option value="admin">System Admin</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col w-1/2">
                                        <label className="font-bold mb-1">Specialization</label>
                                        <input type="text" className="border border-slate-200 p-1 bg-white" placeholder="e.g. Cardiology" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-bold mb-1">Email Address *</label>
                                    <input required type="email" className="border border-slate-200 p-1 bg-white" placeholder="user@intellicare.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-bold mb-1">Temporary Password *</label>
                                    <input required type="password" className="border border-slate-200 p-1 bg-white" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-bold mb-1">Phone Number</label>
                                    <input type="text" className="border border-slate-200 p-1 bg-white" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>

                                {createError && (
                                    <div className="text-rose-600 font-bold bg-rose-50 border border-red-400 p-2 mt-2">
                                        Error: {createError}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 px-4 py-1 text-sm font-bold shadow-sm hover:bg-white shadow-sm rounded-xl active:bg-gray-400 text-slate-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 px-4 py-1 text-sm font-bold shadow-sm hover:bg-white shadow-sm rounded-xl active:bg-gray-400 text-slate-800 ml-2"
                                    >
                                        {isCreating ? 'Processing...' : 'Save Record'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75">
                    <div className="bg-white border-2 border-gray-600 shadow-xl w-full max-w-lg font-sans">
                        <div className="bg-blue-600 rounded-xl shadow-sm text-white font-bold p-2 flex justify-between items-center text-sm">
                            <span>Edit Medical Staff</span>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="bg-white shadow-sm rounded-xl border border-gray-500 text-slate-800 px-2 hover:bg-gray-400 font-bold"
                            >
                                X
                            </button>
                        </div>

                        <div className="p-4">
                            <form onSubmit={handleUpdateStaff} className="space-y-3 text-sm">
                                <div className="flex flex-col">
                                    <label className="font-bold mb-1">Full Name *</label>
                                    <input required type="text" className="border border-slate-200 p-1 bg-white" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex flex-col w-1/2">
                                        <label className="font-bold mb-1">Role *</label>
                                        <select className="border border-slate-200 p-1 bg-white" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                            <option value="doctor">Doctor</option>
                                            <option value="nurse">Nurse</option>
                                            <option value="admin">System Admin</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col w-1/2">
                                        <label className="font-bold mb-1">Specialization</label>
                                        <input type="text" className="border border-slate-200 p-1 bg-white" value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-bold mb-1">Email Address *</label>
                                    <input required type="email" className="border border-slate-200 p-1 bg-white" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>
                                <div className="flex flex-col">
                                    <label className="font-bold mb-1">Phone Number</label>
                                    <input type="text" className="border border-slate-200 p-1 bg-white" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                                </div>

                                <div className="flex items-center gap-2 py-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={(form as any).is_active}
                                        onChange={e => setForm({ ...form, is_active: e.target.checked } as any)}
                                    />
                                    <label htmlFor="is_active" className="font-bold">Account Active Status</label>
                                </div>

                                {createError && (
                                    <div className="text-rose-600 font-bold bg-rose-50 border border-red-400 p-2 mt-2">
                                        Error: {createError}
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 px-4 py-1 text-sm font-bold shadow-sm hover:bg-white shadow-sm rounded-xl active:bg-gray-400 text-slate-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isCreating}
                                        className="bg-slate-50/80 backdrop-blur-sm border border-slate-200 px-4 py-1 text-sm font-bold shadow-sm hover:bg-white shadow-sm rounded-xl active:bg-gray-400 text-slate-800 ml-2"
                                    >
                                        {isCreating ? 'Saving...' : 'Update Record'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}
