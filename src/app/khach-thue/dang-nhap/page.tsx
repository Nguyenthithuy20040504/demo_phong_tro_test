'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, Lock, LogIn, Home, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function KhachThueDangNhapPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    soDienThoai: '',
    matKhau: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/khach-thue/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('khachThueToken', result.data.token);
        localStorage.setItem('khachThueData', JSON.stringify(result.data.khachThue));
        
        toast.success('Đăng nhập thành công!');
        router.push('/khach-thue/dashboard');
      } else {
        toast.error(result.message || 'Đăng nhập thất bại');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error('Có lỗi xảy ra khi đăng nhập');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] relative overflow-hidden px-4">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="w-full max-w-[480px] relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/10 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 mb-6"
          >
            <ShieldCheck className="size-3" /> Tenant Access
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3"
          >
            Đăng nhập
          </motion.h1>
          <p className="text-sm text-muted-foreground/60 font-medium tracking-wide">
            Dành cho khách thuê phòng
          </p>
        </div>

        <Card className="border-none bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-premium rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="soDienThoai" className="text-xs font-semibold text-muted-foreground ml-1">Số điện thoại</Label>
                  <div className="relative group">
                    <Input
                      id="soDienThoai"
                      type="tel"
                      placeholder="0123456789"
                      value={formData.soDienThoai}
                      onChange={(e) => setFormData(prev => ({ ...prev, soDienThoai: e.target.value }))}
                      className="h-14 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all px-6 font-light tracking-wide"
                      required
                    />
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/20 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matKhau" className="text-xs font-semibold text-muted-foreground ml-1">Mật khẩu</Label>
                  <div className="relative group">
                    <Input
                      id="matKhau"
                      type="password"
                      placeholder="••••••••"
                      value={formData.matKhau}
                      onChange={(e) => setFormData(prev => ({ ...prev, matKhau: e.target.value }))}
                      className="h-14 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all px-6 font-mono tracking-widest"
                      required
                    />
                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/20 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <div className="flex items-center gap-2">
                    <LogIn className="size-4" />
                    <span>Đăng nhập</span>
                  </div>
                )}
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground/60">Chưa có tài khoản? Vui lòng liên hệ quản lý</p>
              </div>
            </form>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex items-center justify-center gap-8 opacity-20"
        >
          <Home className="size-5" />
          <div className="w-1 h-1 rounded-full bg-foreground" />
          <Sparkles className="size-5" />
          <div className="w-1 h-1 rounded-full bg-foreground" />
          <ShieldCheck className="size-5" />
        </motion.div>
      </motion.div>
    </div>
  );
}

