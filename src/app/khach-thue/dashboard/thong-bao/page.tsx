'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCheck, Receipt, FileText, AlertTriangle, Info, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface Notification {
  _id: string;
  tieuDe: string;
  noiDung: string;
  loai: 'chung' | 'hoaDon' | 'suCo' | 'hopDong' | 'khac';
  ngayGui: string;
  isRead: boolean;
  nguoiGui?: { ten?: string; name?: string; email?: string };
}

export default function KhachThueThongBaoPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    document.title = 'Thông báo của tôi';
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/thong-bao/my-notifications?limit=50');
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
      case 'hoaDon': return <Receipt className="h-5 w-5 text-orange-500" />;
      case 'hopDong': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'suCo': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'hoaDon': return <Badge className="bg-orange-100 text-orange-700 text-xs">Hóa đơn</Badge>;
      case 'hopDong': return <Badge className="bg-blue-100 text-blue-700 text-xs">Hợp đồng</Badge>;
      case 'suCo': return <Badge className="bg-red-100 text-red-700 text-xs">Sự cố</Badge>;
      case 'chung': return <Badge className="bg-gray-100 text-gray-700 text-xs">Chung</Badge>;
      default: return <Badge variant="outline" className="text-xs">Khác</Badge>;
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Thông báo của tôi
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">Bạn có <span className="font-semibold text-blue-600">{unreadCount}</span> thông báo chưa đọc</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-1" />
            Đọc tất cả
          </Button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell className="h-12 w-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Chưa có thông báo nào</p>
          <p className="text-sm mt-1">Thông báo từ chủ nhà sẽ xuất hiện ở đây</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <Card
              key={notif._id}
              onClick={() => { if (!notif.isRead) markAsRead(notif._id); }}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${!notif.isRead ? 'border-blue-200 bg-blue-50/40 shadow-sm' : 'border-gray-100'}`}
            >
              <div className="flex gap-3">
                <div className={`flex-shrink-0 p-2 rounded-full ${!notif.isRead ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {getTypeIcon(notif.loai)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className={`text-sm leading-snug ${!notif.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {notif.tieuDe}
                    </h3>
                    {!notif.isRead && <div className="flex-shrink-0 w-2.5 h-2.5 mt-1 bg-blue-500 rounded-full" />}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line line-clamp-3">
                    {notif.noiDung}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    {getTypeBadge(notif.loai)}
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {timeAgo(notif.ngayGui)}
                    </span>
                    {notif.nguoiGui && (
                      <span className="text-[10px] text-gray-400">
                        Từ: {notif.nguoiGui.ten || notif.nguoiGui.name || notif.nguoiGui.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
