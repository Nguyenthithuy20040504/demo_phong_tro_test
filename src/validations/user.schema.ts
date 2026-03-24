import { z } from 'zod';

export const userProfileSchema = z.object({
  name: z.string().min(1, 'Họ và tên là bắt buộc').max(100, 'Tên không được quá 100 ký tự'),
  phone: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
  address: z.string().max(500, 'Địa chỉ không được quá 500 ký tự').optional().or(z.literal('')),
  avatar: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
  anhCCCD: z.object({
    matTruoc: z.string().optional().or(z.literal('')),
    matSau: z.string().optional().or(z.literal('')),
  }).optional(),
  thongTinThanhToan: z.object({
    nganHang: z.string().optional().or(z.literal('')),
    soTaiKhoan: z.string().optional().or(z.literal('')),
    chuTaiKhoan: z.string().optional().or(z.literal('')),
  }).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  matKhau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["confirmPassword"],
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
