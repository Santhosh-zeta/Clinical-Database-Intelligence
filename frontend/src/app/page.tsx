"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

export default function Root() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!currentUser) {
      return;
    }

    const role = currentUser.role?.toLowerCase() || '';
    router.replace('/dashboard');
  }, [currentUser, router, mounted]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="animate-pulse flex flex-col items-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-medium text-sm tracking-wide">Routing...</p>
      </div>
    </div>
  );
}
