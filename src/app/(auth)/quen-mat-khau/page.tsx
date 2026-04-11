'use client';

import { useState, Suspense } from 'react';
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
import { Loader2, ShieldCheck, Sparkles, KeyRound, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const requestSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

const verifySchema = z.object({
  code: z.string().length(6, 'Mã xác nhận phải gồm 6 số'),
});

type RequestForm = z.infer<typeof requestSchema>;
type VerifyForm = z.infer<typeof verifySchema>;

function ForgotPasswordContent() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const router = useRouter();

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: errorsRequest },
  } = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
  });

  const {
    register: registerVerify,
    handleSubmit: handleSubmitVerify,
    reset: resetVerify,
    formState: { errors: errorsVerify },
  } = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: '' },
  });

  const onRequestSubmit = async (data: RequestForm) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || 'Có lỗi xảy ra');
        return;
      }

      setSuccess('Mã khôi phục đã được gửi vào email của bạn!');
      setEmail(data.email);
      resetVerify(); // reset form OTP để tránh trình duyệt tự điền giá trị cũ
      setStep(2);
      setResendTimer(60);
      
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err) {
      setError('Đã xảy ra lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || 'Có lỗi xảy ra khi gửi lại mã');
        return;
      }

      setSuccess('Mã khôi phục mới đã được gửi vào email của bạn!');
      setResendTimer(60);
      
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError('Đã xảy ra lỗi hệ thống khi gửi lại mã');
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifySubmit = async (data: VerifyForm) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/forgot-password/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: data.code }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || 'Mã xác nhận không đúng');
        return;
      }

      setSuccess('Xác nhận thành công. Đang chuyển hướng...');
      setTimeout(() => {
        router.push(`/doi-mat-khau?email=${encodeURIComponent(email)}&code=${encodeURIComponent(data.code)}`);
      }, 1500);
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
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-red-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[100px]" />
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
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold uppercase tracking-[0.2em] text-red-600 mb-6"
          >
            <KeyRound className="size-3" /> Password Recovery
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3"
          >
            Quên mật khẩu
          </motion.h1>
          <p className="text-sm text-muted-foreground/60 font-medium tracking-wide">
            {step === 1 ? 'Nhập email để nhận mã khôi phục' : 'Nhập mã OTP đã nhận được qua email'}
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
                  <Alert className="bg- emerald-500/10 border-none text-emerald-600 rounded-2xl">
                    <AlertDescription className="text-xs font-medium tracking-wide">{success}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {step === 1 ? (
              <form onSubmit={handleSubmitRequest(onRequestSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground ml-1">Địa chỉ Email</Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      {...registerRequest('email')}
                      className={`h-14 bg-secondary/10 border-transparent rounded-2xl focus:bg-background transition-all px-6 font-light tracking-wide ${errorsRequest.email ? 'border-destructive/50' : ''}`}
                    />
                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/20 group-focus-within:text-red-500 transition-colors" />
                  </div>
                  {errorsRequest.email && (
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest ml-1">{errorsRequest.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="size-5 animate-spin" /> : 'Gửi mã xác nhận'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmitVerify(onVerifySubmit)} className="space-y-6">
                <div className="space-y-2 text-center">
                  <Label className="text-xs font-semibold text-muted-foreground">Mã OTP đã gửi đến: <span className="text-foreground font-bold">{email}</span></Label>
                  <div className="relative group mt-4">
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      maxLength={6}
                      placeholder="••••••"
                      {...registerVerify('code')}
                      className={`flex h-16 w-full rounded-2xl bg-secondary/10 border border-transparent px-3 py-2 text-center text-3xl tracking-[1em] font-mono focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all ${errorsVerify.code ? 'border-destructive/50' : ''}`}
                    />
                  </div>
                  {errorsVerify.code && (
                    <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mt-2">{errorsVerify.code.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="size-5 animate-spin" /> : 'Xác nhận mã OTP'}
                </Button>

                <div className="flex items-center justify-between mt-4">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    Thay đổi Email
                  </button>
                  <button 
                    type="button" 
                    onClick={handleResendCode}
                    disabled={resendTimer > 0 || isLoading}
                    className={`text-xs underline underline-offset-4 ${
                      resendTimer > 0 
                        ? 'text-muted-foreground/50 cursor-not-allowed' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {resendTimer > 0 ? `Gửi lại mã sau ${resendTimer}s` : 'Gửi lại mã OTP'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-8 text-center border-t border-muted/20 pt-6">
              <p className="text-xs text-muted-foreground/60 font-medium">
                Đã nhớ mật khẩu?{' '}
                <Link href="/dang-nhap" className="text-foreground hover:text-red-500 font-bold transition-colors">
                  Quay lại đăng nhập
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="size-10 animate-spin text-primary" /></div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
