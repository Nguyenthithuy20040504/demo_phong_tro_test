'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  CheckCircle2, 
  Crown, 
  Zap, 
  ShieldCheck, 
  CreditCard,
  Building2,
  Users,
  Calendar,
  AlertCircle,
  RefreshCw,
  History,
  ArrowUpRight
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface Plan {
  _id: string;
  ten: string;
  moTa: string;
  gia: number;
  thoiGian: number;
  maxPhong: number;
  features: string[];
  isPopular: boolean;
}

export default function SubscriptionPage() {
  const { data: session, update } = useSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [extending, setExtending] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [currentSubs, setCurrentSubs] = useState<{ goiDichVu: string, ngayHetHan: string | null } | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'Gia hạn gói dịch vụ';
    fetchPlans();
    fetchCurrentStatus();
    fetchPaymentHistory();

    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success');
    const orderCodeStr = urlParams.get('orderCode');
    
    if (isSuccess === 'true' && orderCodeStr) {
      toast.info('Đang đồng bộ giao dịch với Ngân hàng...', { id: 'verifying' });
      // Xóa params để tránh bị load lại toast
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Gọi fetch API Server polling để nâng cấp DB nếu chưa được kích hoạt ngầm
      fetch(`/api/user/subscription/payos/verify?orderCode=${orderCodeStr}`)
        .then(res => res.json())
        .then((verificationData) => {
            if (verificationData.status === 'PAID') {
               toast.success('🎉 Cảm ơn bạn! Hệ thống đã ghi nhận tiền về và tự động cộng thêm ngày sử dụng!', { id: 'verifying' });
               setTimeout(() => {
                  fetchCurrentStatus();
                  update();
               }, 1000);
            } else {
               toast.error('❌ Thanh toán chưa hoàn tất hoặc gặp lỗi từ ngân hàng.', { id: 'verifying' });
            }
        })
        .catch(err => toast.error('Lỗi mạng khi kiểm tra lại hóa đơn', { id: 'verifying' }));
    } else if (isSuccess === 'false') {
      toast.error('Thanh toán đã bị người dùng hủy bỏ (hoặc bị trục trặc cổng giao dịch).');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchCurrentStatus = async () => {
    try {
      const res = await fetch('/api/user/subscription/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setCurrentSubs(data);
      }
    } catch (error) {
      console.error('Failed to fetch actual user status');
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await fetch('/api/user/subscription/payments', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(data.payments || []);
      }
    } catch (error) {
      console.error('Failed to fetch payment history');
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/admin/saas/plans', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setPlans(data.filter((p: any) => p.isActive));
      }
    } catch (error) {
      toast.error('Không tải được danh sách gói cước.');
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async (plan: Plan) => {
    try {
      setExtending(plan._id);
      const response = await fetch('/api/user/subscription/payos/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan._id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to PayOS secure checkout page!
        window.location.href = data.checkoutUrl;
      } else {
        const error = await response.json();
        toast.error(error.message || 'Có lỗi kết nối Cổng thanh toán.');
        setExtending(null);
        setIsPaymentOpen(false);
      }
    } catch (error) {
      toast.error('Lỗi cấu hình Cổng thanh toán (Vui lòng kiểm tra lại API Keys).');
      setExtending(null);
      setIsPaymentOpen(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const userGoiDichVu = currentSubs?.goiDichVu || (session?.user as any)?.goiDichVu || 'mienPhi';
  const rawNgayHetHan = currentSubs ? currentSubs.ngayHetHan : (session?.user as any)?.ngayHetHan;
  const userExpiry = rawNgayHetHan ? new Date(rawNgayHetHan) : null;
  const isExpired = userExpiry ? userExpiry < new Date() : false;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold font-heading text-foreground drop-shadow-sm">
          Gói dịch vụ của tôi
        </h1>
        <p className="text-muted-foreground">
          Nâng cấp hoặc gia hạn gói dịch vụ để tận hưởng các tính năng quản lý cao cấp.
        </p>
      </div>

      {/* Current Subscription Status */}
      <Card className="premium-card border-none shadow-xl bg-teal-600 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Crown size={120} />
        </div>
        <CardHeader className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline" className="text-white border-white/40 bg-white/10 backdrop-blur-md px-3 py-1">
                 Gói hiện tại
              </Badge>
           </div>
           <CardTitle className="text-3xl font-bold flex items-center gap-2">
              {userGoiDichVu === 'chuyenNghiep' ? 'Chuyên nghiệp' : 
               userGoiDichVu === 'coBan' ? 'Cơ bản' : 'Miễn phí'}
              <ShieldCheck className="text-teal-200" />
           </CardTitle>
           <CardDescription className="text-teal-100/80 text-lg">
              {currentSubs === null ? (
                <span className="flex items-center gap-2 font-medium">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Đang đồng bộ ngày tháng...
                </span>
               ) : isExpired ? (
                <span className="flex items-center gap-2 text-red-200 font-bold">
                  <AlertCircle size={18} /> Gói của bạn đã hết hạn
                </span>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <span>Ngày hết hạn: {userExpiry ? userExpiry.toLocaleDateString('vi-VN') : 'Lỗi đồng bộ (Vui lòng đăng nhập lại)'}</span>
                  <span className="text-sm font-normal text-teal-100 flex items-start gap-1.5 mt-1 border-t border-teal-500/50 pt-2 w-fit">
                     Lưu ý: Bạn chỉ có thể cộng dồn ngày gia hạn cho gói hiện tại. Các tính năng nâng/hạ cấp <br className="hidden sm:block"/> sang gói khác sẽ được mở khóa tự động sau khi gói hiện tại hết hạn.
                  </span>
                </div>
              )}
           </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-2">
              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-lg">
                    <Building2 className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-xs text-teal-100 font-medium">Giới hạn phòng</p>
                    <p className="font-bold">
                      {userGoiDichVu === 'chuyenNghiep' ? 'Không giới hạn' : 
                       userGoiDichVu === 'coBan' ? 'Tối đa 20 phòng' : 'Tối đa 10 phòng'}
                    </p>
                 </div>
              </div>

              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-lg">
                    <Users className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-xs text-teal-100 font-medium">Hỗ trợ</p>
                    <p className="font-bold">24/7 Premium</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-lg">
                    <Zap className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-xs text-teal-100 font-medium">Tính năng</p>
                    <p className="font-bold">Nhắc nợ tự động</p>
                 </div>
              </div>
           </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card 
            key={plan._id} 
            className={`flex flex-col border-2 relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
              plan.isPopular ? 'border-teal-500 shadow-teal-100' : 'border-border'
            }`}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0">
                <Badge className="bg-teal-600 text-white rounded-tr-sm rounded-bl-lg px-4 py-1.5 font-bold uppercase tracking-wider text-[10px]">
                  Phổ biến nhất
                </Badge>
              </div>
            )}
            
            <CardHeader>
              <div className="mb-2">
                  <div className={`p-3 w-fit rounded-2xl mb-4 ${
                    plan.ten.includes('Chuyên nghiệp') ? 'bg-orange-100 text-orange-600' : 
                    plan.ten.includes('Cơ bản') ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {plan.ten.includes('Chuyên nghiệp') ? <Rocket size={28} /> : 
                     plan.ten.includes('Cơ bản') ? <Zap size={28} /> : <Users size={28} />}
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.ten}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-2 leading-relaxed h-10">
                    {plan.moTa}
                  </CardDescription>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{formatPrice(plan.gia)}</span>
                <span className="text-muted-foreground font-medium">/{plan.thoiGian} tháng</span>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1">
              <ul className="space-y-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5 bg-teal-50 rounded-full p-0.5">
                      <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    </div>
                    <span className="text-sm text-gray-600 leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              {(() => {
                const getPlanRole = (ten: string) => {
                  const t = ten.toLowerCase();
                  if (t.includes('chuyên nghiệp') || t.includes('professional') || t.includes('vip')) return 'chuyenNghiep';
                  if (t.includes('cơ bản') || t.includes('basic')) return 'coBan';
                  return 'mienPhi';
                };
                
                const planRole = getPlanRole(plan.ten);
                const isFreePlan = planRole === 'mienPhi';
                const isLocked = !isExpired && userGoiDichVu !== 'mienPhi' && userGoiDichVu !== planRole;

                if (isFreePlan) {
                  return (
                    <Button 
                      disabled 
                      className="w-full group h-12 text-[11px] sm:text-sm font-bold uppercase tracking-wider bg-gray-200 text-gray-500 cursor-not-allowed"
                    >
                      Đã sử dụng
                    </Button>
                  );
                }

                if (isLocked) {
                  return (
                    <Button 
                      disabled 
                      variant="outline"
                      className="w-full group h-12 text-[11px] sm:text-sm font-bold uppercase tracking-wider bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed"
                    >
                      Đang dùng gói khác
                    </Button>
                  );
                }

                // If not locked and not free plan -> allow extend/purchase
                return (
                  <Button 
                    className={`w-full group h-12 text-sm font-bold uppercase tracking-wider transition-all duration-300 bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-100 text-white`}
                    onClick={() => handleExtend(plan)}
                    disabled={extending === plan._id}
                  >
                    {extending === plan._id ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                        Gia hạn ngay
                      </>
                    )}
                  </Button>
                );
              })()}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Payment Security Badge */}
      <div className="flex justify-center items-center gap-8 py-10 opacity-60">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck className="text-emerald-600 h-5 w-5" />
          Thanh toán an toàn 100%
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="text-teal-600 h-5 w-5" />
          Gia hạn tự động
        </div>
      </div>

      {/* Payment History Section */}
      <div className="mt-12 space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-teal-600" />
          <h2 className="text-2xl font-bold">Lịch sử giao dịch của bạn</h2>
        </div>
        <Card className="border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[150px]">Mã đơn</TableHead>
                  <TableHead>Ngày GD</TableHead>
                  <TableHead>Gói cước</TableHead>
                  <TableHead>Số tiền nộp</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Chưa có lịch sử giao dịch nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentHistory.map((payment) => (
                    <TableRow key={payment._id}>
                      <TableCell className="font-mono text-xs font-medium text-slate-500">
                        {payment.maDonHang || '...'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-sm">
                          <span className="font-medium text-slate-700">{new Date(payment.createdAt).toLocaleDateString('vi-VN')}</span>
                          <span className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleTimeString('vi-VN')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100">{payment.goiDichVu?.ten || 'Không rõ'}</Badge>
                      </TableCell>
                      <TableCell>
                        {(payment.trangThai === 'daThanhToan' ? (payment.soTienDaChuyen || payment.soTien) : (payment.soTienDaChuyen || 0)) === payment.soTien ? (
                          <span className="font-bold text-emerald-600">{(payment.trangThai === 'daThanhToan' ? (payment.soTienDaChuyen || payment.soTien) : payment.soTienDaChuyen)?.toLocaleString('vi-VN')} đ</span>
                        ) : payment.trangThai === 'chuaThanhToanHet' ? (
                          <div className="flex flex-col">
                            <span className="text-orange-600 font-bold">{payment.soTienDaChuyen?.toLocaleString('vi-VN')} đ</span>
                            <span className="text-xs text-muted-foreground">/ {payment.soTien?.toLocaleString('vi-VN')} đ (tổng)</span>
                          </div>
                        ) : (
                          <span className="font-bold text-slate-500">{(payment.soTienDaChuyen || 0)?.toLocaleString('vi-VN')} đ</span>
                        )}
                      </TableCell>
                      <TableCell>
                         <Badge 
                           variant={payment.trangThai === 'daThanhToan' ? 'default' : payment.trangThai === 'chuaThanhToanHet' ? 'outline' : 'secondary'}
                           className={payment.trangThai === 'daThanhToan' ? 'bg-emerald-500' : payment.trangThai === 'chuaThanhToanHet' ? 'text-orange-600 border-orange-200 bg-orange-50' : payment.trangThai === 'daHuy' ? 'bg-red-500 text-white' : ''}
                         >
                           {payment.trangThai === 'daThanhToan' ? 'Thành công' : payment.trangThai === 'chuaThanhToanHet' ? 'Chưa thanh toán đủ' : payment.trangThai === 'daHuy' ? 'Đã hủy' : 'Đang chờ duyệt'}
                         </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
