'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, ShieldCheck, Sparkles, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const setPasswordSchema = z.object({
  matKhau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  xacNhanMatKhau: z.string().min(6, 'Vui lòng xác nhận mật khẩu'),
}).refine((data) => data.matKhau === data.xacNhanMatKhau, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["xacNhanMatKhau"],
});

type SetPasswordForm = z.infer<typeof setPasswordSchema>;

function SetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError('Đường dẫn không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ chủ nhà để gửi lại lời mời.');
    }
  }, [token, email]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordForm>({
    resolver: zodResolver(setPasswordSchema),
  });

  const onSubmit = async (data: SetPasswordForm) => {
    if (!token || !email) return;
    
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/khach-thue/thiet-lap-mat-khau', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          matKhau: data.matKhau,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        toast.success('Thiết lập mật khẩu thành công!');
        // Chuyển hướng sau 3 giây
        setTimeout(() => {
          router.push('/dang-nhap?message=verified');
        }, 3000);
      } else {
        setError(result.message || 'Không thể thiết lập mật khẩu. Vui lòng thử lại.');
      }
    } catch (error) {
      setError('Đã xảy ra lỗi kết nối, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-md"
        >
          <div className="size-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
            <ShieldCheck className="size-10" />
          </div>
          <h1 className="text-3xl font-bold">Thành công!</h1>
          <p className="text-muted-foreground">
            Mật khẩu của bạn đã được thiết lập. Tài khoản đã sẵn sàng để sử dụng.
            Hệ thống sẽ tự động chuyển về trang đăng nhập sau vài giây...
          </p>
          <Button onClick={() => router.push('/dang-nhap')} className="w-full h-12 rounded-xl">
            Đăng nhập ngay
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] relative overflow-hidden px-4">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[450px] relative z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/10 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 mb-5">
            <KeyRound className="size-3" /> Security Setup
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Thiết lập mật khẩu</h1>
          <p className="text-sm text-muted-foreground/60">
            Chào mừng bạn! Vui lòng tạo mật khẩu để bảo vệ tài khoản của bạn.
          </p>
        </div>

        <Card className="border-none bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-premium rounded-[2rem] overflow-hidden">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Alert variant="destructive" className="bg-destructive/10 border-none text-destructive rounded-xl">
                      <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">Email tài khoản</Label>
                  <Input
                    value={email || ''}
                    disabled
                    className="h-12 bg-secondary/20 border-transparent rounded-xl text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matKhau" className="text-xs font-semibold text-muted-foreground ml-1">Mật khẩu mới</Label>
                  <div className="relative group">
                    <Input
                      id="matKhau"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('matKhau')}
                      className="h-12 bg-secondary/10 border-transparent rounded-xl focus:bg-background transition-all px-5"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-background/50 text-muted-foreground/40"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  {errors.matKhau && (
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errors.matKhau.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="xacNhanMatKhau" className="text-xs font-semibold text-muted-foreground ml-1">Xác nhận mật khẩu</Label>
                  <Input
                    id="xacNhanMatKhau"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('xacNhanMatKhau')}
                    className="h-12 bg-secondary/10 border-transparent rounded-xl focus:bg-background transition-all px-5"
                  />
                  {errors.xacNhanMatKhau && (
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errors.xacNhanMatKhau.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !token}
                className="w-full h-12 rounded-xl bg-blue-600 text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  'Hoàn tất thiết lập'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center opacity-20 flex justify-center gap-4">
          <ShieldCheck className="size-5" />
          <Sparkles className="size-5" />
          <KeyRound className="size-5" />
        </div>
      </motion.div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}
