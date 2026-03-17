'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, 
  DoorOpen, 
  Users, 
  Receipt, 
  AlertTriangle, 
  TrendingUp,
  Calendar as CalendarIcon,
  Clock,
  RefreshCcw,
  LayoutDashboard,
  ArrowRight,
  PlusCircle,
  FileText
} from 'lucide-react';
import { DashboardStats, ToaNha } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  
  // Filters
  const [selectedToaNha, setSelectedToaNha] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('current_month');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedToaNha !== 'all') params.append('toaNhaId', selectedToaNha);
      
      const now = new Date();
      let start = '';
      let end = '';

      if (timeRange === 'current_month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
      } else if (timeRange === 'last_month') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      } else if (timeRange === 'current_year') {
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
      }

      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) setStats(result.data);
      }
      
      // Fetch recent activities (simplified for dashboard)
      const resActivities = await fetch('/api/thanh-toan?limit=5');
      if (resActivities.ok) {
        const data = await resActivities.json();
        setRecentActivities(data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi khi tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedToaNha, timeRange]);

  const fetchToaNha = async () => {
    try {
      const response = await fetch('/api/toa-nha?limit=100');
      if (response.ok) {
        const result = await response.json();
        if (result.success) setToaNhaList(result.data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  useEffect(() => {
    document.title = 'Dashboard | SmartStay';
    fetchToaNha();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRangeLabel = () => {
    if (timeRange === 'current_month') return 'Tháng này';
    if (timeRange === 'last_month') return 'Tháng trước';
    if (timeRange === 'current_year') return 'Năm nay';
    return '';
  };

  if (loading && !stats) {
    return <div className="p-8 text-center text-gray-400">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Filters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border shadow-sm backdrop-blur-sm bg-white/80 sticky top-0 z-10 transition-all">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Thống kê Tổng quát</h1>
            <p className="text-xs text-gray-500 font-medium">Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedToaNha} onValueChange={setSelectedToaNha}>
            <SelectTrigger className="w-full sm:w-[200px] h-10 rounded-lg border-gray-200 focus:ring-blue-500">
              <Building2 className="mr-2 h-4 w-4 text-gray-400" />
              <SelectValue placeholder="Chọn tòa nhà" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tòa nhà</SelectItem>
              {toaNhaList.map((t) => (
                <SelectItem key={t._id} value={t._id!}>{t.tenToaNha}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-lg border-gray-200">
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
              <SelectValue placeholder="Thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Tháng này</SelectItem>
              <SelectItem value="last_month">Tháng trước</SelectItem>
              <SelectItem value="current_year">Năm này</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={fetchStats} disabled={loading} className="h-10 w-10 border-gray-200 text-gray-500">
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-6">
          {/* Top Cards: Room Status and Revenue */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-md bg-white overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-600 transition-colors duration-300">
                    <Building2 className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-2 py-0.5 text-[10px] font-bold">SMART STAY</Badge>
                </div>
                <h3 className="text-gray-500 text-sm font-semibold tracking-tight uppercase">Tổng số phòng</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-gray-900 leading-none">{stats.tongSoPhong}</span>
                  <span className="text-sm text-gray-400 font-medium">phòng</span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>{stats.phongDangThue} đang có người ở</span>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-md bg-white overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-green-50 rounded-2xl group-hover:bg-green-600 transition-colors duration-300">
                    <DoorOpen className="h-6 w-6 text-green-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0.5 text-[10px] font-bold">READY</Badge>
                </div>
                <h3 className="text-gray-500 text-sm font-semibold tracking-tight uppercase">Phòng còn trống</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-green-600 leading-none">{stats.phongTrong}</span>
                  <span className="text-sm text-gray-400 font-medium">phòng</span>
                </div>
                <div className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Tỷ lệ {stats.tongSoPhong > 0 ? ((stats.phongTrong / stats.tongSoPhong) * 100).toFixed(1) : 0}% trống
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-md bg-white overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl group-hover:bg-emerald-600 transition-colors duration-300">
                    <TrendingUp className="h-6 w-6 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-2 py-0.5 text-[10px] font-bold">REVENUE</Badge>
                </div>
                <h3 className="text-gray-500 text-sm font-semibold tracking-tight uppercase">Doanh thu {getRangeLabel().toLowerCase()}</h3>
                <div className="mt-1">
                  <span className="text-3xl font-black text-emerald-600 leading-none tracking-tight">
                    {formatCurrency(stats.filteredRevenue !== undefined && stats.filteredRevenue !== null ? stats.filteredRevenue : stats.doanhThuThang)}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 font-bold uppercase tracking-widest">
                  <TrendingUp className="h-3 w-3" />
                  <span>Tăng 12% tháng trước</span>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-md bg-white overflow-hidden group hover:shadow-xl transition-all duration-300">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-red-50 rounded-2xl group-hover:bg-red-600 transition-colors duration-300">
                    <AlertTriangle className="h-6 w-6 text-red-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  {stats.suCoCanXuLy > 0 && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
                </div>
                <h3 className="text-gray-500 text-sm font-semibold tracking-tight uppercase">Sự cố tồn đọng</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-red-600 leading-none">{stats.suCoCanXuLy}</span>
                  <span className="text-sm text-gray-400 font-medium">yêu cầu</span>
                </div>
                <div className="mt-4 flex gap-1">
                  {[...Array(Math.min(stats.suCoCanXuLy, 5))].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  ))}
                  {stats.suCoCanXuLy > 5 && <span className="text-[10px] text-gray-400 font-black">+{stats.suCoCanXuLy - 5}</span>}
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Monthly Revenue Chart (Bar-style) */}
            <Card className="lg:col-span-2 shadow-sm border-gray-100 overflow-hidden">
              <CardHeader className="bg-gray-50/50 border-b p-5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800">Doanh thu theo tháng</CardTitle>
                  <CardDescription className="text-xs">Theo thực thu từ biên lai (Năm {new Date().getFullYear()})</CardDescription>
                </div>
                <Link href="/dashboard/hoa-don" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group">
                  Chi tiết <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </CardHeader>
              <CardContent className="p-6 pt-10">
                <div className="h-[240px] flex items-end justify-between gap-1.5 md:gap-4 px-2">
                  {stats.doanhThuTheoThang?.map((m) => {
                    const max = Math.max(...(stats.doanhThuTheoThang?.map(x => x.total) || [1000000]));
                    const height = m.total > 0 ? (m.total / max) * 100 : 2;
                    return (
                      <div key={m.thang} className="group relative flex-1 flex flex-col items-center">
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-500 ease-out cursor-pointer ${m.thang === (new Date().getMonth() + 1) ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-gray-100 group-hover:bg-blue-200'}`}
                          style={{ height: `${height}%` }}
                        >
                          {m.total > 0 && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-xl pointer-events-none">
                              {formatCurrency(m.total)}
                            </div>
                          )}
                        </div>
                        <span className="mt-3 text-[10px] font-bold text-gray-400 group-hover:text-blue-600 transition-colors uppercase tracking-widest">T{m.thang}</span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tháng cao điểm</p>
                    <p className="text-lg font-black text-gray-900 leading-none">
                      Tháng {stats.doanhThuTheoThang?.reduce((prev, curr) => prev.total > curr.total ? prev : curr).thang}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tổng năm dự kiến</p>
                    <p className="text-lg font-black text-blue-700 leading-none">{formatCurrency(stats.doanhThuNam)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Key Actions & Recent Activities */}
            <div className="space-y-6">
              <Card className="shadow-sm border-gray-100">
                <CardHeader className="p-5 pb-3">
                  <CardTitle className="text-base font-bold text-gray-800">Việc cần xử lý ngay</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3">
                  <Link href="/dashboard/hoa-don">
                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-orange-50 transition-colors border-l-4 border-orange-500 bg-white shadow-sm mb-3">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-gray-800 leading-tight">Hóa đơn sắp hạn</h4>
                        <p className="text-[10px] text-gray-500">{stats.hoaDonSapDenHan} mục cần thu tiền</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-orange-400" />
                    </div>
                  </Link>

                  <Link href="/dashboard/hop-dong">
                    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-yellow-50 transition-colors border-l-4 border-yellow-500 bg-white shadow-sm">
                      <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-gray-800 leading-tight">Hợp đồng hết hạn</h4>
                        <p className="text-[10px] text-gray-500">{stats.hopDongSapHetHan} mục cần gia hạn</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-yellow-400" />
                    </div>
                  </Link>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-emerald-100 bg-emerald-50/30">
                <CardHeader className="p-5 pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-bold text-emerald-950">Biên lai mới nhất</CardTitle>
                    <PlusCircle className="h-4 w-4 text-emerald-600 cursor-pointer hover:scale-110 transition-transform" />
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <div className="space-y-4">
                    {recentActivities.length > 0 ? (
                      recentActivities.map((act) => (
                        <div key={act._id} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-500"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">
                              {act.hoaDon?.khachThue?.hoTen || 'Thanh toán'}
                            </p>
                            <p className="text-[10px] text-gray-500 truncate">
                              Phòng {act.hoaDon?.phong?.maPhong} • {formatCurrency(act.soTien)}
                            </p>
                          </div>
                          <span className="text-[9px] font-black text-gray-400 uppercase">
                            {new Date(act.ngayThanhToan).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4 italic">Chưa có giao dịch gần đây</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
