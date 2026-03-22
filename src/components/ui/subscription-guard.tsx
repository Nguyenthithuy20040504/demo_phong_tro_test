'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from './button';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  
  const [isChecking, setIsChecking] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Avoid double check if no session or if they are on a safe page
    if (!session?.user) {
      setIsChecking(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/user/subscription/status?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.ngayHetHan) {
            const expiryDate = new Date(data.ngayHetHan);
            const now = new Date();
            
            // Check if expired
            if (expiryDate < now && expiryDate.getFullYear() < 2099) {
              setIsExpired(true);
            } else {
              setIsExpired(false);
            }
          }
        }
      } catch (error) {
        console.error('Failed to verify subscription status', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkStatus();
  }, [session, pathname]);

  // Bypassed paths that expired users CAN still visit
  const safePaths = [
    '/dashboard/gia-han-goi',
    '/dashboard/thong-tin-ca-nhan' // Maybe allow them to see their profile
  ];

  if (isChecking) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If expired and not on a safe page, block access!
  const isBlockablePath = !safePaths.some(p => pathname.startsWith(p));
  
  if (isExpired && isBlockablePath) {
    const role = (session?.user as any)?.role;

    if (role === 'nhanVien') {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-xl p-8 text-center shadow-lg animate-in fade-in zoom-in duration-500">
            <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-3">Tài khoản bị khóa</h2>
            <p className="text-red-800 mb-6 leading-relaxed">
              Gói cước phục vụ quản lý hệ thống của Chủ Nhà quản lý bạn <strong>đã hết hạn</strong>. 
              Bạn không thể truy cập các chức năng vào lúc này.
            </p>
            <p className="text-red-700 text-sm italic border-t border-red-200 pt-4">
              Vui lòng thông báo cho Chủ Nhà / Quản lý của bạn tiến hành gia hạn gói cước để tiếp tục công việc.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-sm">
             <AlertTriangle className="h-10 w-10 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Gói Dịch Vụ Đã Hết Hạn</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Hạn dùng gói cước của bạn đã kết thúc. Để đảm bảo dữ liệu phòng trọ tiếp tục được hệ thống bảo vệ và quản lý liền mạch, bạn cần phải gia hạn ngay.
          </p>
          <div className="bg-orange-50 p-4 rounded-lg mb-6 text-sm text-orange-800 border items-start text-left border-orange-100 flex gap-3">
             <div className="text-orange-500 mt-0.5">ℹ️</div>
             <div>Mọi chức năng ngoại trừ <strong>Gia hạn gói</strong> đã bị khóa tạm thời nhằm bảo vệ tính toàn vẹn hệ thống!</div>
          </div>
          <Button 
            size="lg" 
            className="w-full bg-blue-600 hover:bg-blue-700 font-semibold text-white shadow-md hover:shadow-lg transition-all"
            onClick={() => router.push('/dashboard/gia-han-goi')}
          >
            Tiến hành Gia hạn ngay
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
