'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users,
  Plus,
  Shield,
  RefreshCw,
  UserCheck,
  UserX,
  LockKeyhole,
  Building2,
  Home,
  AlertCircle,
  Zap,
  User as UserIcon,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Trash2,
  ChevronRight,
  Info,
  CheckCircle2,
  UserPlus,
  Edit2,
  X
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { LandlordTable, Landlord } from './table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function AdminLandlordManagementPage() {
  const { data: session } = useSession();
  const [landlords, setLandlords] = useState<Landlord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);

  // Creation state
  const [createData, setCreateData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'chuNha',
    goiDichVu: 'mienPhi',
    // Detailed profile
    cccd: '',
    ngaySinh: '',
    gioiTinh: 'nam',
    queQuan: '',
    ngheNghiep: ''
  });

  // Edit Profile state
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    cccd: '',
    ngaySinh: '',
    gioiTinh: 'nam',
    queQuan: '',
    ngheNghiep: ''
  });

  // Edit Plan state
  const [editPlanData, setEditPlanData] = useState({
    goiDichVu: 'mienPhi',
    ngayHetHan: '',
    isActive: true
  });

  const [newPassword, setNewPassword] = useState('');

  const fetchLandlords = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await fetch('/api/admin/users?type=chuNha');
      if (response.ok) {
        const data = await response.json();
        setLandlords(data);
      } else {
        toast.error('Không thể tải danh sách chủ trọ');
      }
    } catch (error) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Quản lý Chủ trọ | Hệ thống SaaS';
    fetchLandlords();
  }, [fetchLandlords]);

  const handleCreate = async () => {
    if (!createData.name || !createData.email || !createData.password) {
      return toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
    }

    setActionLoading('create');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });

      if (response.ok) {
        toast.success('Đã gửi email tới tài khoản vừa tạo', { duration: 5000 });
        setIsCreateDialogOpen(false);
        setCreateData({
          name: '', email: '', phone: '', password: '', role: 'chuNha', goiDichVu: 'mienPhi',
          cccd: '', ngaySinh: '', gioiTinh: 'nam', queQuan: '', ngheNghiep: ''
        });
        fetchLandlords();
      } else {
        const err = await response.json();
        toast.error(err.message || 'Lỗi khi tạo tài khoản');
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditProfile = async () => {
    if (!selectedLandlord) return;
    setActionLoading('edit-profile');
    try {
      const response = await fetch(`/api/admin/users/${selectedLandlord._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProfileData),
      });

      if (response.ok) {
        toast.success('Đã cập nhật hồ sơ chủ trọ thành công');
        setIsEditProfileDialogOpen(false);
        fetchLandlords(false);
      } else {
        toast.error('Lỗi khi cập nhật hồ sơ');
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditPlan = async () => {
    if (!selectedLandlord) return;
    setActionLoading('edit-plan');
    try {
      const response = await fetch(`/api/admin/users/${selectedLandlord._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPlanData),
      });

      if (response.ok) {
        toast.success('Cập nhật gói dịch vụ thành công');
        setIsEditPlanDialogOpen(false);
        fetchLandlords(false);
      } else {
        toast.error('Lỗi khi cập nhật gói');
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (landlord: Landlord) => {
    setActionLoading(`status-${landlord._id}`);
    try {
      const currentStatus = landlord.isActive !== undefined ? landlord.isActive : (landlord.trangThai === 'hoatDong');
      const newStatus = !currentStatus;

      const response = await fetch(`/api/admin/users/${landlord._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: newStatus,
          trangThai: newStatus ? 'hoatDong' : 'khoa'
        }),
      });

      if (response.ok) {
        toast.success(newStatus ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
        fetchLandlords(false);
      }
    } catch (error) {
      toast.error('Lỗi cập nhật trạng thái');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedLandlord || !newPassword) return;
    setActionLoading('reset-pw');
    try {
      const response = await fetch(`/api/admin/users/${selectedLandlord._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        toast.success('Đã đặt lại mật khẩu thành công');
        setIsResetPasswordDialogOpen(false);
        setNewPassword('');
      } else {
        toast.error('Lỗi khi đặt lại mật khẩu');
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(`delete-${id}`);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Đã xóa tài khoản chủ trọ thành công');
        fetchLandlords();
      } else {
        const err = await response.json();
        toast.error(err.message || 'Lỗi khi xóa tài khoản');
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendVerification = async (landlord: Landlord) => {
    setActionLoading(`resend-${landlord._id}`);
    try {
      const response = await fetch('/api/admin/users/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: landlord._id }),
      });

      if (response.ok) {
        toast.success(`📧 Đã gửi lại email xác nhận đến ${landlord.email}`);
      } else {
        const err = await response.json();
        toast.error(err.message || 'Không thể gửi lại email xác nhận');
      }
    } catch (error) {
      toast.error('Lỗi kết nối');
    } finally {
      setActionLoading(null);
    }
  };

  const openViewDialog = (landlord: Landlord) => {
    setSelectedLandlord(landlord);
    setIsViewDialogOpen(true);
  };

  const openEditProfileDialog = (landlord: Landlord) => {
    setSelectedLandlord(landlord);
    setEditProfileData({
      name: landlord.name || landlord.ten || '',
      email: landlord.email,
      phone: landlord.phone || landlord.soDienThoai || '',
      cccd: landlord.cccd || '',
      ngaySinh: landlord.ngaySinh ? new Date(landlord.ngaySinh).toISOString().split('T')[0] : '',
      gioiTinh: landlord.gioiTinh || 'nam',
      queQuan: landlord.queQuan || '',
      ngheNghiep: landlord.ngheNghiep || ''
    });
    setIsEditProfileDialogOpen(true);
  };

  const openEditPlanDialog = (landlord: Landlord) => {
    setSelectedLandlord(landlord);
    setEditPlanData({
      goiDichVu: landlord.goiDichVu || 'mienPhi',
      ngayHetHan: landlord.ngayHetHan ? new Date(landlord.ngayHetHan).toISOString().split('T')[0] : '',
      isActive: landlord.isActive !== undefined ? landlord.isActive : (landlord.trangThai === 'hoatDong')
    });
    setIsEditPlanDialogOpen(true);
  };

  const filteredLandlords = landlords.filter(l =>
    (l.name || l.ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.phone || l.soDienThoai || '').includes(searchTerm) ||
    (l.cccd || '').includes(searchTerm)
  );

  const stats = {
    total: landlords.length,
    active: landlords.filter(l => (l.isActive !== undefined ? l.isActive : l.trangThai === 'hoatDong')).length,
    premium: landlords.filter(l => l.goiDichVu === 'chuyenNghiep').length,
    expiring: landlords.filter(l => l.ngayHetHan && new Date(l.ngayHetHan) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Chủ trọ</h1>
          <p className="text-muted-foreground">Hệ thống quản trị tài khoản SaaS dành cho các chủ đầu tư, theo dõi quy mô tòa nhà, phòng trọ và thời hạn sử dụng dịch vụ.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchLandlords()}
            className={cn("size-11 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all hover:rotate-180", loading && "animate-spin")}
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </Button>
          <Button
            size="lg"
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-12 px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 shadow-lg shadow-teal-100 transition-all active:scale-95 group font-bold"
          >
            <Plus className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
            Thêm Chủ trọ mới
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Tổng chủ trọ', value: stats.total, icon: Users, gradient: 'from-blue-600 to-indigo-600', bg: 'bg-blue-50/50', text: 'text-blue-600', desc: 'Tài khoản hệ thống' },
          { label: 'Hoạt động', value: stats.active, icon: UserCheck, gradient: 'from-emerald-600 to-teal-600', bg: 'bg-emerald-50/50', text: 'text-emerald-600', desc: 'Tài khoản không khóa' },
          { label: 'Premium', value: stats.premium, icon: Zap, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-50/50', text: 'text-amber-600', desc: 'Gói Chuyên nghiệp' },
          { label: 'Sắp hết hạn', value: stats.expiring, icon: AlertCircle, gradient: 'from-rose-500 to-red-600', bg: 'bg-rose-50/50', text: 'text-rose-600', desc: 'Trong 7 ngày tới' },
        ].map((item, id) => (
          <Card key={id} className="relative overflow-hidden border-none shadow-sm transition-all hover:shadow-xl group rounded-3xl">
            <div className={cn("absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity", item.bg)} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-2xl", item.bg)}>
                  <item.icon className={cn("h-6 w-6 uppercase", item.text)} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                  <p className="text-xs text-gray-500 font-bold">{item.desc}</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{item.value}</h3>
                <div className={cn("flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg", item.bg, item.text)}>
                  <span>+2.5%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Section */}
      <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-white/40 backdrop-blur-xl">
        <CardContent className="p-2 sm:p-4">
          <LandlordTable
            data={filteredLandlords}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onView={openViewDialog}
            onEditProfile={openEditProfileDialog}
            onEditPlan={openEditPlanDialog}
            onToggleStatus={handleToggleStatus}
            onResetPassword={(l) => {
              setSelectedLandlord(l);
              setNewPassword('');
              setIsResetPasswordDialogOpen(true);
            }}
            onDelete={handleDelete}
            onResendVerification={handleResendVerification}
            actionLoading={actionLoading}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 rounded-[2rem] overflow-hidden border-none shadow-3xl">
          <DialogHeader className="p-8 pb-4 bg-gray-50/50">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-teal-600 rounded-2xl shadow-lg shadow-teal-100">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight font-heading">Thêm Chủ trọ mới</DialogTitle>
                <DialogDescription className="font-medium text-gray-500">Khởi tạo hệ thống cho đối tác vận hành mới</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="account" className="w-full">
            <div className="px-8 mb-4">
              <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl bg-gray-100 p-1.5">
                <TabsTrigger value="account" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">
                  Tài khoản & Dịch vụ
                </TabsTrigger>
                <TabsTrigger value="profile" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">
                  Hồ sơ cá nhân
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[400px] px-8 py-2">
              <TabsContent value="account" className="mt-0 space-y-6">
                <div className="grid gap-5">
                  <div className="grid gap-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Họ và tên bắt buộc</Label>
                    <Input
                      placeholder="Nguyễn Văn A"
                      className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                      value={createData.name}
                      onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Email đăng nhập</Label>
                    <Input
                      type="email"
                      placeholder="partner@example.com"
                      className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                      value={createData.email}
                      onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="grid gap-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Mật khẩu</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                        value={createData.password}
                        onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Gói dịch vụ</Label>
                      <Select value={createData.goiDichVu} onValueChange={(v) => setCreateData({ ...createData, goiDichVu: v })}>
                        <SelectTrigger className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus:ring-teal-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl">
                          <SelectItem value="mienPhi" className="rounded-xl">Miễn phí (1 tháng)</SelectItem>
                          <SelectItem value="coBan" className="rounded-xl">Cơ bản (3 tháng)</SelectItem>
                          <SelectItem value="chuyenNghiep" className="rounded-xl">Chuyên nghiệp (6 tháng)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="p-5 bg-teal-50/50 rounded-3xl border border-teal-100/50 flex items-start gap-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm">
                      <Zap className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-teal-900 mb-0.5">Thời hạn mặc định</p>
                      <p className="text-xs text-teal-700 leading-relaxed font-medium">Hệ thống sẽ tự động thiết lập ngày hết hạn căn cứ theo gói dịch vụ bạn đã chọn ở trên.</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="profile" className="mt-0 space-y-6">
                <div className="grid gap-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="grid gap-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Số điện thoại</Label>
                      <Input
                        placeholder="09xxx"
                        className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                        value={createData.phone}
                        onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Số CCCD</Label>
                      <Input
                        placeholder="12 chữ số"
                        className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                        value={createData.cccd}
                        onChange={(e) => setCreateData({ ...createData, cccd: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="grid gap-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Ngày sinh</Label>
                      <Input
                        type="date"
                        className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                        value={createData.ngaySinh}
                        onChange={(e) => setCreateData({ ...createData, ngaySinh: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Giới tính</Label>
                      <Select value={createData.gioiTinh} onValueChange={(v) => setCreateData({ ...createData, gioiTinh: v })}>
                        <SelectTrigger className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus:ring-teal-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl">
                          <SelectItem value="nam" className="rounded-xl">Nam</SelectItem>
                          <SelectItem value="nu" className="rounded-xl">Nữ</SelectItem>
                          <SelectItem value="khac" className="rounded-xl">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Quê quán</Label>
                    <Input
                      placeholder="Nhập địa chỉ quê quán"
                      className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                      value={createData.queQuan}
                      onChange={(e) => setCreateData({ ...createData, queQuan: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Nghề nghiệp</Label>
                    <Input
                      placeholder="VD: Kinh doanh tự do"
                      className="h-12 rounded-2xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                      value={createData.ngheNghiep}
                      onChange={(e) => setCreateData({ ...createData, ngheNghiep: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>

            <DialogFooter className="p-8 pt-4 bg-gray-50/30 flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-bold order-2 sm:order-1 transition-all active:scale-95">
                Hủy bỏ
              </Button>
              <Button
                onClick={handleCreate}
                disabled={actionLoading === 'create'}
                className="flex-1 h-12 rounded-2xl bg-teal-600 hover:bg-teal-700 font-bold shadow-lg shadow-teal-100 order-1 sm:order-2 transition-all active:scale-95"
              >
                {actionLoading === 'create' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Xác nhận tạo tài khoản
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 rounded-[2.5rem] overflow-hidden border-none shadow-4xl group">
          <DialogTitle className="sr-only">Chi tiết hồ sơ chủ trọ</DialogTitle>
          <div className="relative h-32 bg-gradient-to-r from-teal-600 to-emerald-600">
            <div className="absolute -bottom-16 left-8 p-1.5 bg-white rounded-[2.2rem] shadow-xl">
              <Avatar className="h-32 w-32 rounded-[2rem] border-4 border-white shadow-inner">
                <AvatarImage src={selectedLandlord?.avatar || selectedLandlord?.anhDaiDien} />
                <AvatarFallback className="bg-teal-50 text-teal-700 text-3xl font-black">{selectedLandlord ? getInitials(selectedLandlord.name || selectedLandlord.ten || '') : ''}</AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute top-6 right-8">
              <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-[0.2em]">Profile Overview</Badge>
            </div>
          </div>

          <div className="pt-20 px-8 pb-8 space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight font-heading">{selectedLandlord?.name || selectedLandlord?.ten}</h2>
                <div className="flex items-center gap-3">
                  <Badge className="bg-teal-50 text-teal-700 border-teal-100 font-bold uppercase py-0.5 tracking-tighter">Chủ nhà hệ thống</Badge>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {selectedLandlord?.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-xl h-10 border-gray-100 text-xs font-bold uppercase tracking-widest px-4 hover:bg-gray-50" onClick={() => {
                  setIsViewDialogOpen(false);
                  openEditProfileDialog(selectedLandlord!);
                }}>
                  Edit Profile
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b pb-2">Thông tin liên hệ</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gray-50 rounded-xl">
                        <Phone className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider uppercase">Số điện thoại</p>
                        <p className="text-sm font-bold text-gray-900 leading-none mt-1">{selectedLandlord?.phone || selectedLandlord?.soDienThoai || 'Chưa cập nhật'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gray-50 rounded-xl">
                        <Mail className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest uppercase">Email đăng nhập</p>
                        <p className="text-sm font-bold text-gray-900 leading-none mt-1 truncate">{selectedLandlord?.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 border-b pb-2">Trạng thái dịch vụ</h4>
                  <div className="p-5 rounded-[1.5rem] bg-gray-50 border border-gray-100/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gói hiện tại</span>
                      {selectedLandlord?.goiDichVu && (
                        <Badge className={cn("rounded-lg font-black text-[10px] uppercase",
                          selectedLandlord.goiDichVu === 'chuyenNghiep' ? "bg-amber-100 text-amber-700 border-amber-200" :
                            selectedLandlord.goiDichVu === 'coBan' ? "bg-blue-100 text-blue-700 border-blue-200" :
                              "bg-gray-200 text-gray-700"
                        )}>
                          {selectedLandlord.goiDichVu === 'chuyenNghiep' ? 'Chuyên nghiệp' :
                            selectedLandlord.goiDichVu === 'coBan' ? 'Cơ bản' : 'Miễn phí'}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hết hạn vào</span>
                      <span className="text-xs font-black text-gray-800">
                        {selectedLandlord?.ngayHetHan ? new Date(selectedLandlord.ngayHetHan).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 border-b pb-2">Hồ sơ cá nhân</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-teal-50/30 rounded-2xl border border-teal-100/50">
                      <p className="text-[9px] font-black text-teal-600/60 uppercase tracking-widest mb-1 leading-none">Căn cước công dân</p>
                      <p className="text-sm font-black text-teal-900">{selectedLandlord?.cccd || '---'}</p>
                    </div>
                    <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                      <p className="text-[9px] font-black text-blue-600/60 uppercase tracking-widest mb-1 leading-none">Ngày sinh</p>
                      <p className="text-sm font-black text-blue-900">{selectedLandlord?.ngaySinh ? new Date(selectedLandlord.ngaySinh).toLocaleDateString('vi-VN') : '---'}</p>
                    </div>
                    <div className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100/50">
                      <p className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest mb-1 leading-none">Giới tính</p>
                      <p className="text-sm font-black text-amber-900 capitalize">{selectedLandlord?.gioiTinh || '---'}</p>
                    </div>
                    <div className="p-4 bg-purple-50/30 rounded-2xl border border-purple-100/50">
                      <p className="text-[9px] font-black text-purple-600/60 uppercase tracking-widest mb-1 leading-none">Tòa nhà vận hành</p>
                      <p className="text-sm font-black text-purple-900">{selectedLandlord?.totalBuildings || 0} tòa</p>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 leading-none">Địa chỉ thường trú / Quê quán</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 text-gray-400 mt-0.5" />
                      <p className="text-xs font-bold text-gray-700 leading-normal">{selectedLandlord?.queQuan || 'Chưa cập nhật thông tin địa chỉ.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditProfileDialogOpen} onOpenChange={setIsEditProfileDialogOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 rounded-[2rem] overflow-hidden border-none shadow-3xl">
          <DialogHeader className="p-8 pb-4 bg-teal-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-teal-100">
                <Edit2 className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">Cập nhật hồ sơ chủ trọ</DialogTitle>
                <DialogDescription className="font-medium text-teal-700/60">Thay đổi thông tin hành chính của tài khoản</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[450px] px-8 py-6">
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Họ và tên</Label>
                <Input
                  placeholder="Nguyễn Văn A"
                  className="h-11 rounded-xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600 font-medium"
                  value={editProfileData.name}
                  onChange={(e) => setEditProfileData({ ...editProfileData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Số điện thoại</Label>
                  <Input
                    placeholder="09xxx"
                    className="h-11 rounded-xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                    value={editProfileData.phone}
                    onChange={(e) => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Số CCCD</Label>
                  <Input
                    placeholder="12 chữ số"
                    className="h-11 rounded-xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                    value={editProfileData.cccd}
                    onChange={(e) => setEditProfileData({ ...editProfileData, cccd: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Ngày sinh</Label>
                  <Input
                    type="date"
                    className="h-11 rounded-xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                    value={editProfileData.ngaySinh}
                    onChange={(e) => setEditProfileData({ ...editProfileData, ngaySinh: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Giới tính</Label>
                  <Select value={editProfileData.gioiTinh} onValueChange={(v) => setEditProfileData({ ...editProfileData, gioiTinh: v })}>
                    <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-100 focus:ring-teal-600 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl">
                      <SelectItem value="nam" className="rounded-lg">Nam</SelectItem>
                      <SelectItem value="nu" className="rounded-lg">Nữ</SelectItem>
                      <SelectItem value="khac" className="rounded-lg">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Quê quán</Label>
                <Input
                  placeholder="Địa chỉ thường trú"
                  className="h-11 rounded-xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                  value={editProfileData.queQuan}
                  onChange={(e) => setEditProfileData({ ...editProfileData, queQuan: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nghề nghiệp</Label>
                <Input
                  placeholder="VD: Kinh doanh tự do"
                  className="h-11 rounded-xl bg-gray-50/50 border-gray-100 focus-visible:ring-teal-600"
                  value={editProfileData.ngheNghiep}
                  onChange={(e) => setEditProfileData({ ...editProfileData, ngheNghiep: e.target.value })}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 pt-4 bg-gray-50/30 flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsEditProfileDialogOpen(false)} className="flex-1 h-11 rounded-xl font-bold order-2 sm:order-1 transition-all active:scale-95">
              Hủy bỏ
            </Button>
            <Button
              onClick={handleEditProfile}
              disabled={actionLoading === 'edit-profile'}
              className="flex-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 font-bold shadow-lg shadow-teal-100 order-1 sm:order-2 transition-all active:scale-95"
            >
              {actionLoading === 'edit-profile' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Lưu hồ sơ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog (`isEditPlanDialogOpen`) */}
      <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 rounded-[2rem] overflow-hidden border-none shadow-4xl animate-in zoom-in-95">
          <DialogHeader className="p-8 pb-4 bg-blue-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">Sửa gói & Gia hạn</DialogTitle>
                <DialogDescription className="font-medium text-blue-700/60 leading-tight">Cập nhật quyền lợi sử dụng hệ thống</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Đang chỉnh sửa cho</p>
                <p className="text-sm font-bold text-gray-800 leading-none">{selectedLandlord?.name || selectedLandlord?.ten}</p>
              </div>
              <Badge className="bg-white border-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">{selectedLandlord?.email}</Badge>
            </div>

            <div className="grid gap-6">
              <div className="grid gap-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Gói dịch vụ Premium</Label>
                <Select value={editPlanData.goiDichVu} onValueChange={(v) => setEditPlanData({ ...editPlanData, goiDichVu: v })}>
                  <SelectTrigger className="h-12 rounded-2xl bg-gray-50 border-gray-100 focus:ring-blue-600 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl shadow-3xl">
                    <SelectItem value="mienPhi" className="rounded-xl">Miễn phí (Tiêu chuẩn)</SelectItem>
                    <SelectItem value="coBan" className="rounded-xl">Cơ bản (Professional)</SelectItem>
                    <SelectItem value="chuyenNghiep" className="rounded-xl">Chuyên nghiệp (Enterprise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Thời hạn sử dụng mới</Label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-blue-600" />
                  <Input
                    id="edit-expiry"
                    type="date"
                    value={editPlanData.ngayHetHan}
                    onChange={(e) => setEditPlanData({ ...editPlanData, ngayHetHan: e.target.value })}
                    className="h-12 pl-12 rounded-2xl bg-gray-50 border-gray-100 focus-visible:ring-blue-600 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 p-1 pt-2">
                <div
                  className={cn("p-1.5 rounded-lg transition-all", editPlanData.isActive ? "bg-emerald-100" : "bg-orange-100")}
                  onClick={() => setEditPlanData({ ...editPlanData, isActive: !editPlanData.isActive })}
                >
                  {editPlanData.isActive ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-orange-600" />}
                </div>
                <Label className="text-xs font-black uppercase tracking-widest text-gray-700 cursor-pointer" onClick={() => setEditPlanData({ ...editPlanData, isActive: !editPlanData.isActive })}>
                  Trạng thái: <span className={cn(editPlanData.isActive ? "text-emerald-600" : "text-orange-600")}>{editPlanData.isActive ? 'Cho phép truy cập' : 'Ngắt kết nối / Khóa'}</span>
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 pt-4 bg-gray-50/50 flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsEditPlanDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-bold order-2 sm:order-1 transition-shadow hover:bg-gray-100">
              Bỏ qua
            </Button>
            <Button
              onClick={handleEditPlan}
              className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 order-1 sm:order-2 transition-all active:scale-95"
              disabled={actionLoading === 'edit-plan'}
            >
              {actionLoading === 'edit-plan' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
              Xác nhận gia hạn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Pass Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-0 rounded-[2rem] overflow-hidden border-none shadow-4xl">
          <DialogHeader className="p-8 pb-4 bg-rose-50/50">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-600 rounded-2xl shadow-lg shadow-rose-100">
                <LockKeyhole className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">Cấp lại mật khẩu</DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tài khoản</p>
              <p className="text-sm font-bold text-gray-800 break-all leading-tight">{selectedLandlord?.email}</p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="new-pass" className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">Mật khẩu mới</Label>
              <Input
                id="new-pass"
                type="password"
                placeholder="Lớn hơn 6 ký tự"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 rounded-2xl bg-gray-50 border-gray-100 focus-visible:ring-rose-500"
              />
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-medium text-amber-800 leading-normal">Mật khẩu sẽ có hiệu lực ngay lập tức. Hãy đảm bảo bạn đã thông báo cho chủ trọ mật khẩu này.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 pt-4 bg-gray-50/50 flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsResetPasswordDialogOpen(false)} className="flex-1 h-12 rounded-2xl font-bold order-2 sm:order-1 capitalize">Hủy bỏ</Button>
            <Button
              onClick={handleResetPassword}
              className="flex-1 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 font-bold shadow-lg shadow-rose-100 order-1 sm:order-2 transition-all active:scale-95"
              disabled={actionLoading === 'reset-pw' || !newPassword}
            >
              {actionLoading === 'reset-pw' ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
              Đổi mật khẩu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
