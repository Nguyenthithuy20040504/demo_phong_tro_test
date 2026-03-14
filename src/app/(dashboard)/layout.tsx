'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { DynamicBreadcrumb } from '@/components/ui/dynamic-breadcrumb';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary/40" />
          <p className="text-sm font-medium text-muted-foreground tracking-widest uppercase">Đang khởi tạo...</p>
        </motion.div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <SidebarProvider>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.98_0.02_250),transparent)] -z-10" />
      
      <AppSidebar className="border-r hairline-t bg-background/50 backdrop-blur-md" />
      
      <SidebarInset className="bg-transparent">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 px-6 bg-background/40 backdrop-blur-xl hairline-b">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-primary/5 transition-colors rounded-full" />
            <Separator orientation="vertical" className="h-4 bg-border/50" />
            <DynamicBreadcrumb />
          </div>
          
          <div className="flex items-center gap-4">
            {/* Action Area for Notifications if needed */}
          </div>
        </header>

        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="p-6 md:p-8 lg:p-12"
            >
              {children}
            </motion.div>
          </AnimatePresence>
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
