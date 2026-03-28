'use client';

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
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/ui/image-upload';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
      const response = await fetch('/api/hoa-don');
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quản lý hóa đơn</h1>
          <p className="text-gray-500">Theo dõi và thanh toán các hóa đơn hàng tháng · Click vào hàng để xem chi tiết</p>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl gap-2 border-gray-200">
                <Download className="size-4" />
                <span>Xuất file</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuLabel>Định dạng xuất</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportToPDF} className="gap-2 focus:bg-primary/5 cursor-pointer">
                <FileText className="size-4 text-rose-500" />
                <span>Xuất PDF</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel} className="gap-2 focus:bg-primary/5 cursor-pointer">
                <FileSpreadsheet className="size-4 text-emerald-500" />
                <span>Xuất Excel (CSV)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-none shadow-sm rounded-2xl bg-white overflow-visible">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mr-2">
            <Filter className="size-4" />
            <span>Bộ lọc:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tháng */}
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[140px] rounded-xl bg-gray-50/50 border-gray-100">
                <SelectValue placeholder="Chọn tháng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả tháng</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>Tháng {i + 1}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Filter Năm */}
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[120px] rounded-xl bg-gray-50/50 border-gray-100">
                <SelectValue placeholder="Chọn năm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả năm</SelectItem>
                <SelectItem value="2024">Năm 2024</SelectItem>
                <SelectItem value="2025">Năm 2025</SelectItem>
                <SelectItem value="2026">Năm 2026</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter Trạng thái */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px] rounded-xl bg-gray-50/50 border-gray-100">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="daThanhToan">Đã thanh toán</SelectItem>
                <SelectItem value="chuaThanhToan">Chưa thanh toán</SelectItem>
                <SelectItem value="choDuyet">Chờ duyệt</SelectItem>
                <SelectItem value="quaHan">Quá hạn</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setFilterMonth('all');
                setFilterStatus('all');
                setFilterYear(new Date().getFullYear().toString());
              }}
              className="text-xs text-primary hover:bg-primary/5 rounded-lg"
            >
              Đặt lại
            </Button>
          </div>

          <div className="flex-1 text-right text-xs text-gray-400 font-medium hidden sm:block">
            Hiển thị {filteredHoaDons.length} / {hoaDons.length} hóa đơn
          </div>
        </CardContent>
      </Card>

      {filteredHoaDons.length === 0 ? (
        <Card className="border-none shadow-sm bg-white/60 rounded-2xl overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="bg-blue-50 p-8 rounded-full mb-6">
              <Receipt className="h-16 w-16 text-blue-500/60" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Không tìm thấy hóa đơn</h2>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              Thử thay đổi bộ lọc hoặc kiểm tra lại sau.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterMonth('all');
                setFilterStatus('all');
              }}
              className="mt-6 rounded-xl"
            >
              Xóa tất cả bộ lọc
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="font-semibold text-gray-700">Mã hóa đơn</TableHead>
                    <TableHead className="font-semibold text-gray-700">Kỳ</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tiền phòng</TableHead>
                    <TableHead className="font-semibold text-gray-700">Điện</TableHead>
                    <TableHead className="font-semibold text-gray-700">Nước</TableHead>
                    <TableHead className="font-semibold text-gray-700">Tổng tiền</TableHead>
                    <TableHead className="font-semibold text-gray-700">Hạn TT</TableHead>
                    <TableHead className="font-semibold text-gray-700">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHoaDons.map((hd) => (
                    <TableRow
                      key={hd._id}
                      className="hover:bg-primary/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedHoaDon(hd)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary shrink-0">
                            <Receipt className="size-4" />
                          </div>
                          <span className="font-mono text-sm font-medium text-gray-900">{hd.maHoaDon}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">Tháng {hd.thang}/{hd.nam}</span>
                      </TableCell>
                      <TableCell className="text-sm">{fmt(hd.tienPhong)}</TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <div className="text-gray-900">{fmt(hd.tienDien)}</div>
                          <div className="text-xs text-gray-400">{hd.soDien} kWh</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div>
                          <div className="text-gray-900">{fmt(hd.tienNuoc)}</div>
                          <div className="text-xs text-gray-400">{hd.soNuoc} m³</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-gray-900">{fmt(hd.tongTien)}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Calendar className="size-3.5" />
                          {fmtDate(hd.hanThanhToan)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(hd.trangThai)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thông tin hỗ trợ */}
      <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-indigo-500/5 rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm text-primary">
            <CreditCard className="size-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Hướng dẫn thanh toán</h3>
            <p className="text-sm text-gray-600">Bạn có thể thanh toán trực tiếp tại văn phòng hoặc chuyển khoản ngân hàng qua thông tin có sẵn trong chi tiết hóa đơn.</p>
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
    </div>
  );
}
