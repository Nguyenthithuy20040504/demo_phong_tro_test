'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Home, FileText, AlertCircle, MapPin, Calendar, DollarSign, Phone, Mail, ChevronRight, User, ArrowUpRight, Receipt, Loader2, ShieldCheck, Smartphone, Users, Lock, CheckCircle2, Headset } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from "next-auth/react";
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from 'lucide-react';

export default function KhachThueDashboardPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [approving, setApproving] = useState(false);

  const { data: session, status } = useSession();

  useEffect(() => {
    document.title = 'Tổng quan - Khách thuê';
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      // Gọi ngầm CRON trong môi trường local để kích hoạt tự động hủy/nhắc nhở 
      // (Trong thực tế function này sẽ do Vercel Cron chạy tự động)
      try {
        await fetch('/api/cron/hop-dong/kiem-tra-duyet');
      } catch (e) {
        console.error('Silently ignored cron fetch error');
      }

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

  // Tìm hợp đồng chờ duyệt - chỉ hiển thị cho NGƯỜI ĐẠI DIỆN
  const currentUserId = session?.user?.id;
  const khachThueId = khachThue?._id;
  
  const pendingContracts = hopDongList.filter((hd: any) => {
    if (!['choDuyet', 'choDuyetGiaHan'].includes(hd.trangThai)) return false;
    // Chỉ người đại diện mới thấy nút duyệt
    const daiDienId = typeof hd.nguoiDaiDien === 'object' 
      ? hd.nguoiDaiDien?._id?.toString() 
      : hd.nguoiDaiDien?.toString();
      
    // Khớp ID của NguoiDung hoặc ID của record KhachThue
    return daiDienId === currentUserId || daiDienId === khachThueId?.toString();
  });

  const handleApproval = async (hopDongId: string, action: 'duyet' | 'tuChoi') => {
    setApproving(true);
    try {
      const res = await fetch(`/api/hop-dong/${hopDongId}/duyet`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(action === 'duyet' ? 'Đã duyệt hợp đồng thành công!' : 'Đã từ chối hợp đồng');
        fetchDashboardData(); // Refresh data
      } else {
        toast.error(result.message || 'Có lỗi xảy ra');
      }
    } catch {
      toast.error('Mất kết nối với máy chủ');
    } finally {
      setApproving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return 'Dữ liệu trống từ Server';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Ngày không hợp lệ';
    return d.toLocaleDateString('vi-VN');
  };

  const getHanDuyet = (dateStr: string) => {
    if (!dateStr) return '';
    // Hạn duyệt là 7 phút kể từ ngày tạo/yêu cầu (để phục vụ test nhanh)
    const expDate = new Date(new Date(dateStr).getTime() + 7 * 60 * 1000);
    const now = new Date();
    const diffMs = expDate.getTime() - now.getTime();
    const minutes = Math.ceil(diffMs / (1000 * 60));
    
    const timeStr = expDate.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
    if (minutes < 0) return `${timeStr} (Đã quá hạn)`;
    if (minutes === 0) return `${timeStr} (Sắp hết hạn)`;
    return `${timeStr} (Còn ${minutes} phút)`;
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Banner hợp đồng chờ duyệt */}
      {pendingContracts.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {pendingContracts.map((hd: any) => (
            <Card key={hd._id} className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 rounded-[2rem] overflow-hidden shadow-lg shadow-amber-100/50">
              <CardContent className="p-6 md:p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="size-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="size-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black text-gray-900">
                          {hd.trangThai === 'choDuyetGiaHan' ? 'Yêu cầu gia hạn hợp đồng' : 'Hợp đồng chờ duyệt'}
                        </h3>
                        <Badge className={`${hd.trangThai === 'choDuyetGiaHan' ? 'bg-indigo-500' : 'bg-amber-500'} text-white border-none font-bold text-[10px] px-2.5 rounded-lg animate-pulse`}>
                          {hd.trangThai === 'choDuyetGiaHan' ? 'GIA HẠN' : 'CHỜ DUYỆT'}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-bold text-gray-900">Phòng:</span> {hd.phong?.maPhong} — {hd.phong?.toaNha?.tenToaNha}</p>
                        <p><span className="font-bold text-gray-900">Mã HĐ:</span> {hd.maHopDong}</p>
                        {hd.trangThai === 'choDuyetGiaHan' ? (
                          <>
                            <p className="flex items-center gap-2"><span className="font-bold text-gray-900 min-w-[120px]">Ngày kết thúc cũ:</span> {formatDate(hd.ngayKetThuc)}</p>
                            <p className="flex items-center gap-2 text-indigo-600 font-bold">
                              <span className="text-gray-900 min-w-[120px]">Gia hạn đến:</span> {formatDate(hd.ngayKetThucGiaHan)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p><span className="font-bold text-gray-900">Giá thuê:</span> {formatCurrency(hd.giaThue)}/tháng • <span className="font-bold text-gray-900">Cọc:</span> {formatCurrency(hd.tienCoc)}</p>
                            <p><span className="font-bold text-gray-900">Thời hạn:</span> {formatDate(hd.ngayBatDau)} → {formatDate(hd.ngayKetThuc)}</p>
                          </>
                        )}
                        {hd.ngayTao && (
                          <p>
                            <span className="font-bold text-red-600">Hạn duyệt:</span>{' '}
                            <span className="text-red-500 font-semibold">
                              {getHanDuyet(hd.trangThai === 'choDuyetGiaHan' ? (hd.ngayCapNhat || hd.ngayTao) : hd.ngayTao)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:flex-col">
                    <Button
                      onClick={() => handleApproval(hd._id, 'duyet')}
                      disabled={approving}
                      className="flex-1 md:w-40 h-12 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200 transition-all"
                    >
                      {approving ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                      Duyệt
                    </Button>
                    <Button
                      onClick={() => handleApproval(hd._id, 'tuChoi')}
                      disabled={approving}
                      variant="outline"
                      className="flex-1 md:w-40 h-12 rounded-2xl font-black border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all"
                    >
                      Từ chối
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-6 border-b border-gray-100">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary/60 mb-1">
            <div className="size-1 bg-primary rounded-full" />
            Workspace
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4 ml-auto self-end">
          {/* Room Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-4 p-2 pl-4 bg-white hover:bg-gray-50 rounded-[1.5rem] border border-gray-200 shadow-sm transition-all group">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Home className="size-5" strokeWidth={2.5} />
                </div>
                <div className="flex flex-col text-left pr-2">
                  <span className="text-[14px] font-black tracking-tight text-gray-900 leading-none mb-1">
                    Phòng {currentHopDong?.phong?.maPhong}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {currentHopDong?.phong?.toaNha?.tenToaNha || 'Trọ PiRoom'}
                  </span>
                </div>
                <div className="ml-2 pr-2 border-l border-gray-100 pl-4">
                  <ChevronDown className="size-4 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-[280px] p-2 bg-white/80 backdrop-blur-2xl rounded-[2rem] border-gray-100 shadow-2xl space-y-1">
              <div className="px-4 py-3 mb-1 border-b border-gray-50">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Danh sách phòng thuê</p>
              </div>
              {hopDongList.map((hd: any, idx: number) => {
                const isSelected = selectedRoomIndex === idx;
                return (
                  <DropdownMenuItem 
                    key={hd._id}
                    onClick={() => setSelectedRoomIndex(idx)}
                    className={`
                      flex items-center gap-4 p-3 rounded-[1.25rem] cursor-pointer transition-all mb-1
                      ${isSelected ? "bg-primary text-white focus:bg-primary focus:text-white" : "hover:bg-gray-50 focus:bg-gray-50"}
                    `}
                  >
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20 text-white" : "bg-primary/5 text-primary"}`}>
                       <Home className="size-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-black tracking-tight leading-none mb-1 ${isSelected ? "text-white" : "text-gray-900"}`}>
                        Phòng {hd.phong?.maPhong}
                      </span>
                      <p className={`text-[10px] font-bold uppercase tracking-wider truncate opacity-70`}>
                        {hd.phong?.toaNha?.tenToaNha || 'PiRoom'}
                      </p>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Real-time Status Badge */}
          <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm shrink-0">
            <div className="size-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-emerald-700 text-[11px] font-black uppercase tracking-widest">Dữ liệu thời gian thực</span>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1: Phòng đang xem */}
        <motion.div variants={itemVariants}>
          <div className="relative group bg-white rounded-[2.5rem] p-8 shadow-premium hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100/50 flex flex-col h-full pl-10">
            {/* Left Accent Bar */}
            <div className="absolute left-0 top-0 h-full w-2.5 bg-indigo-500" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="size-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Home className="size-5" />
              </div>
              <span className="text-gray-500 font-bold text-sm tracking-tight">Đang xem phòng</span>
            </div>

            <h3 className="text-4xl font-black text-gray-900 tracking-tight flex items-baseline gap-2 mb-6">
              {currentHopDong?.phong?.maPhong || 'N/A'}
            </h3>

            <div className="mt-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-black uppercase tracking-wider">
                <MapPin className="size-3" />
                {currentHopDong?.phong?.toaNha?.tenToaNha || 'Chưa xác định'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Hóa đơn chờ */}
        <motion.div variants={itemVariants}>
          <div className="relative group bg-white rounded-[2.5rem] p-8 shadow-premium hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100/50 flex flex-col h-full pl-10">
            {/* Left Accent Bar */}
            <div className="absolute left-0 top-0 h-full w-2.5 bg-rose-500" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="size-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Receipt className="size-5" />
              </div>
              <span className="text-gray-500 font-bold text-sm tracking-tight">Tổng hóa đơn chờ</span>
            </div>

            <h3 className="text-4xl font-black text-gray-900 tracking-tight flex items-baseline gap-2 mb-6">
              {soHoaDonChuaThanhToan}
              <span className="text-lg text-gray-300 font-bold">phiếu</span>
            </h3>

            <div className="mt-auto">
              <Link href="/khach-thue/dashboard/hoa-don" className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[11px] font-black uppercase tracking-wider hover:bg-rose-100 transition-colors">
                <ArrowUpRight className="size-3" />
                Xem danh sách thanh toán
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Trạng thái thuê */}
        <motion.div variants={itemVariants}>
          <div className="relative group bg-white rounded-[2.5rem] p-8 shadow-premium hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100/50 flex flex-col h-full pl-10">
            {/* Left Accent Bar */}
            <div className="absolute left-0 top-0 h-full w-2.5 bg-emerald-500" />
            
            <div className="flex items-center gap-3 mb-6">
              <div className="size-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <span className="text-gray-500 font-bold text-sm tracking-tight">Trạng thái thuê</span>
            </div>

            <div className="mb-6">
              {khachThue.trangThai === 'dangThue' || hopDongList.length > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-black text-gray-900 tracking-tight">Active</span>
                </div>
              ) : (
                <span className="text-4xl font-black text-gray-400 tracking-tight">Expired</span>
              )}
            </div>

            <div className="mt-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-black uppercase tracking-wider">
                <div className="size-1.5 bg-emerald-500 rounded-full" />
                Thông tin đã xác thực
              </div>
            </div>
          </div>
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
              <Dialog>
                <DialogTrigger asChild>
                  <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-500 group relative pl-4">
                    {/* Left Accent Bar */}
                    <div className="absolute left-0 top-0 h-full w-2.5 bg-primary" />
                    
                    <CardHeader className="p-8 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Home className="size-5" />
                          </div>
                          <h3 className="text-2xl font-black text-gray-900 tracking-tight">Chi tiết hợp đồng & Phòng thuê</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasMultipleRooms && (
                            <span className="text-[10px] bg-secondary px-4 py-1.5 rounded-full text-secondary-foreground font-black tracking-widest uppercase">
                              PHÒNG {selectedRoomIndex + 1}/{hopDongList.length}
                            </span>
                          )}
                          <div className="size-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <ChevronRight className="size-4" />
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-8 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                        {/* Vị trí */}
                        <div className="p-6 bg-gray-50/80 rounded-3xl border border-gray-100 group-hover:border-primary/20 transition-all">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-3">Vị trí</p>
                          <p className="text-xl font-black text-gray-900 leading-tight mb-2">
                            Phòng {currentHopDong.phong.maPhong} — {currentHopDong.phong.toaNha.tenToaNha}
                          </p>
                          <div className="flex items-start gap-2 text-xs text-gray-500 font-bold leading-relaxed">
                            <MapPin className="size-3.5 shrink-0 text-gray-400 mt-0.5" />
                            <span>{currentHopDong.phong.toaNha.diaChi?.duong}, {currentHopDong.phong.toaNha.diaChi?.phuong}</span>
                          </div>
                        </div>
                        
                        {/* Thời hạn */}
                        <div className="p-6 bg-gray-50/80 rounded-3xl border border-gray-100 group-hover:border-primary/20 transition-all">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-3">Thời hạn hợp đồng</p>
                          <div className="flex items-center justify-between font-black text-sm text-gray-900 mb-4">
                            <span>{formatDate(currentHopDong.ngayBatDau)}</span>
                            <span className="text-[10px] text-gray-300 uppercase tracking-widest px-2">đến</span>
                            <span>{formatDate(currentHopDong.ngayKetThuc)}</span>
                          </div>
                          <div className="w-full bg-gray-200/50 h-2 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: "75%" }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className="bg-primary h-full rounded-full shadow-[0_0_10px_rgba(95,179,166,0.3)]" 
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2">
                        <div className="flex items-center gap-4">
                          <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <DollarSign className="size-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50">Giá thuê</p>
                            <p className="text-2xl font-black text-emerald-600 tracking-tight">{formatCurrency(currentHopDong.phong.giaThue)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 sm:justify-end">
                          <div className="size-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 sm:order-2">
                            <FileText className="size-5" />
                          </div>
                          <div className="sm:text-right sm:order-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-orange-600/50">Mã Hợp Đồng</p>
                            <p className="text-lg font-black text-gray-900 tracking-tight">{currentHopDong.maHopDong}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-10 flex justify-center">
                        <div className="bg-primary/5 px-6 py-2.5 rounded-full border border-primary/10 group-hover:bg-primary/10 transition-colors flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Ấn để xem chi tiết đầy đủ</span>
                          <ChevronRight className="size-3 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-[2.5rem] border-none shadow-premium">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Chi tiết hợp đồng & Phòng thuê</DialogTitle>
                    <DialogDescription>Xem thông tin chi tiết về căn phòng và các điều khoản hợp đồng của bạn.</DialogDescription>
                  </DialogHeader>
                  <div className="relative">
                    {/* Header Image Room */}
                    <div className="h-64 bg-gray-100 relative overflow-hidden">
                      {currentHopDong.phong.anhPhong && currentHopDong.phong.anhPhong.length > 0 ? (
                        <img 
                          src={currentHopDong.phong.anhPhong[0]} 
                          className="w-full h-full object-cover" 
                          alt="Room" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                          <Home className="size-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-8 left-8 text-white">
                        <h2 className="text-4xl font-black tracking-tight">P.{currentHopDong.phong.maPhong}</h2>
                        <p className="font-bold opacity-80 flex items-center gap-2 mt-1">
                          <MapPin className="size-4" /> {currentHopDong.phong.toaNha.tenToaNha} - Tầng {currentHopDong.phong.tang}
                        </p>
                      </div>
                    </div>

                    <div className="p-8 space-y-10">
                      {/* Grid thông tin chung */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-emerald-50/50 p-4 rounded-3xl text-center">
                          <DollarSign className="size-6 text-emerald-600 mx-auto mb-2" />
                          <p className="text-[10px] font-black uppercase text-emerald-600/70 mb-1">Tiền phòng</p>
                          <p className="text-lg font-black text-emerald-800">{formatCurrency(currentHopDong.giaThue)}</p>
                        </div>
                        <div className="bg-orange-50/50 p-4 rounded-3xl text-center">
                          <ShieldCheck className="size-6 text-orange-600 mx-auto mb-2" />
                          <p className="text-[10px] font-black uppercase text-orange-600/70 mb-1">Tiền cọc</p>
                          <p className="text-lg font-black text-orange-800">{formatCurrency(currentHopDong.tienCoc)}</p>
                        </div>
                        <div className="bg-blue-50/50 p-4 rounded-3xl text-center">
                          <Calendar className="size-6 text-blue-600 mx-auto mb-2" />
                          <p className="text-[10px] font-black uppercase text-blue-600/70 mb-1">Ngày vào</p>
                          <p className="text-lg font-black text-blue-800">{formatDate(currentHopDong.ngayBatDau)}</p>
                        </div>
                        <div className="bg-indigo-50/50 p-4 rounded-3xl text-center">
                          <Lock className="size-6 text-indigo-600 mx-auto mb-2" />
                          <p className="text-[10px] font-black uppercase text-indigo-600/70 mb-1">
                            {currentHopDong.trangThai === 'choDuyetGiaHan' ? 'Ngày hết hạn mới' : 'Ngày hết hạn'}
                          </p>
                          <p className="text-lg font-black text-indigo-800">
                            {formatDate(currentHopDong.trangThai === 'choDuyetGiaHan' ? currentHopDong.ngayKetThucGiaHan : currentHopDong.ngayKetThuc)}
                          </p>
                          {currentHopDong.trangThai === 'choDuyetGiaHan' && (
                             <p className="text-[10px] text-indigo-500 font-bold mt-1">(Dự kiến)</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Cột 1: Dịch vụ & Tiện nghi */}
                        <div className="space-y-8">
                          <section>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2 mb-4">
                              <Receipt className="size-4 text-primary" /> Bảng giá dịch vụ
                            </h3>
                            <div className="space-y-3 bg-gray-50/80 p-5 rounded-[2rem]">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Tiền điện</span>
                                <span className="font-bold text-gray-900">{formatCurrency(currentHopDong.giaDien)}/kWh</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 font-medium">Tiền nước</span>
                                <span className="font-bold text-gray-900">{formatCurrency(currentHopDong.giaNuoc)}/m³</span>
                              </div>
                              {currentHopDong.phiDichVu?.map((dv: any, i: number) => (
                                <div key={i} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500 font-medium">{dv.ten}</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(dv.gia)}</span>
                                </div>
                              ))}
                            </div>
                          </section>

                          <section>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2 mb-4">
                              <Smartphone className="size-4 text-primary" /> Tiện nghi phòng
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {currentHopDong.phong.tienNghi?.length > 0 ? (
                                currentHopDong.phong.tienNghi.map((tn: string, i: number) => (
                                  <Badge key={i} variant="outline" className="px-4 py-2 rounded-xl bg-white border-gray-100 font-bold text-xs">
                                    {tn}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs italic text-gray-400">Không có thông tin tiện nghi</span>
                              )}
                            </div>
                          </section>
                        </div>

                        {/* Cột 2: Thành viên & Liên hệ */}
                        <div className="space-y-8">
                          <section>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 flex items-center gap-2 mb-4">
                              <Users className="size-4 text-primary" /> Thành viên sống tại phòng
                            </h3>
                            <div className="space-y-3">
                              {currentHopDong.khachThueId?.map((member: any) => (
                                <div key={member._id} className="flex items-center gap-3 p-3 bg-white border border-gray-50 rounded-2xl shadow-sm">
                                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {member.hoTen?.charAt(0)}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-black text-gray-900">{member.hoTen}</p>
                                    <p className="text-[10px] text-gray-400">{member.soDienThoai}</p>
                                  </div>
                                  {currentHopDong.nguoiDaiDien?._id === member._id && (
                                    <Badge className="text-[8px] bg-indigo-500 font-black px-2 py-0">ĐẠI DIỆN</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </section>

                          <section className="bg-primary/5 p-6 rounded-[2.5rem]">
                            <h4 className="text-xs font-black uppercase text-primary mb-3">Lưu ý hợp đồng</h4>
                            <p className="text-xs text-gray-600 leading-relaxed italic">
                              "{currentHopDong.dieuKhoan || 'Thực hiện đầy đủ quy định của tòa nhà và pháp luật hiện hành.'}"
                            </p>
                          </section>
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.div>
          )}
        </div>

        {/* Cột phụ: Hóa đơn gần nhất & Liên hệ */}
        <div className="lg:col-span-2 space-y-8">
          {hoaDonGanNhat && (
            <motion.div variants={itemVariants} className="h-full">
              <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden group relative pl-4 h-full">
                {/* Left Accent Bar */}
                <div className="absolute left-0 top-0 h-full w-2.5 bg-emerald-500" />
                
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-black text-gray-900">Hóa đơn gần nhất</CardTitle>
                    <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Receipt className="size-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 flex flex-col h-[calc(100%-100px)]">
                  <div className="flex items-center justify-between pb-6 border-b border-gray-50 mb-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Kỳ hóa đơn</p>
                      <p className="text-sm font-bold text-gray-900">Tháng {hoaDonGanNhat.thang}/{hoaDonGanNhat.nam}</p>
                    </div>
                    {hoaDonGanNhat.trangThai === 'daThanhToan' ? (
                      <Badge className="bg-emerald-500 text-white rounded-lg px-3 py-1 font-black text-[10px] uppercase">Đã thanh toán</Badge>
                    ) : (
                      <Badge variant="destructive" className="rounded-lg px-3 py-1 font-black text-[10px] uppercase">Chờ thanh toán</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-400">Tiền phòng (P.{hoaDonGanNhat.phong?.maPhong})</span>
                      <span className="text-gray-900">{formatCurrency(hoaDonGanNhat.tienPhong)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-400">Dịch vụ & Tiện ích</span>
                      <span className="text-gray-900">{formatCurrency(hoaDonGanNhat.tienDien + hoaDonGanNhat.tienNuoc)}</span>
                    </div>
                    <div className="flex justify-between pt-6 mt-6 border-t border-gray-100 flex-wrap gap-2">
                      <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Tổng cộng</span>
                      <span className="text-2xl font-black text-emerald-600 tracking-tighter">{formatCurrency(hoaDonGanNhat.tongTien)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <Link href="/khach-thue/dashboard/hoa-don" className="block w-full">
                      <Button className="w-full rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-95">
                        Xem chi tiết hóa đơn
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

        </div>
      </div>

      {/* Full-width Contact Section below the grid */}
      <motion.div 
        variants={itemVariants}
        className="mt-8"
      >
        <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden relative group">
          {/* Left Decorator - Solid Primary */}
          <div className="absolute left-0 top-0 h-full w-2.5 bg-primary" />
          
          <CardHeader className="p-8 pb-0 pl-12 relative">
            <div className="flex items-center gap-2">
              <Headset className="size-5 text-primary" />
              <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Liên hệ Chủ nhà</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Hỗ trợ khách thuê & Tư vấn dịch vụ 24/7</CardDescription>
          </CardHeader>

          <CardContent className="p-8 pt-6 pl-12 flex flex-col md:flex-row items-center gap-8 justify-between relative">
            {/* Left: Branding & Profile */}
            <div className="flex items-center gap-6">
              <div className="relative shrink-0">
                <div className="size-16 md:size-20 rounded-[2rem] bg-primary text-white flex items-center justify-center text-2xl md:text-3xl font-black shadow-xl shadow-primary/20 ring-[6px] ring-white">
                  {dashboardData?.chuNha?.hoTen?.charAt(0) || 'A'}
                </div>
                <div className="absolute -bottom-1 -right-1 size-7 bg-white rounded-full flex items-center justify-center shadow-lg ring-4 ring-emerald-50">
                  <div className="size-3 rounded-full bg-emerald-500" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-none">
                    {dashboardData?.chuNha?.hoTen || 'Thuy Test'}
                  </h4>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black px-2.5 py-0.5">QUẢN LÝ TRỰC TIẾP</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> Phản hồi trong ~15 phút
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Premium Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
              <a 
                href={`tel:${dashboardData?.chuNha?.soDienThoai}`}
                className="w-full sm:w-auto group/call"
              >
                <Button className="w-full sm:w-auto h-16 px-10 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border-emerald-100/50 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center gap-4 transition-all hover:scale-[1.03] active:scale-95 shadow-md hover:shadow-emerald-100">
                  <div className="size-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center group-hover/call:rotate-12 transition-transform">
                    <Phone className="size-4" />
                  </div>
                  {dashboardData?.chuNha?.soDienThoai || 'GỌI NGAY'}
                </Button>
              </a>
              <a 
                href={`mailto:${dashboardData?.chuNha?.email}`}
                className="w-full sm:w-auto group/mail"
              >
                <Button className="w-full sm:w-auto h-16 px-10 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 border-indigo-100/50 rounded-3xl font-black text-sm uppercase tracking-widest flex items-center gap-4 transition-all hover:scale-[1.03] active:scale-95 shadow-md hover:shadow-indigo-100">
                  <div className="size-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center group-hover/mail:-rotate-12 transition-transform">
                    <Mail className="size-4" />
                  </div>
                  Gửi yêu cầu Email
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
