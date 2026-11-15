'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header, type HeaderUser } from '@/components/Header';
import { ToastProvider } from '@/components/Toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch('/api/v1/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }

        const body = await res.json();
        const u = body.data;
        setUser({
          userId: u._id,
          fullName: u.fullName || 'Sarah Johnson',
          email: u.email,
          role: u.role,
          institutionName: u.institution?.name || 'Thapar Institute of Eng & Tech',
        });
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E5EAF0] border-t-[#087E8B]" />
          <p className="text-sm text-[#718096] font-medium">Launching Smart Mess Operations...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-[#F5F7FA] text-[#253746] antialiased font-sans">
        <Sidebar
          role={user?.role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header
            user={user}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
