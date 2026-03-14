'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Building2, 
  DoorOpen, 
  TrendingUp,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight
} from 'lucide-react';
import { DashboardStats } from '@/types';

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "circOut" as any }
  }
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard | Quản lý phòng trọ';
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats');
        if (response.ok) {
          const result = await response.json();
          if (result.success) setStats(result.data);
        }
      } catch (error) {
        console.error('Error stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatVND = (val: number) => 
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!stats) return null;

  return (
    <motion.div 
      className="max-w-[1400px] mx-auto p-4 md:p-8 space-y-12"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Editorial Header */}
      <motion.header variants={itemVariants} className="space-y-2">
        <h1 className="text-fluid-2xl font-heading text-foreground tracking-tight">
          Hệ thống <span className="text-primary italic">Tổng quan</span>
        </h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground uppercase tracking-widest font-medium">
          <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span className="w-1 h-1 bg-border rounded-full" />
          <span>Real-time Insights</span>
        </div>
      </motion.header>

      {/* Hero Stats Section - Asymmetric */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Hero Metric */}
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-8 p-8 glass-premium rounded-2xl flex flex-col justify-between min-h-[320px] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 text-primary/10 group-hover:text-primary/20 transition-colors">
            <Building2 size={160} strokeWidth={1} />
          </div>
          
          <div className="relative z-10">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-4">Quy mô quản lý</p>
            <div className="flex items-baseline gap-4">
              <span className="text-7xl md:text-8xl font-black tracking-tighter text-foreground">{stats.tongSoPhong}</span>
              <span className="text-2xl font-heading text-muted-foreground">Phòng</span>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap gap-8 pt-8 hairline-t">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Đang thuê</p>
              <p className="text-xl font-bold">{stats.phongDangThue}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Bảo trì</p>
              <p className="text-xl font-bold">{stats.phongBaoTri}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Trống</p>
              <p className="text-xl font-bold text-accent">{stats.phongTrong}</p>
            </div>
          </div>
        </motion.div>

        {/* Highlight Stats Column */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div 
            variants={itemVariants}
            className="p-6 border hairline-t border-border/50 rounded-xl space-y-4 hover:bg-secondary/50 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider italic">Doanh thu tháng</p>
              <TrendingUp className="text-accent" size={18} />
            </div>
            <p className="text-3xl font-bold tracking-tight">{formatVND(stats.doanhThuThang)}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-accent font-bold">+12.5%</span>
              <span>so với tháng trước</span>
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="p-6 bg-foreground text-background rounded-xl space-y-4 shadow-premium group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium opacity-60 uppercase tracking-wider">Sự cố cần xử lý</p>
              <AlertTriangle className="text-destructive" size={18} />
            </div>
            <p className="text-5xl font-black">{stats.suCoCanXuLy}</p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="opacity-80">Yêu cầu ưu tiên</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Data Insight Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Hóa đơn đến hạn', val: stats.hoaDonSapDenHan, icon: Calendar, color: 'text-orange-500' },
          { label: 'Hợp đồng hết hạn', val: stats.hopDongSapHetHan, icon: Clock, color: 'text-yellow-500' },
          { label: 'Doanh thu năm', val: formatVND(stats.doanhThuNam), icon: TrendingUp, color: 'text-primary' }
        ].map((stat, i) => (
          <motion.div 
            key={i}
            variants={itemVariants}
            className="p-6 border border-border/40 rounded-lg hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <stat.icon className={stat.color} size={16} />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stat.val}</p>
          </motion.div>
        ))}
      </section>

      {/* Bottom Insights */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-12 hairline-t">
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-heading">Hoạt động mới</h3>
            <span className="text-xs text-primary font-bold cursor-pointer hover:underline">Xem tất cả</span>
          </div>
          <div className="space-y-4">
            {[
              { type: 'Mới', title: 'Khách thuê: Nguyễn Văn A', detail: 'Phòng P101 - Vừa đăng ký', color: 'bg-primary' },
              { type: 'Xong', title: 'Thanh toán: 2,500,000đ', detail: 'Phòng P102 - Chuyển khoản', color: 'bg-accent' },
              { type: 'Lỗi', title: 'Sự cố: Hỏng điều hòa', detail: 'Phòng P105 - Cần thợ điện', color: 'bg-destructive' }
            ].map((act, i) => (
              <div key={i} className="flex gap-4 group">
                <div className={`w-1 shrink-0 ${act.color} group-hover:scale-x-150 transition-transform origin-left`} />
                <div>
                  <p className="text-sm font-bold">{act.title}</p>
                  <p className="text-xs text-muted-foreground">{act.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-6">
          <h3 className="text-xl font-heading">Tỷ lệ sử dụng</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>PHÒNG ĐÃ THUÊ</span>
                <span>{((stats.phongDangThue / stats.tongSoPhong) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.phongDangThue / stats.tongSoPhong) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-primary"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span>PHÒNG TRỐNG</span>
                <span>{((stats.phongTrong / stats.tongSoPhong) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.phongTrong / stats.tongSoPhong) * 100}%` }}
                  transition={{ duration: 1, delay: 0.7 }}
                  className="h-full bg-accent"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
}
