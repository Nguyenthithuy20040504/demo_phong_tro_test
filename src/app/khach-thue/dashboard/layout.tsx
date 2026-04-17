'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession, signOut } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Home, FileText, AlertCircle, User, LogOut, Menu, X, Bell, ShieldCheck } from 'lucide-react';

export default function KhachThueDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: session, status } = useSession();
  const user = session?.user;

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/dang-nhap');
      return;
    }

    if (user?.role && user.role !== 'khachThue') {
      router.replace('/dashboard');
      return;
    }
  }, [status, session, user?.role, router]);

  useEffect(() => {
    if (!session) return;
    
    const fetchCount = () => {
      fetch('/api/thong-bao/unread-count')
        .then(r => r.json())
        .then(d => setUnreadCount(d.count || 0))
        .catch(() => {});
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    
    const handleRead = () => setUnreadCount(0);
    window.addEventListener('notificationsRead', handleRead);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsRead', handleRead);
    };
  }, [session]);

  const handleLogout = async () => {
    toast.success('Đã đăng xuất');
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5fb3a6]" />
      </div>
    );
  }

  if (!session) return null;

  const navigation = [
    { name: 'Trang chủ', href: '/khach-thue/dashboard', icon: Home },
    { name: 'Hợp đồng', href: '/khach-thue/dashboard/hop-dong', icon: ShieldCheck },
    { name: 'Hóa đơn', href: '/khach-thue/dashboard/hoa-don', icon: FileText },
    { name: 'Sự cố', href: '/khach-thue/dashboard/su-co', icon: AlertCircle },
    { name: 'Thông báo', href: '/khach-thue/dashboard/thong-bao', icon: Bell, badge: unreadCount },
    { name: 'Thông tin cá nhân', href: '/khach-thue/dashboard/thong-tin', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 w-64 h-screen bg-[#5fb3a6] border-r border-[#5fb3a6]/20 transition-transform
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full px-4 py-8 flex flex-col overflow-hidden">
          {/* Brand/Logo */}
          <div className="px-4 mb-3">
            <h1 className="text-5xl font-black text-white tracking-tighter">PiRoom</h1>
          </div>

          {/* Prominent Profile Card */}
          <div className="mb-4 p-5 bg-white rounded-3xl shadow-[0_15px_30px_-5px_rgba(0,0,0,0.1)] border border-white/20">
            <h2 className="text-[14px] font-semibold text-[#5fb3a6]/90 uppercase tracking-[0.1em] mb-1">XIN CHÀO,</h2>
            <p className="text-lg font-semibold text-[#5fb3a6] truncate leading-tight">{user?.name}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="size-1.5 bg-[#5fb3a6] rounded-full animate-pulse" />
              <p className="text-[11px] text-[#5fb3a6]/80 uppercase tracking-widest font-semibold">{(user as any)?.phone}</p>
            </div>
          </div>

          {/* Navigation - Compact */}
          <nav className="space-y-1 flex-1 overflow-hidden">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const badge = (item as any).badge || 0;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-[1.25rem] transition-all duration-300 group font-black
                    ${isActive 
                      ? 'bg-white text-[#5fb3a6] shadow-lg scale-[1.03]' 
                      : 'text-white hover:bg-white/20 hover:scale-[1.02] hover:border-white/10 hover:shadow-xl hover:shadow-black/5 hover:translate-x-2'}
                  `}
                >
                  <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="text-[14px] font-semibold uppercase tracking-wider flex-1 truncate">{item.name}</span>
                  {badge > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-black rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-lg">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Compact Logout */}
          <div className="pt-4 border-t border-white/10 mt-auto">
            <Button
              variant="ghost"
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10 rounded-xl h-10 px-4"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3" />
              <span className="text-sm font-black uppercase tracking-wider">Đăng xuất</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b flex items-center justify-between px-6 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-600 rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div className="text-lg font-black text-[#5fb3a6]">PiRoom</div>
          <div className="w-10" /> {/* Spacer */}
        </header>

        <div className="p-4 lg:p-12 pt-6 lg:pt-12 no-scrollbar">{children}</div>
      </main>
    </div>
  );
}
