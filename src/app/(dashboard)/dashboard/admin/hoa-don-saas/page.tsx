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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Receipt, Search, Filter, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SaaSInvoicesPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/saas/payments');
      const data = await res.json();
      setPayments(data);
    } catch (error) {
      toast.error('Lỗi khi tải lịch sử hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => 
    (p.chuNha?.name || p.chuNha?.ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.chuNha?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Hóa đơn Gia hạn SaaS</h1>
        <p className="text-muted-foreground">Theo dõi lịch sử nộp tiền mua gói của các Chủ trọ.</p>
      </div>

      <div className="flex items-center gap-4 justify-between bg-background/50 p-2 rounded-lg border">
         <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên hoặc email chủ trọ..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> Lọc
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
                <Receipt className="h-4 w-4" /> Xuất báo cáo
            </Button>
         </div>
      </div>

      <Card className="premium-card">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chủ nhà</TableHead>
                <TableHead>Gói cước</TableHead>
                <TableHead>Ngày thanh toán</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Phương thức</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hết hạn mới</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold">{payment.chuNha?.name || payment.chuNha?.ten || 'Chủ trọ ẩn danh'}</span>
                        <span className="text-xs text-muted-foreground">{payment.chuNha?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{payment.goiDichVu?.ten || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(payment.ngayThanhToan).toLocaleDateString('vi-VN')}
                  </TableCell>
                  <TableCell className="font-bold text-emerald-600">
                    {payment.soTien.toLocaleString('vi-VN')} đ
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ArrowUpRight className="h-3 w-3" />
                        {payment.phuongThuc === 'chuyenKhoan' ? 'Chuyển khoản' : payment.phuongThuc === 'tienMat' ? 'Tiền mặt' : 'Ví điện tử'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={payment.trangThai === 'daThanhToan' ? 'default' : 'secondary'}
                      className={payment.trangThai === 'daThanhToan' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                    >
                      {payment.trangThai === 'daThanhToan' ? 'Thành công' : 'Chờ duyệt'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 font-medium">
                        {new Date(payment.ngayHetHanMoi).toLocaleDateString('vi-VN')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPayments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Không có lịch sử giao dịch nào được tìm thấy.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
