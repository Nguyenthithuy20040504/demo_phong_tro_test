'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Zap, Settings, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function ZaloNotificationPage() {
  const { data: session } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleGenerateBills = async () => {
    try {
      setIsGenerating(true);
      const today = new Date();
      // Ta lấy tháng hiện tại, nếu muốn tháng sau thì +1
      const res = await fetch('/api/billing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thang: today.getMonth() + 1,
          nam: today.getFullYear()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ồ, có lỗi khi tạo hóa đơn mất rồi.');

      toast.success(data.message || `Tuyệt vời! Hệ thống đã quét và tạo thành công ${data.count} hóa đơn rồi nhé.`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối server rồi. Bạn kiểm tra lại nhé!');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendZNSMock = async () => {
    toast.info('Giao diện đang trong chế độ thử nghiệm (Sandbox) thôi nhé. Bạn cần cấu hình Token để gọi API thực tế.');
  };

  if (session?.user?.role !== 'admin' && session?.user?.role !== 'chuNha') {
    return <div className="p-6">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold font-heading text-foreground drop-shadow-sm">Zalo Notification (ZNS)</h1>
        <p className="text-sm text-muted-foreground mt-1">Cấu hình tự động và gửi tin nhắn hóa đơn Zalo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bulk Generation Card */}
        <Card className="premium-card border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground font-heading border-b border-border/50 pb-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              Tạo Hóa Đơn Tự Động
            </CardTitle>
            <CardDescription className="pt-2">
              Chạy luồng tự động quét tất cả các Hợp Đồng đang hiệu lực để sinh ra Hóa Đơn Tạm Tính cho tháng hiện tại.
              (Hệ thống sẽ giữ lại phần Số Điện, Số Nước = 0 để quản lý cập nhật sau).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-between">
               <div>
                 <p className="text-sm font-semibold">Tạo Hóa Đơn Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
                 <p className="text-xs text-muted-foreground mt-1">Trạng thái rà soát sẵn sàng</p>
               </div>
               <Button onClick={handleGenerateBills} disabled={isGenerating} size="sm" className="bg-primary hover:bg-primary/90">
                 {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2"/>}
                 Kích hoạt quét
               </Button>
            </div>
          </CardContent>
        </Card>

        {/* Zalo OA Configuration */}
        <Card className="premium-card border-none opacity-80 cursor-not-allowed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground font-heading border-b border-border/50 pb-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              Cấu hình Zalo ZNS (Requires API Key)
            </CardTitle>
            <CardDescription className="pt-2">
               Thiết lập App ID và Secret Key để chạy dịch vụ Gửi Tin Nhắn. (Đang bị khóa vì chưa khai báo API Token trên Back-end)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Trạng thái Webhook</p>
              <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                 Chưa liên kết Zalo Dev
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

       {/* Zalo Messaging Area */}
       <Card className="premium-card border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground font-heading border-b border-border/50 pb-3">
              <MessageSquare className="h-5 w-5 text-[#0068FF]" />
              Gửi Thông Báo (Hàng Loạt)
            </CardTitle>
            <CardDescription className="pt-2">
              Quét các hóa đơn còn nợ hoặc Hóa đơn vừa chốt sổ Điện/Nước và Tự động nhắc qua tính năng Zalo ZNS API.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Để thực hiện gửi tin nhắn thực tế tới thiết bị người thuê, bạn cần xác thực Doanh Nghiệp (Zalo OA). Hiện tại nút Demo bên dưới chỉ dùng để chạy luồng Test.</p>
          </CardContent>
          <CardFooter className="pt-2">
             <Button onClick={handleSendZNSMock} className="w-full bg-[#0068FF] hover:bg-[#0052CC] text-white">
                <MessageSquare className="h-4 w-4 mr-2" />
                Gửi Zalo ZNS Nhắc Nợ (Demo)
             </Button>
          </CardFooter>
        </Card>
    </div>
  );
}
