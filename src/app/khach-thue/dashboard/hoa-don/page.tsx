'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Receipt, Calendar, CreditCard, Loader2, X, Zap, Droplets, Home, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
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

export default function HoaDonKhachThuePage() {
  const [hoaDons, setHoaDons] = useState<HoaDon[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHoaDon, setSelectedHoaDon] = useState<HoaDon | null>(null);

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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quản lý hóa đơn</h1>
        <p className="text-gray-500">Theo dõi và thanh toán các hóa đơn hàng tháng · Click vào hàng để xem chi tiết</p>
      </div>

      {hoaDons.length === 0 ? (
        <Card className="border-none shadow-sm bg-white/60 rounded-2xl overflow-hidden">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="bg-blue-50 p-8 rounded-full mb-6">
              <Receipt className="h-16 w-16 text-blue-500/60" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Chưa có hóa đơn nào</h2>
            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
              Hóa đơn sẽ hiển thị tại đây khi tới hạn thanh toán hàng tháng.
            </p>
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
                  {hoaDons.map((hd) => (
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
                <DialogTitle className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Receipt className="size-5" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">{selectedHoaDon.maHoaDon}</div>
                    <div className="text-sm text-gray-500 font-normal">Hóa đơn tháng {selectedHoaDon.thang}/{selectedHoaDon.nam}</div>
                  </div>
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
                        {selectedHoaDon.chiSoDienCu ?? '?'} → {selectedHoaDon.chiSoDienMoi ?? '?'} · {selectedHoaDon.soDien} kWh
                        {selectedHoaDon.giaDien ? ` · ${fmt(selectedHoaDon.giaDien)}/kWh` : ''}
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
                        {selectedHoaDon.chiSoNuocCu ?? '?'} → {selectedHoaDon.chiSoNuocMoi ?? '?'} · {selectedHoaDon.soNuoc} m³
                        {selectedHoaDon.giaNuoc ? ` · ${fmt(selectedHoaDon.giaNuoc)}/m³` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">{fmt(selectedHoaDon.tienNuoc)}</span>
                </div>

                {/* Phí dịch vụ khác nếu có */}
                {selectedHoaDon.phiDichVuKhac && selectedHoaDon.phiDichVuKhac.length > 0 && (
                  <>
                    {selectedHoaDon.phiDichVuKhac.map((phi: any, i: number) => (
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

              <Button variant="outline" className="w-full" onClick={() => setSelectedHoaDon(null)}>
                Đóng
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
