'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCache } from '@/hooks/use-cache';
import { Card } from '@/components/ui/card';
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
  Plus, 
  Search, 
  Building2, 
  RefreshCw,
} from 'lucide-react';
import { ToaNha } from '@/types';
import { toast } from 'sonner';
import { ToaNhaDataTable } from './table';

import { Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1]
    }
  } as any
};

export default function ToaNhaPage() {
  const { data: session } = useSession();
  const isNhanVien = session?.user?.role === 'nhanVien';
  const cache = useCache<{ toaNhaList: ToaNha[] }>({ key: 'toa-nha-data', duration: 300000 });
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingToaNha, setEditingToaNha] = useState<ToaNha | null>(null);

  useEffect(() => {
    document.title = 'Quản lý Tòa nhà | Impeccable';
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
    toast.success('Dữ liệu hệ thống đã được cập nhật');
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
        toast.success('Đã xóa tòa nhà thành công!');
      } else {
        const msg = result.message || '';
        if (msg.includes('phong') || msg.includes('room') || response.status === 409) {
          toast.error('Không thể xóa vì tòa nhà này còn phòng. Hãy xóa hết các phòng trước!');
        } else {
          toast.error('Xóa tòa nhà thất bại. Vui lòng thử lại sau.');
        }
      }
    } catch (error) {
      toast.error('Mất kết nối đến máy chủ. Kiểm tra mạng rồi thử lại nhé!');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary/20" />
        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-[1400px] mx-auto space-y-16"
    >
      {/* Header Editorial Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-end gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="h-px w-8 bg-primary/40" />
             <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-primary/60">Quản lý hệ thống</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight text-foreground">
            Danh sách <span className="text-primary italic">Tòa nhà</span>
          </h1>
          <p className="text-muted-foreground/60 max-w-md text-sm leading-relaxed">
            Quản lý thông tin các tòa nhà, tối ưu hóa quy trình vận hành và theo dõi tỷ lệ cho thuê thực tế.
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button 
            variant="outline"
            size="lg"
            onClick={handleRefresh}
            disabled={cache.isRefreshing}
            className="rounded-full h-14 px-8 border-border/40 hover:bg-primary/5 font-bold uppercase tracking-widest text-[10px]"
          >
            <RefreshCw className={`h-4 w-4 mr-3 ${cache.isRefreshing ? 'animate-spin' : ''}`} />
            Tải mới
          </Button>
          {!isNhanVien && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" onClick={() => setEditingToaNha(null)} className="rounded-full h-14 px-10 font-bold uppercase tracking-widest text-[10px] shadow-premium">
                  <Plus className="h-4 w-4 mr-3" />
                  Thêm Tòa nhà
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl bg-background/90 backdrop-blur-2xl border-border/40 rounded-2xl p-0 max-h-[90vh] flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/20 flex-shrink-0">
                  <DialogTitle className="text-xl font-heading font-bold">
                    {editingToaNha ? 'Cập nhật Tòa nhà' : 'Thêm Tòa nhà mới'}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {editingToaNha ? 'Cập nhật thông tin cho tòa nhà này.' : 'Nhập các thông số cơ bản để tạo một tòa nhà mới.'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="overflow-y-auto flex-1 px-6">
                  <ToaNhaForm 
                    toaNha={editingToaNha}
                    onClose={() => setIsDialogOpen(false)}
                    onSuccess={() => {
                      cache.clearCache();
                      setIsDialogOpen(false);
                      fetchToaNha(true);
                    }}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </motion.div>

      {/* Stats Summary Panel */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110">
            <Building2 className="size-24" />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary/60">TỔNG SỐ TÒA NHÀ</span>
          <p className="text-5xl font-bold mt-2 tracking-tighter">{toaNhaList.length}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-primary italic">
             <span>Đang được quản lý</span>
          </div>
        </div>
        
        <div className="p-8 rounded-3xl bg-secondary/30 border border-border/40 relative overflow-hidden">
             <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">PHÒNG TRỐNG</span>
             <p className="text-5xl font-bold mt-2 tracking-tighter text-green-600/80">
                {toaNhaList.reduce((sum, toaNha) => sum + ((toaNha as any).phongTrong || 0), 0)}
             </p>
             <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600 italic">
                <span>Phòng chưa cho thuê</span>
             </div>
        </div>

        <div className="p-8 rounded-3xl bg-secondary/30 border border-border/40 relative overflow-hidden">
             <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">ĐANG CHO THUÊ</span>
             <p className="text-5xl font-bold mt-2 tracking-tighter text-blue-600/80">
                {toaNhaList.reduce((sum, toaNha) => sum + ((toaNha as any).phongDangThue || 0), 0)}
             </p>
             <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-600 italic">
                <span>Vận hành ổn định</span>
             </div>
        </div>
      </motion.div>

      {/* Main Table Interface */}
      <motion.div variants={itemVariants} className="bg-background/40 backdrop-blur-md rounded-3xl border border-border/20 overflow-hidden">
        <div className="p-8">
           <ToaNhaDataTable
            data={filteredToaNha}
            onEdit={handleEdit}
            onDelete={handleDelete}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            canEdit={!isNhanVien}
          />
        </div>
      </motion.div>
    </motion.div>
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tenToaNha.trim()) {
      toast.error('Bạn chưa nhập tên tòa nhà!');
      return;
    }
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
          toast.error('Thông tin chưa đầy đủ. Kiểm tra lại các trường bắt buộc nhé!');
        } else if (response.status === 403) {
          toast.error('Bạn không có quyền thực hiện thao tác này.');
        } else {
          toast.error('Có lỗi xảy ra. Vui lòng thử lại sau!');
        }
      }
    } catch (error) {
      toast.error('Mất kết nối đến máy chủ. Kiểm tra mạng rồi thử lại nhé!');
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
        <Label htmlFor="tenToaNha" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Tên tòa nhà</Label>
        <Input
          id="tenToaNha"
          value={formData.tenToaNha}
          onChange={(e) => setFormData(prev => ({ ...prev, tenToaNha: e.target.value }))}
          placeholder="VD: Tòa nhà Hoàng Anh, KTX ABC..."
          required
          className="h-10 bg-secondary/30 border-transparent rounded-xl focus:bg-background transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Địa chỉ</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Số nhà / Ngõ" value={formData.soNha} onChange={(e) => setFormData(prev => ({ ...prev, soNha: e.target.value }))} required className="h-10 bg-secondary/30 border-transparent rounded-xl" />
          <Input placeholder="Tên đường" value={formData.duong} onChange={(e) => setFormData(prev => ({ ...prev, duong: e.target.value }))} required className="h-10 bg-secondary/30 border-transparent rounded-xl" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input placeholder="Phường / Xã" value={formData.phuong} onChange={(e) => setFormData(prev => ({ ...prev, phuong: e.target.value }))} required className="h-10 bg-secondary/30 border-transparent rounded-xl" />
          <Input placeholder="Quận / Huyện" value={formData.quan} onChange={(e) => setFormData(prev => ({ ...prev, quan: e.target.value }))} required className="h-10 bg-secondary/30 border-transparent rounded-xl" />
          <Input placeholder="Thành phố" value={formData.thanhPho} onChange={(e) => setFormData(prev => ({ ...prev, thanhPho: e.target.value }))} required className="h-10 bg-secondary/30 border-transparent rounded-xl" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="moTa" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Mô tả (Ghi chú)</Label>
        <Textarea id="moTa" value={formData.moTa} onChange={(e) => setFormData(prev => ({ ...prev, moTa: e.target.value }))} rows={2} placeholder="Ghi chú thêm về tòa nhà..." className="bg-secondary/30 border-transparent rounded-xl focus:bg-background transition-all resize-none" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Tiện ích chung</Label>
        <div className="grid grid-cols-4 gap-2">
          {tienNghiOptions.map((option) => (
            <div
              key={option.value}
              onClick={() => handleTienNghiChange(option.value, !formData.tienNghiChung.includes(option.value))}
              className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all text-xs font-medium select-none ${
                formData.tienNghiChung.includes(option.value)
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-secondary/20 text-muted-foreground hover:bg-secondary/40 border border-transparent'
              }`}
            >
              <div className={`size-3 rounded-full flex-shrink-0 border ${
                formData.tienNghiChung.includes(option.value) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
              }`} />
              {option.label}
            </div>
          ))}
        </div>
      </div>

      <DialogFooter className="gap-3 pt-4 pb-2 border-t border-border/10">
        <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl h-10 px-6 font-bold text-xs uppercase tracking-widest">Hủy</Button>
        <Button type="submit" className="rounded-xl h-10 px-8 font-bold text-xs uppercase tracking-widest shadow-premium">
          {toaNha ? 'Lưu thay đổi' : 'Thêm tòa nhà'}
        </Button>
      </DialogFooter>
    </form>
  );
}

