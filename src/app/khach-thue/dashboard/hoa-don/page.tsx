'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Receipt, 
  Calendar, 
  CreditCard, 
  Loader2, 
  Zap, 
  Droplets, 
  Home, 
  FileText, 
  Filter, 
  Download,
  FileSpreadsheet,
  Camera,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { HoaDon } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';

export default function HoaDonKhachThuePage() {
  const [hoaDons, setHoaDons] = useState<HoaDon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHoaDon, setSelectedHoaDon] = useState<HoaDon | null>(null);

  // Filter States
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentImage, setPaymentImage] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    document.title = 'Hóa đơn - Khách thuê';
    fetchHoaDons();
  }, []);

  const fetchHoaDons = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hoa-don?limit=1000');
      const result = await response.json();
      if (result.success) {
        setHoaDons(result.data || []);
      } else {
        toast.error('Không thể tải danh sách hóa đơn');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const filteredHoaDons = useMemo(() => {
    return hoaDons.filter((hd) => {
      const matchMonth = filterMonth === 'all' || hd.thang.toString() === filterMonth;
      const matchStatus = filterStatus === 'all' || hd.trangThai === filterStatus;
      const matchYear = filterYear === 'all' || hd.nam.toString() === filterYear;
      return matchMonth && matchStatus && matchYear;
    }).sort((a, b) => {
      const dateA = new Date(a.ngayTao || 0).getTime();
      const dateB = new Date(b.ngayTao || 0).getTime();
      return dateB - dateA;
    });
  }, [hoaDons, filterMonth, filterStatus, filterYear]);

  const paginatedHoaDons = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHoaDons.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHoaDons, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredHoaDons.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMonth, filterStatus, filterYear]);

  const fmt = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

  const fmtDate = (date: string | Date) => new Date(date).toLocaleDateString('vi-VN');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'daThanhToan':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Đã thanh toán</Badge>;
      case 'chuaThanhToan':
        return <Badge variant="outline" className="text-orange-500 border-orange-500/20 bg-orange-500/5">Chưa thanh toán</Badge>;
      case 'daThanhToanMotPhan':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Một phần</Badge>;
      case 'quaHan':
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20">Quá hạn</Badge>;
      case 'choDuyet':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Chờ duyệt</Badge>;
      case 'tuChoi':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20">Từ chối</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'daThanhToan': return 'Đã thanh toán';
      case 'chuaThanhToan': return 'Chưa thanh toán';
      case 'daThanhToanMotPhan': return 'Một phần';
      case 'quaHan': return 'Quá hạn';
      case 'choDuyet': return 'Chờ duyệt';
      case 'tuChoi': return 'Từ chối';
      default: return status;
    }
  };

  // Export Functions
  const exportToExcel = () => {
    if (filteredHoaDons.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const headers = ['Mã hóa đơn', 'Kỳ', 'Tiền phòng', 'Tiền điện', 'Tiền nước', 'Tổng tiền', 'Hạn thanh toán', 'Trạng thái'];
    const csvContent = [
      headers.join(','),
      ...filteredHoaDons.map(hd => [
        hd.maHoaDon,
        `Tháng ${hd.thang}/${hd.nam}`,
        hd.tienPhong,
        hd.tienDien,
        hd.tienNuoc,
        hd.tongTien,
        fmtDate(hd.hanThanhToan),
        getStatusText(hd.trangThai)
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `hoa_don_thue_phong_${new Date().getTime()}.csv`);
    toast.success('Đã xuất file Excel (CSV) thành công');
  };

  const exportToPDF = () => {
    if (filteredHoaDons.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('DANH SACH HOA DON THUE PHONG', 14, 22);
    doc.setFontSize(11);
    doc.text(`Ngay xuat: ${fmtDate(new Date())}`, 14, 30);
    
    const tableColumn = ["Ma HD", "Ky", "Tien Phong", "Tien Dien", "Tien Nuoc", "Tong Tien", "Han TT", "Trang Thai"];
    const tableRows = filteredHoaDons.map(hd => [
      hd.maHoaDon,
      `${hd.thang}/${hd.nam}`,
      fmt(hd.tienPhong),
      fmt(hd.tienDien),
      fmt(hd.tienNuoc),
      fmt(hd.tongTien),
      fmtDate(hd.hanThanhToan),
      getStatusText(hd.trangThai)
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] } // Primary color
    });

    doc.save(`danh_sach_hoa_don_${new Date().getTime()}.pdf`);
    toast.success('Đã xuất file PDF thành công');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
        <p className="text-sm text-muted-foreground animate-pulse">Đang tải danh sách hóa đơn...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-1">
            <Home className="size-3" />
            <Link href="/khach-thue/dashboard" className="hover:text-primary transition-colors cursor-pointer capitalize">Trang chủ</Link>
            <ChevronRight className="size-3" />
            <span className="text-primary">Hóa đơn</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
             Hóa đơn của tôi
          </h1>
          <p className="text-gray-500 font-medium text-xs leading-none">
            Theo dõi và thanh toán các khoản phí lưu trú định kỳ
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-14 px-8 rounded-[1.5rem] bg-gradient-to-r from-[#5fb3a6] to-[#4ea296] text-white font-black uppercase text-[11px] tracking-widest border-none shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:scale-[1.03] transition-all active:scale-95 group">
                <Download className="size-4 stroke-[3px] mr-3 group-hover:-translate-y-1 transition-transform" />
                Xuất file
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 bg-white/80 backdrop-blur-2xl rounded-[1.5rem] border-gray-100 shadow-2xl">
              <DropdownMenuLabel className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Định dạng xuất</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-50" />
              <DropdownMenuItem onClick={exportToPDF} className="p-3 gap-3 rounded-xl focus:bg-primary/5 cursor-pointer">
                <div className="size-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                  <FileText className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-900">Xuất PDF</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Portable Document</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="p-3 gap-3 rounded-xl focus:bg-primary/5 cursor-pointer">
                <div className="size-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-900">Xuất Excel</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Spreadsheet Data</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Advanced Filter Bar - Revitalized */}
      <Card className="border-2 shadow-premium rounded-[2.5rem] bg-white/80 backdrop-blur-md border-gray-100 overflow-hidden relative group">
        {/* Subtle decorative accent */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardContent className="p-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Label Button */}
            <div className="flex items-center gap-2 px-5 h-11 bg-gray-50/80 rounded-2xl border border-gray-100 shadow-inner">
              <Filter className="size-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Bộ lọc</span>
            </div>

            {/* Filter Tháng */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[160px] h-11 rounded-2xl bg-white border-gray-100/50 text-xs font-bold text-gray-800 shadow-sm hover:shadow-md hover:border-primary/20 transition-all focus:ring-primary/10">
                <SelectValue placeholder="Tháng" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                <SelectItem value="all" className="rounded-xl">Tất cả tháng</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()} className="rounded-xl">Tháng {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Năm */}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[130px] h-11 rounded-2xl bg-white border-gray-100/50 text-xs font-bold text-gray-800 shadow-sm hover:shadow-md hover:border-primary/20 transition-all focus:ring-primary/10">
                <SelectValue placeholder="Năm" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                <SelectItem value="all" className="rounded-xl">Tất cả năm</SelectItem>
                <SelectItem value="2024" className="rounded-xl">Năm 2024</SelectItem>
                <SelectItem value="2025" className="rounded-xl">Năm 2025</SelectItem>
                <SelectItem value="2026" className="rounded-xl">Năm 2026</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Trạng thái */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px] h-11 rounded-2xl bg-white border-gray-100/50 text-xs font-bold text-gray-800 shadow-sm hover:shadow-md hover:border-primary/20 transition-all focus:ring-primary/10">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-gray-100 shadow-2xl">
                <SelectItem value="all" className="rounded-xl font-bold">Tất cả trạng thái</SelectItem>
                <SelectItem value="daThanhToan" className="rounded-xl">Đã thanh toán</SelectItem>
                <SelectItem value="chuaThanhToan" className="rounded-xl">Chưa thanh toán</SelectItem>
                <SelectItem value="choDuyet" className="rounded-xl">Chờ duyệt</SelectItem>
                <SelectItem value="quaHan" className="rounded-xl">Quá hạn</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="ghost" 
              onClick={() => {
                setFilterMonth('all');
                setFilterStatus('all');
                setFilterYear(new Date().getFullYear().toString());
              }}
              className="px-4 h-11 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-2xl transition-all"
            >
              Đặt lại
            </Button>
          </div>

          {/* Floating Result Badge - Primary Light Style */}
          <div className="hidden lg:flex items-center px-6 h-11 bg-white border border-primary/10 rounded-2xl shadow-lg shadow-primary/5 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-300">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
              Kết quả của bạn 
              <span className="text-secondary text-base font-black font-mono">
                {filteredHoaDons.length}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {filteredHoaDons.length === 0 ? (
        <Card className="border-2 border-gray-100 shadow-premium bg-white/60 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-24 text-center px-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-blue-50/50 p-10 rounded-[3rem] mb-8"
            >
              <Receipt className="h-20 w-20 text-blue-500/30" strokeWidth={1} />
            </motion.div>
            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Không tìm thấy hóa đơn</h2>
            <p className="text-gray-500 max-w-sm mx-auto leading-relaxed font-medium">
              Dữ liệu theo bộ lọc hiện tại trống. Vui lòng thay đổi tiêu chí tìm kiếm.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterMonth('all');
                setFilterStatus('all');
              }}
              className="mt-10 rounded-[1.25rem] h-12 px-8 font-black uppercase text-[11px] tracking-widest border-2 border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-all"
            >
              Xóa tất cả bộ lọc
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-gray-200 shadow-premium rounded-[2.5rem] overflow-hidden bg-white/90 backdrop-blur-xl group">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 border-b border-gray-100/50 h-12 hover:bg-gray-50/50">
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 pl-8">Mã hóa đơn</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Loại</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Kỳ thanh toán</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Tổng cộng</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Ngày tạo</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Hạn cuối</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 pr-8">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedHoaDons.map((hd) => (
                    <TableRow
                      key={hd._id}
                      className="hover:bg-primary/5 transition-all cursor-pointer group/row h-14"
                      onClick={() => setSelectedHoaDon(hd)}
                    >
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover/row:bg-primary group-hover/row:text-white transition-all shadow-sm">
                            <Receipt className="size-4" />
                          </div>
                          <span className="font-semibold text-[13px] text-gray-900 tracking-tight">{hd.maHoaDon}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {hd.loai === 'chi' || hd.maHoaDon.startsWith('HC-') ? (
                          <Badge variant="outline" className="text-gray-700 border-gray-200 text-[10px] uppercase font-semibold">Hoàn tiền</Badge>
                        ) : hd.maHoaDon.startsWith('COC-') ? (
                          <Badge variant="outline" className="text-gray-700 border-gray-200 text-[10px] uppercase font-semibold">Tiền cọc</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-700 border-gray-200 text-[10px] uppercase font-semibold">Tiền phòng</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">T. {hd.thang}/{hd.nam}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold text-gray-900">{fmt(hd.tongTien)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">{fmtDate(hd.ngayTao)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">
                          {fmtDate(hd.hanThanhToan)}
                        </span>
                      </TableCell>
                      <TableCell className="pr-8">{getStatusBadge(hd.trangThai)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination UI */}
            <div className="px-8 py-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
              <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Hiển thị <span className="text-gray-900">{paginatedHoaDons.length}</span> trên <span className="text-gray-900">{filteredHoaDons.length}</span> kết quả
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl border-gray-200"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl border-gray-200"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                
                <div className="px-4 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-xs font-black min-w-[3rem]">
                  {currentPage} / {totalPages || 1}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl border-gray-200"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-xl border-gray-200"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Số hàng:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(val) => {
                  setItemsPerPage(Number(val));
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-[70px] h-9 rounded-xl text-xs font-bold border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Guide - Compact Light Section */}
      <Card className="border-2 border-primary/20 shadow-premium rounded-[2.5rem] bg-gradient-to-br from-primary/10 via-white to-white overflow-hidden relative group">
        <div className="absolute -bottom-24 -right-24 size-64 bg-primary/5 rounded-full blur-3xl" />
        
        <CardContent className="p-6 md:p-10 flex flex-col md:flex-row items-center gap-6 md:gap-10 relative z-10">
          <div className="size-20 rounded-[1.5rem] bg-white shadow-lg shadow-primary/10 border border-primary/5 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-all duration-500">
            <CreditCard className="size-8" strokeWidth={1.5} />
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-center md:justify-start">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                Hướng dẫn thanh toán
              </h3>
              <div className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full border border-primary/20 self-center">
                System Verified
              </div>
            </div>
            
            <p className="text-gray-500 font-medium leading-normal max-w-2xl text-sm">
              Bạn có thể dễ dàng thanh toán trực tiếp tại văn phòng PiRoom hoặc sử dụng hình thức chuyển khoản ngân hàng 24/7. 
              Dữ liệu của bạn được mã hóa và bảo mật tuyệt đối qua hệ thống của chúng tôi.
            </p>
            
            <div className="flex flex-wrap items-center gap-3 pt-2 justify-center md:justify-start">
               <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-600">
                 <Zap className="size-3 text-emerald-500" /> Nhanh chóng
               </div>
               <div className="flex items-center gap-2 bg-gray-50/80 border border-gray-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-600">
                 <ShieldCheck className="size-3 text-primary" /> Bảo mật 100%
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog chi tiết hóa đơn - Rich Data Reversion */}
      <Dialog open={!!selectedHoaDon} onOpenChange={(open) => !open && setSelectedHoaDon(null)}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedHoaDon && (
            <div className="space-y-4 md:space-y-6 pt-2">
              <DialogHeader>
                <DialogTitle className="text-lg md:text-xl">Chi tiết hóa đơn</DialogTitle>
                <div className="text-xs md:text-sm text-gray-500">
                  Thông tin chi tiết hóa đơn {selectedHoaDon.maHoaDon}
                </div>
              </DialogHeader>

              {/* Invoice Header */}
              <div className="text-center border-b pb-3 md:pb-4">
                <h2 className="text-lg md:text-2xl font-bold">
                  {selectedHoaDon.loai === 'chi' || selectedHoaDon.maHoaDon.startsWith('HC-') 
                    ? 'HÓA ĐƠN HOÀN CỌC' 
                    : selectedHoaDon.maHoaDon.startsWith('COC-') 
                      ? 'HÓA ĐƠN TIỀN CỌC' 
                      : 'HÓA ĐƠN THUÊ PHÒNG'}
                </h2>
                <p className="text-base md:text-lg text-gray-600">{selectedHoaDon.maHoaDon}</p>
              </div>

              {/* Ghi chú (Đưa lên đầu) */}
              {selectedHoaDon.ghiChu && (
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                  <h3 className="text-sm md:text-base font-semibold mb-1 text-emerald-800 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Ghi chú
                  </h3>
                  <p className="text-xs md:text-sm text-emerald-700">{selectedHoaDon.ghiChu}</p>
                </div>
              )}

              {/* Thông tin phòng & thanh toán */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <h3 className="text-sm md:text-base font-semibold mb-2">Thông tin phòng</h3>
                  <p className="text-xs md:text-sm"><strong>Phòng:</strong> {(selectedHoaDon.phong as any)?.maPhong || '—'}</p>
                  <p className="text-xs md:text-sm"><strong>Tòa nhà:</strong> {(selectedHoaDon.phong as any)?.toaNha?.tenToaNha || '—'}</p>
                  <p className="text-xs md:text-sm"><strong>Hợp đồng:</strong> {(selectedHoaDon as any).hopDong?.maHopDong || 'HĐ Gốc'}</p>
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-semibold mb-2">Thông tin thanh toán</h3>
                  <p className="text-xs md:text-sm"><strong>Tháng/Năm:</strong> {selectedHoaDon.thang}/{selectedHoaDon.nam}</p>
                  <p className="text-xs md:text-sm"><strong>Hạn thanh toán:</strong> {fmtDate(selectedHoaDon.hanThanhToan)}</p>
                  <p className="text-xs md:text-sm"><strong>Trạng thái:</strong> {getStatusBadge(selectedHoaDon.trangThai)}</p>
                </div>
              </div>

              <Separator />

              {/* Chỉ số điện nước (Nếu có) */}
              {!selectedHoaDon.maHoaDon.startsWith('COC-') && !selectedHoaDon.maHoaDon.startsWith('HC-') && (
                <div>
                  <h3 className="text-sm md:text-base font-semibold mb-3">Chỉ số điện nước</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-amber-600">
                        <Zap className="size-4" /> Điện
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Chỉ số:</span>
                          <span>{selectedHoaDon.chiSoDienBanDau} → {selectedHoaDon.chiSoDienCuoiKy}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Sử dụng:</span>
                          <span>{selectedHoaDon.soDien} kWh</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2 text-blue-600">
                        <Droplets className="size-4" /> Nước
                      </h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Chỉ số:</span>
                          <span>{selectedHoaDon.chiSoNuocBanDau} → {selectedHoaDon.chiSoNuocCuoiKy}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Sử dụng:</span>
                          <span>{selectedHoaDon.soNuoc} m³</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chi tiết các khoản phí */}
              <div>
                <h3 className="text-sm md:text-base font-semibold mb-3">Chi tiết hóa đơn</h3>
                <div className="space-y-2 text-xs md:text-sm">
                  <div className="flex justify-between">
                    <span>Tiền phòng</span>
                    <span>{fmt(selectedHoaDon.tienPhong)}</span>
                  </div>
                  {(selectedHoaDon.tienDien > 0 || selectedHoaDon.soDien > 0) && (
                    <div className="flex justify-between">
                      <span>Tiền điện ({selectedHoaDon.soDien} kWh)</span>
                      <span>{fmt(selectedHoaDon.tienDien)}</span>
                    </div>
                  )}
                  {(selectedHoaDon.tienNuoc > 0 || selectedHoaDon.soNuoc > 0) && (
                    <div className="flex justify-between">
                      <span>Tiền nước ({selectedHoaDon.soNuoc} m³)</span>
                      <span>{fmt(selectedHoaDon.tienNuoc)}</span>
                    </div>
                  )}
                  {selectedHoaDon.phiDichVu && selectedHoaDon.phiDichVu.map((phi, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{phi.ten}</span>
                      <span>{fmt(phi.gia)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-3 md:pt-4">
                <div className="flex justify-between text-base md:text-lg font-semibold text-[#5fb3a6]">
                  <span>Tổng tiền:</span>
                  <span>{fmt(selectedHoaDon.tongTien)}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span>Đã thanh toán:</span>
                  <span className="text-green-600 font-medium">{fmt(selectedHoaDon.daThanhToan)}</span>
                </div>
                <div className="flex justify-between text-xs md:text-sm">
                  <span>Còn lại:</span>
                  <span className={selectedHoaDon.conLai > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                    {fmt(selectedHoaDon.conLai)}
                  </span>
                </div>
              </div>

              {/* Thông tin thời gian */}
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="bg-gray-50 p-2 rounded-xl text-center">
                  <div className="text-gray-400 uppercase font-black tracking-tighter mb-1">Ngày lập đơn</div>
                  <div className="font-bold text-gray-700">{fmtDate(selectedHoaDon.ngayTao)}</div>
                </div>
                <div className={`p-2 rounded-xl text-center ${selectedHoaDon.trangThai === 'quaHan' ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-700'}`}>
                  <div className="text-gray-400 uppercase font-black tracking-tighter mb-1">Hạn thanh toán</div>
                  <div className="font-extrabold">{fmtDate(selectedHoaDon.hanThanhToan)}</div>
                </div>
              </div>

              {/* Lịch sử xác nhận (Nếu đã thanh toán) */}
              {selectedHoaDon.trangThai === 'daThanhToan' && (selectedHoaDon as any).ngayThanhToan && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-black text-emerald-700 uppercase">Xác nhận thanh toán</div>
                    <div className="text-xs text-emerald-800 font-medium font-mono">
                      Ghi nhận lúc: {new Date((selectedHoaDon as any).ngayThanhToan).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              )}

              {/* Biên lai thanh toán (Nếu có) */}
              {(selectedHoaDon as any).anhBienLai && (
                <div className="space-y-2">
                   <div className="text-xs font-black text-gray-400 uppercase tracking-widest pl-1 leading-none">Biên lai đối soát</div>
                   <div className="relative group">
                      <img 
                        src={(selectedHoaDon as any).anhBienLai} 
                        alt="Bien lai" 
                        className="w-full rounded-2xl border-2 border-gray-100 shadow-sm group-hover:shadow-md transition-shadow cursor-pointer" 
                        onClick={() => window.open((selectedHoaDon as any).anhBienLai, '_blank')}
                      />
                      <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md text-white text-[8px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest pointer-events-none">Click để phóng to</div>
                   </div>
                </div>
              )}

              {/* Thanh toán QR (Chỉ hiện cho hóa đơn THU, chưa thanh toán và có URL) */}
              {selectedHoaDon.trangThai !== 'daThanhToan' && selectedHoaDon.loai !== 'chi' && selectedHoaDon.checkoutUrl && (
                <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Thanh toán chuyển khoản nhanh</span>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 shrink-0">
                      <img src={selectedHoaDon.checkoutUrl} alt="VietQR" className="size-56 md:size-64 object-contain" />
                    </div>
                    <div className="w-full space-y-2 text-sm bg-white/50 p-4 rounded-xl">
                       <div className="flex justify-between border-b border-slate-200 border-dashed py-1">
                          <span className="text-slate-400 font-medium">Ngân hàng:</span>
                          <span className="font-extrabold text-slate-700">{(selectedHoaDon as any).chuNha?.thongTinThanhToan?.tenNganHang || '—'}</span>
                       </div>
                       <div className="flex justify-between border-b border-slate-200 border-dashed py-1">
                          <span className="text-slate-400 font-medium">Số tài khoản:</span>
                          <span className="font-black text-blue-600">{(selectedHoaDon as any).chuNha?.thongTinThanhToan?.soTaiKhoan || '—'}</span>
                       </div>
                       <div className="flex justify-between py-1">
                          <span className="text-slate-400 font-medium">Người thụ hưởng:</span>
                          <span className="font-extrabold text-slate-700 uppercase">{(selectedHoaDon as any).chuNha?.thongTinThanhToan?.chuTaiKhoan || '—'}</span>
                       </div>
                    </div>
                    <p className="text-[10px] text-slate-400 italic font-medium">Mở ứng dụng Ngân hàng và quét mã để thanh toán nhanh</p>
                  </div>
                </div>
              )}

              {/* Nút thao tác đóng */}
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400" onClick={() => setSelectedHoaDon(null)}>
                  Đóng nội dung
                </Button>
                {selectedHoaDon.trangThai !== 'daThanhToan' && selectedHoaDon.loai !== 'chi' && selectedHoaDon.checkoutUrl && (
                  <Button 
                    className="flex-[2] rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700"
                    onClick={() => setIsPaymentDialogOpen(true)}
                  >
                    🚀 Gửi biên lai thanh toán
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog xác nhận thanh toán */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Thanh toán bằng chuyển khoản</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm mb-4">
              Vui lòng chuyển khoản số tiền <strong className="text-lg">{fmt(selectedHoaDon?.conLai || 0)}</strong> qua thẻ ngân hàng hoặc ví điện tử với thông tin chuyển khoản từ chủ trọ.
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Tải lên biên lai gốc (ảnh chụp màn hình)</label>
              <ImageUpload
                imageUrl={paymentImage}
                onImageChange={setPaymentImage}
                label=""
                placeholder="Chọn ảnh biên lai từ điện thoại/máy tính"
              />
            </div>

            <Button 
              className="w-full mt-4" 
              disabled={submittingPayment || !paymentImage}
              onClick={async () => {
                setSubmittingPayment(true);
                try {
                  const reqData = {
                    hoaDonId: selectedHoaDon?._id,
                    soTien: selectedHoaDon?.conLai,
                    phuongThuc: 'chuyenKhoan',
                    thongTinChuyenKhoan: {
                      nganHang: 'Ngân hàng',
                      soGiaoDich: 'Giao dịch online'
                    },
                    ghiChu: 'Khách thuê tải lên biên lai ứng dụng',
                    anhBienLai: paymentImage
                  };
                  const res = await fetch('/api/thanh-toan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reqData)
                  });
                  if(res.ok) {
                    toast.success('Xác nhận thanh toán đã được gửi.');
                    setIsPaymentDialogOpen(false);
                    setSelectedHoaDon((prev: any) => ({...prev, trangThai: 'choDuyet'})); 
                    fetchHoaDons();
                  } else {
                    toast.error('Có lỗi khi ghi nhận thanh toán');
                  }
                } finally {
                  setSubmittingPayment(false);
                }
              }}
            >
              {submittingPayment ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
              Xác nhận đã chuyển khoản
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
