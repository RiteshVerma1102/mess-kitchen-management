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
          fullName: u.fullName,
          email: u.email,
          role: u.role,
          institutionName: u.institution?.name,
        });
      } catch {
        // Fallback for offline mode or demo view
        setUser({
          userId: 'demo_user',
          fullName: 'Mess Officer',
          email: 'officer@thapar.edu',
          role: 'admin',
          institutionName: 'Thapar Institute (Offline)',
        });
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" />
          <p className="text-sm text-ink/70 font-medium">Loading Smart Mess Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-stone-50/50 dark:bg-stone-950/40">
        <Sidebar
          role={user?.role}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
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
