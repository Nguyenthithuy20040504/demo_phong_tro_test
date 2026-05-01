'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Bell, 
  Calendar,
  Users,
  Eye,
  Filter,
  Send,
  Building2,
  Home,
  RefreshCw,
  Zap,
  AlertTriangle,
  Check,
  ChevronsUpDown,
  X
} from 'lucide-react';
import { ThongBao, ToaNha, Phong, KhachThue } from '@/types';
import { toast } from 'sonner';
import { useCache } from '@/hooks/use-cache';

export default function ThongBaoPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const cache = useCache<{
    thongBaoList: ThongBao[];
    toaNhaList: ToaNha[];
    phongList: Phong[];
    khachThueList: KhachThue[];
  }>({ key: 'thong-bao-data', duration: 300000 });
  
  const [thongBaoList, setThongBaoList] = useState<ThongBao[]>([]);
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);
  const [phongList, setPhongList] = useState<Phong[]>([]);
  const [khachThueList, setKhachThueList] = useState<KhachThue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingThongBao, setViewingThongBao] = useState<ThongBao | null>(null);
  const [editingThongBao, setEditingThongBao] = useState<ThongBao | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');

  useEffect(() => {
    document.title = 'Quản lý Thông báo';
    const saved = typeof window !== 'undefined' ? localStorage.getItem('selected_building_id') || 'all' : 'all';
    setSelectedBuildingId(saved);
  }, []);

  // Đọc URL params (khi bấm vào thông báo chủ động từ chuông)
  const searchParams = useSearchParams();
  const [filterByNotifId, setFilterByNotifId] = useState<string | null>(null);

  useEffect(() => {
    const notifId = searchParams.get('id');
    const s = searchParams.get('search');

    if (notifId) {
      setFilterByNotifId(notifId);
      window.history.replaceState({}, '', '/dashboard/thong-bao');
    }

    if (s) {
      setSearchTerm(s);
      setCurrentPage(1);
      window.history.replaceState({}, '', '/dashboard/thong-bao');
    }
  }, [searchParams]);

  // Khi có filterByNotifId và thông báo không nằm trong list hiện tại, fetch trực tiếp và inject
  useEffect(() => {
    if (filterByNotifId && !loading && thongBaoList.length >= 0) {
      const found = thongBaoList.find(tb => tb._id === filterByNotifId);
      if (!found) {
        // Fetch trực tiếp thông báo đó và thêm vào list
        fetch(`/api/thong-bao?id=${filterByNotifId}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data) {
              const notif = Array.isArray(data.data) ? data.data[0] : data.data;
              if (notif) {
                setThongBaoList(prev => [notif, ...prev]);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [filterByNotifId, loading]);

  // Global Building Sync (listen to TopNavbar)
  useEffect(() => {
    const handleSyncBuilding = () => {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('selected_building_id') || 'all' : 'all';
      setSelectedBuildingId(saved);
      fetchData(true);
    };
    window.addEventListener('buildingChange', handleSyncBuilding);
    return () => window.removeEventListener('buildingChange', handleSyncBuilding);
  }, []);

  useEffect(() => {
    fetchData(true);
  }, [selectedBuildingId]);

  const fetchData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (!forceRefresh) {
        const cachedData = cache.getCache();
        if (cachedData) {
          setThongBaoList(cachedData.thongBaoList || []);
          setToaNhaList(cachedData.toaNhaList || []);
          setPhongList(cachedData.phongList || []);
          setKhachThueList(cachedData.khachThueList || []);
          setLoading(false);
          return;
        }
      }
      
      // Fetch all data in parallel
      const limitQuery = '?limit=2000';
      
      if (isAdmin) {
        const [thongBaoResponse, chuNhaResponse] = await Promise.all([
          fetch(`/api/thong-bao${limitQuery}`),
          fetch('/api/admin/users?type=chuNha')
        ]);
        
        const thongBaoData = await thongBaoResponse.json();
        const chuNhaData = await chuNhaResponse.json();
        
        const thongBaos = thongBaoData.success ? thongBaoData.data : [];
        const mappedChuNha = Array.isArray(chuNhaData) ? chuNhaData.map((u: any) => ({ _id: u._id, hoTen: u.ten || u.name, email: u.email })) : [];
        
        setThongBaoList(thongBaos);
        setToaNhaList([]);
        setPhongList([]);
        setKhachThueList(mappedChuNha as any);
        
        cache.setCache({
          thongBaoList: thongBaos,
          toaNhaList: [],
          phongList: [],
          khachThueList: mappedChuNha as any,
        });
      } else {
        const buildingFilterQuery = selectedBuildingId !== 'all' ? `&toaNhaId=${selectedBuildingId}` : '';
        
        const [thongBaoResponse, toaNhaResponse, phongResponse, khachThueResponse] = await Promise.all([
          fetch(`/api/thong-bao${limitQuery}${buildingFilterQuery}`),
          fetch('/api/toa-nha'),
          fetch(`/api/phong${limitQuery}&action=basic`),
          fetch(`/api/khach-thue${limitQuery}`)
        ]);

        const [thongBaoData, toaNhaData, phongData, khachThueData] = await Promise.all([
          thongBaoResponse.ok ? thongBaoResponse.json() : { data: [] },
          toaNhaResponse.ok ? toaNhaResponse.json() : { data: [] },
          phongResponse.ok ? phongResponse.json() : { data: [] },
          khachThueResponse.ok ? khachThueResponse.json() : { data: [] }
        ]);

        const thongBaos = thongBaoData.success ? thongBaoData.data : [];
        const toaNhas = toaNhaData.success ? toaNhaData.data : [];
        const phongs = phongData.success ? phongData.data : [];
        const khachThues = khachThueData.success ? khachThueData.data : [];

        setThongBaoList(thongBaos);
        setToaNhaList(toaNhas);
        setPhongList(phongs);
        setKhachThueList(khachThues);
        
        cache.setCache({
          thongBaoList: thongBaos,
          toaNhaList: toaNhas,
          phongList: phongs,
          khachThueList: khachThues,
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setThongBaoList([]);
      setToaNhaList([]);
      setPhongList([]);
      setKhachThueList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    cache.setIsRefreshing(true);
    await fetchData(true);
    cache.setIsRefreshing(false);
    toast.success('Danh sách thông báo đã được cập nhật.');
  };

  const handleAutoGenerate = async () => {
    setIsAutoGenerating(true);
    try {
      const res = await fetch('/api/thong-bao/auto-generate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Đã tạo ${data.created} thông báo tự động`);
        if (data.created > 0) {
          cache.clearCache();
          fetchData(true);
        }
      } else {
        toast.error(data.message || 'Lỗi tạo thông báo tự động');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setIsAutoGenerating(false);
    }
  };

  const filteredThongBao = filterByNotifId
    ? thongBaoList.filter(tb => tb._id === filterByNotifId)
    : thongBaoList.filter(thongBao => {
        const matchesSearch = thongBao.tieuDe.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             thongBao.noiDung.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'all' || thongBao.loai === typeFilter;
        
        return matchesSearch && matchesType;
      });

  // Pagination
  const totalPages = Math.ceil(filteredThongBao.length / pageSize);
  const paginatedThongBao = filteredThongBao.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page khi filter thay đổi
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };
  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'chung':
        return <Badge variant="default">Chung</Badge>;
      case 'hoaDon':
        return <Badge variant="secondary">Hóa đơn</Badge>;
      case 'suCo':
        return <Badge variant="destructive">Sự cố</Badge>;
      case 'hopDong':
        return <Badge variant="outline">Hợp đồng</Badge>;
      case 'he_thong':
        return <Badge className="bg-red-600 text-white hover:bg-red-700">Hệ thống</Badge>;
      case 'thanh_toan_saas':
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">SaaS Payment</Badge>;
      case 'khac':
        return <Badge variant="outline">Khác</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getToaNhaName = (toaNha: any) => {
    if (!toaNha || toaNha === 'all') return 'Tất cả tòa nhà';
    if (typeof toaNha === 'object') {
      if (toaNha.tenToaNha) return toaNha.tenToaNha;
      const found = toaNhaList.find(tn => tn._id === toaNha._id);
      return found?.tenToaNha || 'Không xác định';
    }
    const toaNhaId = String(toaNha);
    const found = toaNhaList.find(tn => tn._id === toaNhaId);
    return found?.tenToaNha || 'Không xác định';
  };

  const getPhongNames = (phongs: any[]) => {
    if (!phongs || phongs.length === 0) return 'Tất cả phòng';
    const phongNames = phongs.map(p => {
      if (typeof p === 'object') {
        if (p.maPhong) return p.maPhong;
        const found = phongList.find(r => r._id === p._id);
        return found?.maPhong || 'Không xác định';
      }
      const phongId = String(p);
      const found = phongList.find(r => r._id === phongId);
      return found?.maPhong || 'Không xác định';
    });
    return phongNames.join(', ');
  };

  const getKhachThueNames = (khachThues: any[], thongBao?: any) => {
    if (!khachThues || khachThues.length === 0) {
      // Kiểm tra nếu là broadcast notification
      if (thongBao?.guiTatCa) {
        if (thongBao.vaiTroNhan === 'chuNha') return 'Tất cả chủ nhà';
        if (thongBao.vaiTroNhan === 'khachThue') return 'Tất cả khách thuê';
        if (thongBao.vaiTroNhan === 'admin') return 'Quản trị viên (Admin)';
        return 'Tất cả người dùng';
      }
      return isAdmin ? 'Tất cả chủ nhà' : 'Tất cả khách thuê';
    }
    const khachThueNames = khachThues.map(k => {
      if (typeof k === 'object') {
        if (k.hoTen) return k.hoTen;
        const found = khachThueList.find(kt => kt._id === k._id);
        return found?.hoTen || 'Không xác định';
      }
      const ktId = String(k);
      const found = khachThueList.find(kt => kt._id === ktId || (kt as any).userId === ktId);
      return found?.hoTen || 'Không xác định';
    });
    return khachThueNames.join(', ');
  };

  const handleView = (thongBao: ThongBao) => {
    setViewingThongBao(thongBao);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (thongBao: ThongBao) => {
    setEditingThongBao(thongBao);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      try {
        const response = await fetch(`/api/thong-bao?id=${id}`, {
          method: 'DELETE',
        });

        const result = await response.json();
        if (response.ok) {
          cache.clearCache();
          setThongBaoList(prev => prev.filter(thongBao => thongBao._id !== id));
          toast.success('Thông báo đã được xóa.');
        } else {
          toast.error(result.message || 'Đã xảy ra lỗi khi xóa thông báo. Vui lòng thử lại.');
        }
      } catch (error) {
        toast.error('Có lỗi khi kết nối để xóa thông báo.');
      }
    }
  };

  const handleSend = async (thongBao: ThongBao) => {
    try {
      const toastId = toast.loading('Đang gửi lại thông báo đến email người nhận...');
      
      const response = await fetch('/api/thong-bao/gui-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thongBaoId: thongBao._id })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.success(result.message || 'Đã gửi lại thông báo.', { id: toastId });
      } else {
        toast.error(result.message || 'Lỗi khi gửi lại thông báo', { id: toastId });
      }
    } catch (error) {
      console.error('Error resending notification:', error);
      toast.error('Lỗi kết nối khi gửi email.');
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
    <TooltipProvider>
      <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold font-heading text-foreground drop-shadow-sm">Quản lý thông báo</h1>
          <p className="text-xs md:text-sm text-gray-600">Gửi và quản lý thông báo đến khách thuê</p>
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoGenerate}
            disabled={isAutoGenerating}
            className="flex-1 sm:flex-none border-amber-400 text-amber-700 hover:bg-amber-50"
          >
            <Zap className={`h-4 w-4 sm:mr-2 ${isAutoGenerating ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{isAutoGenerating ? 'Đang tạo...' : 'Tự động'}</span>
          </Button>
          <Button size="sm" onClick={() => { setEditingThongBao(null); setIsDialogOpen(true); }} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tạo thông báo</span>
            <span className="sm:hidden">Tạo</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-1.5 md:gap-4 lg:gap-6`}>
        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600">Tổng thông báo</p>
              <p className="text-base md:text-2xl font-bold">{filteredThongBao.length}</p>
            </div>
            <Bell className="h-3 w-3 md:h-4 md:w-4 text-gray-500" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600">Chung</p>
              <p className="text-base md:text-2xl font-bold text-blue-600">
                {filteredThongBao.filter(t => t.loai === 'chung').length}
              </p>
            </div>
            <Bell className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
          </div>
        </Card>

        <Card className="p-2 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-600">{isAdmin ? 'Hệ thống' : 'Hóa đơn'}</p>
              <p className={`text-base md:text-2xl font-bold ${isAdmin ? 'text-red-600' : 'text-green-600'}`}>
                {isAdmin 
                  ? filteredThongBao.filter(t => t.loai === 'he_thong' || t.loai === 'thanh_toan_saas').length
                  : filteredThongBao.filter(t => t.loai === 'hoaDon').length
                }
              </p>
            </div>
            <Bell className={`h-3 w-3 md:h-4 md:w-4 ${isAdmin ? 'text-red-600' : 'text-green-600'}`} />
          </div>
        </Card>

        {!isAdmin && (
          <Card className="p-2 md:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] md:text-xs font-medium text-gray-600">Sự cố</p>
                <p className="text-base md:text-2xl font-bold text-red-600">
                  {filteredThongBao.filter(t => t.loai === 'suCo').length}
                </p>
              </div>
              <Bell className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
            </div>
          </Card>
        )}
      </div>

      {/* Banner khi đang xem 1 thông báo cụ thể */}
      {filterByNotifId && (
        <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-teal-600" />
            <span className="text-sm text-teal-800 font-medium">
              Đang hiển thị 1 thông báo được chọn
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setFilterByNotifId(null)}
            className="text-teal-700 border-teal-300 hover:bg-teal-100"
          >
            ← Xem tất cả thông báo
          </Button>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Danh sách thông báo</CardTitle>
          <CardDescription>
            {filteredThongBao.length} thông báo được tìm thấy
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* Tìm kiếm và Bộ lọc */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="flex-1 sm:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo tiêu đề, nội dung..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
                <SelectTrigger className="w-full sm:w-[160px] h-10">
                  <SelectValue placeholder="Loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại thông báo</SelectItem>
                  <SelectItem value="chung">Chung</SelectItem>
                  {!isAdmin && (
                    <>
                      <SelectItem value="hoaDon">Hóa đơn</SelectItem>
                      <SelectItem value="suCo">Sự cố</SelectItem>
                      <SelectItem value="hopDong">Hợp đồng</SelectItem>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <SelectItem value="he_thong">Hệ thống SaaS</SelectItem>
                      <SelectItem value="thanh_toan_saas">Thanh toán SaaS</SelectItem>
                    </>
                  )}
                  <SelectItem value="khac">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tiêu đề</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Người nhận</TableHead>
                  {!isAdmin && <TableHead>Phòng</TableHead>}
                  {!isAdmin && <TableHead>Tòa nhà</TableHead>}
                  <TableHead>Ngày gửi</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedThongBao.map((thongBao) => (
                  <TableRow 
                    key={thongBao._id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleView(thongBao)}
                  >
                    <TableCell className="font-medium">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{thongBao.tieuDe}</div>
                          {((thongBao.nguoiGui as any)?.role === 'admin' || (thongBao.nguoiGui as any)?.vaiTro === 'admin') && (
                            <Badge variant="outline" className="text-[10px] h-5 bg-red-50 text-red-600 border-red-100 px-1.5 flex gap-1 items-center">
                              <AlertTriangle className="size-3" /> Hệ thống
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {thongBao.noiDung}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(thongBao.loai)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {getKhachThueNames(thongBao.nguoiNhan, thongBao)}
                      </div>
                    </TableCell>
                    {!isAdmin && (
                      <TableCell>
                        <div className="text-sm">
                          {getPhongNames(thongBao.phong || [])}
                        </div>
                      </TableCell>
                    )}
                    {!isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {getToaNhaName(thongBao.toaNha)}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {new Date(thongBao.ngayGui).toLocaleDateString('vi-VN')}
                          </span>
                          {(thongBao.nguoiGui as any)?.ten && (
                            <span className="text-[10px] text-gray-400">
                              Người gửi: {(thongBao.nguoiGui as any).ten}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={thongBao.daDoc.length > 0 ? "default" : "secondary"}>
                        {thongBao.daDoc.length > 0 ? 'Đã đọc' : 'Chưa đọc'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleView(thongBao)}
                              className="hover:bg-teal-50 hover:text-teal-600 border-teal-100"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-teal-900/95 text-white border-none shadow-md py-1.5 px-3 text-[11px]">
                            <p>Xem chi tiết</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSend(thongBao)}
                              className="hover:bg-blue-50 hover:text-blue-600 border-blue-100"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-teal-900/95 text-white border-none shadow-md py-1.5 px-3 text-[11px]">
                            <p>Gửi lại qua Email</p>
                          </TooltipContent>
                        </Tooltip>


                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDelete(thongBao._id!)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="bg-teal-900/95 text-white border-none shadow-md py-1.5 px-3 text-[11px]">
                            <p>Xóa thông báo</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Hiển thị {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredThongBao.length)} trong {filteredThongBao.length} thông báo
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Số hàng</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[70px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map(s => (
                      <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(1)}>«</Button>
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>‹</Button>
                <span className="text-sm font-medium px-2">Trang {currentPage}/{totalPages || 1}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)}>»</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Danh sách thông báo</h2>
          <span className="text-sm text-gray-500">{filteredThongBao.length} thông báo</span>
        </div>
        
        {/* Mobile Filters */}
        <div className="space-y-2 mb-4">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm thông báo..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 text-sm h-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
            <SelectTrigger className="text-sm h-9">
              <SelectValue placeholder="Loại thông báo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-sm">Tất cả loại thông báo</SelectItem>
              <SelectItem value="chung" className="text-sm">Chung</SelectItem>
              <SelectItem value="hoaDon" className="text-sm">Hóa đơn</SelectItem>
              <SelectItem value="suCo" className="text-sm">Sự cố</SelectItem>
              <SelectItem value="hopDong" className="text-sm">Hợp đồng</SelectItem>
              <SelectItem value="khac" className="text-sm">Khác</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Card List */}
        <div className="space-y-3">
          {paginatedThongBao.map((thongBao) => {
            return (
              <Card key={thongBao._id} className="p-4">
                <div className="space-y-3">
                  {/* Header with title and type */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{thongBao.tieuDe}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(thongBao.ngayGui).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                    {getTypeBadge(thongBao.loai)}
                  </div>

                  {/* Content */}
                  <div className="border-t pt-2">
                    <p className="text-xs text-gray-600 line-clamp-3">{thongBao.noiDung}</p>
                  </div>

                  {/* Recipients info */}
                  <div className="space-y-1 text-xs border-t pt-2">
                    {thongBao.toaNha && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Building2 className="h-3 w-3" />
                        <span>{getToaNhaName(thongBao.toaNha)}</span>
                      </div>
                    )}
                    {thongBao.phong && thongBao.phong.length > 0 && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Home className="h-3 w-3" />
                        <span className="truncate">{getPhongNames(thongBao.phong)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500">
                      <Users className="h-3 w-3" />
                      <span className="truncate">{getKhachThueNames(thongBao.nguoiNhan, thongBao)}</span>
                    </div>
                  </div>

                  {/* Read status */}
                  <div className="border-t pt-2">
                    <Badge variant={thongBao.daDoc.length > 0 ? "default" : "secondary"} className="text-xs">
                      {thongBao.daDoc.length > 0 ? 'Đã đọc' : 'Chưa đọc'}
                    </Badge>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(thongBao)}
                      className="flex-1"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Xem
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend(thongBao)}
                      className="flex-1"
                    >
                      <Send className="h-3.5 w-3.5 mr-1" />
                      Gửi
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(thongBao._id!)}
                      className="flex-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Xóa
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredThongBao.length === 0 && (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Không có thông báo nào</p>
          </div>
        )}

        {/* Mobile Pagination */}
        {filteredThongBao.length > 0 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t">
            <span className="text-xs text-muted-foreground">
              {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredThongBao.length)} / {filteredThongBao.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>‹</Button>
              <span className="text-xs font-medium px-2">{currentPage}/{totalPages || 1}</span>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>›</Button>
            </div>
          </div>
        )}
        </div>

      {/* View Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="w-[95vw] md:w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Chi tiết thông báo</DialogTitle>
            <DialogDescription>
              Thông tin chi tiết về thông báo đã gửi
            </DialogDescription>
          </DialogHeader>
          
          {viewingThongBao && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tiêu đề</h3>
                  <p className="text-lg font-bold text-gray-900 mt-1">{viewingThongBao.tieuDe}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Loại</h3>
                    <div className="mt-1">{getTypeBadge(viewingThongBao.loai)}</div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ngày gửi</h3>
                    <div className="flex items-center gap-2 mt-1 text-gray-700">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(viewingThongBao.ngayGui).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Nội dung</h3>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100 whitespace-pre-wrap text-gray-800 italic">
                    {viewingThongBao.noiDung}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-4 bg-blue-50/30 border-blue-100">
                    <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2 mb-3">
                      <Building2 className="h-4 w-4" />
                      Phạm vi áp dụng
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tòa nhà:</span>
                        <span className="font-medium">{getToaNhaName(viewingThongBao.toaNha)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-600">Phòng:</span>
                        <span className="font-medium bg-white p-2 rounded border border-blue-50 max-h-24 overflow-y-auto text-xs">
                          {getPhongNames(viewingThongBao.phong || [])}
                        </span>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 bg-green-50/30 border-green-100">
                    <h4 className="text-sm font-bold text-green-900 flex items-center gap-2 mb-3">
                      <Users className="h-4 w-4" />
                      Người nhận ({viewingThongBao.nguoiNhan.length})
                    </h4>
                    <div className="max-h-32 overflow-y-auto bg-white p-2 rounded border border-green-50 text-xs leading-relaxed">
                      {getKhachThueNames(viewingThongBao.nguoiNhan, viewingThongBao)}
                    </div>
                  </Card>
                </div>

                <div className="pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Trạng thái:</span>
                    <Badge variant={viewingThongBao.daDoc.length > 0 ? "default" : "secondary"}>
                      {viewingThongBao.daDoc.length > 0 ? `Đã có ${viewingThongBao.daDoc.length} người đọc` : 'Chưa có ai đọc'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400 italic">
                    ID: {viewingThongBao._id}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Đóng</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ThongBaoFormDialog
        thongBao={editingThongBao}
        toaNhaList={toaNhaList}
        phongList={phongList}
        khachThueList={khachThueList}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={() => {
          setIsDialogOpen(false);
          fetchData(true);
        }}
      />
      </div>
    </TooltipProvider>
  );
}

// Dialog wrapper for the form
function ThongBaoFormDialog({ 
  thongBao, 
  toaNhaList, 
  phongList, 
  khachThueList, 
  isOpen, 
  onClose, 
  onSuccess 
}: { 
  thongBao: ThongBao | null;
  toaNhaList: ToaNha[];
  phongList: Phong[];
  khachThueList: KhachThue[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] md:w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{thongBao ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}</DialogTitle>
          <DialogDescription>
            {thongBao ? 'Cập nhật lại thông tin thông báo đã gửi' : 'Tạo và gửi thông báo mới đến khách thuê hoặc nhân viên'}
          </DialogDescription>
        </DialogHeader>
        <ThongBaoForm
          thongBao={thongBao}
          toaNhaList={toaNhaList}
          phongList={phongList}
          khachThueList={khachThueList}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

// Form component for adding/editing thong bao
function ThongBaoForm({ 
  thongBao, 
  toaNhaList,
  phongList,
  khachThueList,
  onClose, 
  onSuccess 
}: { 
  thongBao: ThongBao | null;
  toaNhaList: ToaNha[];
  phongList: Phong[];
  khachThueList: KhachThue[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [formData, setFormData] = useState({
    tieuDe: thongBao?.tieuDe || '',
    noiDung: thongBao?.noiDung || '',
    loai: thongBao?.loai || 'chung',
    nguoiNhan: thongBao?.nguoiNhan || [],
    phong: thongBao?.phong?.map((p: any) => typeof p === 'object' ? p._id : p) || [],
    toaNha: typeof thongBao?.toaNha === 'object' ? (thongBao.toaNha as any)._id : (thongBao?.toaNha || ''),
    guiTatCa: (thongBao as any)?.guiTatCa || false,
    vaiTroNhan: (thongBao as any)?.vaiTroNhan || (isAdmin ? 'chuNha' : 'khachThue'),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openNguoiNhanDropdown, setOpenNguoiNhanDropdown] = useState(false);

  // Helper function to extract Room ID from a tenant
  const getTenantRoomId = (k: any) => {
    const rId = k.hopDongHienTai?.phongInfo?._id || k.hopDongHienTai?.phong;
    return typeof rId === 'object' ? rId?._id || rId?.toString() : rId;
  };

  // Helper function to get Building ID from a tenant
  const getTenantToaNhaId = (k: any) => {
    const tId = k.hopDongHienTai?.phongInfo?.toaNhaInfo?._id || k.hopDongHienTai?.phong?.toaNha?._id || k.toaNhaBanDau || k.toaNha;
    return typeof tId === 'object' ? tId?._id || tId?.toString() : tId;
  };

  // Filter phongList based on toaNha
  const filteredRooms = formData.toaNha && formData.toaNha !== 'all'
    ? phongList.filter(p => {
        const pToaNhaId = typeof p.toaNha === 'object' ? (p.toaNha as any)._id : p.toaNha;
        return pToaNhaId === formData.toaNha;
      })
    : phongList;

  // FILTER logic: Lọc khách thuê dựa trên Tòa nhà và PHÒNG đã chọn
  const filteredTenants = khachThueList.filter(k => {
    // 1. Lọc theo Tòa nhà trước
    if (formData.toaNha && formData.toaNha !== 'all') {
      const tenantToaNhaId = getTenantToaNhaId(k);
      if (tenantToaNhaId !== formData.toaNha) return false;
    }

    // 2. Lọc theo Phòng (NẾU người dùng có tick chọn phòng cụ thể)
    if (formData.phong && formData.phong.length > 0) {
      const tenantRoomId = getTenantRoomId(k);
      return formData.phong.includes(tenantRoomId);
    }

    return true;
  });

  const handleToaNhaChange = (value: string) => {
    setFormData(prev => ({ ...prev, toaNha: value, phong: [], nguoiNhan: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.guiTatCa && formData.nguoiNhan.length === 0) {
      toast.error('Vui lòng chọn ít nhất một người nhận.');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = thongBao 
        ? `/api/thong-bao?id=${thongBao._id}` 
        : '/api/thong-bao';
      const method = thongBao ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(thongBao ? 'Tuyệt vời! Thông báo đã được cập nhật thành công.' : 'Chúc mừng! Bạn đã tạo một thông báo mới thành công.');
        onSuccess();
      } else {
        toast.error(result.message || 'Không thể lưu thông báo. Vui lòng kiểm tra lại.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối khi gửi thông báo rồi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNguoiNhanChange = (khachThueId: string, checked: boolean) => {
    setFormData(prev => {
      const newNguoiNhan = checked 
        ? [...prev.nguoiNhan, khachThueId]
        : prev.nguoiNhan.filter(id => id !== khachThueId);

      // Tự động check phòng nếu chọn khách
      let newPhong = [...prev.phong];
      const tenant = khachThueList.find(k => k._id === khachThueId);
      const roomId = tenant ? getTenantRoomId(tenant) : null;
      const tenantToaNhaId = tenant ? getTenantToaNhaId(tenant) : null;

      let newToaNha = prev.toaNha;

      if (checked) {
        if (roomId && !newPhong.includes(roomId)) newPhong.push(roomId);
        // Nếu tên tòa nhà chưa có hoặc đang là "Tất cả", tự động gán theo người đầu tiên được chọn
        if (tenantToaNhaId && (!newToaNha || newToaNha === 'all')) {
          newToaNha = tenantToaNhaId;
        }
      } else {
        // Chỉ bỏ check phòng nếu không còn vị khách nào khác chọn phòng đó
        if (roomId) {
          const otherSelectedTenantsInRoom = khachThueList.filter(k => 
            k._id !== khachThueId && 
            newNguoiNhan.includes(k._id!) && 
            getTenantRoomId(k) === roomId
          );
          if (otherSelectedTenantsInRoom.length === 0) {
            newPhong = newPhong.filter(id => id !== roomId);
          }
        }
      }

      return { ...prev, nguoiNhan: newNguoiNhan, phong: newPhong, toaNha: newToaNha };
    });
  };

  const handlePhongChange = (phongId: string, checked: boolean) => {
    setFormData(prev => {
      const newPhong = checked 
        ? [...prev.phong, phongId]
        : prev.phong.filter(id => id !== phongId);
      
      // Tự động check/uncheck các khách nằm trong phòng này
      let newNguoiNhan = [...prev.nguoiNhan];
      const tenantsInRoom = khachThueList.filter(k => getTenantRoomId(k) === phongId);
      const tenantIdsInRoom = tenantsInRoom.map(k => k._id!);

      const phong = phongList.find(p => p._id === phongId);
      const phongToaNhaId = phong ? (typeof phong.toaNha === 'object' ? (phong.toaNha as any)._id : phong.toaNha) : null;
      
      let newToaNha = prev.toaNha;

      if (checked) {
        tenantIdsInRoom.forEach(id => {
          if (!newNguoiNhan.includes(id)) newNguoiNhan.push(id);
        });
        // Tự động set tòa nhà
        if (phongToaNhaId && (!newToaNha || newToaNha === 'all')) {
          newToaNha = phongToaNhaId;
        }
      } else {
        newNguoiNhan = newNguoiNhan.filter(id => !tenantIdsInRoom.includes(id));
      }

      return { ...prev, phong: newPhong, nguoiNhan: newNguoiNhan, toaNha: newToaNha };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tieuDe" className="text-xs md:text-sm">Tiêu đề</Label>
        <Input
          id="tieuDe"
          value={formData.tieuDe}
          onChange={(e) => setFormData(prev => ({ ...prev, tieuDe: e.target.value }))}
          placeholder="Nhập tiêu đề thông báo"
          required
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="noiDung" className="text-xs md:text-sm">Nội dung</Label>
        <Textarea
          id="noiDung"
          value={formData.noiDung}
          onChange={(e) => setFormData(prev => ({ ...prev, noiDung: e.target.value }))}
          rows={6}
          placeholder="Nhập nội dung thông báo..."
          required
          className="text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="loai" className="text-xs md:text-sm">Loại thông báo</Label>
        <Select value={formData.loai} onValueChange={(value) => setFormData(prev => ({ ...prev, loai: value as any }))}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Chọn loại thông báo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chung" className="text-sm">Chung</SelectItem>
            {!isAdmin && (
              <>
                <SelectItem value="hoaDon" className="text-sm">Hóa đơn</SelectItem>
                <SelectItem value="suCo" className="text-sm">Sự cố</SelectItem>
                <SelectItem value="hopDong" className="text-sm">Hợp đồng</SelectItem>
              </>
            )}
            {isAdmin && (
              <>
                <SelectItem value="he_thong" className="text-sm">Hệ thống SaaS</SelectItem>
                <SelectItem value="thanh_toan_saas" className="text-sm">Thanh toán SaaS</SelectItem>
              </>
            )}
            <SelectItem value="khac" className="text-sm">Khác</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Chủ trọ: Option gửi cho Admin */}
      {!isAdmin && (
        <div className="bg-purple-50/50 p-3 rounded-md border border-purple-100">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="guiChoAdmin"
              checked={formData.guiTatCa && formData.vaiTroNhan === 'admin'}
              onChange={(e) => {
                if (e.target.checked) {
                  setFormData(prev => ({
                    ...prev,
                    guiTatCa: true,
                    vaiTroNhan: 'admin',
                    nguoiNhan: [],
                    phong: [],
                    toaNha: '',
                  }));
                } else {
                  setFormData(prev => ({
                    ...prev,
                    guiTatCa: false,
                    vaiTroNhan: 'khachThue',
                  }));
                }
              }}
              className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500"
            />
            <Label htmlFor="guiChoAdmin" className="text-sm font-semibold text-purple-800 cursor-pointer">
              📩 Gửi thông báo cho Quản trị viên (Admin)
            </Label>
          </div>
          <p className="text-[11px] text-purple-600 mt-1 ml-6">
            Thông báo sẽ được gửi đến tất cả quản trị viên hệ thống. Dùng khi cần hỗ trợ, phản hồi, hoặc báo cáo vấn đề.
          </p>
        </div>
      )}

      {/* Tòa nhà (chỉ hiện cho chủ trọ khi KHÔNG gửi cho admin) */}
      {!isAdmin && !(formData.guiTatCa && formData.vaiTroNhan === 'admin') && (
        <div className="space-y-2">
          <Label htmlFor="toaNha" className="text-xs md:text-sm">Tòa nhà</Label>
        <Select value={formData.toaNha} onValueChange={handleToaNhaChange}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Chọn tòa nhà (tùy chọn)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">Tất cả tòa nhà</SelectItem>
            {toaNhaList.map((toaNha) => (
              <SelectItem key={toaNha._id} value={toaNha._id!} className="text-sm">
                {toaNha.tenToaNha}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      )}

      {!isAdmin && !(formData.guiTatCa && formData.vaiTroNhan === 'admin') && (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-xs md:text-sm font-semibold">Phòng (tùy chọn)</Label>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-[10px] h-6 px-2 text-blue-600 hover:text-blue-700"
              onClick={() => {
                const allRoomIds = filteredRooms.map(p => p._id!);
                
                // Cũng tự động check tất cả khách trong các phòng này
                const allTenantIds = khachThueList
                  .filter(k => {
                    const rId = getTenantRoomId(k);
                    return rId && allRoomIds.includes(rId);
                  })
                  .map(k => k._id!);

                setFormData(prev => {
                  const mergedNguoiNhan = Array.from(new Set([...prev.nguoiNhan, ...allTenantIds]));
                  return { ...prev, phong: allRoomIds, nguoiNhan: mergedNguoiNhan };
                });
              }}
            >
              Chọn tất cả
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-[10px] h-6 px-2 text-red-600 hover:text-red-700"
              onClick={() => {
                const allRoomIds = filteredRooms.map(p => p._id!);
                
                // Cũng tự động uncheck tất cả khách trong các phòng này
                const allTenantIds = khachThueList
                  .filter(k => {
                    const rId = getTenantRoomId(k);
                    return rId && allRoomIds.includes(rId);
                  })
                  .map(k => k._id!);

                setFormData(prev => ({ 
                  ...prev, 
                  phong: [], 
                  nguoiNhan: prev.nguoiNhan.filter(id => !allTenantIds.includes(id))
                }));
              }}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-40 overflow-y-auto border rounded-md p-3 bg-gray-50/50">
          {filteredRooms.map((phong) => (
            <div key={phong._id} className="flex items-center space-x-2 bg-white p-1.5 rounded border border-gray-100 shadow-sm hover:border-blue-200 transition-colors">
              <input
                type="checkbox"
                id={`phong-${phong._id}`}
                checked={formData.phong.includes(phong._id!)}
                onChange={(e) => handlePhongChange(phong._id!, e.target.checked)}
                className="rounded border-gray-300 w-3.5 h-3.5"
              />
              <Label htmlFor={`phong-${phong._id}`} className="text-[11px] cursor-pointer truncate font-medium">
                {phong.maPhong}
              </Label>
            </div>
          ))}
          {filteredRooms.length === 0 && (
            <p className="col-span-full text-center py-4 text-xs text-gray-400 italic">
              Không tìm thấy phòng nào phù hợp
            </p>
          )}
        </div>
      </div>
      )}

      {isAdmin && (
        <div className="bg-blue-50/50 p-3 rounded-md border border-blue-100 mb-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="guiTatCa"
              checked={formData.guiTatCa}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                guiTatCa: e.target.checked,
                nguoiNhan: e.target.checked ? [] : prev.nguoiNhan
              }))}
              className="rounded border-gray-300 w-4 h-4 text-blue-600"
            />
            <Label htmlFor="guiTatCa" className="text-sm font-semibold text-blue-800 cursor-pointer">
              Gửi thông báo này cho tất cả Chủ trọ
            </Label>
          </div>
          <p className="text-[11px] text-blue-600 mt-1 ml-6">
            Lưu ý: Khi bật tính năng này, thông báo sẽ được hiển thị trên bảng điều khiển của toàn bộ chủ trọ trên hệ thống.
          </p>
        </div>
      )}

      {!formData.guiTatCa && (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="text-xs md:text-sm font-semibold">{isAdmin ? 'Chọn Chủ nhà' : 'Người nhận'} <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-[10px] h-6 px-2 text-green-600 hover:text-green-700"
              onClick={() => {
                const allTenantIds = filteredTenants.map(k => k._id!);
                
                // Tự động check các phòng của những khách này
                const allRoomIds = filteredTenants
                  .map(k => getTenantRoomId(k))
                  .filter(Boolean) as string[];

                setFormData(prev => {
                  const mergedPhong = Array.from(new Set([...prev.phong, ...allRoomIds]));
                  return { ...prev, nguoiNhan: allTenantIds, phong: mergedPhong };
                });
              }}
            >
              Chọn tất cả
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="text-[10px] h-6 px-2 text-red-600 hover:text-red-700"
              onClick={() => {
                const allTenantIds = filteredTenants.map(k => k._id!);
                
                // Tự động uncheck các phòng của những khách này, NẾU không có khách nào khác đag chọn phòng đó
                setFormData(prev => {
                  const remainingTenants = prev.nguoiNhan.filter(id => !allTenantIds.includes(id));
                  
                  // Chỉ giữ lại những phòng có khách thuê nằm trong remainingTenants
                  const remainingRoomIds = khachThueList
                    .filter(k => remainingTenants.includes(k._id!))
                    .map(k => getTenantRoomId(k))
                    .filter(Boolean) as string[];

                  const updatedPhong = prev.phong.filter(rId => remainingRoomIds.includes(rId));
                  
                  return { ...prev, nguoiNhan: remainingTenants, phong: updatedPhong };
                });
              }}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
        <Popover open={openNguoiNhanDropdown} onOpenChange={setOpenNguoiNhanDropdown}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openNguoiNhanDropdown}
              className="w-full justify-between h-auto min-h-10 py-2 border-gray-300"
            >
              <div className="flex flex-wrap gap-1 items-center">
                {formData.nguoiNhan.length > 0 ? (
                  <span className="text-sm font-medium text-green-700">
                    Đã chọn {formData.nguoiNhan.length} {isAdmin ? 'chủ nhà' : 'người nhận'}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500 font-normal">
                    Tìm kiếm và chọn {isAdmin ? 'chủ nhà' : 'người nhận'}...
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-lg" align="start">
            <Command>
              <CommandInput placeholder={`Tìm kiếm theo tên${isAdmin ? ' hoặc email' : ''}...`} className="h-10 text-sm" />
              <CommandList>
                <CommandEmpty>Không tìm thấy dữ liệu phù hợp.</CommandEmpty>
                <CommandGroup className="max-h-60 overflow-y-auto w-full">
                  {filteredTenants.map((khachThue) => (
                    <CommandItem
                      key={khachThue._id}
                      value={`${khachThue.hoTen} ${(khachThue as any).email || ''}`}
                      onSelect={() => {
                        handleNguoiNhanChange(khachThue._id!, !formData.nguoiNhan.includes(khachThue._id!));
                        setOpenNguoiNhanDropdown(false);
                      }}
                      className="cursor-pointer flex items-center justify-between py-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-slate-800">{khachThue.hoTen}</span>
                        {(khachThue as any).email && (
                          <span className="text-xs text-muted-foreground">{(khachThue as any).email}</span>
                        )}
                      </div>
                      <Check
                        className={`h-4 w-4 text-green-600 transition-opacity ${
                          formData.nguoiNhan.includes(khachThue._id!) ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {formData.nguoiNhan.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1 max-h-32 overflow-y-auto">
            {formData.nguoiNhan.map((id) => {
              const kt = filteredTenants.find(t => t._id === id);
              if (!kt) return null;
              return (
                <Badge key={id} variant="secondary" className="bg-green-50/80 text-green-800 border border-green-200/60 font-medium flex items-center pr-1.5 py-1">
                  <span>{kt.hoTen}</span>
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNguoiNhanChange(id, false);
                    }}
                    className="ml-1 cursor-pointer hover:bg-green-200 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </div>
                </Badge>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-gray-500 italic">
            Chưa có {isAdmin ? 'chủ nhà' : 'người nhận'} nào được chọn
          </p>
        )}
      </div>
      )}

      <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
          Hủy
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting} className="w-full sm:w-auto min-w-[120px]">
          {isSubmitting ? 'Đang lưu...' : (thongBao ? 'Cập nhật' : 'Tạo thông báo')}
        </Button>
      </DialogFooter>
    </form>
  );
}
