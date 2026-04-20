'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCache } from '@/hooks/use-cache';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Building2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { ToaNha } from '@/types';
import { toast } from 'sonner';
import { ToaNhaDataTable } from './table';

export default function ToaNhaPage() {
  const { data: session } = useSession();
  const isNhanVien = (session?.user as any)?.role === 'nhanVien';
  const cache = useCache<{ toaNhaList: ToaNha[] }>({ key: 'toa-nha-data', duration: 300000 });
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingToaNha, setEditingToaNha] = useState<ToaNha | null>(null);

  useEffect(() => {
    document.title = 'Quản lý Tòa nhà';
  }, []);

  useEffect(() => {
    fetchToaNha();
  }, []);

  const fetchToaNha = async (forceRefresh = false) => {
    try {
      setLoading(true);
      if (!forceRefresh) {
        const cachedData = cache.getCache();
        if (cachedData) {
          setToaNhaList(cachedData.toaNhaList || []);
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/toa-nha');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const toaNhas = result.data;
          setToaNhaList(toaNhas);
          cache.setCache({ toaNhaList: toaNhas });
        }
      }
    } catch (error) {
      console.error('Error fetching toa nha:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    cache.setIsRefreshing(true);
    await fetchToaNha(true);
    cache.setIsRefreshing(false);
    toast.success('Dữ liệu đã được cập nhật.');
  };

  const filteredToaNha = toaNhaList.filter(toaNha =>
    toaNha.tenToaNha.toLowerCase().includes(searchTerm.toLowerCase()) ||
    toaNha.diaChi.duong.toLowerCase().includes(searchTerm.toLowerCase()) ||
    toaNha.diaChi.phuong.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (toaNha: ToaNha) => {
    setEditingToaNha(toaNha);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/toa-nha/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok && result.success) {
        cache.clearCache();
        setToaNhaList(prev => prev.filter(toaNha => toaNha._id !== id));
        toast.success('Tòa nhà đã được xóa.');
      } else {
        toast.error(result.message || 'Xóa tòa nhà thất bại. Vui lòng thử lại sau.');
      }
    } catch (error) {
      toast.error('Mất kết nối với máy chủ. Vui lòng kiểm tra lại đường truyền mạng.');
    }
  };

  if (loading && toaNhaList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary/20" />
        <span className="text-sm text-muted-foreground font-medium animate-pulse">Đang kết nối hệ thống...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
            Quản lý tòa nhà
          </h1>
          <p className="text-xs md:text-sm text-gray-600">
            Danh sách tất cả tòa nhà trong hệ thống
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={cache.isRefreshing}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${cache.isRefreshing ? 'animate-spin' : ''}`} />
            {cache.isRefreshing ? 'Đang tải...' : 'Làm mới'}
          </Button>
          {!isNhanVien && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditingToaNha(null)} className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Tòa nhà
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-white rounded-2xl border-slate-200 shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-slate-800">
                    {editingToaNha ? 'Cập nhật Tòa nhà' : 'Thêm Tòa nhà mới'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500">
                    {editingToaNha ? 'Cập nhật thông tin cho tòa nhà này.' : 'Nhập các thông số cơ bản để tạo một tòa nhà mới.'}
                  </DialogDescription>
                </DialogHeader>

                <ToaNhaForm
                  toaNha={editingToaNha}
                  onClose={() => setIsDialogOpen(false)}
                  onSuccess={() => {
                    cache.clearCache();
                    setIsDialogOpen(false);
                    fetchToaNha(true);
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Tổng tòa nhà</p>
              <p className="text-lg md:text-2xl font-bold">{toaNhaList.length}</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Phòng trống</p>
              <p className="text-lg md:text-2xl font-bold text-green-600">
                {toaNhaList.reduce((sum, toaNha) => sum + ((toaNha as any).phongTrong || 0), 0)}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <Building2 className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Đang cho thuê</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600">
                {toaNhaList.reduce((sum, toaNha) => sum + ((toaNha as any).phongDangThue || 0), 0)}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Hỏng hóc</p>
              <p className="text-lg md:text-2xl font-bold text-red-600">
                {Math.round((toaNhaList.filter(t => (t as any).suCoCount > 0).length / (toaNhaList.length || 1)) * 100)}%
              </p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      <div className={`transition-all duration-500 ${loading ? 'opacity-70 scale-[0.99] pointer-events-none' : 'opacity-100 scale-100'}`}>
        <ToaNhaDataTable
          data={filteredToaNha}
          onEdit={handleEdit}
          onDelete={handleDelete}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          canEdit={!isNhanVien}
        />
        {loading && (
          <div className="flex justify-center items-center mt-4 gap-2 text-xs text-muted-foreground animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Đang cập nhật danh sách tòa nhà...
          </div>
        )}
      </div>
    </div>
  );
}

// Form component remains largely the same but with style updates
function ToaNhaForm({
  toaNha,
  onClose,
  onSuccess
}: {
  toaNha: ToaNha | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    tenToaNha: toaNha?.tenToaNha || '',
    soNha: toaNha?.diaChi.soNha || '',
    duong: toaNha?.diaChi.duong || '',
    phuong: toaNha?.diaChi.phuong || '',
    quan: toaNha?.diaChi.quan || '',
    thanhPho: toaNha?.diaChi.thanhPho || '',
    moTa: toaNha?.moTa || '',
    tienNghiChung: toaNha?.tienNghiChung || [],
  });

  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  useEffect(() => {
    fetch('https://provinces.open-api.vn/api/p/')
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.thanhPho && provinces.length > 0) {
      const p = provinces.find(x => x.name === formData.thanhPho);
      if (p) {
        fetch(`https://provinces.open-api.vn/api/p/${p.code}?depth=2`)
          .then(res => res.json())
          .then(data => setDistricts(data.districts))
          .catch(console.error);
      } else {
        setDistricts([]);
        setWards([]);
      }
    } else {
      setDistricts([]);
      setWards([]);
    }
  }, [formData.thanhPho, provinces]);

  useEffect(() => {
    if (formData.quan && districts.length > 0) {
      const d = districts.find(x => x.name === formData.quan);
      if (d) {
        fetch(`https://provinces.open-api.vn/api/d/${d.code}?depth=2`)
          .then(res => res.json())
          .then(data => setWards(data.wards))
          .catch(console.error);
      } else {
        setWards([]);
      }
    } else {
      setWards([]);
    }
  }, [formData.quan, districts]);

  const tienNghiOptions = [
    { value: 'wifi', label: 'WiFi' },
    { value: 'camera', label: 'Camera an ninh' },
    { value: 'baoVe', label: 'Bảo vệ 24/7' },
    { value: 'giuXe', label: 'Giữ xe' },
    { value: 'thangMay', label: 'Thang máy' },
    { value: 'sanPhoi', label: 'Sân phơi' },
    { value: 'nhaVeSinhChung', label: 'Nhà vệ sinh chung' },
    { value: 'khuBepChung', label: 'Khu bếp chung' },
  ];

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!formData.tenToaNha.trim()) {
      toast.error('Bạn chưa nhập tên tòa nhà!');
      return;
    }

    if (!formData.thanhPho || !formData.quan || !formData.phuong) {
      toast.error('Bạn vui lòng chọn đầy đủ Thành phố, Quận/Huyện, Phường/Xã!');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = {
        tenToaNha: formData.tenToaNha,
        diaChi: {
          soNha: formData.soNha,
          duong: formData.duong,
          phuong: formData.phuong,
          quan: formData.quan,
          thanhPho: formData.thanhPho,
        },
        moTa: formData.moTa,
        tienNghiChung: formData.tienNghiChung,
      };

      const url = toaNha ? `/api/toa-nha/${toaNha._id}` : '/api/toa-nha';
      const method = toaNha ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(toaNha ? 'Cập nhật tòa nhà thành công!' : 'Thêm tòa nhà mới thành công!');
        onSuccess();
      } else {
        const msg = (result.message || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('exists') || response.status === 409) {
          toast.error('Tòa nhà này đã tồn tại trong hệ thống. Hãy đặt tên khác!');
        } else if (response.status === 400) {
          toast.error('Thông tin không đầy đủ. Vui lòng kiểm tra lại các trường bắt buộc.');
        } else if (response.status === 403) {
          toast.error('Bạn không có quyền thực hiện thao tác này.');
        } else {
          toast.error('Có lỗi xảy ra. Vui lòng thử lại sau!');
        }
      }
    } catch (error) {
      toast.error('Mất kết nối với máy chủ. Vui lòng kiểm tra lại đường truyền mạng.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTienNghiChange = (tienNghi: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      tienNghiChung: checked
        ? [...prev.tienNghiChung, tienNghi]
        : prev.tienNghiChung.filter(t => t !== tienNghi)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-1.5">
        <Label htmlFor="tenToaNha" className="text-xs font-bold uppercase tracking-widest text-slate-500">Tên tòa nhà</Label>
        <Input
          id="tenToaNha"
          value={formData.tenToaNha}
          onChange={(e) => setFormData(prev => ({ ...prev, tenToaNha: e.target.value }))}
          placeholder="VD: Tòa nhà Hoàng Anh, KTX ABC..."
          required
          className="h-10 bg-white border border-slate-200 shadow-sm rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 transition-all text-slate-800 font-medium"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Địa chỉ (Chọn theo bản đồ hành chính)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={formData.thanhPho || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, thanhPho: value, quan: '', phuong: '' }))}>
            <SelectTrigger className="h-10 bg-white border border-slate-200 shadow-sm rounded-xl focus:ring-1 focus:ring-primary/50 transition-all text-slate-800 font-medium">
              <SelectValue placeholder="Thành phố / Tỉnh" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map(p => (
                <SelectItem key={p.code} value={p.name}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={formData.quan || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, quan: value, phuong: '' }))} disabled={!formData.thanhPho || districts.length === 0}>
            <SelectTrigger className="h-10 bg-white border border-slate-200 shadow-sm rounded-xl focus:ring-1 focus:ring-primary/50 transition-all text-slate-800 font-medium">
              <SelectValue placeholder="Quận / Huyện" />
            </SelectTrigger>
            <SelectContent>
              {districts.map(d => (
                <SelectItem key={d.code} value={d.name}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={formData.phuong || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, phuong: value }))} disabled={!formData.quan || wards.length === 0}>
            <SelectTrigger className="h-10 bg-white border border-slate-200 shadow-sm rounded-xl focus:ring-1 focus:ring-primary/50 transition-all text-slate-800 font-medium">
              <SelectValue placeholder="Phường / Xã" />
            </SelectTrigger>
            <SelectContent>
              {wards.map(w => (
                <SelectItem key={w.code} value={w.name}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="Tên đường" value={formData.duong} onChange={(e) => setFormData(prev => ({ ...prev, duong: e.target.value }))} required className="h-10 bg-white border border-slate-200 shadow-sm rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 transition-all text-slate-800 font-medium" />
          <Input placeholder="Số nhà / Ngõ" value={formData.soNha} onChange={(e) => setFormData(prev => ({ ...prev, soNha: e.target.value }))} required className="h-10 bg-white border border-slate-200 shadow-sm rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 transition-all text-slate-800 font-medium" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="moTa" className="text-xs font-bold uppercase tracking-widest text-slate-500">Mô tả (Ghi chú)</Label>
        <Textarea id="moTa" value={formData.moTa} onChange={(e) => setFormData(prev => ({ ...prev, moTa: e.target.value }))} rows={2} placeholder="Ghi chú thêm về tòa nhà..." className="bg-white border border-slate-200 shadow-sm rounded-xl focus-visible:ring-1 focus-visible:ring-primary/50 transition-all resize-none text-slate-800 font-medium" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Tiện ích chung</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {tienNghiOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => handleTienNghiChange(option.value, !formData.tienNghiChung.includes(option.value))}
              className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all text-xs font-medium select-none border ${formData.tienNghiChung.includes(option.value)
                  ? 'bg-primary/5 text-primary border-primary/30 shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
            >
              <div className={`size-3 rounded-full flex-shrink-0 border ${formData.tienNghiChung.includes(option.value) ? 'bg-primary border-primary' : 'border-slate-300'
                }`} />
              {option.label}
            </div>
          ))}
        </div>
      </div>

      <DialogFooter className="gap-3 pt-4 pb-2 border-t border-border/10">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={submitting}
          className="rounded-xl h-10 px-6 font-bold text-xs uppercase tracking-widest"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="rounded-xl h-10 px-8 font-bold text-xs uppercase tracking-widest shadow-premium"
        >
          {submitting ? (
            <>
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            toaNha ? 'Lưu thay đổi' : 'Thêm tòa nhà'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

