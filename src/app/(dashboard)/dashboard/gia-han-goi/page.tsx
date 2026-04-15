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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [currentSubs, setCurrentSubs] = useState<{ goiDichVu: string, goiDichVuId?: string | null, ngayHetHan: string | null, goiDichVuTiepTheo?: string | null } | null>(null);
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

  const currentPlanDetails = plans.find(p => p._id === currentSubs?.goiDichVuId) || 
                             plans.find(p => {
                               const t = p.ten.toLowerCase();
                               if (userGoiDichVu === 'chuyenNghiep') return t.includes('chuyên nghiệp') || t.includes('professional') || t.includes('vip') || t.includes('pro');
                               if (userGoiDichVu === 'coBan') return t.includes('cơ bản') || t.includes('basic');
                               return p.gia === 0;
                             });

  const nextPlanDetails = plans.find(p => {
    const t = p.ten.toLowerCase();
    if (currentSubs?.goiDichVuTiepTheo === 'chuyenNghiep') return t.includes('chuyên nghiệp') || t.includes('professional') || t.includes('vip') || t.includes('pro');
    if (currentSubs?.goiDichVuTiepTheo === 'coBan') return t.includes('cơ bản') || t.includes('basic');
    return false;
  });

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
              {currentPlanDetails?.ten || (userGoiDichVu === 'chuyenNghiep' ? 'Chuyên nghiệp' : 
               userGoiDichVu === 'coBan' ? 'Cơ bản' : 'Miễn phí')}
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
                  <div className="text-sm font-normal text-teal-100 flex flex-col gap-2 mt-1 border-t border-teal-500/50 pt-2 w-fit">
                     <span>Lưu ý: Bạn chỉ có thể cộng dồn ngày gia hạn cho gói hiện tại. Các tính năng nâng/hạ cấp sang gói khác sẽ được kích hoạt ngay lập tức hoặc được xếp hàng nếu là hạ cấp.</span>
                     {nextPlanDetails && (
                       <div className="mt-2 p-3 bg-amber-400/20 backdrop-blur-sm rounded-xl border border-amber-400/30 text-amber-50">
                         <p className="text-[10px] uppercase font-bold tracking-widest mb-1 opacity-70">Gói tiếp theo đã đăng ký:</p>
                         <div className="flex items-center gap-2">
                            <Badge className="bg-amber-400 text-amber-900 border-none hover:bg-amber-400 flex gap-1 items-center font-bold">
                              <Zap className="h-3 w-3" />
                              {nextPlanDetails.ten}
                            </Badge>
                            <span className="text-xs font-semibold">Tự động kích hoạt ngay sau khi gói hiện tại hết hạn</span>
                         </div>
                       </div>
                     )}
                  </div>
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
                      {currentPlanDetails ? (currentPlanDetails.maxPhong === -1 ? 'Không giới hạn' : `Tối đa ${currentPlanDetails.maxPhong} phòng`) : 
                       (userGoiDichVu === 'chuyenNghiep' ? 'Không giới hạn' : 
                        userGoiDichVu === 'coBan' ? 'Tối đa 20 phòng' : 'Tối đa 10 phòng')}
                    </p>
                 </div>
              </div>

              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-lg">
                    <Users className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-xs text-teal-100 font-medium">Hỗ trợ</p>
                    <p className="font-bold">{currentPlanDetails?.features.find(f => f.toLowerCase().includes('hỗ trợ')) || '24/7 Premium'}</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-lg">
                    <Zap className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-xs text-teal-100 font-medium">Tính năng chính</p>
                    <p className="font-bold">{currentPlanDetails?.features[0] || 'Nhắc nợ tự động'}</p>
                 </div>
              </div>
           </div>
        </CardContent>
      </Card>

      {/* Tabs: Gói dịch vụ / Lịch sử giao dịch */}
      <Tabs defaultValue="plans" className="w-full">
        <TabsList className="w-full sm:w-auto bg-slate-100/80 p-1 rounded-xl mb-6">
          <TabsTrigger value="plans" className="data-[state=active]:bg-white data-[state=active]:shadow-md px-6 py-2.5 rounded-lg text-sm font-bold transition-all">
            <Rocket className="mr-2 h-4 w-4" /> Danh sách gói
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:shadow-md px-6 py-2.5 rounded-lg text-sm font-bold transition-all">
            <History className="mr-2 h-4 w-4" /> Lịch sử giao dịch
            {paymentHistory.length > 0 && (
              <Badge className="ml-2 bg-teal-600 text-white text-[10px] px-1.5 py-0 h-5 rounded-full">{paymentHistory.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-0 space-y-8 animate-in fade-in-50 duration-300">
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
                    const getPlanRole = (p: any) => {
                      if (p.gia === 0) return "mienPhi";
                      const t = p.ten.toLowerCase();
                      if (t.includes('chuyên nghiệp') || t.includes('professional') || t.includes('vip') || t.includes('pro')) return 'chuyenNghiep';
                      return 'coBan';
                    };
                    
                    const planRole = getPlanRole(plan);
                    const isFreePlan = plan.gia === 0;
                    const isNextInQueue = currentSubs?.goiDichVuTiepTheo === planRole;
                    
                    const isCurrentPlan = (currentSubs?.goiDichVuId && currentSubs.goiDichVuId === plan._id) || 
                                         (!currentSubs?.goiDichVuId && userGoiDichVu === planRole && !isNextInQueue);

                    if (isFreePlan) {
                      const label = isCurrentPlan ? 'Đang sử dụng' : 'Gói mặc định';
                      const styles = isCurrentPlan 
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                        : "bg-gray-100 text-gray-400 border border-gray-200";
                        
                      return (
                        <Button 
                          disabled 
                          className={`w-full group h-12 text-[11px] sm:text-sm font-bold uppercase tracking-wider ${styles} opacity-80`}
                        >
                          {label}
                        </Button>
                      );
                    }

                    if (isCurrentPlan) {
                      return (
                        <Button 
                          className="w-full group h-12 text-sm font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                          onClick={() => handleExtend(plan)}
                          disabled={extending === plan._id}
                        >
                          {extending === plan._id ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              <CreditCard className="mr-2 h-5 w-5" />
                              Gia hạn ngay
                            </>
                          )}
                        </Button>
                      );
                    }

                    if (isNextInQueue) {
                      return (
                        <Button 
                          disabled 
                          variant="outline"
                          className="w-full group h-12 text-[11px] sm:text-sm font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed"
                        >
                          Đã xếp hàng đợi
                        </Button>
                      );
                    }

                    return (
                      <Button 
                        className="w-full group h-12 text-sm font-bold uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white shadow-lg transition-all"
                        onClick={() => handleExtend(plan)}
                        disabled={extending === plan._id}
                      >
                        {extending === plan._id ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                            Nâng cấp ngay
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
          <div className="flex justify-center items-center gap-8 py-6 opacity-60">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck className="text-emerald-600 h-5 w-5" />
              Thanh toán an toàn 100%
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="text-teal-600 h-5 w-5" />
              Gia hạn tự động
            </div>
          </div>
        </TabsContent>
        <TabsContent value="history" className="mt-0 animate-in fade-in-50 duration-300">
          <Card className="border shadow-2xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white/50 backdrop-blur-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-widest pl-6">Mã GD</TableHead>
                      <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-widest">Thời gian</TableHead>
                      <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-widest">Gói cước</TableHead>
                      <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-widest">Thời hạn</TableHead>
                      <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-widest text-right">Số tiền</TableHead>
                      <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-widest text-center">Thanh toán</TableHead>
                      <TableHead className="font-bold text-slate-600 uppercase text-[10px] tracking-widest text-center pr-6">Trạng thái gói</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Row: Gói tiếp theo (nếu có) */}
                    {nextPlanDetails && (
                      <TableRow className="bg-amber-50/70 hover:bg-amber-50 border-b-2 border-amber-200/50">
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-500 rounded-md"><Calendar size={12} className="text-white" /></div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-[9px] uppercase font-bold tracking-widest text-amber-500">Hàng đợi</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-extrabold text-amber-900">{nextPlanDetails.ten}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-amber-800 text-sm">
                              KH: {userExpiry ? userExpiry.toLocaleDateString('vi-VN') : 'Sau khi gói hiện tại hết hạn'}
                            </span>
                            <span className="text-[10px] text-amber-600">{nextPlanDetails.thoiGian} tháng</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <span className="font-bold text-amber-700 text-sm">{formatPrice(nextPlanDetails.gia)}</span>
                        </TableCell>
                        <TableCell className="py-4 text-center">—</TableCell>
                        <TableCell className="py-4 text-center pr-6">
                          <Badge className="bg-amber-500 text-white border-none font-bold text-[10px] px-3 py-1 rounded-full">
                            <Calendar size={10} className="mr-1" /> Kích hoạt tiếp theo
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Row: Gói đang sử dụng */}
                    <TableRow className="bg-emerald-50/70 hover:bg-emerald-50 border-b-2 border-emerald-200/50">
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-600 rounded-md"><Zap size={12} className="text-white" /></div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-500">Đang hoạt động</span>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="font-extrabold text-emerald-900">
                          {currentPlanDetails?.ten || (userGoiDichVu === 'chuyenNghiep' ? 'Chuyên nghiệp' : userGoiDichVu === 'coBan' ? 'Cơ bản' : 'Miễn phí')}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-emerald-800 text-sm">
                            {userExpiry && !isExpired ? `Đến ${userExpiry.toLocaleDateString('vi-VN')}` : isExpired ? 'Đã hết hạn' : '—'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <span className="font-bold text-emerald-700 text-sm">
                          {currentPlanDetails ? formatPrice(currentPlanDetails.gia) : formatPrice(0)}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-center">—</TableCell>
                      <TableCell className="py-4 text-center pr-6">
                        <Badge className="bg-emerald-600 text-white border-none font-bold text-[10px] px-3 py-1 rounded-full">
                          <Zap size={10} className="mr-1" /> Đang sử dụng
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {/* Divider label */}
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="py-2 px-6 bg-slate-100/50">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Lịch sử giao dịch</span>
                      </TableCell>
                    </TableRow>

                    {paymentHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center gap-2 opacity-40">
                            <History size={48} className="text-slate-300" />
                            <p className="text-lg font-medium text-slate-400">Bạn chưa có giao dịch nào</p>
                            <p className="text-sm">Các gói đăng ký sẽ xuất hiện tại đây sau khi bạn mua hàng.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (() => {
                        const sorted = [...paymentHistory].sort((a, b) => {
                          const getPriority = (p: any) => {
                            const planId = p.goiDichVu?._id;
                            const planName = p.goiDichVu?.ten || p.labelGoiDichVu || '';
                            const isActive = planId && currentSubs?.goiDichVuId === planId;
                            const isQueued = (() => {
                               if (!currentSubs?.goiDichVuTiepTheo) return false;
                               const t = planName.toLowerCase();
                               if (currentSubs.goiDichVuTiepTheo === 'chuyenNghiep') return t.includes('chuyên nghiệp') || t.includes('vip') || t.includes('pro');
                               if (currentSubs.goiDichVuTiepTheo === 'coBan') return !t.includes('chuyên nghiệp') && !t.includes('vip') && !t.includes('pro') && p.goiDichVu?.gia > 0;
                               return false;
                            })();

                            if (isQueued) return 0;
                            if (isActive) return 1; // Đang sử dụng
                            if (p.trangThai === 'daThanhToan' && !isActive) return 2; // Gói cũ (đã kích hoạt)
                            if (p.trangThai === 'daHuy') return 4; // Đã hủy
                            return 3; // Chờ thanh toán, Đang xử lý, etc.
                          };

                          const priA = getPriority(a);
                          const priB = getPriority(b);
                          if (priA !== priB) return priA - priB;
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        });

                        return sorted.map((payment, idx) => {
                          const planName = payment.goiDichVu?.ten || payment.labelGoiDichVu || 'Gói cước';
                          const planId = payment.goiDichVu?._id;
                          const isActivePlan = planId && currentSubs?.goiDichVuId === planId;
                          const isQueuedPlan = (() => {
                            if (!currentSubs?.goiDichVuTiepTheo) return false;
                            const t = planName.toLowerCase();
                            if (currentSubs.goiDichVuTiepTheo === 'chuyenNghiep') return t.includes('chuyên nghiệp') || t.includes('vip') || t.includes('pro');
                            if (currentSubs.goiDichVuTiepTheo === 'coBan') return !t.includes('chuyên nghiệp') && !t.includes('vip') && !t.includes('pro') && payment.goiDichVu?.gia > 0;
                            return false;
                          })();
                          const duration = payment.goiDichVu?.thoiGian || 1;

                          return (
                            <TableRow key={payment._id} className={`group transition-colors border-b last:border-b-0 ${isActivePlan ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : isQueuedPlan ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/50'}`}>
                              <TableCell className="pl-6 py-5">
                                <div className="flex items-center gap-2">
                                   <div className={`p-1.5 rounded-md transition-colors ${isActivePlan ? 'bg-emerald-100' : isQueuedPlan ? 'bg-amber-100' : 'bg-slate-100 group-hover:bg-white'}`}>
                                     <ArrowUpRight size={12} className={isActivePlan ? 'text-emerald-600' : isQueuedPlan ? 'text-amber-600' : 'text-slate-400'} />
                                   </div>
                                   <span className="font-mono text-[11px] font-bold text-slate-500">
                                     #{payment.maDonHang ? payment.maDonHang.toString().slice(-8) : payment._id.toString().slice(-8)}
                                   </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-5">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700 text-sm">{new Date(payment.createdAt).toLocaleDateString('vi-VN')}</span>
                                  <span className="text-[10px] text-muted-foreground">{new Date(payment.createdAt).toLocaleTimeString('vi-VN')}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-5">
                                <div className="flex flex-col gap-1.5">
                                  <span className="font-bold text-slate-800">{planName}</span>
                                  {payment.goiDichVu?.maxPhong && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Building2 size={10} />
                                      {payment.goiDichVu.maxPhong === -1 ? 'Không giới hạn phòng' : `Tối đa ${payment.goiDichVu.maxPhong} phòng`}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-semibold text-slate-700 text-sm">{duration} tháng</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {payment.trangThai === 'daThanhToan' ? `Từ ${new Date(payment.createdAt).toLocaleDateString('vi-VN')}` : '—'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-5 text-right">
                                <div className="flex flex-col items-end">
                                  <span className="font-extrabold text-slate-900 text-base">
                                    {payment.soTien?.toLocaleString('vi-VN')} đ
                                  </span>
                                  {payment.trangThai === 'chuaThanhToanHet' && (
                                    <span className="text-[10px] text-orange-600 font-medium">Đã nộp: {payment.soTienDaChuyen?.toLocaleString('vi-VN')} đ</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-5 text-center">
                                 <Badge 
                                   className={`
                                     inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-none font-bold text-[10px] uppercase tracking-wide
                                     ${payment.trangThai === 'daThanhToan' ? 'bg-emerald-100 text-emerald-700' : 
                                       payment.trangThai === 'chuaThanhToanHet' ? 'bg-orange-100 text-orange-700' : 
                                       payment.trangThai === 'daHuy' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}
                                   `}
                                 >
                                   {payment.trangThai === 'daThanhToan' ? <CheckCircle2 size={12} /> : 
                                    payment.trangThai === 'daHuy' ? <AlertCircle size={12} /> : 
                                    <RefreshCw size={12} className={payment.trangThai === 'choDuyet' ? 'animate-spin' : ''} />}
                                   {payment.trangThai === 'daThanhToan' ? 'Thành công' : 
                                    payment.trangThai === 'chuaThanhToanHet' ? 'Chưa đủ' : 
                                    payment.trangThai === 'daHuy' ? 'Đã hủy' : 'Đang xử lý'}
                                 </Badge>
                              </TableCell>
                              <TableCell className="py-5 text-center pr-6">
                                <div className="flex flex-col items-center gap-1">
                                  {payment.trangThai === 'daThanhToan' ? (
                                    isActivePlan ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <Badge className="bg-emerald-600 text-white border-none font-bold text-[10px] px-3 py-1 rounded-full">
                                          <Zap size={10} className="mr-1" /> Đang sử dụng
                                        </Badge>
                                        {userExpiry && !isExpired && (
                                          <span className="text-[10px] text-emerald-600 font-semibold">
                                            HSD: {userExpiry.toLocaleDateString('vi-VN')}
                                          </span>
                                        )}
                                        {isExpired && (
                                          <span className="text-[10px] text-red-500 font-semibold">Đã hết hạn</span>
                                        )}
                                      </div>
                                    ) : isQueuedPlan ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <Badge className="bg-amber-500 text-white border-none font-bold text-[10px] px-3 py-1 rounded-full">
                                          <Calendar size={10} className="mr-1" /> Kích hoạt tiếp theo
                                        </Badge>
                                        <span className="text-[10px] text-amber-600 font-semibold">
                                          Ngày KH: {userExpiry ? userExpiry.toLocaleDateString('vi-VN') : 'Sau khi gói hiện tại hết hạn'}
                                        </span>
                                      </div>
                                    ) : (
                                      <Badge className="bg-slate-200 text-slate-500 border-none font-bold text-[10px] px-3 py-1 rounded-full">
                                        <CheckCircle2 size={10} className="mr-1" /> Đã kích hoạt
                                      </Badge>
                                    )
                                  ) : payment.trangThai === 'daHuy' ? (
                                    <Badge className="bg-red-50 text-red-400 border border-red-100 font-bold text-[10px] px-3 py-1 rounded-full">
                                      Đã hủy
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-slate-50 text-slate-400 border border-slate-100 font-bold text-[10px] px-3 py-1 rounded-full">
                                      Chờ thanh toán
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
