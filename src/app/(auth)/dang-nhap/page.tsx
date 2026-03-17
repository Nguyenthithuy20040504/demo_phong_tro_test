'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  matKhau: z.string().min(6, 'Mật khẩu phải có nhất 6 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: data.email,
        matKhau: data.matKhau,
        redirect: false,
      });

      if (result?.error) {
        setError('Email hoặc mật khẩu không đúng');
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;

      if (role === 'khachThue') {
        router.push('/khach-thue/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError('Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0a] relative overflow-hidden px-4">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
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
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-6"
          >
            <ShieldCheck className="size-3" /> Secure Gate
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
            Hệ thống quản lý cư trú hiện đại
          </p>
        </div>

        <Card className="border-none bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-premium rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Alert variant="destructive" className="bg-destructive/10 border-none text-destructive rounded-2xl">
                      <AlertDescription className="text-xs font-medium tracking-wide">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground ml-1">Email</Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      {...register('email')}
                      className={`h-14 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all px-6 font-light tracking-wide ${errors.email ? 'border-destructive/50' : ''}`}
                    />
                    <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="matKhau" className="text-xs font-semibold text-muted-foreground ml-1">Mật khẩu</Label>
                  </div>
                  <div className="relative group">
                    <Input
                      id="matKhau"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('matKhau')}
                      className={`h-14 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all px-6 font-mono tracking-widest ${errors.matKhau ? 'border-destructive/50' : ''}`}
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
                  {errors.matKhau && (
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errors.matKhau.message}</p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-2xl bg-primary text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  'Đăng nhập'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex items-center justify-center gap-8 opacity-20"
        >
          <Building2 className="size-5" />
          <div className="w-1 h-1 rounded-full bg-foreground" />
          <Sparkles className="size-5" />
          <div className="w-1 h-1 rounded-full bg-foreground" />
          <ShieldCheck className="size-5" />
        </motion.div>
      </motion.div>
    </div>
  );
}
