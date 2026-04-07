"use client";

import React, { useState } from 'react';
import {
    AlertCircle,
    Thermometer,
    Activity,
    MessageSquare,
    Send,
    CheckCircle2,
    XCircle,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const SYMPTOM_TYPES = [
    { id: 'pain', label: 'Severe Pain', icon: <AlertCircle className="w-4 h-4" />, color: 'bg-rose-500' },
    { id: 'fever', label: 'Fever/Chills', icon: <Thermometer className="w-4 h-4" />, color: 'bg-orange-500' },
    { id: 'nausea', label: 'Nausea', icon: <Activity className="w-4 h-4" />, color: 'bg-emerald-500' },
    { id: 'difficulty_breathing', label: 'Breathing Issue', icon: <Activity className="w-4 h-4" />, color: 'bg-blue-500' },
    { id: 'other', label: 'Other Note', icon: <MessageSquare className="w-4 h-4" />, color: 'bg-slate-500' },
];

export default function SymptomLogger({ onSuccess }: { onSuccess?: () => void }) {
    const { currentUser } = useAuth();
    const [selected, setSelected] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSubmit = async () => {
        if (!selected || !currentUser?.patientId) return;
        setLoading(true);
        setStatus('idle');

        try {
            const res = await fetch(`http://localhost:3001/api/patients/${currentUser.patientId}/symptoms`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('__intellicare_token')}`
                },
                body: JSON.stringify({
                    symptom_type: selected,
                    notes: notes.trim() || `Patient reported ${selected}`
                })
            });

            if (res.ok) {
                setStatus('success');
                setNotes('');
                setSelected(null);
                if (onSuccess) onSuccess();
                setTimeout(() => setStatus('idle'), 3000);
            } else {
                setStatus('error');
            }
        } catch (e) {
            console.error(e);
            setStatus('error');
        }
        setLoading(false);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase tracking-tighter">
                    <div className="p-2 bg-indigo-50 rounded-xl"><Activity className="w-5 h-5 text-indigo-500" /></div>
                    Report Symptom
                </h3>
                {status === 'success' && (
                    <div className="flex items-center gap-2 text-emerald-600 animate-in fade-in zoom-in">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Logged</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {SYMPTOM_TYPES.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => setSelected(type.id)}
                        className={cn(
                            "flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all group",
                            selected === type.id
                                ? "bg-slate-900 border-slate-900 text-white scale-[0.98] shadow-lg"
                                : "bg-slate-50 border-transparent text-slate-600 hover:border-slate-200 hover:bg-white"
                        )}
                    >
                        <div className={cn(
                            "p-2 rounded-xl transition-colors",
                            selected === type.id ? "bg-white/20" : "bg-white text-slate-400 group-hover:text-indigo-500"
                        )}>
                            {type.icon}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-center leading-tight">{type.label}</span>
                    </button>
                ))}
            </div>

            <textarea
                placeholder="Optional: Provide more details about how you feel..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-100 focus:bg-white rounded-[2rem] p-6 text-sm font-medium text-slate-700 outline-none transition-all placeholder:text-slate-400 min-h-[120px] resize-none mb-6"
            />

            <button
                disabled={!selected || loading}
                onClick={handleSubmit}
                className={cn(
                    "w-full flex items-center justify-center gap-3 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] transition-all",
                    !selected || loading
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 active:scale-[0.98]"
                )}
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                        <Send className="w-4 h-4" />
                        Submit to Care Team
                    </>
                )}
            </button>

            {status === 'error' && (
                <p className="text-rose-500 text-xs font-bold text-center mt-4 animate-shake">
                    <XCircle className="w-4 h-4 inline mr-1" /> Connection failed. Please try again.
                </p>
            )}
        </div>
    );
}
