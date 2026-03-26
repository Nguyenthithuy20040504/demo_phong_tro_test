'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { DynamicBreadcrumb } from '@/components/ui/dynamic-breadcrumb';
import { PageProgress } from '@/components/ui/page-progress';
import { SubscriptionGuard } from '@/components/ui/subscription-guard';
import { NotificationBell } from '@/components/ui/notification-bell';
import { UICustomizer } from '@/components/ui-customizer';

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
  if (session.user.role === 'khachThue') {
    router.replace('/khach-thue/dashboard');
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-md px-4 transition-all duration-300">
          <PageProgress />
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-6" />
          <DynamicBreadcrumb />
          <div className="ml-auto flex items-center gap-1.5 md:gap-3">
            <UICustomizer />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <SubscriptionGuard>{children}</SubscriptionGuard>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SessionProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SessionProvider>
  );
}
