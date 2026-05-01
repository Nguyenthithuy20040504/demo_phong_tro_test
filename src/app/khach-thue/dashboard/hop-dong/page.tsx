'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { exportHopDongToDocx } from '@/lib/export-hop-dong';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, 
  Calendar, 
  Clock, 
  Loader2, 
  Home, 
  ChevronRight, 
  ChevronLeft, 
  ChevronsLeft, 
  ChevronsRight,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSearch,
  Download,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface HopDong {
  _id: string;
  maHopDong: string;
  phong: any;
  ngayBatDau: string;
  ngayKetThuc: string;
  giaThue: number;
  tienCoc: number;
  trangThai: string;
  chuKyThanhToan: string;
  ngayThanhToan: number;
  dieuKhoan: string;
  ngayTao?: string;
}

export default function HopDongKhachThuePage() {
  const [hopDongs, setHopDongs] = useState<HopDong[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHopDong, setSelectedHopDong] = useState<HopDong | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    document.title = 'Hợp đồng của tôi';
    fetchHopDongs();
  }, []);

  // Auto-polling 5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchHopDongs(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Refresh khi quay lại tab
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') fetchHopDongs(true);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const fetchHopDongs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await fetch('/api/hop-dong?limit=1000', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      const result = await response.json();
      if (result.success) {
        setHopDongs(result.data || []);
      } else if (!silent) {
        toast.error('Không thể tải danh sách hợp đồng');
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
      if (!silent) toast.error('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const filteredHopDongs = useMemo(() => {
    return hopDongs.filter((hd) => {
      const matchSearch = !searchTerm || 
        hd.maHopDong.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hd.phong?.maPhong?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hd.phong?.toaNha?.tenToaNha?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || hd.trangThai === statusFilter;
      
      const hdDate = new Date(hd.ngayBatDau);
      const matchMonth = filterMonth === 'all' || (hdDate.getMonth() + 1).toString() === filterMonth;
      const matchYear = filterYear === 'all' || hdDate.getFullYear().toString() === filterYear;

      return matchSearch && matchStatus && matchMonth && matchYear;
    }).sort((a, b) => {
      const dateA = new Date(a.ngayTao || a.ngayBatDau).getTime();
      const dateB = new Date(b.ngayTao || b.ngayBatDau).getTime();
      return dateB - dateA;
    });
  }, [hopDongs, searchTerm, statusFilter, filterMonth, filterYear]);

  const paginatedHopDongs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHopDongs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHopDongs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredHopDongs.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filterMonth, filterYear]);

  const fmt = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount ?? 0);

  const fmtDate = (date: string | Date) => new Date(date).toLocaleDateString('vi-VN');

  const handleDownload = () => {
    if (selectedHopDong) {
      exportHopDongToDocx(selectedHopDong);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'dangHieuLuc':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] uppercase font-black">Đang hiệu lực</Badge>;
      case 'sapHetHan':
        return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] uppercase font-black">Sắp hết hạn</Badge>;
      case 'daHetHan':
        return <Badge variant="outline" className="text-gray-400 border-gray-200 bg-gray-50 text-[10px] uppercase font-black">Đã hết hạn</Badge>;
      case 'daHuy':
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] uppercase font-black">Đã hủy</Badge>;
      case 'choKichHoat':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] uppercase font-black">Chờ kích hoạt</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] uppercase font-black">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
        <p className="text-sm font-bold text-gray-500 animate-pulse uppercase tracking-widest">Đang tải hợp đồng...</p>
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
            <span className="text-primary">Hợp đồng</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
             Hợp đồng của tôi
          </h1>
          <p className="text-gray-500 font-medium text-xs leading-none">
            Quản lý thông tin thuê phòng và các điều khoản ký kết
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-12 px-6 rounded-[1.25rem] bg-[#5fb3a6] text-white font-black uppercase text-[11px] tracking-widest border-none shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all group">
                <Download className="size-4 mr-3 group-hover:-translate-y-0.5 transition-transform" />
                Xuất file
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 bg-white rounded-[1.5rem] border-gray-100 shadow-2xl">
              <DropdownMenuLabel className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Định dạng xuất</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-50" />
              <DropdownMenuItem className="p-3 gap-3 rounded-xl focus:bg-primary/5 cursor-pointer">
                <div className="size-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                  <FileText className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-900">Xuất PDF</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Bản in chất lượng</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-3 gap-3 rounded-xl focus:bg-primary/5 cursor-pointer">
                <div className="size-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                  <FileSpreadsheet className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-gray-900">Xuất Excel</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Dữ liệu bảng tính</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card className="border-2 shadow-premium rounded-[1.5rem] bg-white/80 backdrop-blur-md border-gray-100 overflow-hidden relative group">
        <CardContent className="p-2 md:p-3 flex items-center justify-between gap-2 overflow-x-auto lg:overflow-x-visible no-scrollbar">
          <div className="flex items-center gap-2 flex-nowrap min-w-max lg:min-w-0 flex-1">
            {/* Filter Label Button */}
            <div className="flex items-center gap-2 px-3 h-10 bg-gray-50/80 rounded-xl border border-gray-100 shadow-inner shrink-0">
              <Filter className="size-3.5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hidden xl:inline">Bộ lọc</span>
            </div>

            {/* Khối Search tích hợp */}
            <div className="relative group/search min-w-[150px] lg:min-w-[200px] flex-1 max-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 group-focus-within/search:text-primary transition-colors" />
              <input 
                type="text"
                placeholder="Tìm hợp đồng..."
                className="w-full bg-white border border-gray-100 rounded-xl pl-10 pr-3 h-10 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Tháng */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[125px] h-10 rounded-xl bg-white border-gray-100 text-[11px] font-bold text-gray-800 shadow-sm hover:border-primary/20 transition-all shrink-0 px-3">
                <SelectValue placeholder="Tháng" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 shadow-2xl">
                <SelectItem value="all" className="rounded-lg font-bold text-xs">Tất cả tháng</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()} className="rounded-lg text-xs">Tháng {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Năm */}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[105px] h-10 rounded-xl bg-white border-gray-100 text-[11px] font-bold text-gray-800 shadow-sm hover:border-primary/20 transition-all shrink-0 px-3">
                <SelectValue placeholder="Năm" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 shadow-2xl">
                <SelectItem value="all" className="rounded-lg font-bold text-xs">Tất cả năm</SelectItem>
                <SelectItem value="2024" className="rounded-lg text-xs">2024</SelectItem>
                <SelectItem value="2025" className="rounded-lg text-xs">2025</SelectItem>
                <SelectItem value="2026" className="rounded-lg text-xs">2026</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Trạng thái */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[165px] h-10 rounded-xl bg-white border-gray-100/50 text-[11px] font-bold text-gray-800 shadow-sm hover:border-primary/20 transition-all shrink-0 px-3">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 shadow-2xl">
                <SelectItem value="all" className="rounded-lg font-bold text-xs">Tất cả trạng thái</SelectItem>
                <SelectItem value="dangHieuLuc" className="rounded-lg text-xs text-emerald-600 font-bold">Đang hiệu lực</SelectItem>
                <SelectItem value="sapHetHan" className="rounded-lg text-xs text-orange-600 font-bold">Sắp hết hạn</SelectItem>
                <SelectItem value="choKichHoat" className="rounded-lg text-xs text-blue-600 font-bold">Chờ kích hoạt</SelectItem>
                <SelectItem value="daHetHan" className="rounded-lg text-xs text-gray-500 font-bold">Đã hết hạn</SelectItem>
                <SelectItem value="daHuy" className="rounded-lg text-xs text-rose-600 font-bold">Đã hủy</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="ghost" 
              onClick={() => {
                setSearchTerm('');
                setFilterMonth('all');
                setStatusFilter('all');
                setFilterYear('all');
              }}
              className="px-3 h-10 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl transition-all shrink-0"
            >
              Đặt lại
            </Button>
          </div>

          <div className="hidden lg:flex items-center px-4 h-10 bg-white border border-primary/10 rounded-xl shadow-lg shadow-primary/5 shrink-0">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
              Kết quả của bạn: 
              <span className="text-secondary text-sm font-black font-mono">
                {filteredHopDongs.length}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      {filteredHopDongs.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-200 shadow-none rounded-[2.5rem] bg-white/50">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="size-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-6">
              <FileSearch className="size-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">Không tìm thấy hợp đồng</h3>
            <p className="text-gray-500 text-sm max-w-xs text-center leading-relaxed font-medium">
              Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái để tìm thấy tài liệu bạn cần.
            </p>
            <Button 
                variant="outline" 
                className="mt-8 rounded-xl px-8 h-12 text-xs font-black uppercase tracking-widest border-2"
                onClick={() => {setSearchTerm(''); setStatusFilter('all');}}
            >
              Đặt lại bộ lọc
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
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 pl-8">Mã hợp đồng</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Vị trí</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Ngày tạo</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Ngày bắt đầu</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400">Ngày kết thúc</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Giá thuê</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 text-right">Tiền cọc</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest text-gray-400 pr-8 text-center">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedHopDongs.map((hd) => (
                    <TableRow 
                      key={hd._id}
                      className="hover:bg-primary/5 transition-all cursor-pointer group/row h-14"
                      onClick={() => setSelectedHopDong(hd)}
                    >
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover/row:bg-primary group-hover/row:text-white transition-all shadow-sm">
                            <FileText className="size-4" />
                          </div>
                          <span className="font-semibold text-[13px] text-gray-900 tracking-tight">{hd.maHopDong}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900">Phòng {hd.phong?.maPhong}</span>
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest leading-none mt-1">
                            {hd.phong?.toaNha?.tenToaNha}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">{hd.ngayTao ? fmtDate(hd.ngayTao) : '---'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">{fmtDate(hd.ngayBatDau)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-900">{fmtDate(hd.ngayKetThuc)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{fmt(hd.giaThue)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-semibold text-gray-900">{fmt(hd.tienCoc)}</span>
                      </TableCell>
                      <TableCell className="pr-8 text-center">{getStatusBadge(hd.trangThai)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination UI */}
            <div className="px-8 py-5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/30">
              <div className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Hiển thị <span className="text-gray-900">{paginatedHopDongs.length}</span> trên <span className="text-gray-900">{filteredHopDongs.length}</span> kết quả
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
                  <SelectTrigger className="w-[70px] h-9 rounded-xl text-xs font-bold border-gray-200 bg-white">
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

      {/* Contract Detail Dialog */}
      <Dialog open={!!selectedHopDong} onOpenChange={(open) => !open && setSelectedHopDong(null)}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none rounded-[2.5rem] shadow-2xl">
          {selectedHopDong && (
            <div className="flex flex-col h-full bg-white rounded-[2.5rem]">
               {/* Detail Header */}
               <DialogHeader className="p-0">
                 <div className="bg-primary pt-8 pb-12 px-8 relative overflow-hidden text-left">
                   <div className="absolute top-0 right-0 size-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
                   <div className="relative z-10 space-y-2">
                     <div className="flex items-center justify-between">
                       <Badge className="bg-white/20 text-white border-white/30 text-[10px] font-black uppercase tracking-widest">
                         Bản điện tử
                       </Badge>
                       <div className="text-white/60 text-[10px] font-black uppercase tracking-widest">
                          ID: {selectedHopDong._id}
                       </div>
                     </div>
                     <DialogTitle className="text-3xl font-black text-white tracking-tight">Hợp đồng thuê phòng</DialogTitle>
                     <p className="text-white/80 font-bold uppercase tracking-widest text-xs">Mã số: {selectedHopDong.maHopDong}</p>
                   </div>
                 </div>
               </DialogHeader>

               <div className="px-8 -mt-6 relative z-20 pb-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="shadow-xl border-none rounded-[1.5rem]">
                      <CardContent className="p-6 space-y-4">
                         <div className="space-y-1">
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vị trí căn hộ</p>
                           <p className="text-lg font-black text-gray-900">Phòng {selectedHopDong.phong?.maPhong}</p>
                           <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-none mt-1">
                             {selectedHopDong.phong?.toaNha?.tenToaNha}
                           </p>
                         </div>
                         <Separator className="bg-gray-100" />
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bắt đầu</p>
                               <p className="text-sm font-black text-gray-900">{fmtDate(selectedHopDong.ngayBatDau)}</p>
                            </div>
                            <div>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kết thúc</p>
                               <p className="text-sm font-black text-gray-900">{fmtDate(selectedHopDong.ngayKetThuc)}</p>
                            </div>
                         </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-xl border-none rounded-[1.5rem] bg-emerald-50/50 border border-emerald-100/50">
                      <CardContent className="p-6 space-y-4">
                         <div className="space-y-1 text-right">
                           <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest text-right">Giá thuê hàng tháng</p>
                           <p className="text-2xl font-black text-emerald-900">{fmt(selectedHopDong.giaThue)}</p>
                         </div>
                         <Separator className="bg-emerald-200/50" />
                         <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Tiền đặt cọc</p>
                            <p className="text-lg font-black text-emerald-900">{fmt(selectedHopDong.tienCoc)}</p>
                         </div>
                      </CardContent>
                    </Card>
                 </div>

                 {/* Terms and Conditions */}
                 <div className="mt-6 space-y-6">
                    <div className="p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-2">
                          Điều khoản hợp đồng
                       </h4>
                       <div className="text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                         {selectedHopDong.dieuKhoan}
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary">
                             <Clock className="size-5" />
                          </div>
                          <div>
                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em]">Chu kỳ trả tiền</p>
                             <p className="text-sm font-black text-gray-900 capitalize leading-none mt-1">
                               {selectedHopDong.chuKyThanhToan === 'thang' ? 'Hàng tháng' : 
                                selectedHopDong.chuKyThanhToan === 'quy' ? 'Hàng quý' : 'Hàng năm'}
                             </p>
                          </div>
                       </div>
                       <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary">
                             <Calendar className="size-5" />
                          </div>
                          <div>
                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.1em]">Hạn nộp tiền</p>
                             <p className="text-sm font-black text-gray-900 leading-none mt-1">Ngày {selectedHopDong.ngayThanhToan} hàng kỳ</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="mt-8 flex gap-3">
                    <Button 
                      className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                      onClick={handleDownload}
                    >
                       <Download className="mr-2 size-4" /> Tải về bản Word (DOCX)
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest border-2" onClick={() => setSelectedHopDong(null)}>
                       Đóng lại
                    </Button>
                 </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
