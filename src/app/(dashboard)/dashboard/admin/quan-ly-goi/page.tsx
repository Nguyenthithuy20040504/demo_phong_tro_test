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
  XCircle
} from 'lucide-react';
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
    isPopular: false,
    isActive: true
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/saas/plans');
      const data = await res.json();
      setPlans(data);
    } catch (error) {
      toast.error('Lỗi khi tải danh sách gói.');
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

  const openEditDialog = (plan: any) => {
    setCurrentPlan(plan);
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
      isPopular: false,
      isActive: true
    });
    setIsDialogOpen(true);
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
              {plans.map((plan) => (
                <TableRow key={plan._id}>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-bold">{plan.ten}</span>
                        {plan.isPopular && <Badge variant="default" className="w-fit text-[10px] scale-90 -translate-x-1 uppercase">Phổ biến</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {plan.gia.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell>{plan.thoiGian} tháng</TableCell>
                  <TableCell>
                    {plan.maxPhong === -1 ? 'Không giới hạn' : `${plan.maxPhong} phòng`}
                  </TableCell>
                  <TableCell>
                    {plan.isActive ? (
                        <div className="flex items-center text-emerald-600 gap-1 text-sm font-medium">
                             <CheckCircle2 className="h-4 w-4" /> Hiển thị
                        </div>
                    ) : (
                        <div className="flex items-center text-red-500 gap-1 text-sm font-medium">
                             <XCircle className="h-4 w-4" /> Ẩn
                        </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
          <div className="grid gap-4 py-4">
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
            <div className="flex items-center justify-between space-x-2 p-2 bg-muted/30 rounded-lg">
                <div className="flex flex-col gap-0.5">
                    <Label className="text-sm font-bold">Gói phổ biến</Label>
                    <span className="text-[10px] text-muted-foreground uppercase">Gắn nhãn RECOMMENDED</span>
                </div>
                <Switch 
                   checked={currentPlan.isPopular}
                   onCheckedChange={(val) => setCurrentPlan({...currentPlan, isPopular: val})}
                />
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
