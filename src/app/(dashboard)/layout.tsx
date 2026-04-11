'use client';

import { SessionProvider, useSession, signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { TopNavbar } from '@/components/top-navbar';
import { DynamicBreadcrumb } from '@/components/ui/dynamic-breadcrumb';
import { SubscriptionGuard } from '@/components/ui/subscription-guard';
import { GlobalPrefetcher } from '@/components/ui/global-prefetcher';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const lockCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Polling: kiểm tra tài khoản bị khóa mỗi 10 giây
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return;

    const checkLock = async () => {
      try {
        const res = await fetch('/api/auth/check-lock', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.locked) {
            console.log('[LAYOUT] Account locked detected via polling! Force sign out.');
            signOut({ callbackUrl: '/dang-nhap?error=locked' });
          }
        }
      } catch {
        // Ignore network errors
      }
    };

    // Kiểm tra ngay lập tức 1 lần
    checkLock();

    // Sau đó kiểm tra mỗi 10 giây
    lockCheckRef.current = setInterval(checkLock, 10000);

    return () => {
      if (lockCheckRef.current) clearInterval(lockCheckRef.current);
    };
  }, [status, session?.user]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!session || !session.user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/dang-nhap';
    }
    return null;
  }

  // Redirect tenants to their dashboard if they land here
  if ((session.user as any)?.role === 'khachThue') {
    router.replace('/khach-thue/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <TopNavbar />
      <main className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6">
        <div className="max-w-[1600px] mx-auto space-y-4">
          <div className="mb-4">
             <DynamicBreadcrumb />
          </div>
          <SubscriptionGuard>{children}</SubscriptionGuard>
        </div>
        <GlobalPrefetcher />
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SessionProvider refetchInterval={10}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SessionProvider>
  );
}
