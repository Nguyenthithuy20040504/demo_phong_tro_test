'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Users,
  ClipboardList,
  Loader2,
  RefreshCw,
  CalendarDays,
  TrendingUp,
  Info,
  Sparkles,
  Droplets,
  Building2,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AutoInvoiceStatus {
  currentMonth: number;
  currentYear: number;
  activeContractsCount: number;
  existingInvoicesCount: number;
  contractsWithoutReadingsCount: number;
  pendingContracts: any[];
  canRun: boolean;
}

interface AutoInvoiceResult {
  createdInvoices: number;
  totalContracts: number;
  errors: string[];
}

export default function HoaDonTuDongPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AutoInvoiceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<AutoInvoiceResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [isReadingsModalOpen, setIsReadingsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkReadings, setBulkReadings] = useState<Record<string, { chiSoDienCuoiKy: number | undefined; chiSoNuocCuoiKy: number | undefined }>>({});

  // Hàm lấy buildingId hiện tại từ localStorage
  const getBuildingId = () => {
    if (typeof window === 'undefined') return 'all';
    return localStorage.getItem('selected_building_id') || 'all';
  };

  useEffect(() => {
    document.title = 'Hóa đơn tự động';
    fetchStatus();
  }, []);

  // Đồng bộ khi chuyển tòa nhà từ TopNavbar
  useEffect(() => {
    const handleBuildingChange = () => fetchStatus();
    window.addEventListener('buildingChange', handleBuildingChange);
    return () => window.removeEventListener('buildingChange', handleBuildingChange);
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const buildingId = getBuildingId();
      const buildingParam = buildingId && buildingId !== 'all' ? `?toaNhaId=${buildingId}` : '';
      const response = await fetch(`/api/auto-invoice${buildingParam}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);

        // Initialize bulk readings to undefined to force user entry
        const initialReadings: Record<string, any> = {};
        data.data.pendingContracts.forEach((c: any) => {
          initialReadings[c._id] = {
            chiSoDienCuoiKy: undefined,
            chiSoNuocCuoiKy: undefined
          };
        });
        setBulkReadings(initialReadings);
      } else {
        toast.error('Không thể tải trạng thái hóa đơn tự động.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi kiểm tra trạng thái.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoCreate = async () => {
    setShowConfirmDialog(false);
    setIsCreating(true);
    const toastId = toast.loading('Đang tạo hóa đơn tự động...');

    try {
      const buildingId = getBuildingId();
      const response = await fetch('/api/auto-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toaNhaId: buildingId }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.data);
        setShowResultDialog(true);
        toast.success(`Đã tạo thành công ${data.data.createdInvoices} hóa đơn!`, { id: toastId });
        // Refresh status
        fetchStatus();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Có lỗi xảy ra khi tạo hóa đơn tự động.', { id: toastId });
      }
    } catch (error) {
      toast.error('Lỗi kết nối. Vui lòng thử lại sau.', { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const getMonthName = (month: number) => {
    return `Tháng ${month}`;
  };

  const handleBulkCreate = async () => {
    const filteredContracts = (status?.pendingContracts || []).filter((c: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        c.phong?.maPhong?.toLowerCase().includes(searchLower) ||
        c.khachThue?.ten?.toLowerCase().includes(searchLower)
      );
    });

    if (filteredContracts.length === 0) return;

    setIsReadingsModalOpen(false);
    setIsCreating(true);
    const toastId = toast.loading(`Đang tạo hóa đơn cho ${filteredContracts.length} phòng...`);

    try {
      const buildingId = getBuildingId();
      // Only send readings for filtered contracts
      const readingsArray = filteredContracts.map(c => ({
        contractId: c._id,
        ...bulkReadings[c._id]
      }));

      const response = await fetch('/api/auto-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toaNhaId: buildingId,
          readings: readingsArray
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.data);
        setShowResultDialog(true);
        toast.success(`Đã tạo thành công ${data.data.createdInvoices} hóa đơn!`, { id: toastId });
        fetchStatus();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Có lỗi xảy ra.', { id: toastId });
      }
    } catch (error) {
      toast.error('Lỗi kết nối.', { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const getReadinessLevel = (): 'ready' | 'warning' | 'error' => {
    if (!status) return 'error';
    if (status.activeContractsCount === 0) return 'error';
    if (status.contractsWithoutReadingsCount > 0) return 'warning';
    if (status.canRun) return 'ready';
    return 'warning';
  };

  const updateReading = (contractId: string, field: 'chiSoDienCuoiKy' | 'chiSoNuocCuoiKy', value: number | undefined) => {
    setBulkReadings(prev => ({
      ...prev,
      [contractId]: {
        ...prev[contractId],
        [field]: value
      }
    }));
  };

  const isAllReadingsFilled = () => {
    if (!status?.pendingContracts) return false;
    
    const filteredContracts = status.pendingContracts.filter((c: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        c.phong?.maPhong?.toLowerCase().includes(searchLower) ||
        c.khachThue?.ten?.toLowerCase().includes(searchLower)
      );
    });

    if (filteredContracts.length === 0) return false;

    return filteredContracts.every(contract => {
      const reading = bulkReadings[contract._id];
      if (!reading) return false;
      
      const { chiSoDienCuoiKy, chiSoNuocCuoiKy } = reading;

      // Kiểm tra nếu đã nhập tỉ số (không để trống) và số mới phải >= số cũ
      return (
        typeof chiSoDienCuoiKy === 'number' && 
        typeof chiSoNuocCuoiKy === 'number' &&
        chiSoDienCuoiKy >= contract.chiSoDienCu && 
        chiSoNuocCuoiKy >= contract.chiSoNuocCu
      );
    });
  };

  const readiness = getReadinessLevel();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/hoa-don')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Hóa đơn tự động
            </h1>
            <p className="text-xs md:text-sm text-gray-600">
              Tạo hóa đơn hàng loạt cho tất cả hợp đồng đang hoạt động
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Thông tin kỳ hiện tại */}
      <Card className="border-l-4 border-l-teal-500 bg-gradient-to-r from-teal-50/50 to-white">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-teal-100 text-teal-700">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Kỳ tạo hóa đơn hiện tại</p>
              <p className="text-lg md:text-xl font-bold text-teal-800">
                {status ? `${getMonthName(status.currentMonth)} / ${status.currentYear}` : '---'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        {/* Hợp đồng hoạt động */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100/30"></div>
          <CardContent className="relative p-4 md:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                  Hợp đồng hoạt động
                </p>
                <p className="text-2xl md:text-3xl font-bold text-blue-700 mt-1">
                  {status?.activeContractsCount ?? 0}
                </p>
                <p className="text-xs text-blue-500 mt-1">hợp đồng cần tạo HD</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Đã tạo tháng này */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100/30"></div>
          <CardContent className="relative p-4 md:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 uppercase tracking-wider">
                  Đã tạo tháng này
                </p>
                <p className="text-2xl md:text-3xl font-bold text-green-700 mt-1">
                  {status?.existingInvoicesCount ?? 0}
                </p>
                <p className="text-xs text-green-500 mt-1">hóa đơn đã được tạo</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chưa có chỉ số */}
        <Card className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${(status?.contractsWithoutReadingsCount ?? 0) > 0
              ? 'from-amber-50 to-amber-100/30'
              : 'from-gray-50 to-gray-100/30'
            }`}></div>
          <CardContent className="relative p-4 md:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${(status?.contractsWithoutReadingsCount ?? 0) > 0
                    ? 'text-amber-600'
                    : 'text-gray-600'
                  }`}>
                  Chưa có chỉ số
                </p>
                <p className={`text-2xl md:text-3xl font-bold mt-1 ${(status?.contractsWithoutReadingsCount ?? 0) > 0
                    ? 'text-amber-700'
                    : 'text-gray-700'
                  }`}>
                  {status?.contractsWithoutReadingsCount ?? 0}
                </p>
                <p className={`text-xs mt-1 ${(status?.contractsWithoutReadingsCount ?? 0) > 0
                    ? 'text-amber-500'
                    : 'text-gray-500'
                  }`}>
                  phòng chưa ghi điện nước
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${(status?.contractsWithoutReadingsCount ?? 0) > 0
                  ? 'bg-amber-100'
                  : 'bg-gray-100'
                }`}>
                <ClipboardList className={`h-5 w-5 ${(status?.contractsWithoutReadingsCount ?? 0) > 0
                    ? 'text-amber-600'
                    : 'text-gray-600'
                  }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trạng thái sẵn sàng + Hành động */}
      <Card>
        <CardHeader className="p-4 md:p-6 pb-3">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" />
            Trạng thái & Hành động
          </CardTitle>
          <CardDescription>
            Kiểm tra các điều kiện trước khi tạo hóa đơn tự động
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 space-y-4">
          {/* Checklist */}
          <div className="space-y-2.5 rounded-lg border p-4 bg-gray-50/50">
            {/* Điều kiện 1: Hợp đồng hoạt động */}
            <div className="flex items-center gap-3">
              {(status?.activeContractsCount ?? 0) > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="text-sm font-medium">
                  Có hợp đồng đang hoạt động
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({status?.activeContractsCount ?? 0} hợp đồng)
                </span>
              </div>
              {(status?.activeContractsCount ?? 0) > 0 ? (
                <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Đạt</Badge>
              ) : (
                <Badge variant="destructive">Chưa đạt</Badge>
              )}
            </div>

            {/* Điều kiện 2: Chỉ số điện nước */}
            <div className="flex items-center gap-3">
              {(status?.contractsWithoutReadingsCount ?? 0) === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="text-sm font-medium">
                  Tất cả phòng đã nhập chỉ số điện nước
                </span>
                {(status?.contractsWithoutReadingsCount ?? 0) > 0 && (
                  <span className="text-xs text-amber-600 ml-2">
                    (còn {status?.contractsWithoutReadingsCount} phòng chưa có)
                  </span>
                )}
              </div>
              {(status?.contractsWithoutReadingsCount ?? 0) === 0 ? (
                <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Đạt</Badge>
              ) : (
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">Cảnh báo</Badge>
              )}
            </div>

            {/* Điều kiện 3: Hóa đơn tháng này */}
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium">
                  Hóa đơn đã tạo trong tháng
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  ({status?.existingInvoicesCount ?? 0} hóa đơn)
                </span>
              </div>
              <Badge variant="outline" className="border-blue-200 text-blue-600 bg-blue-50">
                Thông tin
              </Badge>
            </div>
          </div>

          {/* Cảnh báo nếu chưa sẵn sàng */}
          {readiness === 'error' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Chưa thể tạo hóa đơn tự động</p>
                <p className="text-xs text-red-600 mt-1">
                  {(status?.activeContractsCount ?? 0) === 0
                    ? 'Không có hợp đồng nào đang hoạt động. Vui lòng tạo hợp đồng trước.'
                    : 'Vui lòng kiểm tra lại các điều kiện ở trên.'}
                </p>
              </div>
            </div>
          )}

          {readiness === 'warning' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Có phòng chưa nhập chỉ số điện nước</p>
                <p className="text-xs text-amber-600 mt-1">
                  Những phòng chưa có chỉ số sẽ bị bỏ qua khi tạo hóa đơn tự động.
                  Bạn vẫn có thể tiếp tục, nhưng một số hóa đơn sẽ không được tạo.
                </p>
              </div>
            </div>
          )}

          {readiness === 'ready' && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">Sẵn sàng tạo hóa đơn!</p>
                <p className="text-xs text-green-600 mt-1">
                  Tất cả điều kiện đã được đáp ứng. Bạn có thể tạo hóa đơn tự động cho
                  {' '}{status?.activeContractsCount} hợp đồng.
                </p>
              </div>
            </div>
          )}

          {/* Nút hành động */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              size="lg"
              disabled={isCreating || (status?.pendingContracts?.length ?? 0) === 0}
              onClick={() => setIsReadingsModalOpen(true)}
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white h-12 text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <ClipboardList className="h-5 w-5 mr-2" />
              Thêm thông tin điện nước
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/dashboard/hoa-don/them-moi')}
              className="flex-1 h-12 text-sm md:text-base border-2 border-dashed border-teal-100 text-teal-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-800 transition-all font-medium"
            >
              <FileText className="h-5 w-5 mr-2" />
              Tạo hóa đơn thủ công
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Dialog xác nhận */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Xác nhận tạo hóa đơn tự động
            </DialogTitle>
            <DialogDescription className="text-left pt-2 space-y-2">
              <p>
                Hệ thống sẽ tạo hóa đơn <strong>{getMonthName(status?.currentMonth ?? 1)}/{status?.currentYear}</strong> cho
                {' '}<strong>{status?.activeContractsCount} hợp đồng</strong> đang hoạt động.
              </p>
              <div className="text-xs p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
                <p className="font-semibold text-amber-800">⚠️ Lưu ý:</p>
                <ul className="list-disc list-inside text-amber-700 space-y-0.5">
                  <li>Hợp đồng đã có hóa đơn tháng này sẽ được bỏ qua</li>
                  <li>Phòng chưa có chỉ số điện nước sẽ không tạo được hóa đơn</li>
                  <li>Hệ thống sẽ tự động gửi thông báo đến khách thuê</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Hủy bỏ
            </Button>
            <Button
              onClick={handleAutoCreate}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Xác nhận tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog kết quả */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-md">
          {/* ... existing result dialog content ... */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result && result.errors.length === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              Kết quả tạo hóa đơn tự động
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-2xl font-bold text-blue-700">{result.totalContracts}</p>
                  <p className="text-xs text-blue-600">Tổng HĐ xử lý</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-2xl font-bold text-green-700">{result.createdInvoices}</p>
                  <p className="text-xs text-green-600">HD tạo thành công</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 space-y-2">
                  <p className="text-sm font-semibold text-red-800 flex items-center gap-1.5">
                    <XCircle className="h-4 w-4" />
                    {result.errors.length} lỗi phát sinh
                  </p>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <li key={index} className="text-xs text-red-600 flex items-start gap-1.5">
                        <span className="text-red-400 mt-0.5">•</span>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors.length === 0 && result.createdInvoices > 0 && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
                  <p className="text-sm text-green-700 font-medium">
                    🎉 Tất cả hóa đơn đã được tạo thành công!
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultDialog(false)}>Đóng</Button>
            <Button
              className="bg-teal-600 text-white"
              onClick={() => {
                setShowResultDialog(false);
                router.push('/dashboard/hoa-don');
              }}
            >
              Xem danh sách
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup nhập chỉ số hàng loạt */}
      <Dialog 
        open={isReadingsModalOpen} 
        onOpenChange={(open) => {
          setIsReadingsModalOpen(open);
          if (!open) setSearchTerm('');
        }}
      >
        <DialogContent className="max-w-[95vw] md:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ClipboardList className="h-6 w-6 text-teal-600" />
              Nhập thông tin điện nước hàng loạt
            </DialogTitle>
            <DialogDescription>
              Nhập chỉ số cuối kỳ cho các phòng thuộc kỳ {status ? `${getMonthName(status.currentMonth)}/${status.currentYear}` : ''}
            </DialogDescription>
            
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm tên phòng hoặc mã phòng..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2">
            <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">Phòng</th>
                    <th className="px-4 py-3 text-center font-semibold text-blue-700 bg-blue-50/30 whitespace-nowrap">Điện (Cũ → Mới)</th>
                    <th className="px-4 py-3 text-center font-semibold text-teal-700 bg-teal-50/30 whitespace-nowrap">Nước (Cũ → Mới)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {status?.pendingContracts
                    .filter((c: any) => {
                      const searchLower = searchTerm.toLowerCase();
                      return (
                        c.phong?.maPhong?.toLowerCase().includes(searchLower) ||
                        c.khachThue?.ten?.toLowerCase().includes(searchLower)
                      );
                    })
                    .map((contract: any) => (
                    <tr key={contract._id} className="hover:bg-gray-50/30">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{contract.phong?.maPhong || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{contract.khachThue?.ten || 'Chưa xác định'}</div>
                      </td>
                      <td className="px-4 py-4 bg-blue-50/10">
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-xs text-gray-400 font-medium min-w-[30px] text-right">
                            {contract.chiSoDienCu}
                          </span>
                          <span className="text-gray-300">→</span>
                          <div className="relative w-28">
                            <Zap className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 opacity-60" />
                            <input
                              type="number"
                              className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white transition-all shadow-sm"
                              placeholder={contract.chiSoDienCu.toString()}
                              onFocus={(e) => e.target.select()}
                              min={contract.chiSoDienCu}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                updateReading(contract._id, 'chiSoDienCuoiKy', val);
                              }}
                              value={bulkReadings[contract._id]?.chiSoDienCuoiKy ?? ''}
                            />
                          </div>
                        </div>
                        {bulkReadings[contract._id]?.chiSoDienCuoiKy !== undefined && (bulkReadings[contract._id]?.chiSoDienCuoiKy ?? 0) < contract.chiSoDienCu && (
                          <p className="text-[10px] text-red-500 mt-1 text-center font-medium">Lớn hơn {contract.chiSoDienCu}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 bg-teal-50/10">
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-xs text-gray-400 font-medium min-w-[30px] text-right">
                            {contract.chiSoNuocCu}
                          </span>
                          <span className="text-gray-300">→</span>
                          <div className="relative w-28">
                            <Droplets className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 opacity-60" />
                            <input
                              type="number"
                              className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white transition-all shadow-sm"
                              placeholder={contract.chiSoNuocCu.toString()}
                              onFocus={(e) => e.target.select()}
                              min={contract.chiSoNuocCu}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                updateReading(contract._id, 'chiSoNuocCuoiKy', val);
                              }}
                              value={bulkReadings[contract._id]?.chiSoNuocCuoiKy ?? ''}
                            />
                          </div>
                        </div>
                        {bulkReadings[contract._id]?.chiSoNuocCuoiKy !== undefined && (bulkReadings[contract._id]?.chiSoNuocCuoiKy ?? 0) < contract.chiSoNuocCu && (
                          <p className="text-[10px] text-red-500 mt-1 text-center font-medium">Lớn hơn {contract.chiSoNuocCu}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="p-6 bg-gray-50/50 border-t gap-3 sm:gap-0">
            <Button variant="outline" size="lg" onClick={() => setIsReadingsModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              size="lg"
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-10 shadow-lg shadow-teal-100 disabled:opacity-50 disabled:grayscale transition-all"
              onClick={handleBulkCreate}
              disabled={isCreating || !isAllReadingsFilled()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  {searchTerm ? `Sinh hóa đơn cho ${
                    status?.pendingContracts.filter((c: any) => {
                      const searchLower = searchTerm.toLowerCase();
                      return (
                        c.phong?.maPhong?.toLowerCase().includes(searchLower) ||
                        c.khachThue?.ten?.toLowerCase().includes(searchLower)
                      );
                    }).length
                  } phòng` : 'Sinh hóa đơn tự động'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
