'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const registerSchema = z.object({
  ten: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  matKhau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  xacNhanMatKhau: z.string(),
  soDienThoai: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ'),
  vaiTro: z.enum(['chuNha']),
}).refine((data) => data.matKhau === data.xacNhanMatKhau, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['xacNhanMatKhau'],
});

type RegisterForm = z.infer<typeof registerSchema>;

function RegisterFormContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'mienPhi';
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      vaiTro: 'chuNha',
    },
  });

  const vaiTro = watch('vaiTro');

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ten: data.ten,
          email: data.email,
          matKhau: data.matKhau,
          soDienThoai: data.soDienThoai,
          vaiTro: data.vaiTro,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.requireVerification) {
          setRegisteredEmail(result.email || data.email);
          setStep(2);
          setCountdown(60);
          setSuccess('Vui lòng kiểm tra email để nhận mã xác nhận.');
        } else {
          setSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
          setTimeout(() => {
            router.push(`/dang-nhap?plan=${selectedPlan}`);
          }, 2000);
        }
      } else {
        setError(result.message || 'Đã xảy ra lỗi, vui lòng thử lại');
      }
    } catch (error) {
      setError('Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số mã xác nhận');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registeredEmail,
          code: verificationCode,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Xác minh thành công! Đang chuyển hướng...');
        setTimeout(() => {
          router.push(`/dang-nhap?plan=${selectedPlan}`);
        }, 2000);
      } else {
        setError(result.message || 'Mã xác nhận không hợp lệ');
      }
    } catch (error) {
      setError('Đã xảy ra lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: registeredEmail }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Đã gửi lại mã xác nhận. Vui lòng kiểm tra email.');
        setCountdown(60);
      } else {
        setError(result.message || 'Không thể gửi lại mã xác nhận');
      }
    } catch (error) {
      setError('Đã xảy ra lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 md:space-y-8">
        <div className="text-center">
          <h2 className="mt-4 md:mt-6 text-2xl md:text-3xl font-bold text-gray-900">
            {step === 1 ? 'Đăng ký Chủ trọ' : 'Xác thực Email'}
          </h2>
          <p className="mt-2 text-xs md:text-sm text-gray-600">
            {step === 1 ? 'Khởi tạo hệ thống quản lý phòng trọ PiRoom của bạn' : 'Vui lòng nhập mã gồm 6 chữ số được gửi tới email của bạn'}
          </p>
        </div>
        
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">{step === 1 ? 'Đăng ký' : 'Xác minh OTP'}</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {step === 1 ? 'Tạo tài khoản mới để sử dụng hệ thống' : `Mã xác nhận đã được gửi đến ${registeredEmail}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 text-emerald-600 border-emerald-200 bg-emerald-50">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {step === 1 ? (
              <>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="ten" className="text-xs md:text-sm">Họ và tên</Label>
                    <Input
                      id="ten"
                      placeholder="Nhập họ và tên"
                      {...register('ten')}
                      className={`text-sm ${errors.ten ? 'border-red-500' : ''}`}
                    />
                    {errors.ten && (
                      <p className="text-xs md:text-sm text-red-500">{errors.ten.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs md:text-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Nhập email"
                      {...register('email')}
                      className={`text-sm ${errors.email ? 'border-red-500' : ''}`}
                    />
                    {errors.email && (
                      <p className="text-xs md:text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="soDienThoai" className="text-xs md:text-sm">Số điện thoại</Label>
                    <Input
                      id="soDienThoai"
                      placeholder="Nhập số điện thoại"
                      {...register('soDienThoai')}
                      className={`text-sm ${errors.soDienThoai ? 'border-red-500' : ''}`}
                    />
                    {errors.soDienThoai && (
                      <p className="text-xs md:text-sm text-red-500">{errors.soDienThoai.message}</p>
                    )}
                  </div>

                  <input type="hidden" {...register('vaiTro')} value="chuNha" />

                  <div className="space-y-2">
                    <Label htmlFor="matKhau" className="text-xs md:text-sm">Mật khẩu</Label>
                    <div className="relative">
                      <Input
                        id="matKhau"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu"
                        {...register('matKhau')}
                        className={`text-sm ${errors.matKhau ? 'border-red-500 pr-10' : 'pr-10'}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.matKhau && (
                      <p className="text-xs md:text-sm text-red-500">{errors.matKhau.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="xacNhanMatKhau" className="text-xs md:text-sm">Xác nhận mật khẩu</Label>
                    <div className="relative">
                      <Input
                        id="xacNhanMatKhau"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu"
                        {...register('xacNhanMatKhau')}
                        className={`text-sm ${errors.xacNhanMatKhau ? 'border-red-500 pr-10' : 'pr-10'}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        ) : (
                          <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.xacNhanMatKhau && (
                      <p className="text-xs md:text-sm text-red-500">{errors.xacNhanMatKhau.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang đăng ký...
                      </>
                    ) : (
                      'Đăng ký'
                    )}
                  </Button>
                </form>

                <div className="mt-4 md:mt-6 relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Hoặc tiếp tục với</span>
                  </div>
                </div>

                <div className="mt-4 md:mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signIn('google', { callbackUrl: `/dashboard?plan=${selectedPlan}` })}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </Button>
                </div>

                <div className="mt-4 md:mt-6 text-center">
                  <p className="text-xs md:text-sm text-gray-600">
                    Đã có tài khoản?{' '}
                    <Link href="/dang-nhap" className="font-medium text-blue-600 hover:text-blue-500">
                      Đăng nhập ngay
                    </Link>
                  </p>
                </div>
              </>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode" className="text-center block text-sm">Mã gồm 6 chữ số</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    maxLength={6}
                    placeholder="VD: 123456"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="text-center text-lg tracking-widest px-4 py-6"
                  />
                </div>

                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    'Xác nhận'
                  )}
                </Button>

                <div className="mt-6 text-center space-y-4">
                  <p className="text-xs md:text-sm text-gray-600">
                    Chưa nhận được mã?{' '}
                    {countdown > 0 ? (
                      <span className="text-gray-400 cursor-not-allowed">
                        Gửi lại mã ({countdown}s)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        className="font-medium text-blue-600 hover:text-blue-500 bg-transparent border-0 p-0 m-0 cursor-pointer"
                        disabled={isLoading}
                      >
                        Gửi lại mã
                      </button>
                    )}
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setVerificationCode('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 block mx-auto underline mt-2"
                  >
                    Quay lại đăng ký
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    }>
      <RegisterFormContent />
    </Suspense>
  );
}
