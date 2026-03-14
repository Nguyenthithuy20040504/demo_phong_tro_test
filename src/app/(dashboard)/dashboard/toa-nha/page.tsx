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
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          cache.clearCache();
          setToaNhaList(prev => prev.filter(toaNha => toaNha._id !== id));
          toast.success('Thực thể đã được gỡ bỏ');
        }
      }
    } catch (error) {
      console.error('Error deleting toa nha:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary/20" />
        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground/40">Đang quét hạ tầng...</span>
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
             <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-primary/60">Quản lý hạ tầng</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight text-foreground">
            Quản lý <span className="text-primary italic">Tòa nhà</span>
          </h1>
          <p className="text-muted-foreground/60 max-w-md text-sm leading-relaxed">
            Hệ chỉnh thông tin các thực thể bất động sản, tối ưu hóa quy trình vận hành và theo dõi hiệu suất lấp đầy thực tế.
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
            {cache.isRefreshing ? <RefreshCw className="h-4 w-4 animate-spin mr-3" /> : 'Tải mới'}
          </Button>
          {!isNhanVien && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" onClick={() => setEditingToaNha(null)} className="rounded-full h-14 px-10 font-bold uppercase tracking-widest text-[10px] shadow-premium">
                  <Plus className="h-4 w-4 mr-3" />
                  Khai báo Tòa nhà
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-background/80 backdrop-blur-2xl border-border/40 rounded-3xl p-8">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-heading font-bold">
                    {editingToaNha ? 'Hiệu chỉnh Thực thể' : 'Khai báo Thực thể mới'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingToaNha ? 'Cập nhật các thông số vận hành cho tòa nhà hiện hữu.' : 'Nhập các thông số cơ bản để khởi tạo thực thể quản lý mới.'}
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
      </motion.div>

      {/* Stats Summary Panel */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110">
            <Building2 className="size-24" />
          </div>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary/60">TỔNG THỰC THỂ</span>
          <p className="text-5xl font-bold mt-2 tracking-tighter">{toaNhaList.length}</p>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-primary italic">
             <span>Đã xác minh hạ tầng</span>
          </div>
        </div>
        
        <div className="p-8 rounded-3xl bg-secondary/30 border border-border/40 relative overflow-hidden">
             <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">PHÒNG TRỐNG</span>
             <p className="text-5xl font-bold mt-2 tracking-tighter text-green-600/80">
                {toaNhaList.reduce((sum, toaNha) => sum + ((toaNha as any).phongTrong || 0), 0)}
             </p>
             <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-green-600 italic">
                <span>Khả năng lấp đầy còn lại</span>
             </div>
        </div>

        <div className="p-8 rounded-3xl bg-secondary/30 border border-border/40 relative overflow-hidden">
             <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">ĐAN THUÊ</span>
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

      if (response.ok) onSuccess();
    } catch (error) {
      console.error('Error submitting form:', error);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="tenToaNha" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Tên định danh tòa nhà</Label>
        <Input
          id="tenToaNha"
          value={formData.tenToaNha}
          onChange={(e) => setFormData(prev => ({ ...prev, tenToaNha: e.target.value }))}
          required
          className="h-12 bg-secondary/30 border-transparent rounded-xl focus:bg-background transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="soNha" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Số nhà/Ngõ</Label>
          <Input id="soNha" value={formData.soNha} onChange={(e) => setFormData(prev => ({ ...prev, soNha: e.target.value }))} required className="h-12 bg-secondary/30 border-transparent rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duong" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Tên đường</Label>
          <Input id="duong" value={formData.duong} onChange={(e) => setFormData(prev => ({ ...prev, duong: e.target.value }))} required className="h-12 bg-secondary/30 border-transparent rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phuong" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Phường</Label>
          <Input id="phuong" value={formData.phuong} onChange={(e) => setFormData(prev => ({ ...prev, phuong: e.target.value }))} required className="h-12 bg-secondary/30 border-transparent rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quan" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Quận</Label>
          <Input id="quan" value={formData.quan} onChange={(e) => setFormData(prev => ({ ...prev, quan: e.target.value }))} required className="h-12 bg-secondary/30 border-transparent rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="thanhPho" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Thành phố</Label>
          <Input id="thanhPho" value={formData.thanhPho} onChange={(e) => setFormData(prev => ({ ...prev, thanhPho: e.target.value }))} required className="h-12 bg-secondary/30 border-transparent rounded-xl" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="moTa" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Ghi chú vận hành</Label>
        <Textarea id="moTa" value={formData.moTa} onChange={(e) => setFormData(prev => ({ ...prev, moTa: e.target.value }))} rows={3} className="bg-secondary/30 border-transparent rounded-xl focus:bg-background transition-all" />
      </div>

      <div className="space-y-4">
        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Hạ tầng tiện ích chung</Label>
        <div className="grid grid-cols-2 gap-3">
          {tienNghiOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-3 p-3 rounded-xl bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer group" onClick={() => handleTienNghiChange(option.value, !formData.tienNghiChung.includes(option.value))}>
              <div className={`w-4 h-4 rounded-full border-2 border-primary/20 flex items-center justify-center transition-all ${formData.tienNghiChung.includes(option.value) ? 'bg-primary border-primary scale-110' : 'group-hover:border-primary/40'}`}>
                 {formData.tienNghiChung.includes(option.value) && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <span className="text-xs font-medium">{option.label}</span>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter className="gap-4 pt-4">
        <Button type="button" variant="ghost" onClick={onClose} className="rounded-full h-12 px-8 font-bold text-xs uppercase tracking-widest">Hủy bỏ</Button>
        <Button type="submit" className="rounded-full h-12 px-10 font-bold text-xs uppercase tracking-widest shadow-premium">
          {toaNha ? 'Xác nhận hiệu chỉnh' : 'Khai báo thực thể'}
        </Button>
      </DialogFooter>
    </form>
  );
}

