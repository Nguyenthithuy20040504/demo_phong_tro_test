'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const resetSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string().min(6, 'Vui lòng xác nhận mật khẩu'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

type ResetForm = z.infer<typeof resetSchema>;

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const code = searchParams.get('code');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  useEffect(() => {
    if (!email || !code) {
      setError('Đường dẫn không hợp lệ hoặc đã hết hạn.');
    }
  }, [email, code]);

  const onSubmit = async (data: ResetForm) => {
    if (!email || !code) return;
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword: data.newPassword }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || 'Có lỗi xảy ra');
        return;
      }

      setSuccess('Đổi mật khẩu thành công! Bạn sẽ được chuyển hướng tới trang đăng nhập.');
      setTimeout(() => {
        router.push('/dang-nhap?message=verified');
      }, 2000);
    } catch (err) {
      setError('Đã xảy ra lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] relative overflow-hidden px-4">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
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
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 mb-6"
          >
            <ShieldCheck className="size-3" /> Secure Reset
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3"
          >
            Đổi mật khẩu mới
          </motion.h1>
          <p className="text-sm text-muted-foreground/60 font-medium tracking-wide">
            Vui lòng nhập mật khẩu mới cho tài khoản của bạn
          </p>
        </div>

        <Card className="border-none bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-premium rounded-[2.5rem] overflow-hidden relative">
          <CardContent className="p-8 md:p-12">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6"
                >
                  <Alert variant="destructive" className="bg-destructive/10 border-none text-destructive rounded-2xl">
                    <AlertDescription className="text-xs font-medium tracking-wide">{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6"
                >
                  <Alert className="bg-emerald-500/10 border-none text-emerald-600 rounded-2xl">
                    <AlertDescription className="text-xs font-medium tracking-wide">{success}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-xs font-semibold text-muted-foreground ml-1">Mật khẩu mới</Label>
                  <div className="relative group">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      disabled={!email || !code}
                      {...register('newPassword')}
                      className={`h-14 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all px-6 font-mono tracking-widest ${errors.newPassword ? 'border-destructive/50' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl hover:bg-background/50 text-muted-foreground/40"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-muted-foreground ml-1">Xác nhận mật khẩu mới</Label>
                  <div className="relative group">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      disabled={!email || !code}
                      {...register('confirmPassword')}
                      className={`h-14 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all px-6 font-mono tracking-widest ${errors.confirmPassword ? 'border-destructive/50' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl hover:bg-background/50 text-muted-foreground/40"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email || !code}
                className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : 'Lưu mật khẩu mới'}
              </Button>
            </form>

            <div className="mt-8 text-center border-t border-muted/20 pt-6">
              <p className="text-xs text-muted-foreground/60 font-medium">
                Quay lại{' '}
                <Link href="/dang-nhap" className="text-foreground hover:text-emerald-500 font-bold transition-colors">
                  Đăng nhập
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="size-10 animate-spin text-primary" /></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
