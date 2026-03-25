'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, CheckCheck, X, Receipt, FileText, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Notification {
  _id: string;
  tieuDe: string;
  noiDung: string;
  loai: 'chung' | 'hoaDon' | 'suCo' | 'hopDong' | 'khac';
  ngayGui: string;
  isRead: boolean;
  nguoiGui?: { ten?: string; name?: string; email?: string };
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Fetch unread count periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // every 1 min
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/thong-bao/unread-count', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch {}
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/thong-bao/my-notifications?limit=10', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      toast.error('Không tải được thông báo');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(prev => !prev);
  };

  const markAsRead = async (id: string) => {
    await fetch('/api/thong-bao/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/thong-bao/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true })
    });
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
    toast.success('Đã đọc tất cả thông báo');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hoaDon': return <Receipt className="h-4 w-4 text-orange-500" />;
      case 'hopDong': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'suCo': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-gray-400" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  return (
    <div className="relative">
      <Button
        ref={btnRef}
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={handleToggle}
        id="notification-bell-btn"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-orange-500 animate-[wiggle_1s_ease-in-out_infinite]" />
        ) : (
          <Bell className="h-5 w-5" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-11 z-50 w-80 md:w-96 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="font-semibold text-sm">Thông báo</span>
              {unreadCount > 0 && (
                <Badge className="bg-white/20 text-white text-xs px-1.5 py-0">{unreadCount} mới</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-white hover:bg-white/20"
                  onClick={markAllRead}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Đọc tất cả
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Không có thông báo nào</p>
              </div>
            )}
            {!loading && notifications.map(notif => (
              <div
                key={notif._id}
                onClick={() => {
                  if (!notif.isRead) markAsRead(notif._id);
                }}
                className={`flex gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-blue-50/60' : ''}`}
              >
                <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-full ${!notif.isRead ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {getTypeIcon(notif.loai)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-tight line-clamp-1 ${!notif.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {notif.tieuDe}
                    </p>
                    {!notif.isRead && <div className="flex-shrink-0 w-2 h-2 mt-1 bg-blue-500 rounded-full" />}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.noiDung}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(notif.ngayGui)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-2 bg-gray-50">
            <Button
              variant="link"
              size="sm"
              className="w-full text-blue-600 h-8 text-xs"
              onClick={() => {
                setIsOpen(false);
                router.push('/dashboard/thong-bao');
              }}
            >
              Xem tất cả thông báo →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
