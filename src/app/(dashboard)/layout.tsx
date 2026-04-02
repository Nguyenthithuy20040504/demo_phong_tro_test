'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { TopNavbar } from '@/components/top-navbar';
import { DynamicBreadcrumb } from '@/components/ui/dynamic-breadcrumb';
import { SubscriptionGuard } from '@/components/ui/subscription-guard';
import { GlobalPrefetcher } from '@/components/ui/global-prefetcher';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

import { useRouter } from 'next/navigation';

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

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

  if (!session) {
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
    <SessionProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SessionProvider>
  );
}
