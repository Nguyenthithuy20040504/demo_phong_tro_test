'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  RefreshCcw,
  AlertCircle,
  Wrench,
  DollarSign,
  Home,
  MessageSquare,
  Lightbulb,
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ─── Donut Tooltip ────────────────────────────────────────────────────────────
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <span className="font-semibold text-gray-800">{name}: {value}</span>
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function RoomStatusDonut({ stats }: { stats: DashboardStats }) {
  const total = stats.tongSoPhong || 1;
  const data = [
    { name: 'Đang thuê', value: stats.phongDangThue, color: '#10B981' },
    { name: 'Đang trống', value: stats.phongTrong, color: '#D1D5DB' },
    { name: 'Đang bảo trì', value: stats.phongBaoTri, color: '#FB923C' },
  ];

  return (
    <div className="flex flex-col items-center h-full select-none">
      <div className="relative w-full h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive
              animationDuration={700}
              label={({ cx, cy, midAngle, outerRadius: or, percent, name, color }: any) => {
                const pct = Math.round(percent * 100);
                if (pct === 0) return null;
                const RADIAN = Math.PI / 180;
                const sx = cx + or * Math.cos(-midAngle * RADIAN);
                const sy = cy + or * Math.sin(-midAngle * RADIAN);
                const labelR = or + 24;
                const ex = cx + labelR * Math.cos(-midAngle * RADIAN);
                const ey = cy + labelR * Math.sin(-midAngle * RADIAN);
                const isRight = ex > cx;
                const tailX = isRight ? ex + 10 : ex - 10;
                return (
                  <g>
                    <path d={`M${sx},${sy} L${ex},${ey} L${tailX},${ey}`} stroke={color} strokeWidth={1.5} fill="none" />
                    <text
                      x={tailX + (isRight ? 4 : -4)}
                      y={ey}
                      fill={color}
                      fontSize={11}
                      fontWeight={600}
                      textAnchor={isRight ? 'start' : 'end'}
                      dominantBaseline="central"
                    >
                      {name.split(' ').slice(-1)[0]}: {pct}%
                    </text>
                  </g>
                );
              }}
              labelLine={false}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="space-y-2 w-full mt-1">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-gray-800">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bar Chart Tooltip ────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
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

function formatYAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}tr`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return `${value}`;
}

// ─── Period options ───────────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { value: '3_months', label: '3 tháng gần nhất' },
  { value: '6_months', label: '6 tháng gần nhất' },
  { value: '12_months', label: '12 tháng gần nhất' },
  { value: 'from_year_start', label: 'Từ đầu năm' },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toaNhaList, setToaNhaList] = useState<ToaNha[]>([]);
  const [selectedToaNha, setSelectedToaNha] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('6_months');

  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedToaNha !== 'all') params.append('toaNhaId', selectedToaNha);

      let start = '';
      const end = now.toISOString().split('T')[0];

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
      params.append('endDate', end);

      const res = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success) setStats(result.data);
      }
    } catch {
      toast.error('Lỗi khi tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedToaNha, timeRange]);

  useEffect(() => {
    document.title = 'Dashboard | SmartStay';
    fetch('/api/toa-nha?limit=100')
      .then((r) => r.json())
      .then((r) => { if (r.success) setToaNhaList(r.data); })
      .catch(() => {});

    // Handle plan selection from registration
    const planKey = searchParams.get('plan');
    if (planKey && ['basic', 'professional'].includes(planKey) && status === 'authenticated') {
      const handlePlan = async () => {
        try {
          const currentPlan = (session?.user as any)?.goiDichVu;
          const ngayHetHan = (session?.user as any)?.ngayHetHan;
          const isExpired = ngayHetHan ? new Date(ngayHetHan) < new Date() : true;
          if ((currentPlan === 'professional' && !isExpired) || (currentPlan === planKey && !isExpired)) {
            toast.success('Chào mừng quay lại! Bạn đang sử dụng ' + (currentPlan === 'professional' ? 'Gói Chuyên Nghiệp' : 'Gói Cơ Bản') + '.');
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
            const resPayment = await fetch('/api/user/subscription/payos/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planId: targetPlan._id }),
            });
            if (resPayment.ok) {
              const data = await resPayment.json();
              if (data.checkoutUrl) window.location.href = data.checkoutUrl;
            } else {
              toast.error('Không thể tạo liên kết thanh toán. Vui lòng thử lại sau.');
            }
          }
        } catch { }
      };
      handlePlan();
    }
  }, [searchParams, status]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';

  const buildingLabel = useMemo(() => {
    if (selectedToaNha === 'all') return 'Tất cả tòa nhà';
    return toaNhaList.find((t) => t._id === selectedToaNha)?.tenToaNha || '';
  }, [selectedToaNha, toaNhaList]);

  const periodLabel = useMemo(() => {
    return PERIOD_OPTIONS.find((p) => p.value === timeRange)?.label ?? '6 tháng gần nhất';
  }, [timeRange]);

  const occupancyRate = stats
    ? (stats.tongSoPhong > 0 ? Math.round((stats.phongDangThue / stats.tongSoPhong) * 100) : 0)
    : 0;

  // ─── Loading ─────────────────────────────────────────────────────────────────
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
    <div className="space-y-5 pb-10">
      {/* ── Sub-header: title + selectors ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Dashboard tổng quan
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tháng {currentMonth}, {currentYear} • {buildingLabel}
          </p>
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Building selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-teal-300 hover:text-teal-700 transition-colors shadow-sm">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="max-w-[160px] truncate">{buildingLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl border border-gray-100 bg-white p-1">
              <DropdownMenuItem
                onClick={() => setSelectedToaNha('all')}
                className={cn('px-3 py-2 rounded-lg text-sm cursor-pointer', selectedToaNha === 'all' ? 'bg-teal-50 text-teal-700 font-semibold' : '')}
              >
                Tất cả tòa nhà
              </DropdownMenuItem>
              {toaNhaList.map((t) => (
                <DropdownMenuItem
                  key={t._id}
                  onClick={() => setSelectedToaNha(t._id!)}
                  className={cn('px-3 py-2 rounded-lg text-sm cursor-pointer', selectedToaNha === t._id ? 'bg-teal-50 text-teal-700 font-semibold' : '')}
                >
                  {t.tenToaNha}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Period selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:border-teal-300 hover:text-teal-700 transition-colors shadow-sm">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <span>{periodLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 text-gray-400 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border border-gray-100 bg-white p-1">
              {PERIOD_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => setTimeRange(opt.value)}
                  className={cn('px-3 py-2 rounded-lg text-sm cursor-pointer', timeRange === opt.value ? 'bg-teal-50 text-teal-700 font-semibold' : '')}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh */}
          <button
            onClick={fetchStats}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-teal-300 hover:text-teal-600 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {stats && (
        <>
          {/* ── 4 KPI Cards ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Doanh thu */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden hover:shadow-md transition-shadow">
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

            {/* Card 2: Nợ chưa thu */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden hover:shadow-md transition-shadow">
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
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden hover:shadow-md transition-shadow">
              <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-blue-500" />
              <div className="pl-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Home className="h-4 w-4 text-blue-500" />
                  <span>Tỉ lệ lấp đầy</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {occupancyRate}%
                </p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Home className="h-3.5 w-3.5" />
                  <span className="font-medium">{stats.phongDangThue}/{stats.tongSoPhong} phòng</span>
                </div>
              </div>
            </div>

            {/* Card 4: Sự cố */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 relative overflow-hidden hover:shadow-md transition-shadow">
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

          {/* ── Charts ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bar chart (2/3) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="mb-5">
                <h2 className="text-base font-bold text-gray-900">
                  Doanh thu &amp; Công nợ {periodLabel.toLowerCase()}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Biểu đồ so sánh tiền đã thu và tiền khách còn nợ
                </p>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.doanhThuVaCongNo6Thang || []}
                    margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                    barCategoryGap="25%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatYAxis}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      width={55}
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Legend iconType="square" iconSize={10} wrapperStyle={{ paddingTop: 14, fontSize: 13 }} />
                    <Bar dataKey="daThu" name="Tiền đã thu" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="conNo" name="Tiền còn nợ" fill="#FB923C" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut chart (1/3) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-900">Trạng thái phòng</h2>
                <p className="text-sm text-gray-500 mt-0.5">Tỉ trọng phòng theo trạng thái</p>
              </div>
              <RoomStatusDonut stats={stats} />
            </div>
          </div>

          {/* ── Tables ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hóa đơn quá hạn */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <h2 className="text-sm font-bold text-red-600">Hóa đơn quá hạn</h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 ml-7">Top 5 khách nợ tiền lâu nhất</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Khách hàng</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phòng</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Số tiền</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quá hạn</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.hoaDonQuaHanList?.length ? (
                      stats.hoaDonQuaHanList.map((item) => (
                        <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-5 font-medium text-gray-800">{item.tenKhach}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                              {item.maPhong}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-red-600">{formatCurrency(item.soTien)}</td>
                          <td className="py-3 px-3 text-red-500 font-medium">{item.soNgayQuaHan} ngày</td>
                          <td className="py-3 px-3">
                            <ZaloButton tenKhach={item.tenKhach} soTien={item.soTien} maPhong={item.maPhong} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">
                          🎉 Không có hóa đơn quá hạn
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hợp đồng sắp hết hạn */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <h2 className="text-sm font-bold text-orange-600">Hợp đồng sắp hết hạn</h2>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 ml-7">Trong vòng 15-30 ngày tới</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Khách hàng</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phòng</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ngày hết hạn</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Còn lại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.hopDongSapHetHanList?.length ? (
                      stats.hopDongSapHetHanList.map((item) => (
                        <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                          <td className="py-3 px-5 font-medium text-gray-800">{item.tenKhach}</td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-semibold text-gray-600">
                              {item.maPhong}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-600">{item.ngayHetHan}</td>
                          <td className="py-3 px-3">
                            <span className={cn('font-semibold', item.soNgayConLai <= 15 ? 'text-red-500' : 'text-orange-500')}>
                              {item.soNgayConLai} ngày
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-gray-400 text-sm">
                          Không có hợp đồng sắp hết hạn
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {(stats.hopDongSapHetHanList?.length ?? 0) > 0 && (
                <div className="mx-5 mb-5 mt-3 p-3.5 bg-amber-50 rounded-xl border border-amber-100">
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

// ─── Zalo reminder button ─────────────────────────────────────────────────────
function ZaloButton({ tenKhach, soTien, maPhong }: { tenKhach: string; soTien: number; maPhong: string }) {
  const handleClick = () => {
    const msg = `Xin chào ${tenKhach}, bạn đang có hóa đơn phòng ${maPhong} chưa thanh toán với số tiền ${new Intl.NumberFormat('vi-VN').format(soTien)} ₫. Vui lòng thanh toán sớm. Xin cảm ơn!`;
    const url = `https://zalo.me/vi/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all"
    >
      <MessageSquare className="h-3 w-3" />
      Nhắc nợ Zalo
    </button>
  );
}
