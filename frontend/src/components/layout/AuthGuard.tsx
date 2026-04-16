"use client";

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { Shell } from './Shell';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { currentUser, login } = useAuth();
    const [selectedRole, setSelectedRole] = useState<'admin' | 'doctor' | 'nurse' | 'patient'>('admin');
    const [isLoading, setIsLoading] = useState(false);

    const handleSimulatedLogin = async (mockUser: any) => {
        setIsLoading(true);
        try {

            const res = await fetch('http://localhost:3001/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: `${mockUser.id}@intellicare.demo`, password: 'password123' })
            });
            const data = await res.json();

            login({ ...mockUser }, data.token);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans text-gray-900">
                <div className="w-full max-w-lg border border-gray-300 bg-white shadow-sm">

                    <div className="p-8">
                        <div className="text-center mb-8 border-b border-gray-200 pb-6">
                            <h2 className="text-2xl font-bold text-gray-800">Welcome to IntelliCare</h2>
                            <p className="mt-2 text-gray-600 text-sm">Please select your account type to sign in.</p>
                        </div>

                        <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden mb-8">
                            {['Admin', 'Doctor', 'Nurse', 'Patient'].map(role => (
                                <button
                                    key={role}
                                    onClick={() => setSelectedRole(role.toLowerCase() as any)}
                                    className={cn(
                                        "flex-1 py-3 text-sm font-semibold transition-colors duration-200",
                                        selectedRole === role.toLowerCase() ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
                                    )}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 min-h-[200px]">
                            {selectedRole === 'admin' && (
                                <CleanLoginOption title="System Admin" desc="Manage hospital settings and staff" onClick={() => handleSimulatedLogin({ id: 'a1', name: 'Super Admin', role: 'admin' })} loading={isLoading} />
                            )}
                            {selectedRole === 'doctor' && (
                                <>
                                    <CleanLoginOption title="Dr. Sarah Connor" desc="Chief Cardiologist" onClick={() => handleSimulatedLogin({ id: 'd1', name: 'Dr. Sarah Connor', role: 'doctor' })} loading={isLoading} />
                                    <CleanLoginOption title="Dr. Vikram Nair" desc="Attending Physician" onClick={() => handleSimulatedLogin({ id: 'd2', name: 'Dr. Vikram Nair', role: 'doctor' })} loading={isLoading} />
                                </>
                            )}
                            {selectedRole === 'nurse' && (
                                <CleanLoginOption title="Nurse Clara" desc="Ward Nurse" onClick={() => handleSimulatedLogin({ id: 'n1', name: 'Nurse Clara', role: 'nurse' })} loading={isLoading} />
                            )}
                            {selectedRole === 'patient' && (
                                <>
                                    <CleanLoginOption title="Rajesh Kumar" desc="Patient" onClick={() => handleSimulatedLogin({ id: 'p1', name: 'Rajesh Kumar', role: 'patient', patientId: '1' })} loading={isLoading} />
                                    <CleanLoginOption title="Sunita Devi" desc="Patient" onClick={() => handleSimulatedLogin({ id: 'p2', name: 'Sunita Devi', role: 'patient', patientId: '2' })} loading={isLoading} />
                                </>
                            )}
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
                            {isLoading ? "Signing in... Please wait." : "Demo system is active."}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Shell>
            {children}
        </Shell>
    );
}

function CleanLoginOption({ title, desc, onClick, loading }: any) {
    return (
        <button
            onClick={loading ? undefined : onClick}
            disabled={loading}
            className={cn(
                "w-full px-5 py-4 border border-gray-300 rounded-lg bg-gray-50 hover:bg-white hover:border-blue-500 hover:shadow-sm transition-all flex items-center text-left",
                loading ? "opacity-50 pointer-events-none" : ""
            )}
        >
            <div className="flex-1">
                <p className="font-bold text-gray-900 text-base">{title}</p>
                <p className="text-sm text-gray-500 mt-1">{desc}</p>
            </div>
            <div className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
                {loading ? "Please wait..." : "Sign In"}
            </div>
        </button>
    )
}
