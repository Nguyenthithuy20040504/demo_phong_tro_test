'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Zap, 
  Droplets, 
  Save, 
  RefreshCw, 
  Building,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { ToaNha, Phong, HopDong } from '@/types';
import { toast } from 'sonner';

interface ReadingEntry {
  phongId: string;
  maPhong: string;
  chiSoDienCu: number;
  chiSoDienMoi: number;
  chiSoNuocCu: number;
  chiSoNuocMoi: number;
  hopDongId: string;
  hasReadingThisMonth: boolean;
  hasAutoInvoiceThisMonth: boolean;
  hasManualInvoiceThisMonth: boolean;
}

export default function ChotSoPage() {
  const router = useRouter();
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);
  const [selectedToaNha, setSelectedToaNha] = useState<string>('');
  const [readings, setReadings] = useState<ReadingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedToaNha) {
      fetchRoomsAndReadings();
    }
  }, [selectedToaNha, currentMonth, currentYear]);

  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/hoa-don/form-data');
      if (response.ok) {
        const result = await response.json();
        setToaNhaList(result.data.toaNhaList || []);
        if (result.data.toaNhaList?.length > 0) {
          setSelectedToaNha(result.data.toaNhaList[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
      toast.error('Không thể tải danh sách tòa nhà');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomsAndReadings = async () => {
    try {
      setLoading(true);
      // 1. Fetch phongs and active contracts for this building
      const phongsRes = await fetch(`/api/phong?toaNha=${selectedToaNha}&limit=100`);
      const phongsData = await phongsRes.json();
      const phongs: Phong[] = phongsData.data || [];

      // 2. Map rooms to ReadingEntry and fetch latest vs current month readings
      const entryPromises = phongs.map(async (phong) => {
        if (phong.trangThai === 'trong' || !phong.hopDongHienTai) {
            return null; // Bỏ qua phòng trống
        }

        // Lấy chỉ số bắt đầu cho tháng này (từ hóa đơn trước hoặc hợp đồng)
        const latestRes = await fetch(`/api/hoa-don/latest-reading?hopDong=${phong.hopDongHienTai._id}&thang=${currentMonth}&nam=${currentYear}`);
        const latestData = await latestRes.json();
        
        // Kiểm tra xem tháng này đã có chỉ số chưa
        const currentReadingRes = await fetch(`/api/chi-so-dien-nuoc?phong=${phong._id}&thang=${currentMonth}&nam=${currentYear}`);
        const currentReadingData = await currentReadingRes.json();
        const existingReading = currentReadingData.data?.[0];

        // Kiểm tra xem tháng này đã có hóa đơn chưa
        const invoiceRes = await fetch(`/api/hoa-don?hopDongId=${phong.hopDongHienTai._id}&thang=${currentMonth}&nam=${currentYear}`);
        const invoiceData = await invoiceRes.json();
        const invoices = invoiceData.data || [];
        const hasAutoInvoice = invoices.some((inv: any) => inv.loaiHoaDon === 'tuDong');
        const hasManualInvoice = invoices.some((inv: any) => inv.loaiHoaDon === 'thuCong');

        return {
          phongId: phong._id!,
          maPhong: phong.maPhong,
          chiSoDienCu: latestData.data.chiSoDienBanDau,
          chiSoDienMoi: existingReading ? existingReading.chiSoDienMoi : latestData.data.chiSoDienBanDau,
          chiSoNuocCu: latestData.data.chiSoNuocBanDau,
          chiSoNuocMoi: existingReading ? existingReading.chiSoNuocMoi : latestData.data.chiSoNuocBanDau,
          hopDongId: phong.hopDongHienTai._id,
          hasReadingThisMonth: !!existingReading,
          hasAutoInvoiceThisMonth: hasAutoInvoice,
          hasManualInvoiceThisMonth: hasManualInvoice
        };
      });

      const entries = await Promise.all(entryPromises);
      setReadings(entries.filter((e): e is ReadingEntry => e !== null));
    } catch (error) {
      console.error('Error fetching readings:', error);
      toast.error('Lỗi khi tải dữ liệu phòng');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index: number, field: keyof ReadingEntry, value: string) => {
    const newReadings = [...readings];
    const numValue = parseInt(value) || 0;
    (newReadings[index] as any)[field] = numValue;
    setReadings(newReadings);
  };

  const handleSaveReadings = async () => {
    try {
      setSubmitting(true);
      const dataToSave = readings.map(r => ({
        phong: r.phongId,
        thang: currentMonth,
        nam: currentYear,
        chiSoDienCu: r.chiSoDienCu,
        chiSoDienMoi: r.chiSoDienMoi,
        chiSoNuocCu: r.chiSoNuocCu,
        chiSoNuocMoi: r.chiSoNuocMoi,
        ngayGhi: new Date().toISOString()
      }));

      const response = await fetch('/api/chi-so-dien-nuoc/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      });

      if (response.ok) {
        toast.success('Đã lưu chỉ số cho tất cả các phòng');
        fetchRoomsAndReadings();
      } else {
        const err = await response.json();
        toast.error(err.message || 'Lỗi khi lưu chỉ số');
      }
    } catch (error) {
      toast.error('Lỗi kết nối server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateInvoices = async () => {
    // 1. Kiểm tra xem đã có hóa đơn TỰ ĐỘNG nào trong tháng này cho tòa nhà này chưa
    const alreadyHasAutoInvoice = readings.some(r => r.hasAutoInvoiceThisMonth);
    if (alreadyHasAutoInvoice) {
      toast.error('Tòa nhà này đã được tạo hóa đơn TỰ ĐỘNG tháng này rồi. Bạn không thể chốt lại hàng loạt.');
      return;
    }

    // 2. Kiểm tra xem đã chốt hết số cho tất cả các phòng chưa
    const missingReadings = readings.filter(r => !r.hasReadingThisMonth);
    if (missingReadings.length > 0) {
      toast.warning(`Còn ${missingReadings.length} phòng chưa được chốt số (Phòng: ${missingReadings.map(r => r.maPhong).join(', ')}). Vui lòng lưu chỉ số cho tất cả các phòng trước khi tạo hóa đơn.`);
      return;
    }

    if (!confirm(`Bạn xác nhận muốn chốt toàn bộ số điện nước và tạo hóa đơn cho tòa nhà này? Thao tác này chỉ được thực hiện 1 lần duy nhất trong tháng.`)) {
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch('/api/auto-invoice/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toaNhaId: selectedToaNha,
          thang: currentMonth,
          nam: currentYear
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Đã tạo thành công ${result.createdCount} hóa đơn cho tòa nhà.`);
        router.push('/dashboard/hoa-don');
      } else {
        const err = await response.json();
        toast.error(err.message || 'Lỗi khi tạo hóa đơn');
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi tạo hóa đơn');
    } finally {
      setGenerating(false);
    }
  };

  const isPastDeadline = currentDay() === 1 && new Date().getHours() >= 20;

  function currentDay() {
    return new Date().getDate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Chốt số điện nước</h1>
          <p className="text-gray-500">Ghi lại chỉ số hàng tháng và tạo hóa đơn hàng loạt</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isPastDeadline && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm border border-amber-200">
              <AlertTriangle className="h-4 w-4" />
              <span>Đã quá hạn chốt số (20h ngày 1)</span>
            </div>
          )}
          <Button 
            variant="outline" 
            onClick={fetchRoomsAndReadings}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Tải lại
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Tòa nhà</Label>
              <Select value={selectedToaNha} onValueChange={setSelectedToaNha}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Chọn tòa nhà" />
                </SelectTrigger>
                <SelectContent>
                  {toaNhaList.map((t) => (
                    <SelectItem key={t._id} value={t._id!}>
                      {t.tenToaNha}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tháng</Label>
              <Select value={currentMonth.toString()} onValueChange={(v) => setCurrentMonth(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      Tháng {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Năm</Label>
              <Select value={currentYear.toString()} onValueChange={(v) => setCurrentYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-600">
                <tr>
                  <th className="px-4 py-3 border">Phòng</th>
                  <th className="px-4 py-3 border text-center" colSpan={2}>Chỉ số Điện (kWh)</th>
                  <th className="px-4 py-3 border text-center" colSpan={2}>Chỉ số Nước (m³)</th>
                  <th className="px-4 py-3 border text-center">Trạng thái</th>
                </tr>
                <tr>
                  <th className="px-4 py-2 border"></th>
                  <th className="px-4 py-2 border text-gray-400 font-normal">Cũ</th>
                  <th className="px-4 py-2 border text-gray-400 font-normal">Mới</th>
                  <th className="px-4 py-2 border text-gray-400 font-normal">Cũ</th>
                  <th className="px-4 py-2 border text-gray-400 font-normal">Mới</th>
                  <th className="px-4 py-2 border"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-4 py-4 border bg-gray-50/50"></td>
                    </tr>
                  ))
                ) : readings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      Không có phòng nào đang thuê trong tòa nhà này.
                    </td>
                  </tr>
                ) : (
                  readings.map((r, i) => (
                    <tr key={r.phongId} className={r.hasReadingThisMonth ? "bg-green-50/30" : ""}>
                      <td className="px-4 py-3 border font-medium">
                        {r.maPhong}
                      </td>
                      <td className="px-4 py-3 border bg-gray-50 font-mono text-gray-500">
                        {r.chiSoDienCu}
                      </td>
                      <td className="px-4 py-3 border">
                        <div className="relative">
                          <Zap className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-yellow-500" />
                          <Input 
                            type="number"
                            className="pl-7 h-8 text-sm"
                            value={r.chiSoDienMoi}
                            onChange={(e) => handleInputChange(i, 'chiSoDienMoi', e.target.value)}
                            min={r.chiSoDienCu}
                            disabled={r.hasAutoInvoiceThisMonth || r.hasManualInvoiceThisMonth}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 border bg-gray-50 font-mono text-gray-500">
                        {r.chiSoNuocCu}
                      </td>
                      <td className="px-4 py-3 border">
                        <div className="relative">
                          <Droplets className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-blue-500" />
                          <Input 
                            type="number"
                            className="pl-7 h-8 text-sm"
                            value={r.chiSoNuocMoi}
                            onChange={(e) => handleInputChange(i, 'chiSoNuocMoi', e.target.value)}
                            min={r.chiSoNuocCu}
                            disabled={r.hasAutoInvoiceThisMonth || r.hasManualInvoiceThisMonth}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 border text-center">
                        {r.hasAutoInvoiceThisMonth ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">HĐ Tự động</Badge>
                        ) : r.hasManualInvoiceThisMonth ? (
                          <div className="flex flex-col gap-1 items-center">
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">HĐ Thủ công</Badge>
                            {r.hasReadingThisMonth ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Đã chốt số</Badge>
                            ) : (
                                <span className="text-gray-400 text-[10px] italic">Có thể chốt tự động</span>
                            )}
                          </div>
                        ) : r.hasReadingThisMonth ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Đã chốt số</Badge>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Chưa ghi</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button 
          variant="outline" 
          onClick={handleSaveReadings} 
          disabled={submitting || generating || readings.length === 0}
        >
          <Save className="h-4 w-4 mr-2" />
          {submitting ? 'Đang lưu...' : 'Lưu chỉ số'}
        </Button>
        <Button 
          onClick={handleGenerateInvoices} 
          disabled={submitting || generating || readings.length === 0}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {generating ? 'Đang tạo hóa đơn...' : 'Chốt & Tạo Hóa Đơn'}
        </Button>
      </div>
    </div>
  );
}

function Badge({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
