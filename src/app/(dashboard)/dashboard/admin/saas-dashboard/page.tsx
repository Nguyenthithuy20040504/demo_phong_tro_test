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
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  ArrowUpRight, 
  Award,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils'; // Giả sử có hàm này, nếu không sẽ tự format

export default function SaasDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/saas/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (!stats) return <div>Lỗi tải dữ liệu</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin (SaaS)</h1>
        <p className="text-muted-foreground">Thống kê doanh thu và quản lý khách hàng SaaS.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.totalRevenue || 0).toLocaleString('vi-VN')} đ</div>
            <p className="text-xs text-muted-foreground">
              +20.1% so với tháng trước
            </p>
          </CardContent>
        </Card>
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chủ nhà Hoạt động</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeLandlords} / {stats.totalLandlords}</div>
            <p className="text-xs text-muted-foreground">
              Tỉ lệ hoạt động: {Math.round((stats.activeLandlords / stats.totalLandlords) * 100)}%
            </p>
          </CardContent>
        </Card>
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hóa đơn mới</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.recentPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Giao dịch trong tuần này
            </p>
          </CardContent>
        </Card>
        <Card className="premium-card text-orange-600 bg-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sắp hết hạn</CardTitle>
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon.length}</div>
            <p className="text-xs font-medium">Cần nhắc gia hạn</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 premium-card">
          <CardHeader>
            <CardTitle>Biểu đồ Doanh thu</CardTitle>
            <CardDescription>Thống kê tiền bán phần mềm 12 tháng gần nhất.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlyRevenue}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000000}M`} />
                  <Tooltip 
                    formatter={(value) => [`${(Number(value)).toLocaleString('vi-VN')} đ`, 'Doanh thu']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 premium-card">
          <CardHeader>
            <CardTitle>Tài khoản sắp hết hạn</CardTitle>
            <CardDescription>Danh sách chủ trọ hết hạn trong 7 ngày tới.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {stats.expiringSoon.map((user: any) => (
                 <div key={user._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="text-right">
                        <Badge variant="outline" className="text-orange-600 bg-orange-50 border-orange-200">
                             {new Date(user.ngayHetHan).toLocaleDateString('vi-VN')}
                        </Badge>
                    </div>
                 </div>
               ))}
               {stats.expiringSoon.length === 0 && (
                 <p className="text-center text-muted-foreground py-4">Không có tài khoản nào sắp hết hạn.</p>
               )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-7 premium-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Giao dịch gần đây</CardTitle>
              <CardDescription>Lịch sử nộp tiền mua gói của các Chủ trọ.</CardDescription>
            </div>
            <Badge variant="secondary" className="cursor-pointer">Xem tất cả</Badge>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-full w-full">
              <div className="space-y-4">
                {stats.recentPayments.map((payment: any) => (
                  <div key={payment._id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-full">
                            <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">{payment.chuNha?.name || 'Chủ trọ ẩn danh'}</p>
                            <p className="text-xs text-muted-foreground">{new Date(payment.ngayThanhToan).toLocaleString('vi-VN')}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">+{payment.soTien.toLocaleString('vi-VN')} đ</p>
                        <Badge variant="outline" className="text-[10px] uppercase">{payment.trangThai === 'daThanhToan' ? 'Thành công' : 'Chờ duyệt'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
