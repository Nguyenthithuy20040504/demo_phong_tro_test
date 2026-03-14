import { z } from 'zod';

export const userProfileSchema = z.object({
  name: z.string().min(1, 'Họ và tên là bắt buộc').max(100, 'Tên không được quá 100 ký tự'),
  phone: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
  address: z.string().max(500, 'Địa chỉ không được quá 500 ký tự').optional().or(z.literal('')),
  avatar: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  matKhau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
