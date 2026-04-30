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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  LockKeyhole,
  Check,
  ChevronsUpDown,
  X,
  AlertCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from 'sonner';
import { UserDataTable } from './table';

interface User {
  _id: string;
  name?: string;
  ten?: string;
  email: string;
  username?: string;
  tenDangNhap?: string;
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
  tenantId?: string;
}

export default function AccountManagementPage() {
  const { data: session } = useSession();
  const cache = useCache<{ users: User[] }>({ key: 'tai-khoan-data', duration: 300000 });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const hasFetchedRef = useRef(false);
  
  const [tenantSuggestions, setTenantSuggestions] = useState<any[]>([]);
  const [openTenantPopover, setOpenTenantPopover] = useState(false);

  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'khachThue',
    tenantId: undefined
  });

  useEffect(() => {
    if (isCreateDialogOpen && createUserData.role === 'khachThue') {
      fetch('/api/khach-thue?limit=200&trangThai=noAccount')
        .then(res => res.json())
        .then(data => {
          if (data.success) setTenantSuggestions(data.data || []);
        })
        .catch(console.error);
    }
  }, [isCreateDialogOpen, createUserData.role]);
  
  const [editUserData, setEditUserData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    isActive: true
  });

  useEffect(() => {
    document.title = 'Quản lý Tài khoản';
  }, []);

  useEffect(() => {
    if (((session?.user as any)?.role === 'admin' || (session?.user as any)?.role === 'chuNha') && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchUsers(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

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
        toast.error('Hệ thống không thể tải danh sách người dùng. Vui lòng thử lại sau.');
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
    toast.success('Dữ liệu người dùng đã được cập nhật.');
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
        const successMessage = createUserData.role === 'khachThue' 
          ? 'Tuyệt vời! Tài khoản mới đã được tạo. Một email xác minh mã OTP đã được gửi tới khách thuê.'
          : 'Tuyệt vời! Tài khoản mới đã được tạo thành công.';
        
        toast.success(successMessage);
        setIsCreateDialogOpen(false);
        setCreateUserData({
          name: '',
          email: '',
          password: '',
          phone: '',
          role: ((session?.user as any)?.role) === 'admin' ? 'chuNha' : 'khachThue',
          tenantId: undefined
        });
        cache.clearCache();
        fetchUsers(true);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.');
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
        toast.success('Thông tin tài khoản đã được cập nhật.');
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        cache.clearCache();
        fetchUsers(true);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Không thể lưu thay đổi cho tài khoản. Vui lòng thử lại.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi cập nhật tài khoản rồi.');
    }
  };

  // Không cho phép xóa tài khoản để đảm bảo tính toàn vẹn dữ liệu
  const handleDeleteUser = async () => {
    toast.error('Không cho phép xóa tài khoản để đảm bảo tính toàn vẹn dữ liệu và lưu log ở các hợp đồng, hóa đơn. Vui lòng sử dụng chức năng "Khóa tài khoản".');
  };

  const handleToggleStatus = (user: User) => {
    setUserToToggle(user);
    setIsToggleStatusDialogOpen(true);
  };

  const executeToggleStatus = async () => {
    if (!userToToggle) return;
    try {
      const newStatus = !getUserIsActive(userToToggle);
      const response = await fetch(`/api/admin/users/${userToToggle._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userToToggle,
          name: getUserName(userToToggle),
          phone: getUserPhone(userToToggle),
          role: getUserRole(userToToggle),
          isActive: newStatus,
          trangThai: newStatus ? 'hoatDong' : 'khoa'
        }),
      });

      if (response.ok) {
        toast.success(newStatus ? 'Đã mở khóa tài khoản!' : 'Đã khóa tài khoản thành công!');
        setIsToggleStatusDialogOpen(false);
        setUserToToggle(null);
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
      email: user.email || '',
      phone: getUserPhone(user),
      role: getUserRole(user),
      isActive: getUserIsActive(user)
    });
    setIsEditDialogOpen(true);
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

  const filteredUsers = users.filter(user => {
    // Search filter
    const searchMatch = (user.name || user.ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Role filter
    const roleMatch = roleFilter === 'all' || getUserRole(user) === roleFilter;
    
    // Status filter
    const active = getUserIsActive(user);
    const statusMatch = statusFilter === 'all' || 
                        (statusFilter === 'true' && active) || 
                        (statusFilter === 'false' && !active);
    
    return searchMatch && roleMatch && statusMatch;
  });

  if (((session?.user as any)?.role) !== 'admin' && ((session?.user as any)?.role) !== 'chuNha') {
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
              role: ((session?.user as any)?.role) === 'admin' ? 'chuNha' : 'khachThue'
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
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[520px]">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-base md:text-lg">Tạo tài khoản mới</DialogTitle>
              <DialogDescription className="text-xs">
                Tạo tài khoản người dùng mới cho hệ thống
              </DialogDescription>
            </DialogHeader>

            <div className="pt-0 pb-1">
              <Tabs 
                value={createUserData.role} 
                onValueChange={(val) => {
                  setCreateUserData(prev => ({ 
                    ...prev, 
                    role: val,
                    name: '', phone: '', email: '', password: '', tenantId: undefined
                  }));
                }} 
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 h-10 items-center bg-gray-100 rounded-lg p-1">
                  {((session?.user as any)?.role) === 'admin' ? (
                    <>
                      <TabsTrigger value="chuNha" className="rounded-md data-[state=active]:bg-[#0d9488] data-[state=active]:text-white transition-all text-sm font-medium">Chủ nhà</TabsTrigger>
                      <TabsTrigger value="admin" className="rounded-md data-[state=active]:bg-[#0d9488] data-[state=active]:text-white transition-all text-sm font-medium">Quản trị viên</TabsTrigger>
                    </>
                  ) : (
                    <>
                      <TabsTrigger value="khachThue" className="rounded-md data-[state=active]:bg-[#0d9488] data-[state=active]:text-white transition-all text-sm font-medium">Khách thuê</TabsTrigger>
                      <TabsTrigger value="nhanVien" className="rounded-md data-[state=active]:bg-[#0d9488] data-[state=active]:text-white transition-all text-sm font-medium">Nhân viên</TabsTrigger>
                    </>
                  )}
                </TabsList>
              </Tabs>
            </div>

            <div className="grid gap-2.5 py-1">
              {createUserData.role === 'khachThue' && (
                <div className="relative group rounded-lg border border-dashed border-[#0d9488]/40 bg-[#0d9488]/5 p-2.5 transition-all hover:bg-[#0d9488]/10 mb-0.5 pointer-events-auto">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-full bg-white shadow-sm p-1.5 text-[#0d9488]">
                      <UserCheck className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <Label className="text-[13px] font-semibold text-[#0f766e]">Liên kết hồ sơ khách thuê</Label>
                        <p className="text-[10.5px] text-[#0d9488]/80 mt-0.5 leading-tight">Hệ thống sẽ tự điền thông tin khi bạn chọn khách từ danh sách này.</p>
                      </div>
                      <Popover open={openTenantPopover} onOpenChange={setOpenTenantPopover}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            role="combobox" 
                            aria-expanded={openTenantPopover} 
                            className={cn(
                              "w-full justify-between bg-white/90 backdrop-blur-sm border-[#0d9488]/20 hover:bg-white hover:border-[#0d9488]/40 shadow-sm h-9 px-3",
                              !createUserData.name && "text-muted-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Search className="h-3.5 w-3.5 opacity-50 shrink-0" />
                              <span className="truncate">
                                {createUserData.tenantId && tenantSuggestions.find(t => t._id === createUserData.tenantId)
                                  ? `${tenantSuggestions.find(t => t._id === createUserData.tenantId)?.hoTen} - ${tenantSuggestions.find(t => t._id === createUserData.tenantId)?.soDienThoai}`
                                  : "Tìm theo tên hoặc SĐT..."}
                              </span>
                            </div>
                            {!createUserData.tenantId ? (
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            ) : (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCreateUserData(prev => ({ 
                                    ...prev, 
                                    name: '', phone: '', email: '', tenantId: undefined 
                                  }));
                                }} 
                                className="ml-2 p-1 rounded-sm hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                              >
                                <X className="h-3.5 w-3.5 shrink-0" />
                              </div>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[370px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Tìm theo tên hoặc SĐT..." />
                        <CommandList>
                          <CommandEmpty>Không có khách thuê nào đang chờ tạo tài khoản.</CommandEmpty>
                          <CommandGroup>
                            {tenantSuggestions.map((tenant) => (
                              <CommandItem
                                key={tenant._id}
                                value={tenant.hoTen + ' ' + tenant.soDienThoai}
                                onSelect={() => {
                                  setCreateUserData(prev => ({ 
                                    ...prev, 
                                    name: tenant.hoTen, 
                                    phone: tenant.soDienThoai, 
                                    email: tenant.email || prev.email,
                                    tenantId: tenant._id
                                  }));
                                  setOpenTenantPopover(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", createUserData.tenantId === tenant._id ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span>{tenant.hoTen}</span>
                                  <span className="text-xs text-muted-foreground">SĐT: {tenant.soDienThoai} {tenant.cccd ? `- CCCD: ${tenant.cccd}` : ''}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-name" className={cn("text-[13px] font-medium", createUserData.tenantId && "text-slate-500")}>Họ và tên</Label>
                  <Input
                    id="create-name"
                    value={createUserData.name}
                    onChange={(e) => setCreateUserData({ ...createUserData, name: e.target.value })}
                    placeholder="Nhập họ và tên"
                    autoComplete="off"
                    readOnly={!!createUserData.tenantId}
                    className={cn("h-8 text-xs", createUserData.tenantId && "bg-slate-100 border-slate-200 text-slate-600 focus-visible:ring-0")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-phone" className={cn("text-[13px] font-medium", createUserData.tenantId && "text-slate-500")}>Số điện thoại</Label>
                  <Input
                    id="create-phone"
                    value={createUserData.phone}
                    onChange={(e) => setCreateUserData({ ...createUserData, phone: e.target.value })}
                    placeholder="Nhập số điện thoại"
                    autoComplete="off"
                    readOnly={!!createUserData.tenantId}
                    className={cn("h-8 text-xs", createUserData.tenantId && "bg-slate-100 border-slate-200 text-slate-600 focus-visible:ring-0")}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-email" className={cn("text-[13px] font-medium", createUserData.tenantId && "text-slate-500")}>Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createUserData.email}
                    onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                    placeholder="Nhập email"
                    autoComplete="new-password"
                    readOnly={!!createUserData.tenantId}
                    className={cn("h-8 text-xs", createUserData.tenantId && "bg-slate-100 border-slate-200 text-slate-600 focus-visible:ring-0")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-password" className="text-[13px] font-medium">Mật khẩu</Label>
                  <Input
                    id="create-password"
                    type="password"
                    value={createUserData.password}
                    onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                    placeholder="Nhập mật khẩu"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              
              {createUserData.tenantId && (
                <div className="col-span-1 flex gap-2 items-start bg-amber-50 border border-amber-200 p-2.5 rounded-md mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0" />
                  <p className="text-[10.5px] text-amber-800 leading-tight">
                    Thông tin này được đồng bộ từ hồ sơ khách thuê. Để thay đổi, vui lòng chỉnh sửa tại <strong>Quản lý khách thuê</strong>.
                  </p>
                </div>
              )}
              {/* Vai trò selection is now handled by the Tabs at the top */}
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

      {/* Toggle Status Confirmation Dialog */}
      <Dialog open={isToggleStatusDialogOpen} onOpenChange={setIsToggleStatusDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{userToToggle && getUserIsActive(userToToggle) ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}</DialogTitle>
            <DialogDescription className="pt-2">
              {userToToggle && getUserIsActive(userToToggle) 
                ? `Bạn có chắc chắn muốn khóa tài khoản của "${getUserName(userToToggle)}"? Tài khoản bị khóa sẽ không thể đăng nhập vào hệ thống.`
                : `Bạn có chắc chắn muốn mở khóa tài khoản của "${userToToggle ? getUserName(userToToggle) : ''}"? Họ sẽ có thể đăng nhập trở lại.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setIsToggleStatusDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              variant={userToToggle && getUserIsActive(userToToggle) ? "destructive" : "default"} 
              onClick={executeToggleStatus}
            >
              {userToToggle && getUserIsActive(userToToggle) ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
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
              <p className="text-base md:text-2xl font-bold">{filteredUsers.length}</p>
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
                {filteredUsers.filter(u => getUserRole(u) === 'admin').length}
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
                {filteredUsers.filter(u => getUserRole(u) === 'chuNha').length}
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
                {filteredUsers.filter(u => getUserRole(u) === 'nhanVien').length}
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
                {filteredUsers.filter(u => getUserRole(u) === 'khachThue').length}
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
            currentUserId={((session?.user as any)?.id)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            roleFilter={roleFilter}
            onRoleChange={setRoleFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
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
              className="pl-10 text-sm h-10"
            />
          </div>
        </div>

        {/* Mobile Filter Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full text-xs h-9">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              <SelectItem value="admin">Quản trị viên</SelectItem>
              <SelectItem value="chuNha">Chủ nhà</SelectItem>
              <SelectItem value="nhanVien">Nhân viên</SelectItem>
              <SelectItem value="khachThue">Khách thuê</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full text-xs h-9">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="true">Hoạt động</SelectItem>
              <SelectItem value="false">Tạm khóa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Card List */}
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const isCurrentUser = ((session?.user as any)?.id) === user._id;
            
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
                    {(user.username || (user as any).tenDangNhap) && (
                      <div className="flex items-center gap-2 text-blue-600 font-medium">
                        <UserCheck className="h-3 w-3" />
                        <span>Tài khoản: {user.username || (user as any).tenDangNhap}</span>
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
              <Label htmlFor="edit-email" className="text-xs md:text-sm">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                placeholder="Nhập email"
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
                  {((session?.user as any)?.role) === 'admin' ? (
                    <>
                      <SelectItem value="chuNha" className="text-sm">Chủ nhà</SelectItem>
                      <SelectItem value="admin" className="text-sm">Quản trị viên</SelectItem>
                    </>
                  ) : (
                    <>
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


    </div>
  );
}
