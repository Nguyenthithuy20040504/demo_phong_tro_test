'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
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
  TriangleAlert,
  Wrench,
  DollarSign,
  Users,
  Home,
  Filter,
  MessageSquare,
  Lightbulb,
  Zap,
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
  const [selectedToaNha, setSelectedToaNha] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selected_building_id') || 'all';
    }
    return 'all';
  });
  const [timeRange, setTimeRange] = useState<string>('6_months');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const fetchStats = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoading(true);
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
        if (result.success) {
          setStats(result.data);
          // Save to persistent cache for instant next load
          localStorage.setItem('dashboard_stats_cache', JSON.stringify({
            data: result.data,
            timestamp: Date.now()
          }));
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Lỗi khi tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, [selectedToaNha, timeRange]);

  const fetchToaNha = useCallback(async () => {
    try {
      const response = await fetch('/api/toa-nha?limit=100');
      if (response.ok) {
        const result = await response.json();
        if (result.success) setToaNhaList(result.data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    // 0. Load from local cache for instant paint
    const cached = typeof window !== 'undefined' ? localStorage.getItem('dashboard_stats_cache') : null;
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        setStats(data);
      } catch (e) {
        // ignore
      }
    }

    try {
      // 1. Fetch buildings (Required for building filter labels)
      await fetchToaNha();
    } catch (error) {
      console.error('Error fetching initial dashboard data:', error);
    } finally {
      // stats are handled by useEffect[selectedToaNha]
    }
  }, [fetchToaNha]);

  useEffect(() => {
    document.title = 'Dashboard | SmartStay';
    fetchInitialData();
  }, [fetchInitialData]);

  // Global Building Sync (listen to TopNavbar)
  useEffect(() => {
    const handleSyncBuilding = () => {
      const globalId = localStorage.getItem('selected_building_id') || 'all';
      if (globalId !== selectedToaNha) {
        setSelectedToaNha(globalId);
        // fetchStats is called by useEffect [selectedToaNha] dependency indirectly if we use one
      }
    };
    window.addEventListener('buildingChange', handleSyncBuilding);
    return () => window.removeEventListener('buildingChange', handleSyncBuilding);
  }, [selectedToaNha]);

  // When local filter changes, sync to global
  const handleLocalBuildingChange = (val: string) => {
    setSelectedToaNha(val);
    localStorage.setItem('selected_building_id', val);
    // Dispatch event so TopNavbar can sync if it doesn't reload
    window.dispatchEvent(new Event('buildingChange'));
  };

  // Trigger refetch when selectedToaNha or timeRange changes
  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [selectedToaNha, timeRange, status, fetchStats]);

  // Restore Plan Selection Logic
  useEffect(() => {
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
  }, [searchParams, status, session]);

  useEffect(() => {
    // Initial sync with TopNavbar choice
    const saved = typeof window !== 'undefined' ? localStorage.getItem('selected_building_id') || 'all' : 'all';
    setSelectedToaNha(saved);
    fetchStats();
  }, []);

  // Global Building Sync
  useEffect(() => {
    const handleSyncBuilding = () => {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('selected_building_id') || 'all' : 'all';
      setSelectedToaNha(saved);
      fetchStats();
    };
    window.addEventListener('buildingChange', handleSyncBuilding);
    return () => window.removeEventListener('buildingChange', handleSyncBuilding);
  }, []);

  useEffect(() => {
    // Re-fetch stats khi bộ lọc THỜI GIAN thay đổi (selectedToaNha đã handle ở sync effect)
    if (!loading && timeRange !== '6_months') {
      fetchStats();
    }
  }, [timeRange]);

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
      {/* ===== HEADER SECTION ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 md:gap-4 mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard tổng quan</h1>
          <p className="text-xs md:text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
            <CalendarIcon className="h-3.5 md:h-4 w-3.5 md:w-4 opacity-70" />
            Báo cáo vận hành tháng {currentMonth}, {currentYear}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-teal-600 bg-teal-50 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full border border-teal-100 uppercase tracking-wider w-fit">
           <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-teal-500 animate-pulse" />
           Dữ liệu thời gian thực
        </div>
      </div>

      {/* ===== FILTERS BAR ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 bg-white p-1.5 rounded-xl md:rounded-2xl border border-gray-100 shadow-sm mb-4 md:mb-8">
        <div className="flex flex-wrap items-center gap-2 p-1.5">
          <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest border-r border-gray-100 mr-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Bộ lọc</span>
          </div>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] md:w-[160px] h-9 md:h-10 rounded-xl border-none bg-gray-50 hover:bg-gray-100 transition-colors text-xs md:text-sm font-semibold shadow-none focus:ring-0">
              <div className="flex items-center gap-2 text-gray-700">
                <CalendarIcon className="h-4 w-4 text-teal-600" />
                <SelectValue placeholder="Khoảng thời gian" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-100 shadow-xl">
              <SelectItem value="3_months" className="text-xs font-semibold py-2.5">3 tháng gần nhất</SelectItem>
              <SelectItem value="6_months" className="text-xs font-semibold py-2.5">6 tháng gần nhất</SelectItem>
              <SelectItem value="12_months" className="text-xs font-semibold py-2.5">12 tháng gần nhất</SelectItem>
              <SelectItem value="from_year_start" className="text-xs font-semibold py-2.5">Từ đầu năm</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={() => fetchStats()}
            disabled={loading}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 border border-transparent hover:border-teal-200 hover:bg-teal-50 text-gray-500 hover:text-teal-600 transition-all disabled:opacity-50 active:scale-95 shadow-none"
            title="Làm mới dữ liệu"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="px-5 py-2 sm:py-0 border-t sm:border-t-0 sm:border-l border-gray-50 flex items-center">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mr-3">Đang xem:</p>
          <div className="px-3 py-1 bg-teal-600 text-white text-[11px] font-bold rounded-lg shadow-sm">
            {buildingLabel}
          </div>
        </div>
      </div>

      {stats && (
        <>
          {/* ===== 4 SUMMARY CARDS ===== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {/* Card 1: Tổng doanh thu */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#14b8a6]" />
              <div className="p-3 md:p-6">
                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-medium text-gray-500 mb-2 md:mb-4">
                  <div className="p-1.5 md:p-2 bg-teal-50 rounded-lg text-teal-600 group-hover:scale-110 transition-transform">
                    <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                  <span>Tổng doanh thu {monthNames[currentMonth]}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-lg md:text-3xl font-bold text-gray-900 tracking-tight leading-none mb-1 md:mb-2">
                    {formatCurrency(stats.doanhThuThang)}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs">
                    {(stats.tyLeThayDoiDoanhThu ?? 0) >= 0 ? (
                      <div className="flex items-center px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        <span>Tăng {stats.tyLeThayDoiDoanhThu}% so với tháng trước</span>
                      </div>
                    ) : (
                      <div className="flex items-center px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-bold border border-red-100">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        <span>Giảm {Math.abs(stats.tyLeThayDoiDoanhThu ?? 0)}% so với tháng trước</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Tổng nợ chưa thu */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ef4444]" />
              <div className="p-3 md:p-6">
                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-medium text-gray-500 mb-2 md:mb-4">
                  <div className="p-1.5 md:p-2 bg-red-50 rounded-lg text-red-600 group-hover:scale-110 transition-transform">
                    <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                  <span>Tổng nợ chưa thu</span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-lg md:text-3xl font-bold text-red-600 tracking-tight leading-none mb-1 md:mb-2">
                    {formatCurrency(stats.tongNoKhongThu ?? 0)}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 font-bold border border-orange-100 w-fit">
                    <TriangleAlert className="h-3 w-3 mr-1" />
                    <span>{stats.soHoaDonQuaHan ?? 0} hóa đơn quá hạn</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Tỉ lệ lấp đầy */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#3b82f6]" />
              <div className="p-3 md:p-6">
                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-medium text-gray-500 mb-2 md:mb-4">
                  <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                    <Home className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                  <span>Tỉ lệ lấp đầy</span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-lg md:text-3xl font-bold text-gray-900 tracking-tight leading-none mb-1 md:mb-2">
                    {stats.tongSoPhong > 0 ? Math.round((stats.phongDangThue / stats.tongSoPhong) * 100) : 0}%
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <Users className="h-3.5 w-3.5" />
                    <span>{stats.phongDangThue}/{stats.tongSoPhong} phòng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Sự cố chờ xử lý */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-300">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#fb923c]" />
              <div className="p-3 md:p-6">
                <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm font-medium text-gray-500 mb-2 md:mb-4">
                  <div className="p-1.5 md:p-2 bg-orange-50 rounded-lg text-orange-600 group-hover:scale-110 transition-transform">
                    <Wrench className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </div>
                  <span>Sự cố chờ xử lý</span>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-lg md:text-3xl font-bold text-orange-600 tracking-tight leading-none mb-1 md:mb-2">
                    {stats.suCoCanXuLy}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 px-1.5 py-0.5 rounded-full bg-rose-50 font-bold border border-rose-100 w-fit">
                    <Zap className="h-3 w-3 mr-1" />
                    <span>Sự cố mới</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CHARTS SECTION ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
            {/* Bar Chart - Revenue vs Debt (2/3 width) */}
            <div className="lg:col-span-2 bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
              <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold text-gray-900">
                  Doanh thu & Công nợ {timeRange === '3_months' ? '3 tháng gần nhất' : timeRange === '12_months' ? '12 tháng gần nhất' : timeRange === 'from_year_start' ? 'từ đầu năm' : '6 tháng gần nhất'}
                </h2>
                <p className="text-xs md:text-sm text-gray-500">Biểu đồ so sánh tiền đã thu và tiền khách còn nợ</p>
              </div>
              <div className="h-[220px] md:h-[300px]">
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
                      fill="#0d9488"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                      animationDuration={1000}
                    />
                    <Bar
                      dataKey="conNo"
                      name="Tiền còn nợ"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                      animationDuration={1000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donut Chart - Room Status (1/3 width) */}
            <div className="bg-white rounded-xl md:rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 pb-6 md:pb-8">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">Trạng thái phòng</h2>
                <p className="text-sm text-gray-500">Tỉ trọng phòng theo trạng thái</p>
              </div>
              <RoomStatusDonut stats={stats} />
            </div>
          </div>

          {/* ===== TABLES SECTION ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 pb-8">
            {/* Hóa đơn quá hạn */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base text-gray-900 leading-tight">Hóa đơn quá hạn</h2>
                      <p className="text-xs text-gray-500 font-normal mt-0.5">Top 10 khách nợ tiền lâu nhất</p>
                    </div>
                  </div>
                  <Link href="/dashboard/hoa-don" className="text-xs text-teal-600 hover:text-teal-700 font-semibold p-1 hover:bg-teal-50 rounded transition-colors">
                    Xem tất cả
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-500 border-b border-gray-100">
                      <th className="text-left py-3 px-6 text-[11px] font-bold uppercase tracking-widest">Khách hàng</th>
                      <th className="text-left py-3 px-3 text-[11px] font-bold uppercase tracking-widest">Phòng</th>
                      <th className="text-left py-3 px-3 text-[11px] font-bold uppercase tracking-widest">Số tiền</th>
                      <th className="text-left py-3 px-3 text-[11px] font-bold uppercase tracking-widest">Quá hạn</th>
                      <th className="text-right py-3 px-6 text-[11px] font-bold uppercase tracking-widest">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(stats.hoaDonQuaHanList && stats.hoaDonQuaHanList.length > 0) ? (
                      stats.hoaDonQuaHanList.map((item) => (
                        <tr key={item._id} className="hover:bg-teal-50/20 transition-colors group">
                          <td className="py-4 px-6">
                            <span className="font-semibold text-gray-800">{item.tenKhach}</span>
                          </td>
                          <td className="py-4 px-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                              {item.maPhong}
                            </span>
                          </td>
                          <td className="py-4 px-3 font-bold text-red-600 font-mono tracking-tight">{formatCurrency(item.soTien)}</td>
                          <td className="py-4 px-3">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-red-600 font-bold border border-rose-100">
                              {item.soNgayQuaHan} ngày
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700 transition-all shadow-sm active:scale-95">
                              <MessageSquare className="h-3 w-3" />
                              Nhắc nợ
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-400 text-sm italic">
                          <div className="flex flex-col items-center gap-2">
                             <span className="text-2xl">🎉</span>
                             <span>Tuyệt vời! Không có hóa đơn quá hạn</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Hợp đồng sắp hết hạn */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                      <TriangleAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base text-gray-900 leading-tight">Hợp đồng sắp hết hạn</h2>
                      <p className="text-xs text-gray-500 font-normal mt-0.5">Trong vòng 30 ngày tới</p>
                    </div>
                  </div>
                  <Link href="/dashboard/hop-dong" className="text-xs text-teal-600 hover:text-teal-700 font-semibold p-1 hover:bg-teal-50 rounded transition-colors">
                    Xem tất cả
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 text-gray-500 border-b border-gray-100">
                      <th className="text-left py-3 px-6 text-[11px] font-bold uppercase tracking-widest">Khách hàng</th>
                      <th className="text-left py-3 px-3 text-[11px] font-bold uppercase tracking-widest">Phòng</th>
                      <th className="text-left py-3 px-3 text-[11px] font-bold uppercase tracking-widest">Ngày hết hạn</th>
                      <th className="text-right py-3 px-6 text-[11px] font-bold uppercase tracking-widest">Thời gian còn lại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(stats.hopDongSapHetHanList && stats.hopDongSapHetHanList.length > 0) ? (
                      stats.hopDongSapHetHanList.map((item) => (
                        <tr key={item._id} className="hover:bg-teal-50/20 transition-colors group">
                          <td className="py-4 px-6">
                            <span className="font-semibold text-gray-800">{item.tenKhach}</span>
                          </td>
                          <td className="py-4 px-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-[11px] font-bold text-gray-600 uppercase border border-gray-200">
                              {item.maPhong}
                            </span>
                          </td>
                          <td className="py-4 px-3 text-gray-600 font-medium">{item.ngayHetHan}</td>
                          <td className="py-4 px-6 text-right">
                             <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 text-amber-700 text-xs font-bold">
                                {item.soNgayConLai} ngày
                             </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400 text-sm italic">
                           <div className="flex flex-col items-center gap-2">
                             <span className="text-2xl">📋</span>
                             <span>Hiện không có hợp đồng sắp hết hạn</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Advice note */}
              {(stats.hopDongSapHetHanList && stats.hopDongSapHetHanList.length > 0) && (
                <div className="p-5 mt-auto">
                  <div className="p-4 bg-teal-900 text-white rounded-xl shadow-lg relative overflow-hidden group">
                    <div className="absolute -right-4 -bottom-4 bg-white/10 rounded-full h-24 w-24 translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500" />
                    <div className="flex items-start gap-3 relative z-10">
                      <div className="bg-primary/20 p-2 rounded-lg">
                        <Lightbulb className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Gợi ý vận hành</p>
                        <p className="text-xs leading-relaxed opacity-90">
                          Liên hệ khách hàng trước 15 ngày để gia hạn hoặc tìm khách mới, tránh phòng bị bỏ trống gây thất thoát doanh thu.
                        </p>
                      </div>
                    </div>
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
