'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useCache } from '@/hooks/use-cache';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Shield, 
  Phone,
  Calendar,
  RefreshCw,
  UserX,
  UserCheck,
  LockKeyhole
} from 'lucide-react';
import { toast } from 'sonner';
import { UserDataTable } from './table';

interface User {
  _id: string;
  name?: string;
  ten?: string;
  email: string;
  phone?: string;
  soDienThoai?: string;
  role?: string;
  vaiTro?: string;
  avatar?: string;
  anhDaiDien?: string;
  createdAt?: string;
  ngayTao?: string;
  lastLogin?: string;
  isActive?: boolean;
  trangThai?: string;
  goiDichVu?: string;
  ngayHetHan?: string;
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: string;
}

export default function AccountManagementPage() {
  const { data: session } = useSession();
  const cache = useCache<{ users: User[] }>({ key: 'tai-khoan-data', duration: 300000 });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const hasFetchedRef = useRef(false);
  
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'nhanVien'
  });
  
  const [editUserData, setEditUserData] = useState({
    name: '',
    phone: '',
    role: '',
    isActive: true
  });

  useEffect(() => {
    document.title = 'Quản lý Tài khoản';
  }, []);

  useEffect(() => {
    if ((session?.user?.role === 'admin' || session?.user?.role === 'chuNha') && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchUsers(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.role]);

  const fetchUsers = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (!forceRefresh) {
        const cachedData = cache.getCache();
        if (cachedData) {
          setUsers(cachedData.users || []);
          setLoading(false);
          return;
        }
      }
      
      const response = await fetch(`/api/admin/users?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        cache.setCache({ users: data });
      } else {
        toast.error('Hệ thống chưa tải được danh sách người dùng, bạn thử lại sau nhé!');
      }
    } catch (error) {
      toast.error('Có lỗi khi lấy dữ liệu người dùng rồi.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    cache.setIsRefreshing(true);
    await fetchUsers(true);
    cache.setIsRefreshing(false);
    toast.success('Dữ liệu người dùng đã được làm mới rồi nhé!');
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createUserData),
      });

      if (response.ok) {
        toast.success('Tuyệt vời! Tài khoản mới đã được tạo thành công.');
        setIsCreateDialogOpen(false);
        setCreateUserData({
          name: '',
          email: '',
          password: '',
          phone: '',
          role: session?.user?.role === 'admin' ? 'chuNha' : 'nhanVien'
        });
        cache.clearCache();
        fetchUsers(true);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Ồ, chưa tạo được tài khoản rồi. Bạn kiểm tra lại thông tin nhé!');
      }
    } catch (error) {
      toast.error('Có lỗi kết nối khi tạo tài khoản.');
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editUserData),
      });

      if (response.ok) {
        toast.success('Hệ thống đã cập nhật thông tin tài khoản thành công!');
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        cache.clearCache();
        fetchUsers(true);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Chưa lưu được thay đổi cho tài khoản này. Bạn thử lại nhé!');
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi cập nhật tài khoản rồi.');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    try {
      const response = await fetch(`/api/admin/users/${selectedUser._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (response.ok) {
        toast.success('Đặt lại mật khẩu thành công!');
        setIsResetPasswordDialogOpen(false);
        setNewPassword('');
        setSelectedUser(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Chưa đặt lại được mật khẩu.');
      }
    } catch (error) {
      toast.error('Lỗi khi thực hiện đặt lại mật khẩu.');
    }
  };

  // Không cho phép xóa tài khoản để đảm bảo tính toàn vẹn dữ liệu
  const handleDeleteUser = async () => {
    toast.error('Không cho phép xóa tài khoản để đảm bảo tính toàn vẹn dữ liệu và lưu log ở các hợp đồng, hóa đơn. Vui lòng sử dụng chức năng "Khóa tài khoản".');
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const newStatus = !getUserIsActive(user);
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...user,
          name: getUserName(user),
          phone: getUserPhone(user),
          role: getUserRole(user),
          isActive: newStatus,
          trangThai: newStatus ? 'hoatDong' : 'khoa'
        }),
      });

      if (response.ok) {
        toast.success(newStatus ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản thành công!');
        cache.clearCache();
        fetchUsers(true);
      } else {
        toast.error('Không thể cập nhật trạng thái tài khoản.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi thay đổi trạng thái.');
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      name: getUserName(user),
      phone: getUserPhone(user),
      role: getUserRole(user),
      isActive: getUserIsActive(user)
    });
    setIsEditDialogOpen(true);
  };

  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setIsResetPasswordDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Quản trị viên</Badge>;
      case 'chuNha':
        return <Badge variant="default">Chủ nhà</Badge>;
      case 'nhanVien':
        return <Badge variant="secondary">Nhân viên</Badge>;
      default:
        return <Badge variant="outline">Người dùng</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserName = (user: User) => user.name || user.ten || 'Không có tên';
  const getUserPhone = (user: User) => user.phone || user.soDienThoai || '';
  const getUserRole = (user: User) => user.role || user.vaiTro || 'nhanVien';
  const getUserAvatar = (user: User) => user.avatar || user.anhDaiDien || '';
  const getUserIsActive = (user: User) => user.isActive !== undefined ? user.isActive : (user.trangThai === 'hoatDong');

  const filteredUsers = users.filter(user =>
    (user.name || user.ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (session?.user?.role !== 'admin' && session?.user?.role !== 'chuNha') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-600">Bạn cần quyền quản trị viên hoặc chủ nhà để truy cập trang này.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải danh sách người dùng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold font-heading text-foreground drop-shadow-sm">Quản lý tài khoản</h1>
          <p className="text-xs md:text-sm text-gray-600">Quản lý người dùng và phân quyền hệ thống</p>
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
            <span className="hidden sm:inline">{cache.isRefreshing ? 'Đang tải...' : 'Tải mới'}</span>
          </Button>
          <Button size="sm" onClick={() => {
            setCreateUserData({
              name: '',
              email: '',
              password: '',
              phone: '',
              role: session?.user?.role === 'admin' ? 'chuNha' : 'nhanVien'
            });
            setIsCreateDialogOpen(true);
          }} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tạo tài khoản</span>
            <span className="sm:hidden">Tạo</span>
          </Button>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">Tạo tài khoản mới</DialogTitle>
              <DialogDescription className="text-xs md:text-sm">
                Tạo tài khoản người dùng mới cho hệ thống
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 md:gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name" className="text-xs md:text-sm">Họ và tên</Label>
                <Input
                  id="create-name"
                  value={createUserData.name}
                  onChange={(e) => setCreateUserData({ ...createUserData, name: e.target.value })}
                  placeholder="Nhập họ và tên"
                  autoComplete="off"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email" className="text-xs md:text-sm">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createUserData.email}
                  onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                  placeholder="Nhập email"
                  autoComplete="new-password"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password" className="text-xs md:text-sm">Mật khẩu</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createUserData.password}
                  onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                  placeholder="Nhập mật khẩu"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone" className="text-xs md:text-sm">Số điện thoại</Label>
                <Input
                  id="create-phone"
                  value={createUserData.phone}
                  onChange={(e) => setCreateUserData({ ...createUserData, phone: e.target.value })}
                  placeholder="Nhập số điện thoại"
                  autoComplete="off"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs md:text-sm">Vai trò</Label>
                <Select value={createUserData.role} onValueChange={(value) => setCreateUserData({ ...createUserData, role: value })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    {session?.user?.role === 'admin' ? (
                      <>
                        <SelectItem value="chuNha" className="text-sm">Chủ nhà</SelectItem>
                        <SelectItem value="admin" className="text-sm">Quản trị viên</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="nhanVien" className="text-sm">Nhân viên</SelectItem>
                        <SelectItem value="khachThue" className="text-sm">Khách thuê</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                Hủy
              </Button>
              <Button size="sm" onClick={handleCreateUser} className="w-full sm:w-auto">
                Tạo tài khoản
              </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4 lg:gap-6">
        <Card className="p-2 md:p-4 premium-card shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-tight">Tổng người dùng</p>
              <p className="text-base md:text-2xl font-bold">{users.length}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-full">
               <Users className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-2 md:p-4 premium-card shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-tight">Quản trị viên</p>
              <p className="text-base md:text-2xl font-bold text-red-600">
                {users.filter(u => getUserRole(u) === 'admin').length}
              </p>
            </div>
            <div className="p-2 bg-red-50 rounded-full">
               <Shield className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-2 md:p-4 premium-card shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-tight">Chủ nhà</p>
              <p className="text-base md:text-2xl font-bold text-blue-600">
                {users.filter(u => getUserRole(u) === 'chuNha').length}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-full">
               <Users className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-2 md:p-4 premium-card shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-tight">Nhân viên</p>
              <p className="text-base md:text-2xl font-bold text-emerald-600">
                {users.filter(u => getUserRole(u) === 'nhanVien').length}
              </p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-full">
               <Users className="h-3 w-3 md:h-4 md:w-4 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-2 md:p-4 premium-card shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-tight">Khách thuê</p>
              <p className="text-base md:text-2xl font-bold text-orange-500">
                {users.filter(u => getUserRole(u) === 'khachThue').length}
              </p>
            </div>
            <div className="p-2 bg-orange-50 rounded-full">
               <Users className="h-3 w-3 md:h-4 md:w-4 text-orange-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block premium-card border-none shadow-lg overflow-hidden">
        <CardHeader className="bg-white/50 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Danh sách người dùng
              </CardTitle>
              <CardDescription>
                Quản lý tất cả tài khoản trong hệ thống ({filteredUsers.length} người dùng)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <UserDataTable
            data={filteredUsers}
            onEdit={openEditDialog}
            onDelete={handleDeleteUser}
            onToggleStatus={handleToggleStatus}
            onResetPassword={openResetPasswordDialog}
            currentUserId={session?.user?.id}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Danh sách người dùng</h2>
          <span className="text-sm text-gray-500">{filteredUsers.length} người dùng</span>
        </div>

        {/* Mobile Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const isCurrentUser = session?.user?.id === user._id;
            
            return (
              <Card key={user._id} className="p-4 premium-card border-none shadow-md">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                      <AvatarImage src={getUserAvatar(user)} />
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {getInitials(getUserName(user))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{getUserName(user)}</h3>
                          <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        </div>
                        {getRoleBadge(getUserRole(user))}
                      </div>
                      {isCurrentUser && (
                        <Badge variant="outline" className="mt-1 text-xs">Bạn</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs border-t pt-2">
                    {getUserPhone(user) && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="h-3 w-3" />
                        <span>{getUserPhone(user)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>Tham gia: {
                        (user.createdAt || user.ngayTao) 
                          ? new Date(user.createdAt || user.ngayTao!).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) 
                          : 'Chưa cập nhật'
                      }</span>
                    </div>
                  </div>

                  <div className="border-t pt-2 flex justify-between items-center">
                    <Badge variant={getUserIsActive(user) ? "default" : "secondary"} className="text-[10px] uppercase tracking-wider">
                      {getUserIsActive(user) ? 'Hoạt động' : 'Tạm khóa'}
                    </Badge>
                  </div>

                  {!isCurrentUser && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                        className="flex-1 h-8 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Sửa
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openResetPasswordDialog(user)}
                        className="flex-1 h-8 text-xs"
                      >
                        <LockKeyhole className="h-3 w-3 mr-1" />
                        Mật khẩu
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(user)}
                        className={`flex-1 h-8 text-xs ${getUserIsActive(user) ? 'text-orange-600' : 'text-emerald-600'}`}
                      >
                         {getUserIsActive(user) ? <UserX className="h-3 w-3 mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
                         {getUserIsActive(user) ? 'Khóa' : 'Mở'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed mt-4">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Hệ thống chưa tìm thấy tài khoản nào khớp với yêu cầu.</p>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Chỉnh sửa tài khoản</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Cập nhật thông tin tài khoản người dùng
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-xs md:text-sm">Họ và tên</Label>
              <Input
                id="edit-name"
                value={editUserData.name}
                onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                placeholder="Nhập họ và tên"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-xs md:text-sm">Số điện thoại</Label>
              <Input
                id="edit-phone"
                value={editUserData.phone}
                onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
                placeholder="Nhập số điện thoại"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="text-xs md:text-sm">Vai trò</Label>
              <Select value={editUserData.role} onValueChange={(value) => setEditUserData({ ...editUserData, role: value })}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {session?.user?.role === 'admin' ? (
                    <>
                      <SelectItem value="chuNha" className="text-sm">Chủ nhà</SelectItem>
                      <SelectItem value="admin" className="text-sm">Quản trị viên</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="nhanVien" className="text-sm">Nhân viên</SelectItem>
                      <SelectItem value="khachThue" className="text-sm">Khách thuê</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
              Hủy
            </Button>
            <Button size="sm" onClick={handleEditUser} className="w-full sm:w-auto">
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-orange-500" />
              Đặt lại mật khẩu
            </DialogTitle>
            <DialogDescription>
              Nhập mật khẩu mới cho tài khoản <strong>{selectedUser ? getUserName(selectedUser) : ''}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Mật khẩu mới</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập ít nhất 6 ký tự"
                autoFocus
              />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Lưu ý:</strong> Sau khi đặt lại, người dùng sẽ phải dùng mật khẩu mới này để đăng nhập. Bạn hãy thông báo mật khẩu này cho họ nhé.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsResetPasswordDialogOpen(false)} className="w-full sm:w-auto">
              Hủy
            </Button>
            <Button 
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto" 
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 6}
            >
              Đặt lại mật khẩu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
