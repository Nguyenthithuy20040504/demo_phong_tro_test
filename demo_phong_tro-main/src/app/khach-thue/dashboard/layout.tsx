'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession, signOut } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Home, FileText, AlertCircle, User, LogOut, Menu, X } from 'lucide-react';

export default function KhachThueDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: session, status } = useSession();
  const user = session?.user;

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/dang-nhap');
      return;
    }

      if (user?.role !== 'khachThue') {
    router.replace('/dashboard'); 
    return;
      }
  }, [status, session, user?.role, router]);

  const handleLogout = async () => {
    toast.success('Đã đăng xuất');
    await signOut({ redirect: false });
    router.replace('/dang-nhap');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session) return null;

  const navigation = [
    { name: 'Tổng quan', href: '/khach-thue/dashboard', icon: Home },
    { name: 'Hóa đơn', href: '/khach-thue/dashboard/hoa-don', icon: FileText },
    { name: 'Sự cố', href: '/khach-thue/dashboard/su-co', icon: AlertCircle },
    { name: 'Thông tin cá nhân', href: '/khach-thue/dashboard/thong-tin', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-lg"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-white border-r
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-full px-4 py-6 overflow-y-auto flex flex-col">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-bold text-blue-900">Xin chào,</h2>
            <p className="text-sm text-blue-700 font-medium">{user?.name}</p>
            <p className="text-xs text-blue-600 mt-1">{(user as any)?.phone}</p>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t">
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </main>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
