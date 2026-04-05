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
  ShieldCheck
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
    });
  }, [hoaDons, filterMonth, filterStatus, filterYear]);

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
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10"
    >
      {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b-2 border-gray-100">
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-1">
              <Link 
                href="/khach-thue/dashboard" 
                className="flex items-center gap-1.5 text-gray-400 hover:text-primary transition-colors"
              >
                <Home className="size-3" />
                Trang Chủ
              </Link>
              <ChevronRight className="size-3 text-gray-300" />
              <span className="text-primary/80">Hóa đơn</span>
            </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
            Hóa đơn
          </h1>
          <p className="text-gray-500 font-medium text-sm mt-2">Theo dõi và thanh toán các hóa đơn hàng tháng của bạn</p>
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
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Kỳ thanh toán</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Tiền phòng</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Điện</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Nước</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Tổng cộng</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Hạn cuối</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 pr-8">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHoaDons.map((hd) => (
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
                          <span className="font-black text-sm text-gray-900 tracking-tight">{hd.maHoaDon}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-bold text-gray-700">T. {hd.thang}/{hd.nam}</span>
                      </TableCell>
                      <TableCell className="font-bold text-gray-800 text-sm">{fmt(hd.tienPhong)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-gray-900">{fmt(hd.tienDien)}</div>
                          <div className="text-[9px] font-black uppercase text-gray-400 tracking-wider font-mono bg-gray-50 px-1 rounded">{hd.soDien}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold text-gray-900">{fmt(hd.tienNuoc)}</div>
                          <div className="text-[9px] font-black uppercase text-gray-400 tracking-wider font-mono bg-gray-50 px-1 rounded">{hd.soNuoc}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[14px] font-black text-gray-900 tracking-tight">{fmt(hd.tongTien)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                          {fmtDate(hd.hanThanhToan)}
                        </div>
                      </TableCell>
                      <TableCell className="pr-8">{getStatusBadge(hd.trangThai)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

      {/* Dialog chi tiết hóa đơn */}
      <Dialog open={!!selectedHoaDon} onOpenChange={(open) => !open && setSelectedHoaDon(null)}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedHoaDon && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Receipt className="size-5" />
                    </div>
                    <div>
                      <div className="text-lg font-bold">{selectedHoaDon.maHoaDon}</div>
                      <div className="text-sm text-gray-500 font-normal">Hóa đơn tháng {selectedHoaDon.thang}/{selectedHoaDon.nam}</div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      // Logic xuất PDF riêng cho 1 hóa đơn nếu cần
                      toast.info('Tính năng in lẻ đang được cập nhật');
                    }}
                    className="rounded-full text-gray-400 hover:text-primary"
                  >
                    <Download className="size-4" />
                  </Button>
                </DialogTitle>
              </DialogHeader>

              {/* Trạng thái */}
              <div className="flex items-center justify-between px-1">
                <span className="text-sm text-gray-500">Trạng thái</span>
                {getStatusBadge(selectedHoaDon.trangThai)}
              </div>

              <Separator />

              {/* Chi tiết các khoản */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Chi tiết các khoản phí</h4>

                {/* Tiền phòng */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Home className="size-4 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">Tiền phòng</div>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">{fmt(selectedHoaDon.tienPhong)}</span>
                </div>

                {/* Điện */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Zap className="size-4 text-yellow-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">Tiền điện</div>
                      <div className="text-xs text-gray-400">
                        {selectedHoaDon.chiSoDienBanDau ?? '?'} → {selectedHoaDon.chiSoDienCuoiKy ?? '?'} · {selectedHoaDon.soDien} kWh
                        {(selectedHoaDon as any).giaDien ? ` · ${fmt((selectedHoaDon as any).giaDien)}/kWh` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">{fmt(selectedHoaDon.tienDien)}</span>
                </div>

                {/* Nước */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Droplets className="size-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">Tiền nước</div>
                      <div className="text-xs text-gray-400">
                        {selectedHoaDon.chiSoNuocBanDau ?? '?'} → {selectedHoaDon.chiSoNuocCuoiKy ?? '?'} · {selectedHoaDon.soNuoc} m³
                        {(selectedHoaDon as any).giaNuoc ? ` · ${fmt((selectedHoaDon as any).giaNuoc)}/m³` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">{fmt(selectedHoaDon.tienNuoc)}</span>
                </div>

                {/* Phí dịch vụ khác nếu có */}
                {selectedHoaDon.phiDichVu && selectedHoaDon.phiDichVu.length > 0 && (
                  <>
                    {selectedHoaDon.phiDichVu.map((phi: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <FileText className="size-4 text-purple-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-800">{phi.ten || 'Dịch vụ khác'}</div>
                        </div>
                        <span className="font-semibold text-gray-900">{fmt(phi.gia || 0)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <Separator />

              {/* Tổng */}
              <div className="flex items-center justify-between px-1">
                <span className="font-semibold text-gray-700">Tổng cộng</span>
                <span className="text-xl font-bold text-gray-900">{fmt(selectedHoaDon.tongTien)}</span>
              </div>

              {/* Thông tin ngày */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 mb-1">Ngày tạo</div>
                  <div className="font-medium text-gray-700">{selectedHoaDon.ngayTao ? fmtDate(selectedHoaDon.ngayTao) : '—'}</div>
                </div>
                <div className={`rounded-xl p-3 ${selectedHoaDon.trangThai === 'quaHan' ? 'bg-rose-50' : 'bg-gray-50'}`}>
                  <div className="text-xs text-gray-400 mb-1">Hạn thanh toán</div>
                  <div className={`font-medium ${selectedHoaDon.trangThai === 'quaHan' ? 'text-rose-600' : 'text-gray-700'}`}>
                    {fmtDate(selectedHoaDon.hanThanhToan)}
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              {selectedHoaDon.ghiChu && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                  <span className="font-medium">Ghi chú: </span>{selectedHoaDon.ghiChu}
                </div>
              )}

              {/* Note about waiting approval if in choDuyet */}
              {selectedHoaDon.trangThai === 'choDuyet' && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-sm text-yellow-800 flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5 animate-pulse">⏳</span>
                  <span>Đang chờ chủ trọ xác nhận biên lai giải ngân. Hóa đơn sẽ cập nhật trạng thái sau khi được duyệt.</span>
                </div>
              )}

              {selectedHoaDon.trangThai === 'tuChoi' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">❌</span>
                  <span>Biên lai thanh toán của bạn đã bị <strong>từ chối</strong>. Vui lòng kiểm tra lại thông tin chuyển khoản và gửi lại biên lai mới, hoặc liên hệ chủ trọ để biết thêm chi tiết.</span>
                </div>
              )}

              {/* Thông tin chuyển khoản & QR */}
              {selectedHoaDon.trangThai !== 'daThanhToan' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="size-2 rounded-full bg-blue-500" />
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Thanh toán chuyển khoản</h4>
                  </div>
                  
                  {selectedHoaDon.checkoutUrl ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                        <img 
                          src={selectedHoaDon.checkoutUrl} 
                          alt="VietQR Landlord" 
                          className="w-full max-w-[220px] aspect-square object-contain"
                        />
                      </div>
                      <div className="w-full space-y-2 text-sm">
                        <div className="flex justify-between items-center py-1 border-b border-slate-200 border-dashed">
                          <span className="text-slate-500">Ngân hàng:</span>
                          <span className="font-bold text-slate-800">{(selectedHoaDon as any).chuNha?.thongTinThanhToan?.tenNganHang || (selectedHoaDon as any).chuNha?.thongTinThanhToan?.nganHang || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-200 border-dashed">
                          <span className="text-slate-500">Số tài khoản:</span>
                          <span className="font-bold text-blue-600">{(selectedHoaDon as any).chuNha?.thongTinThanhToan?.soTaiKhoan || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-500">Chủ tài khoản:</span>
                          <span className="font-bold text-slate-800">{(selectedHoaDon as any).chuNha?.thongTinThanhToan?.chuTaiKhoan || '—'}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-center text-slate-400 italic">Quét mã QR bằng ứng dụng Ngân hàng để thanh toán nhanh</p>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      Chủ trọ chưa cập nhật thông tin thanh toán.
                    </div>
                  )}
                </div>
              )}

              {selectedHoaDon.trangThai !== 'daThanhToan' && selectedHoaDon.trangThai !== 'choDuyet' && (
                <div className="grid grid-cols-1 gap-2">
                  <Button 
                    variant="outline"
                    className="w-full rounded-xl border-[#0068FF] text-[#0068FF] hover:bg-[#0068FF]/5" 
                    onClick={() => setIsPaymentDialogOpen(true)}
                  >
                    💳 Gửi biên lai chuyển khoản (Thủ công)
                  </Button>
                </div>
              )}
              <Button variant="ghost" className="w-full rounded-xl" onClick={() => setSelectedHoaDon(null)}>
                Đóng
              </Button>
            </>
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
                    toast.success('Gửi xác nhận thanh toán thành công!');
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
    </motion.div>
  );
}
