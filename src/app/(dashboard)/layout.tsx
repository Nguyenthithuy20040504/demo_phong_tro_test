'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { TopNavbar } from '@/components/top-navbar';
import { PageProgress } from '@/components/ui/page-progress';
import { SubscriptionGuard } from '@/components/ui/subscription-guard';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-600" />
          <p className="text-gray-500 text-sm font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Redirect tenants
  if (session.user.role === 'khachThue') {
    router.replace('/khach-thue/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PageProgress />
      <TopNavbar />
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        <SubscriptionGuard>{children}</SubscriptionGuard>
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
