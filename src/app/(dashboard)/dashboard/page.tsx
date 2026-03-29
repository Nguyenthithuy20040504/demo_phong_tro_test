'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  RefreshCcw,
  AlertCircle,
  Wrench,
  DollarSign,
  Users,
  Home,
  Filter,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';
import { DashboardStats, ToaNha } from '@/types';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ===== Donut Tooltip =====
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <span className="font-semibold text-gray-800">{name} : {value}</span>
    </div>
  );
}

// ===== Custom label on pie segments =====
function renderDonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const pct = Math.round(percent * 100);
  if (pct === 0) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#6b7280"
      fontSize={11}
      fontWeight={500}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
    >
      {name.length > 6 ? name.slice(0, 6) + '…' : name}: {pct}%
    </text>
  );
}

// ===== Donut Chart Component =====
function RoomStatusDonut({ stats }: { stats: DashboardStats }) {
  const total = stats.tongSoPhong || 1;
  const data = [
    { name: 'Đang thuê', shortLabel: 'Thuê', value: stats.phongDangThue, color: '#34D399' },
    { name: 'Đang trống', shortLabel: 'Trống', value: stats.phongTrong, color: '#9CA3AF' },
    { name: 'Đang bảo trì', shortLabel: 'Bảo trì', value: stats.phongBaoTri, color: '#FB923C' },
  ];

  return (
    <div className="flex flex-col items-center h-full select-none">
      {/* Donut Chart */}
      <div className="relative w-full h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={true}
              animationDuration={600}
              label={({ cx, cy, midAngle, outerRadius: or, percent, shortLabel, color }: any) => {
                const pct = Math.round(percent * 100);
                if (pct === 0) return null;
                const RADIAN = Math.PI / 180;
                // Line start point (on pie edge)
                const sx = cx + or * Math.cos(-midAngle * RADIAN);
                const sy = cy + or * Math.sin(-midAngle * RADIAN);
                // Line end / label position
                const labelR = or + 24;
                const ex = cx + labelR * Math.cos(-midAngle * RADIAN);
                const ey = cy + labelR * Math.sin(-midAngle * RADIAN);
                // Horizontal tail
                const isRight = ex > cx;
                const tailX = isRight ? ex + 14 : ex - 14;
                return (
                  <g>
                    {/* Connector line */}
                    <path
                      d={`M${sx},${sy} L${ex},${ey} L${tailX},${ey}`}
                      stroke={color}
                      strokeWidth={1.5}
                      fill="none"
                    />
                    {/* Label text */}
                    <text
                      x={tailX + (isRight ? 4 : -4)}
                      y={ey}
                      fill={color}
                      fontSize={12}
                      fontWeight={600}
                      textAnchor={isRight ? 'start' : 'end'}
                      dominantBaseline="central"
                    >
                      {shortLabel}: {pct}%
                    </text>
                  </g>
                );
              }}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-2.5 w-full mt-2">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-700">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-gray-800">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== Revenue Tooltip =====
function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-bold text-gray-800">
            {new Intl.NumberFormat('vi-VN').format(p.value)} ₫
          </span>
        </div>
      ))}
    </div>
  );
}

// ===== Format Y axis =====
function formatYAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value} ₫`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);

  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  // Filters
  const [selectedToaNha, setSelectedToaNha] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('6_months');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedToaNha !== 'all') params.append('toaNhaId', selectedToaNha);

      const now = new Date();
      let start = '';
      let end = now.toISOString().split('T')[0];

      if (timeRange === '3_months') {
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0];
      } else if (timeRange === '6_months') {
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
      } else if (timeRange === '12_months') {
        start = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().split('T')[0];
      } else if (timeRange === 'from_year_start') {
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      }

      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) setStats(result.data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi khi tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedToaNha, timeRange]);

  const fetchToaNha = async () => {
    try {
      const response = await fetch('/api/toa-nha?limit=100');
      if (response.ok) {
        const result = await response.json();
        if (result.success) setToaNhaList(result.data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  useEffect(() => {
    document.title = 'Dashboard | SmartStay';
    fetchToaNha();

    // Check for plan selection from registration
    const planKey = searchParams.get('plan');
    if (planKey && ['basic', 'professional'].includes(planKey) && status === 'authenticated') {
      const handleSelectedPlan = async () => {
        try {
          const currentPlan = (session?.user as any)?.goiDichVu;
          const ngayHetHan = (session?.user as any)?.ngayHetHan;
          const isExpired = ngayHetHan ? new Date(ngayHetHan) < new Date() : true;

          if (
            (currentPlan === 'professional' && !isExpired) ||
            (currentPlan === planKey && !isExpired)
          ) {
            toast.success('Chào mừng quay lại! Bạn đang sử dụng ' +
              (currentPlan === 'professional' ? 'Gói Chuyên Nghiệp' : 'Gói Cơ Bản') + '.');
            return;
          }

          const resPlans = await fetch('/api/admin/saas/plans');
          if (!resPlans.ok) return;
          const allPlans = await resPlans.json();

          const targetPlan = allPlans.find((p: any) =>
            (planKey === 'basic' && (p.ten.toLowerCase().includes('cơ bản') || p.ten.toLowerCase().includes('basic'))) ||
            (planKey === 'professional' && (p.ten.toLowerCase().includes('chuyên nghiệp') || p.ten.toLowerCase().includes('professional')))
          );

          if (targetPlan) {
            toast.loading('Đang khởi tạo thanh toán cho ' + targetPlan.ten + '...');
            const resPayment = await fetch('/api/user/subscription/payos/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planId: targetPlan._id })
            });

            if (resPayment.ok) {
              const data = await resPayment.json();
              if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
              }
            } else {
              toast.error('Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.');
            }
          }
        } catch (error) {
          console.error('Error handling selected plan:', error);
        }
      };
      handleSelectedPlan();
    }
  }, [searchParams]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  // Building name for display
  const buildingLabel = useMemo(() => {
    if (selectedToaNha === 'all') return 'Tất cả tòa nhà';
    return toaNhaList.find(t => t._id === selectedToaNha)?.tenToaNha || '';
  }, [selectedToaNha, toaNhaList]);

  const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  // ===== LOADING STATE =====
  if (loading && !stats) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCcw className="h-8 w-8 animate-spin mx-auto text-teal-600" />
          <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 w-full">
      {/* ===== HEADER ===== */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Dashboard tổng quan
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {monthNames[currentMonth]}, {currentYear}
        </p>
      </div>

      {/* ===== FILTERS BAR ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
            <Filter className="h-4 w-4 text-gray-400" />
            <span>Bộ lọc:</span>
          </div>

          <Select value={selectedToaNha} onValueChange={setSelectedToaNha}>
            <SelectTrigger className="w-[200px] h-9 rounded-lg border-gray-200 text-sm">
              <Building2 className="mr-2 h-4 w-4 text-gray-400" />
              <SelectValue placeholder="Tất cả tòa nhà" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả tòa nhà</SelectItem>
              {toaNhaList.map((t) => (
                <SelectItem key={t._id} value={t._id!}>{t.tenToaNha}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px] h-9 rounded-lg border-gray-200 text-sm">
              <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
              <SelectValue placeholder="6 tháng gần nhất" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3_months">3 tháng gần nhất</SelectItem>
              <SelectItem value="6_months">6 tháng gần nhất</SelectItem>
              <SelectItem value="12_months">12 tháng gần nhất</SelectItem>
              <SelectItem value="from_year_start">Từ đầu năm</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={fetchStats}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Đang xem: <span className="font-semibold text-gray-800">{buildingLabel}</span>
        </p>
      </div>

      {stats && (
        <>
          {/* ===== 4 SUMMARY CARDS ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: Tổng doanh thu */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-teal-500" />
              <div className="pl-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <DollarSign className="h-4 w-4 text-teal-500" />
                  <span>Tổng doanh thu tháng {currentMonth}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {formatCurrency(stats.doanhThuThang)}
                </p>
                <div className="flex items-center gap-1.5 text-xs">
                  {(stats.tyLeThayDoiDoanhThu ?? 0) >= 0 ? (
                    <>
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-600 font-medium">
                        Tăng {stats.tyLeThayDoiDoanhThu}% so với tháng trước
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-red-600 font-medium">
                        Giảm {Math.abs(stats.tyLeThayDoiDoanhThu ?? 0)}% so với tháng trước
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Tổng nợ chưa thu */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-red-500" />
              <div className="pl-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>Tổng nợ chưa thu</span>
                </div>
                <p className="text-2xl font-bold text-red-600 mb-2">
                  {formatCurrency(stats.tongNoKhongThu ?? 0)}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-orange-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="font-medium">{stats.soHoaDonQuaHan ?? 0} hóa đơn quá hạn</span>
                </div>
              </div>
            </div>

            {/* Card 3: Tỉ lệ lấp đầy */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-blue-500" />
              <div className="pl-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Home className="h-4 w-4 text-blue-500" />
                  <span>Tỉ lệ lấp đầy</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {stats.tongSoPhong > 0 ? Math.round((stats.phongDangThue / stats.tongSoPhong) * 100) : 0}%
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-medium">{stats.phongDangThue}/{stats.tongSoPhong} phòng</span>
                </div>
              </div>
            </div>

            {/* Card 4: Sự cố chờ xử lý */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-orange-500" />
              <div className="pl-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Wrench className="h-4 w-4 text-orange-500" />
                  <span>Sự cố chờ xử lý</span>
                </div>
                <p className="text-2xl font-bold text-orange-600 mb-2">
                  {stats.suCoCanXuLy}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-orange-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="font-medium">Sự cố mới</span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CHARTS SECTION ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Bar Chart - Revenue vs Debt (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">Doanh thu & Công nợ 6 tháng gần nhất</h2>
                <p className="text-sm text-gray-500">Biểu đồ so sánh tiền đã thu và tiền khách còn nợ</p>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.doanhThuVaCongNo6Thang || []}
                    margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                    barGap={4}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatYAxis}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Legend
                      iconType="square"
                      iconSize={10}
                      wrapperStyle={{ paddingTop: 16, fontSize: 13 }}
                    />
                    <Bar
                      dataKey="daThu"
                      name="Tiền đã thu"
                      fill="#34D399"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="conNo"
                      name="Tiền còn nợ"
                      fill="#f97316"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart - Room Status (1/3 width) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 pb-8">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">Trạng thái phòng</h2>
                <p className="text-sm text-gray-500">Tỉ trọng phòng theo trạng thái</p>
              </div>
              <RoomStatusDonut stats={stats} />
            </div>
          </div>

          {/* ===== TABLES SECTION ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Hóa đơn quá hạn */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <h2 className="text-base font-bold text-red-600">Hóa đơn quá hạn</h2>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 ml-[30px]">Top 5 khách nợ tiền lâu nhất</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phòng</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Số tiền</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quá hạn</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.hoaDonQuaHanList && stats.hoaDonQuaHanList.length > 0) ? (
                      stats.hoaDonQuaHanList.map((item) => (
                        <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-medium text-gray-800">{item.tenKhach}</td>
                          <td className="py-3.5 px-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 text-xs font-semibold text-gray-700">
                              {item.maPhong}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-semibold text-red-600">{formatCurrency(item.soTien)}</td>
                          <td className="py-3.5 px-3 text-red-500 font-medium">{item.soNgayQuaHan} ngày</td>
                          <td className="py-3.5 px-3">
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all">
                              <MessageSquare className="h-3 w-3" />
                              Nhắc nợ Zalo
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400 text-sm italic">
                          Không có hóa đơn quá hạn 🎉
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hợp đồng sắp hết hạn */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <h2 className="text-base font-bold text-orange-600">Hợp đồng sắp hết hạn</h2>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 ml-[30px]">Trong vòng 15-30 ngày tới</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Khách hàng</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phòng</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ngày hết hạn</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Còn lại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats.hopDongSapHetHanList && stats.hopDongSapHetHanList.length > 0) ? (
                      stats.hopDongSapHetHanList.map((item) => (
                        <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-medium text-gray-800">{item.tenKhach}</td>
                          <td className="py-3.5 px-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 text-xs font-semibold text-gray-700">
                              {item.maPhong}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-gray-600">{item.ngayHetHan}</td>
                          <td className="py-3.5 px-3">
                            <span className="font-semibold text-orange-600">{item.soNgayConLai} ngày</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400 text-sm italic">
                          Không có hợp đồng sắp hết hạn
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Advice note */}
              {(stats.hopDongSapHetHanList && stats.hopDongSapHetHanList.length > 0) && (
                <div className="mx-5 mb-5 mt-2 p-3.5 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <span className="font-semibold">Lời khuyên:</span> Liên hệ khách hàng trước 15 ngày để gia hạn hoặc tìm khách mới, tránh phòng bị bỏ trống.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
