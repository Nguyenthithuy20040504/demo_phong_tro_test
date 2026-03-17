'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, FileText, AlertCircle, MapPin, Calendar, DollarSign, Phone, Mail, ChevronRight, User, ArrowUpRight, Receipt, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from "next-auth/react";
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function KhachThueDashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);

  const { data: session, status } = useSession();

  useEffect(() => {
    document.title = 'Tổng quan - Khách thuê';
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/auth/khach-thue/me', {
        credentials: "include",   
        cache: "no-store",
      });

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        toast.error('Không thể tải thông tin');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
        <p className="text-sm text-muted-foreground animate-pulse">Đang đồng bộ dữ liệu của bạn...</p>
      </div>
    );
  }

  if (!dashboardData || (!dashboardData.hopDongList || dashboardData.hopDongList.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-blue-50/50 p-10 rounded-[3rem] mb-8"
        >
          <Home className="h-20 w-20 text-blue-500/40" />
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Chưa có thông tin phòng thuê</h2>
        <p className="text-gray-500 max-w-md mb-10 leading-relaxed">
          Chào mừng bạn tham gia hệ thống. Hiện tại tài khoản của bạn chưa được liên kết với bất kỳ hợp đồng thuê phòng nào đang hoạt động.
        </p>
        <Card className="w-full max-w-lg border-none shadow-premium bg-white/60 backdrop-blur-xl rounded-[2.5rem]">
          <CardContent className="p-8">
            <h3 className="font-bold text-gray-900 mb-6 flex items-center justify-center gap-3 italic">
              <Phone className="h-5 w-5 text-primary" /> Liên hệ hỗ trợ kỹ thuật
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                <div className="bg-primary/10 p-3 rounded-xl mb-3"><Phone className="h-5 w-5 text-primary" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Hotline</span>
                <strong className="text-gray-900">0123-456-789</strong>
              </div>
              <div className="flex flex-col items-center p-4 bg-white rounded-2xl shadow-sm border border-gray-50">
                <div className="bg-indigo-50 p-3 rounded-xl mb-3"><Mail className="h-5 w-5 text-indigo-500" /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Email</span>
                <strong className="text-gray-900">support@rent.vn</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { khachThue, hopDongList, soHoaDonChuaThanhToan, hoaDonGanNhat } = dashboardData;
  const currentHopDong = hopDongList[selectedRoomIndex] || hopDongList[0];
  const hasMultipleRooms = hopDongList.length > 1;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN');
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-gray-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-20">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Tổng quan</h1>
          {hasMultipleRooms && (
            <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-xl p-1.5 rounded-[1.25rem] shadow-premium border border-gray-100/50">
              {hopDongList.map((hd: any, idx: number) => (
                <Button
                  key={hd._id}
                  variant={selectedRoomIndex === idx ? "default" : "ghost"}
                  onClick={() => setSelectedRoomIndex(idx)}
                  className={`rounded-[1rem] px-6 py-2.5 h-10 text-xs font-black transition-all duration-500 ${
                    selectedRoomIndex === idx 
                      ? "shadow-xl shadow-primary/30 bg-primary text-white scale-105" 
                      : "text-muted-foreground hover:bg-gray-50 hover:text-primary"
                  }`}
                >
                  P.{hd.phong?.maPhong}
                </Button>
              ))}
            </div>
          )}
        </div>
        <p className="text-gray-500 font-medium md:text-right hidden sm:block">
          Xin chào, <span className="text-primary font-bold">{khachThue.hoTen}</span> 👋
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="size-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                  <Home className="size-7" />
                </div>
                <div className="flex items-center gap-2">
                  {hasMultipleRooms && (
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none px-2 rounded-lg font-black text-[10px]">
                      {hopDongList.length} PHÒNG
                    </Badge>
                  )}
                  <Link href="/khach-thue/dashboard/hoa-don" className="text-gray-300 hover:text-primary transition-colors">
                    <ArrowUpRight className="size-6" />
                  </Link>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Đang xem phòng</p>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight flex items-baseline gap-2">
                {currentHopDong?.phong?.maPhong || 'N/A'}
                {hasMultipleRooms && <span className="text-xs text-primary animate-pulse font-black">(Phòng {selectedRoomIndex + 1})</span>}
              </h3>
              <p className="text-sm text-gray-400 mt-2 font-medium truncate">
                {currentHopDong?.phong?.toaNha?.tenToaNha || 'Chưa xác định'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="size-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors duration-500">
                  <Receipt className="size-7" />
                </div>
                <Link href="/khach-thue/dashboard/hoa-don" className="text-gray-300 hover:text-primary transition-colors">
                  <ArrowUpRight className="size-6" />
                </Link>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Tổng hóa đơn chờ</p>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                {soHoaDonChuaThanhToan} <span className="text-sm text-gray-300 font-bold">hóa đơn</span>
              </h3>
              <p className={`text-sm mt-2 font-bold ${soHoaDonChuaThanhToan > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {soHoaDonChuaThanhToan > 0 ? 'Tổng hợp tất cả các phòng' : 'Đã thanh toán đầy đủ'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-premium bg-white rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="size-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-500">
                  <AlertCircle className="size-7" />
                </div>
                <Link href="/khach-thue/dashboard/su-co" className="text-gray-300 hover:text-primary transition-colors">
                  <ArrowUpRight className="size-6" />
                </Link>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">Trạng thái thuê</p>
              <div className="mt-1">
                {khachThue.trangThai === 'dangThue' || hopDongList.length > 0 ? (
                  <Badge className="bg-emerald-500 text-white border-none px-4 py-1.5 rounded-xl font-bold">Đang hoạt động</Badge>
                ) : (
                  <Badge variant="secondary" className="px-4 py-1.5 rounded-xl font-bold">Không hoạt động</Badge>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-4 font-medium italic">Thông tin đã xác thực</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Cột chính: Thông tin chi tiết */}
        <div className="lg:col-span-3 space-y-8">
          {currentHopDong && (
            <motion.div 
              key={currentHopDong._id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="flex items-center justify-between text-xl font-black text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-xl text-primary"><Home className="size-5" /></div>
                      Chi tiết hợp đồng & Phòng thuê
                    </div>
                    {hasMultipleRooms && (
                      <span className="text-[10px] bg-secondary px-3 py-1 rounded-full text-secondary-foreground font-bold tracking-widest">
                        PHÒNG {selectedRoomIndex + 1}/{hopDongList.length}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-5 bg-secondary/20 rounded-2xl border border-transparent hover:border-primary/20 transition-all cursor-default group">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Vị trí</p>
                        <p className="font-bold text-gray-900 leading-tight group-hover:text-primary transition-colors">
                          Phòng {currentHopDong.phong.maPhong} - {currentHopDong.phong.toaNha.tenToaNha}
                        </p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                          <MapPin className="size-3" /> {currentHopDong.phong.toaNha.diaChi?.duong}, {currentHopDong.phong.toaNha.diaChi?.phuong}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg"><DollarSign className="size-4" /></div>
                          <span className="text-xs font-bold text-gray-500">Giá thuê</span>
                        </div>
                        <span className="text-lg font-black text-emerald-600">{formatCurrency(currentHopDong.phong.giaThue)}</span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-5 bg-secondary/10 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Thời hạn hợp đồng</p>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-900">{formatDate(currentHopDong.ngayBatDau)}</span>
                          <span className="text-[10px] text-gray-300">đến</span>
                          <span className="text-xs font-bold text-gray-900">{formatDate(currentHopDong.ngayKetThuc)}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "75%" }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="bg-primary h-full rounded-full" 
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <div className="bg-orange-50 text-orange-600 p-2 rounded-lg"><FileText className="size-4" /></div>
                          <span className="text-xs font-bold text-gray-500">Mã Hợp Đồng</span>
                        </div>
                        <span className="text-sm font-black text-gray-900">{currentHopDong.maHopDong}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Cột phụ: Hóa đơn gần nhất & Liên hệ */}
        <div className="lg:col-span-2 space-y-8">
          {hoaDonGanNhat && (
            <motion.div variants={itemVariants}>
              <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <CardTitle className="text-xl font-black text-gray-900">Hóa đơn gần nhất</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                  <div className="flex items-center justify-between pb-6 border-b border-gray-50">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Kỳ hóa đơn</p>
                      <p className="text-sm font-bold text-gray-900">Tháng {hoaDonGanNhat.thang}/{hoaDonGanNhat.nam}</p>
                    </div>
                    {hoaDonGanNhat.trangThai === 'daThanhToan' ? (
                      <Badge className="bg-emerald-500 text-white rounded-lg">Đã thanh toán</Badge>
                    ) : (
                      <Badge variant="destructive" className="rounded-lg">Chờ xử lý</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-400">Tiền phòng (P.{hoaDonGanNhat.phong?.maPhong})</span>
                      <span className="text-gray-900">{formatCurrency(hoaDonGanNhat.tienPhong)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-gray-400">Dịch vụ & Tiện ích</span>
                      <span className="text-gray-900">{formatCurrency(hoaDonGanNhat.tienDien + hoaDonGanNhat.tienNuoc)}</span>
                    </div>
                    <div className="flex justify-between pt-4 mt-4 border-t border-gray-100">
                      <span className="text-sm font-black text-gray-900 uppercase">Tổng cộng</span>
                      <span className="text-xl font-black text-primary">{formatCurrency(hoaDonGanNhat.tongTien)}</span>
                    </div>
                  </div>
                  
                  <Link href="/khach-thue/dashboard/hoa-don" className="block w-full">
                    <Button className="w-full rounded-2xl h-14 font-black shadow-lg">Xem chi tiết hóa đơn</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-sm bg-secondary/10 rounded-[2rem] overflow-hidden p-8">
              <h3 className="font-black text-gray-900 mb-6">Hotline Hỗ Trợ</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                  <div className="bg-primary/5 p-2 rounded-xl text-primary"><Phone className="size-4" /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gọi phản ánh</span>
                    <span className="text-sm font-black text-gray-900">0123.456.789</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                  <div className="bg-indigo-50 p-2 rounded-xl text-indigo-500"><Mail className="size-4" /></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email cứu hộ</span>
                    <span className="text-sm font-black text-gray-900">sos@rent.vn</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
