'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCache } from '@/hooks/use-cache';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Users, 
  Phone,
  Mail,
  Calendar,
  MapPin,
  Info,
  CreditCard,
  RefreshCw,
  Copy,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  UserX,
  Sparkles
} from 'lucide-react';
import { KhachThue } from '@/types';
import { KhachThueDataTable } from './table';
import { CCCDUpload } from '@/components/ui/cccd-upload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
}

export default function KhachThuePage() {
  const { data: session } = useSession();
  const isNhanVien = session?.user?.role === 'nhanVien';
  const cache = useCache<{ khachThueList: KhachThue[] }>({ key: 'khach-thue-data', duration: 300000 });
  const [khachThueList, setKhachThueList] = useState<KhachThue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrangThai, setSelectedTrangThai] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKhachThue, setEditingKhachThue] = useState<KhachThue | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Quản lý Khách thuê | Impeccable';
  }, []);

  useEffect(() => {
    fetchKhachThue();
  }, []);

  const fetchKhachThue = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (!forceRefresh) {
        const cachedData = cache.getCache();
        if (cachedData) {
          setKhachThueList(cachedData.khachThueList || []);
          setLoading(false);
          return;
        }
      }
      
      const params = new URLSearchParams();
      if (selectedTrangThai && selectedTrangThai !== 'all') params.append('trangThai', selectedTrangThai);
      
      const response = await fetch(`/api/khach-thue?${params.toString()}&limit=100`);
      let khachThueData: KhachThue[] = [];
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          khachThueData = result.data;
          setKhachThueList(khachThueData);
        }
      }
      
      if (khachThueData.length > 0) {
        cache.setCache({ khachThueList: khachThueData });
      }
    } catch (error) {
      console.error('Error fetching khach thue:', error);
      toast.error('Lỗi kết nối dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    cache.setIsRefreshing(true);
    await fetchKhachThue(true);
    cache.setIsRefreshing(false);
    toast.success('Dữ liệu đã được đồng bộ');
  };

  useEffect(() => {
    if (selectedTrangThai) {
      fetchKhachThue(true);
    }
  }, [selectedTrangThai]);

  const filteredKhachThue = khachThueList.filter(khachThue =>
    khachThue.hoTen.toLowerCase().includes(searchTerm.toLowerCase()) ||
    khachThue.soDienThoai.includes(searchTerm) ||
    khachThue.cccd.includes(searchTerm) ||
    khachThue.queQuan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (khachThue: KhachThue) => {
    setEditingKhachThue(khachThue);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoading(`delete-${id}`);
      const response = await fetch(`/api/khach-thue/${id}`, { method: 'DELETE' });
      const result = await response.json();
      
      if (response.ok && result.success) {
        cache.clearCache();
        setKhachThueList(prev => prev.filter(kt => kt._id !== id));
        toast.success('Đã xóa khách thuê thành công!');
      } else {
        const msg = (result.message || '').toLowerCase();
        if (msg.includes('hop dong') || msg.includes('hợp đồng') || msg.includes('contract')) {
          toast.error('Không thể xóa vì khách thuê này đang có hợp đồng hoạt động!');
        } else {
          toast.error('Xóa thất bại. Vui lòng thử lại sau.');
        }
      }
    } catch (error) {
      toast.error('Mất kết nối đến máy chủ. Kiểm tra mạng rồi thử lại nhé!');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-12"
    >
      {/* Editorial Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
           <div className="flex items-center gap-3">
              <span className="h-px w-8 bg-primary/40" />
              <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-primary/60">Quản lý khách hàng</span>
           </div>
           <h1 className="text-4xl md:text-5xl font-['Playfair_Display'] italic text-foreground tracking-tight">Khách thuê</h1>
           <p className="text-sm text-muted-foreground max-w-md font-medium leading-relaxed">
             Quản lý thông tin khách thuê, hợp đồng và lịch sử thanh toán.
           </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={cache.isRefreshing}
              className="h-11 px-5 rounded-2xl bg-background/50 backdrop-blur-md border-border/40 text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/40 transition-all flex-1 sm:flex-none"
            >
              <RefreshCw className={`size-3.5 mr-2 ${cache.isRefreshing ? 'animate-spin' : ''}`} />
              Tải mới
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditingKhachThue(null)} className="h-11 px-6 rounded-2xl bg-primary shadow-premium hover:shadow-premium-hover transition-all text-[10px] font-bold uppercase tracking-widest gap-2 flex-1 sm:flex-none">
                  <Plus className="size-4" />
                  Thêm khách thuê
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/80 backdrop-blur-2xl border-border/40 rounded-[2.5rem] p-8">
                <DialogHeader className="mb-8">
                  <DialogTitle className="text-3xl font-bold italic tracking-tight font-['Playfair_Display']">
                    {editingKhachThue ? 'Cập nhật thông tin' : 'Thêm khách thuê mới'}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
                    {editingKhachThue ? 'Cập nhật hồ sơ khách thuê' : 'Nhập thông tin cơ bản cho khách thuê mới'}
                  </DialogDescription>
                </DialogHeader>
                
                <KhachThueForm 
                  khachThue={editingKhachThue}
                  onClose={() => setIsDialogOpen(false)}
                  onSuccess={() => {
                    cache.clearCache();
                    setIsDialogOpen(false);
                    fetchKhachThue(true);
                    toast.success(editingKhachThue ? 'Đã cập nhật hồ sơ' : 'Thêm khách thuê thành công');
                  }}
                />
              </DialogContent>
            </Dialog>
        </div>
      </motion.div>

      {/* Stats Section with Glassmorphism */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Tổng khách', value: khachThueList.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/5' },
            { label: 'Đang thuê', value: khachThueList.filter(k => k.trangThai === 'dangThue').length, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
            { label: 'Đã trả phòng', value: khachThueList.filter(k => k.trangThai === 'daTraPhong').length, icon: UserX, color: 'text-slate-500', bg: 'bg-slate-500/5' },
            { label: 'Chờ duyệt', value: khachThueList.filter(k => k.trangThai === 'chuaThue').length, icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-500/5' },
          ].map((stat, i) => (
            <Card key={i} className="group relative overflow-hidden border-none bg-background/40 backdrop-blur-md rounded-3xl p-6 hover:shadow-premium transition-all duration-500">
               <div className={`absolute top-0 right-0 size-24 ${stat.bg} rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-500`} />
               <div className="relative flex flex-col gap-4">
                  <div className={`size-10 rounded-2xl ${stat.bg} flex items-center justify-center border border-border/20`}>
                     <stat.icon className={`size-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{stat.label}</p>
                    <p className="text-3xl font-bold tracking-tighter text-foreground">{stat.value}</p>
                  </div>
               </div>
            </Card>
          ))}
      </motion.div>

      {/* Desktop Table Container */}
      <motion.div variants={itemVariants} className="hidden md:block">
        <Card className="border-none bg-background/40 backdrop-blur-xl rounded-[2.5rem] shadow-premium-subtle overflow-hidden">
          <CardContent className="p-10">
            <KhachThueDataTable
              data={filteredKhachThue}
              onEdit={handleEdit}
              onDelete={handleDelete}
              actionLoading={actionLoading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedTrangThai={selectedTrangThai}
              onTrangThaiChange={setSelectedTrangThai}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Mobile Experience - Redesigned Editorial Cards */}
      <motion.div variants={itemVariants} className="md:hidden space-y-8">
        <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
               <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Danh sách</span>
               <span className="text-lg font-bold italic font-['Playfair_Display'] tracking-tight">Khách thuê</span>
            </div>
            <Badge variant="outline" className="h-7 rounded-full px-3 text-[10px] font-bold border-border/40">{filteredKhachThue.length} Người</Badge>
        </div>

        <div className="space-y-4 px-2">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
              <Input
                placeholder="Tìm kiếm khách..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 bg-secondary/20 border-transparent rounded-[1.25rem] text-sm"
              />
           </div>
        </div>
        
        <AnimatePresence mode="popLayout">
          {filteredKhachThue.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 flex flex-col items-center justify-center gap-4 opacity-40">
              <Users className="size-12 stroke-[1]" />
              <p className="text-xs font-bold uppercase tracking-widest">Không tìm thấy khách thuê</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-6 px-2">
              {filteredKhachThue.map((kt) => (
                <motion.div 
                  layout
                  key={kt._id}
                  variants={itemVariants}
                  className="group relative overflow-hidden bg-background/60 backdrop-blur-xl border border-border/20 rounded-[2rem] p-6 shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                       <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Users className="size-5 text-primary/60" />
                       </div>
                       <div className="space-y-0.5">
                          <h3 className="text-xl font-bold tracking-tight text-foreground">{kt.hoTen}</h3>
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">{kt.gioiTinh}</span>
                       </div>
                    </div>
                    {/* Status Indicator */}
                    <div className={`px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest ${
                       kt.trangThai === 'dangThue' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' :
                       kt.trangThai === 'daTraPhong' ? 'bg-slate-500/5 text-slate-500 border-slate-500/10' :
                       'bg-amber-500/5 text-amber-600 border-amber-500/10'
                    }`}>
                        {kt.trangThai === 'dangThue' ? 'Active' : kt.trangThai === 'daTraPhong' ? 'Inactive' : 'Pending'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 mb-8">
                      <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl">
                         <Phone className="size-3.5 text-muted-foreground/60" />
                         <span className="text-sm font-mono font-medium tracking-tight whitespace-nowrap">{kt.soDienThoai}</span>
                      </div>
                      <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-2xl">
                         <MapPin className="size-3.5 text-muted-foreground/60" />
                         <span className="text-sm font-medium tracking-tight truncate">{kt.queQuan}</span>
                      </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1 h-12 rounded-2xl bg-secondary/10 hover:bg-secondary/20 text-xs font-bold uppercase tracking-widest gap-2"
                      onClick={() => handleEdit(kt)}
                    >
                      <Edit className="size-3.5" />
                      Chỉnh sửa
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-12 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 group"
                      onClick={() => handleDelete(kt._id!)}
                      disabled={actionLoading === `delete-${kt._id}`}
                    >
                      <Trash2 className="size-4 text-rose-500/40 group-hover:text-rose-500 transition-colors" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Form component for adding/editing khach thue
function KhachThueForm({ 
  khachThue, 
  onClose, 
  onSuccess 
}: { 
  khachThue: KhachThue | null;
  onClose: () => void;
  onSuccess: (newKhachThue?: KhachThue) => void;
}) {
  const [formData, setFormData] = useState({
    hoTen: khachThue?.hoTen || '',
    soDienThoai: khachThue?.soDienThoai || '',
    email: khachThue?.email || '',
    cccd: khachThue?.cccd || '',
    ngaySinh: khachThue?.ngaySinh ? new Date(khachThue.ngaySinh).toISOString().split('T')[0] : '',
    gioiTinh: khachThue?.gioiTinh || 'nam',
    queQuan: khachThue?.queQuan || '',
    anhCCCD: {
      matTruoc: khachThue?.anhCCCD?.matTruoc || '',
      matSau: khachThue?.anhCCCD?.matSau || '',
    },
    ngheNghiep: khachThue?.ngheNghiep || '',
    matKhau: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = khachThue ? `/api/khach-thue/${khachThue._id}` : '/api/khach-thue';
      const method = khachThue ? 'PUT' : 'POST';

      const submitData = { ...formData };
      if (!submitData.matKhau || submitData.matKhau.trim() === '') {
        delete (submitData as any).matKhau;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const result = await response.json();
        onSuccess(result.data);
      } else {
        const error = await response.json();
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('cccd') || msg.includes('phone') || msg.includes('sdt')) {
          toast.error('Số điện thoại hoặc số CCCD đã được đăng ký trước đó. Vui lòng kiểm tra lại!');
        } else if (msg.includes('email')) {
          toast.error('Email này đã được sử dụng. Hãy dùng email khác!');
        } else if (response.status === 400) {
          toast.error('Thông tin chưa đầy đủ hoặc không hợp lệ. Kiểm tra lại nhé!');
        } else if (response.status === 403) {
          toast.error('Bạn không có quyền thực hiện thao tác này.');
        } else {
          toast.error(error.message || 'Có lỗi xảy ra. Vui lòng thử lại!');
        }
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <Tabs defaultValue="thong-tin" className="w-full">
        <TabsList className="bg-secondary/20 p-1.5 rounded-2xl mb-8 flex w-fit gap-1">
          <TabsTrigger value="thong-tin" className="rounded-xl px-6 py-2 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-premium transition-all">
            Hồ sơ khách thuê
          </TabsTrigger>
          <TabsTrigger value="anh-cccd" className="rounded-xl px-6 py-2 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-premium transition-all">
            Hình ảnh CCCD
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="thong-tin" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Họ và tên</Label>
              <Input
                value={formData.hoTen}
                onChange={(e) => setFormData(prev => ({ ...prev, hoTen: e.target.value }))}
                required
                className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Số điện thoại</Label>
              <Input
                value={formData.soDienThoai}
                onChange={(e) => setFormData(prev => ({ ...prev, soDienThoai: e.target.value }))}
                required
                className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Số CCCD</Label>
              <Input
                value={formData.cccd}
                onChange={(e) => setFormData(prev => ({ ...prev, cccd: e.target.value }))}
                required
                className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Ngày sinh</Label>
              <Input
                type="date"
                value={formData.ngaySinh}
                onChange={(e) => setFormData(prev => ({ ...prev, ngaySinh: e.target.value }))}
                required
                className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Giới tính</Label>
              <Select value={formData.gioiTinh} onValueChange={(value) => setFormData(prev => ({ ...prev, gioiTinh: value as 'nam' | 'nu' | 'khac' }))}>
                <SelectTrigger className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background/80 backdrop-blur-2xl border-border/40 rounded-2xl">
                  <SelectItem value="nam" className="rounded-lg">Nam</SelectItem>
                  <SelectItem value="nu" className="rounded-lg">Nữ</SelectItem>
                  <SelectItem value="khac" className="rounded-lg">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-3">
               <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Quê quán (Địa chỉ thường trú)</Label>
               <Input
                 value={formData.queQuan}
                 onChange={(e) => setFormData(prev => ({ ...prev, queQuan: e.target.value }))}
                 required
                 className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
               />
             </div>
             <div className="space-y-3">
               <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Nghề nghiệp / Nơi làm việc</Label>
               <Input
                 value={formData.ngheNghiep}
                 onChange={(e) => setFormData(prev => ({ ...prev, ngheNghiep: e.target.value }))}
                 className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
               />
             </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-1">Mật khẩu đăng nhập</Label>
            <Input
              type="password"
              value={formData.matKhau}
              onChange={(e) => setFormData(prev => ({ ...prev, matKhau: e.target.value }))}
              placeholder={khachThue ? "Giữ nguyên nếu không thay đổi" : "Mật khẩu (ít nhất 6 ký tự)"}
              className="h-12 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all"
            />
            <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest ml-1 pt-1">Mật khẩu dùng để truy cập vào ứng dụng khách thuê</p>
          </div>
        </TabsContent>
        
        <TabsContent value="anh-cccd" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
           <div className="bg-secondary/5 rounded-[2.5rem] p-8 border border-border/10">
              <CCCDUpload
                anhCCCD={formData.anhCCCD}
                onCCCDChange={(anhCCCD) => setFormData(prev => ({ ...prev, anhCCCD }))}
                className="w-full"
              />
           </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-4 pt-10 border-t border-border/10">
        <Button 
          type="button" 
          variant="ghost" 
          onClick={onClose} 
          disabled={isSubmitting}
          className="h-14 flex-1 rounded-2xl text-[11px] font-bold uppercase tracking-widest"
        >
          Hủy bỏ
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="h-14 flex-[2] rounded-2xl bg-primary text-[11px] font-bold uppercase tracking-widest shadow-premium hover:shadow-premium-hover transition-all"
        >
          {isSubmitting ? (
             <RefreshCw className="size-4 animate-spin" />
          ) : (
             khachThue ? 'Cập nhật thông tin' : 'Thêm khách thuê'
          )}
        </Button>
      </div>
    </form>
  );
}