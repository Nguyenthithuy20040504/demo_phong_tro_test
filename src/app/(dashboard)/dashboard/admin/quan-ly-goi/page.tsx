'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Settings2,
  Package,
  CheckCircle2,
  XCircle,
  Search,
  X
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch'; // Giả sử có component này

export default function ManagePlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>({
    ten: '',
    moTa: '',
    gia: 0,
    thoiGian: 1,
    maxPhong: -1,
    features: [],
    hasPostingFeature: true,
    isPopular: false,
    isActive: true,
    trangThai: 'hoatDong'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [newFeature, setNewFeature] = useState('');

  const availableSuggestedFeatures = [
    "Quản lý tối đa 19 phòng",
    "Tính năng đăng bài Facebook",
    "Hỗ trợ kỹ thuật 24/7",
    "Báo cáo thống kê chuyên sâu",
    "Quản lý hóa đơn tự động",
    "Thông báo Zalo/Sms"
  ];

  useEffect(() => {
    fetchPlans();
  }, []);

  // Auto-polling 5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchPlans(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Refresh khi quay lại tab
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') fetchPlans(true);
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const fetchPlans = async (silent = false) => {
    try {
      const res = await fetch('/api/admin/saas/plans');
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlans(data);
      } else {
        setPlans([]);
      }
    } catch (error) {
      if (!silent) toast.error('Lỗi khi tải danh sách gói.');
      if (!silent) setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    try {
      const method = currentPlan._id ? 'PUT' : 'POST';
      const url = currentPlan._id ? `/api/admin/saas/plans/${currentPlan._id}` : '/api/admin/saas/plans';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentPlan)
      });

      if (res.ok) {
        toast.success(currentPlan._id ? 'Đã cập nhật gói thành công!' : 'Đã tạo gói mới thành công!');
        setIsDialogOpen(false);
        fetchPlans();
      } else {
        toast.error('Có lỗi xảy ra.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối.');
    }
  };

  const handleCancelPlan = async (plan: any) => {
    if (!confirm(`Bạn có chắc muốn hủy gói "${plan.ten}" không?`)) return;
    
    try {
      // Tách _id ra khỏi dữ liệu cập nhật
      const { _id, ...updateData } = plan;
      
      const res = await fetch(`/api/admin/saas/plans/${_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...updateData, 
          trangThai: 'daHuy',
          isActive: false // Đồng bộ isActive
        })
      });

      if (res.ok) {
        toast.success('Đã hủy gói dịch vụ thành công!');
        fetchPlans();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Có lỗi xảy ra khi hủy gói.');
      }
    } catch (error) {
      toast.error('Lỗi kết nối.');
    }
  };

  const openEditDialog = (plan: any) => {
    setCurrentPlan({
      ...plan,
      trangThai: plan.trangThai || (plan.isActive ? 'hoatDong' : 'daHuy')
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setCurrentPlan({
      ten: '',
      moTa: '',
      gia: 0,
      thoiGian: 1,
      maxPhong: -1,
      features: [],
      hasPostingFeature: true,
      isPopular: false,
      isActive: true,
      trangThai: 'hoatDong'
    });
    setNewFeature('');
    setIsDialogOpen(true);
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    const currentFeatures = currentPlan.features || [];
    if (!currentFeatures.includes(newFeature.trim())) {
      setCurrentPlan({
        ...currentPlan,
        features: [...currentFeatures, newFeature.trim()]
      });
    }
    setNewFeature('');
  };

  const handleRemoveFeature = (feature: string) => {
    setCurrentPlan({
      ...currentPlan,
      features: (currentPlan.features || []).filter((f: string) => f !== feature)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cài đặt Gói Dịch vụ</h1>
          <p className="text-muted-foreground">Thiết lập các gói thuê bao cho Chủ nhà (SaaS).</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Tạo gói mới
        </Button>
      </div>

      <Card className="premium-card">
        <CardHeader>
           <div className="flex items-center gap-2">
               <Package className="h-5 w-5 text-blue-500" />
               <CardTitle>Danh sách gói cước</CardTitle>
           </div>
            <CardDescription>Cấu hình bảng giá hiển thị ngoài trang chủ.</CardDescription>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên gói..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Khoảng giá" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả giá</SelectItem>
                    <SelectItem value="1000000">Giá từ 1tr</SelectItem>
                    <SelectItem value="4000000">Giá từ 4tr</SelectItem>
                    <SelectItem value="10000000">Giá từ 10tr</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(searchTerm !== '' || priceFilter !== 'all') && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchTerm('');
                    setPriceFilter('all');
                  }}
                  className="w-fit text-xs text-muted-foreground hover:text-red-500"
                >
                  <X className="mr-1 h-3 w-3" /> Xóa bộ lọc
                </Button>
              )}
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên gói</TableHead>
                <TableHead>Giá tiền</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Giới hạn</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex justify-center items-center gap-2">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                       Đang tải dữ liệu...
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {Array.isArray(plans) && plans
                    .filter(plan => {
                      const matchesName = plan.ten.toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesPrice = priceFilter === 'all' || plan.gia >= Number(priceFilter);
                      return matchesName && matchesPrice;
                    })
                    .map((plan) => (
                    <TableRow key={plan._id}>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-bold">{plan.ten}</span>
                            {plan.isPopular && <Badge variant="default" className="w-fit text-[10px] scale-90 -translate-x-1 uppercase">Phổ biến</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {plan.gia?.toLocaleString('vi-VN')} đ
                      </TableCell>
                      <TableCell>{plan.thoiGian} tháng</TableCell>
                      <TableCell>
                        {plan.maxPhong === -1 ? 'Không giới hạn' : `${plan.maxPhong} phòng`}
                      </TableCell>
                      <TableCell>
                        {(plan.trangThai === 'daHuy' || (!plan.trangThai && !plan.isActive)) ? (
                            <div className="flex items-center text-red-500 gap-1 text-sm font-medium">
                                 <XCircle className="h-4 w-4" /> Đã hủy
                            </div>
                        ) : (
                            <div className="flex items-center text-emerald-600 gap-1 text-sm font-medium">
                                 <CheckCircle2 className="h-4 w-4" /> Hiển thị
                            </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleCancelPlan(plan)}
                          disabled={plan.trangThai === 'daHuy'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!plans || plans.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Chưa có gói dịch vụ nào.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentPlan._id ? 'Sửa gói dịch vụ' : 'Thêm gói mới'}</DialogTitle>
            <DialogDescription>Nhập thông tin chi tiết cho sản phẩm SaaS của bạn.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label htmlFor="ten">Tên gói</Label>
              <Input 
                id="ten" 
                value={currentPlan.ten} 
                onChange={(e) => setCurrentPlan({...currentPlan, ten: e.target.value})}
              />
            </div>
             <div className="grid gap-2">
              <Label htmlFor="moTa">Mô tả ngắn</Label>
              <Input 
                 id="moTa" 
                 value={currentPlan.moTa}
                 onChange={(e) => setCurrentPlan({...currentPlan, moTa: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                  <Label htmlFor="gia">Giá tiền (VNĐ)</Label>
                  <Input 
                    id="gia" 
                    type="number"
                    value={currentPlan.gia}
                    onChange={(e) => setCurrentPlan({...currentPlan, gia: Number(e.target.value)})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="thoiGian">Thời gian (tháng)</Label>
                  <Input 
                    id="thoiGian" 
                    type="number"
                    value={currentPlan.thoiGian}
                    onChange={(e) => setCurrentPlan({...currentPlan, thoiGian: Number(e.target.value)})}
                  />
                </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxPhong">Giới hạn số phòng (-1: Không GH)</Label>
              <Input 
                id="maxPhong" 
                type="number"
                value={currentPlan.maxPhong}
                onChange={(e) => setCurrentPlan({...currentPlan, maxPhong: Number(e.target.value)})}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tùy chọn Tính năng</Label>
              <Select 
                value={currentPlan.hasPostingFeature === false ? 'khong' : 'co'}
                onValueChange={(val) => setCurrentPlan({...currentPlan, hasPostingFeature: val === 'co'})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tùy chọn tính năng đăng bài" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="co">Thêm Tính năng quảng cáo/đăng bài</SelectItem>
                  <SelectItem value="khong">Không có chức năng đăng bài</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mục thêm các tính năng bổ sung */}
            <div className="grid gap-2 p-3 border rounded-lg bg-gray-50/50">
              <Label className="text-blue-600 font-bold flex items-center gap-1">
                <Settings2 className="h-4 w-4" /> Chi tiết tính năng (Hiển thị tick xanh)
              </Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Thêm tính năng mới..." 
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                />
                <Button type="button" size="icon" onClick={handleAddFeature}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Danh sách các tính năng đã thêm */}
              <div className="flex flex-wrap gap-2 mt-2">
                {(currentPlan.features || []).map((feature: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                    {feature}
                    <button 
                      type="button" 
                      onClick={() => handleRemoveFeature(feature)}
                      className="hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {(currentPlan.features || []).length === 0 && (
                  <span className="text-xs text-muted-foreground italic">Chưa có tính năng bổ sung nào.</span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between space-x-2 p-2 bg-muted/30 rounded-lg mt-2">
                <div className="flex flex-col gap-0.5">
                    <Label className="text-sm font-bold">Gói phổ biến</Label>
                    <span className="text-[10px] text-muted-foreground uppercase">Gắn nhãn RECOMMENDED</span>
                </div>
                <Switch 
                   checked={currentPlan.isPopular}
                   onCheckedChange={(val) => setCurrentPlan({...currentPlan, isPopular: val})}
                />
            </div>
            
            <div className="grid gap-2 mt-2">
              <Label htmlFor="trangThai">Trạng thái gói</Label>
               <Select 
                 value={currentPlan.trangThai || 'hoatDong'} 
                 onValueChange={(val) => setCurrentPlan({
                   ...currentPlan, 
                   trangThai: val,
                   isActive: val === 'hoatDong'
                 })}
               >
                 <SelectTrigger id="trangThai">
                   <SelectValue placeholder="Chọn trạng thái" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="hoatDong">Hiển thị</SelectItem>
                   <SelectItem value="daHuy">Đã hủy</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSavePlan}>Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
