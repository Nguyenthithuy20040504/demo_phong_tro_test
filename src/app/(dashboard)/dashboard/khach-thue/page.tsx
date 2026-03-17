'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useCache } from '@/hooks/use-cache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Copy
} from 'lucide-react';
import { KhachThue } from '@/types';
import { KhachThueDataTable } from './table';
import { CCCDUpload } from '@/components/ui/cccd-upload';
import { DeleteConfirmPopover } from '@/components/ui/delete-confirm-popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

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
    document.title = 'Quản lý Khách thuê';
  }, []);

  useEffect(() => {
    fetchKhachThue();
  }, []);

  const fetchKhachThue = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      // Thử load từ cache trước
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
      
      // Lưu cache với data mới
      if (khachThueData.length > 0) {
        cache.setCache({ khachThueList: khachThueData });
      }
    } catch (error) {
      console.error('Error fetching khach thue:', error);
      toast.error('Không thể tải danh sách khách thuê. Vui lòng kiểm tra lại kết nối!');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    cache.setIsRefreshing(true);
    await fetchKhachThue(true);
    cache.setIsRefreshing(false);
    toast.success('Danh sách khách thuê đã được cập nhật mới nhất!');
  };

  useEffect(() => {
    // Khi filter thay đổi, cần force refresh để lấy data mới theo filter
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
    setActionLoading(`delete-${id}`);
    try {
      const response = await fetch(`/api/khach-thue/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      if (response.ok && result.success) {
        cache.clearCache();
        setKhachThueList(prev => prev.filter(khachThue => khachThue._id !== id));
        toast.success('Đã xóa thông tin khách thuê thành công!');
      } else {
        const msg = (result.message || '').toLowerCase();
        if (msg.includes('hop dong') || msg.includes('hợp đồng') || msg.includes('contract')) {
          toast.error('Khách thuê này đang có hợp đồng hoạt động. Bạn hãy kết thúc hợp đồng trước khi xóa nhé!');
        } else {
          toast.error(result.message || 'Rất tiếc, đã có lỗi khi xóa. Vui lòng thử lại!');
        }
      }
    } catch (error) {
      console.error('Error deleting khach thue:', error);
      toast.error('Mất kết nối với máy chủ. Vui lòng thử lại sau ít phút!');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Quản lý khách thuê</h1>
          <p className="text-xs md:text-sm text-gray-600">Danh sách tất cả khách thuê trong hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={cache.isRefreshing}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${cache.isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{cache.isRefreshing ? 'Đang tải...' : 'Làm mới'}</span>
          </Button>
          {!isNhanVien && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                <Button size="sm" onClick={() => setEditingKhachThue(null)} className="flex-1 sm:flex-none">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Thêm khách thuê</span>
                    <span className="sm:hidden">Thêm mới</span>
                </Button>
                </DialogTrigger>
            <DialogContent className="w-[95vw] md:w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                <DialogTitle>
                    {editingKhachThue ? 'Cập nhật hồ sơ khách thuê' : 'Thêm khách thuê mới'}
                </DialogTitle>
                <DialogDescription>
                    {editingKhachThue ? 'Thay đổi thông tin liên lạc hoặc hồ sơ của khách' : 'Hãy nhập đầy đủ thông tin để tạo hồ sơ khách thuê mới nhé!'}
                </DialogDescription>
                </DialogHeader>
                
                <KhachThueForm 
                khachThue={editingKhachThue}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={(newKhachThue) => {
                    cache.clearCache();
                    setIsDialogOpen(false);
                    fetchKhachThue(true);
                    toast.success(editingKhachThue ? 'Đã lưu các thay đổi vào hồ sơ khách thuê thành công!' : 'Đã thêm khách thuê mới vào hệ thống!');
                }}
                />
                </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-4 lg:gap-6">
        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Tổng khách thuê</p>
              <p className="text-base md:text-2xl font-bold">{khachThueList.length}</p>
            </div>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Đang thuê</p>
              <p className="text-base md:text-2xl font-bold text-blue-600">
                {khachThueList.filter(k => k.trangThai === 'dangThue').length}
              </p>
            </div>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Đã trả phòng</p>
              <p className="text-base md:text-2xl font-bold text-gray-600">
                {khachThueList.filter(k => k.trangThai === 'daTraPhong').length}
              </p>
            </div>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-gray-600" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600 uppercase tracking-wider">Chưa thuê/Mới</p>
              <p className="text-base md:text-2xl font-bold text-orange-600">
                {khachThueList.filter(k => k.trangThai === 'chuaThue').length}
              </p>
            </div>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Danh sách khách thuê</CardTitle>
          <CardDescription>
            Tìm thấy {filteredKhachThue.length} khách thuê trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <KhachThueDataTable
            data={filteredKhachThue}
            onEdit={handleEdit}
            onDelete={handleDelete}
            actionLoading={actionLoading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedTrangThai={selectedTrangThai}
            onTrangThaiChange={setSelectedTrangThai}
            canEdit={!isNhanVien}
          />
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Danh sách khách thuê</h2>
          <span className="text-sm text-gray-500">{filteredKhachThue.length} khách thuê</span>
        </div>
        
        {/* Mobile Filters */}
        <div className="space-y-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm tên, SĐT hoặc CCCD..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <Select value={selectedTrangThai} onValueChange={setSelectedTrangThai}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">Tất cả trạng thái</SelectItem>
              <SelectItem value="dangThue" className="text-sm">Đang thuê</SelectItem>
              <SelectItem value="daTraPhong" className="text-sm">Đã trả phòng</SelectItem>
              <SelectItem value="chuaThue" className="text-sm">Chưa thuê</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Card List */}
        <div className="space-y-3">
          {filteredKhachThue.map((khachThue) => (
            <Card key={khachThue._id} className="p-4">
              <div className="space-y-3">
                {/* Header with name and status */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{khachThue.hoTen}</h3>
                    <p className="text-sm text-gray-500 capitalize">{khachThue.gioiTinh === 'nam' ? 'Nam' : 'Nữ'}</p>
                  </div>
                  <div className="flex gap-2">
                    {(() => {
                      switch (khachThue.trangThai) {
                        case 'dangThue':
                          return <Badge variant="default" className="text-xs">Đang thuê</Badge>;
                        case 'daTraPhong':
                          return <Badge variant="secondary" className="text-xs">Đã trả phòng</Badge>;
                        case 'chuaThue':
                          return <Badge variant="outline" className="text-xs">Chưa thuê</Badge>;
                        default:
                          return <Badge variant="outline" className="text-xs">{khachThue.trangThai}</Badge>;
                      }
                    })()}
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>{khachThue.soDienThoai}</span>
                  </div>
                  {khachThue.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{khachThue.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CreditCard className="h-3 w-3" />
                    <span className="font-mono">{khachThue.cccd}</span>
                  </div>
                </div>

                {/* Additional info */}
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>Ngày sinh: {new Date(khachThue.ngaySinh).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">Quê quán: {khachThue.queQuan}</span>
                  </div>
                  {khachThue.ngheNghiep && (
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      <span>Công việc: {khachThue.ngheNghiep}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const publicUrl = `${window.location.origin}/khach-thue/dang-nhap`;
                        navigator.clipboard.writeText(publicUrl);
                        toast.success('Đã sao chép đường dẫn đăng nhập cho khách!');
                      }}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Copy link đăng nhập"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    {!isNhanVien && (
                        <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(khachThue)}
                        disabled={actionLoading === `edit-${khachThue._id}`}
                        >
                        <Edit className="h-3.5 w-3.5" />
                        </Button>
                    )}
                  </div>
                  {!isNhanVien && (
                    <DeleteConfirmPopover
                        onConfirm={() => handleDelete(khachThue._id!)}
                        title="Xóa khách thuê"
                        description="Bạn có thực sự muốn xóa hồ sơ khách thuê này không?"
                        className="text-black hover:text-red-700 hover:bg-red-50"
                    />
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredKhachThue.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Hiện không có khách thuê nào phù hợp với tìm kiếm.</p>
          </div>
        )}
      </div>
    </div>
  );
}

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
        if (result.success) {
          onSuccess(result.data);
        } else {
          toast.error(result.message || 'Rất tiếc, không thể lưu thông tin. Hãy kiểm tra lại nhé!');
        }
      } else {
        const error = await response.json();
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('cccd') || msg.includes('sdt')) {
            toast.error('Số điện thoại hoặc CCCD này đã tồn tại trong hệ thống rồi!');
        } else {
            toast.error(error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại sau!');
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Mất kết nối với máy chủ. Kiểm tra lại mạng nhé!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
      <Tabs defaultValue="thong-tin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="thong-tin" className="text-xs md:text-sm">
            Thông tin cá nhân
          </TabsTrigger>
          <TabsTrigger value="anh-cccd" className="text-xs md:text-sm">
            Hợp lệ hóa (CCCD)
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="thong-tin" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="hoTen" className="text-sm">Họ và tên</Label>
              <Input
                id="hoTen"
                value={formData.hoTen}
                onChange={(e) => setFormData(prev => ({ ...prev, hoTen: e.target.value }))}
                required
                placeholder="Nhập đầy đủ tên khách"
                className="text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="soDienThoai" className="text-sm">Số điện thoại</Label>
              <Input
                id="soDienThoai"
                value={formData.soDienThoai}
                onChange={(e) => setFormData(prev => ({ ...prev, soDienThoai: e.target.value }))}
                required
                placeholder="Số điện thoại liên lạc"
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="địa_chỉ@email.com"
                className="text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cccd" className="text-sm">Số CCCD</Label>
              <Input
                id="cccd"
                value={formData.cccd}
                onChange={(e) => setFormData(prev => ({ ...prev, cccd: e.target.value }))}
                required
                placeholder="Nhập 12 số CCCD"
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label htmlFor="ngaySinh" className="text-sm">Ngày sinh</Label>
              <Input
                id="ngaySinh"
                type="date"
                value={formData.ngaySinh}
                onChange={(e) => setFormData(prev => ({ ...prev, ngaySinh: e.target.value }))}
                required
                className="text-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gioiTinh" className="text-sm">Giới tính</Label>
              <Select value={formData.gioiTinh} onValueChange={(value) => setFormData(prev => ({ ...prev, gioiTinh: value as any }))}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nam" className="text-sm">Nam</SelectItem>
                  <SelectItem value="nu" className="text-sm">Nữ</SelectItem>
                  <SelectItem value="khac" className="text-sm">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="queQuan" className="text-sm">Quê quán (Theo CCCD)</Label>
            <Input
              id="queQuan"
              value={formData.queQuan}
              onChange={(e) => setFormData(prev => ({ ...prev, queQuan: e.target.value }))}
              required
              placeholder="Địa chỉ thường trú ghi trên CCCD"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ngheNghiep" className="text-sm">Công việc hiện tại</Label>
            <Input
              id="ngheNghiep"
              value={formData.ngheNghiep}
              onChange={(e) => setFormData(prev => ({ ...prev, ngheNghiep: e.target.value }))}
              placeholder="Nghề nghiệp hoặc nơi làm việc"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matKhau" className="text-sm">Mật khẩu (Cho tài khoản khách thuê)</Label>
            <Input
              id="matKhau"
              type="password"
              value={formData.matKhau}
              onChange={(e) => setFormData(prev => ({ ...prev, matKhau: e.target.value }))}
              placeholder={khachThue ? "Để trống nếu không muốn đổi mật khẩu" : "Nhập ít nhất 6 ký tự"}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground italic">
              Mật khẩu này giúp khách thuê đăng nhập để xem thông tin hợp đồng và thanh toán tiền phòng.
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="anh-cccd" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <CCCDUpload
            anhCCCD={formData.anhCCCD}
            onCCCDChange={(anhCCCD) => setFormData(prev => ({ ...prev, anhCCCD }))}
            className="w-full"
          />
        </TabsContent>
      </Tabs>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="text-sm">
          Hủy bỏ
        </Button>
        <Button type="submit" disabled={isSubmitting} className="text-sm">
          {isSubmitting ? 'Đang lưu hồ sơ...' : (khachThue ? 'Cập nhật hồ sơ' : 'Thêm khách thuê')}
        </Button>
      </DialogFooter>
    </form>
  );
}