import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { z } from 'zod';
import { sendVerificationEmail } from '@/lib/mail';

const registerSchema = z.object({
  ten: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  matKhau: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  soDienThoai: z.string().regex(/^[0-9]{10,11}$/, 'Số điện thoại không hợp lệ'),
  vaiTro: z.enum(['chuNha']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    
    await dbConnect();
    
    // Check if user already exists
    const existingUser = await NguoiDung.findOne({
      $or: [
        { email: validatedData.email.toLowerCase() },
        { soDienThoai: validatedData.soDienThoai }
      ]
    });
    
    if (existingUser) {
      if (!existingUser.daXacMinhEmail) {
        // If exists but not verified, could resend code or ask to resend, but let's just say it's already used
        return NextResponse.json(
          { message: 'Email hoặc số điện thoại đã được đăng ký nhưng chưa xác minh. Vui lòng kiểm tra email hoặc đăng nhập.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: 'Email hoặc số điện thoại đã được sử dụng' },
        { status: 400 }
      );
    }
    
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes from now

    // Create new user with both Vietnamese and English fields for compatibility
    const newUser = new NguoiDung({
      ten: validatedData.ten,
      name: validatedData.ten,
      email: validatedData.email.toLowerCase(),
      matKhau: validatedData.matKhau,
      password: validatedData.matKhau,
      soDienThoai: validatedData.soDienThoai,
      phone: validatedData.soDienThoai,
      vaiTro: validatedData.vaiTro,
      role: validatedData.vaiTro,
      trangThai: 'hoatDong',
      isActive: true,
      daXacMinhEmail: false,
      maXacNhanEmail: otpCode,
      hanMaXacNhanEmail: expiryTime,
    });
    
    await newUser.save();
    
    // Send verification email
    await sendVerificationEmail({
      email: newUser.email,
      khachThueName: newUser.ten,
      code: otpCode,
    });
    
    return NextResponse.json(
      { 
        message: 'Đăng ký thành công, vui lòng kiểm tra email',
        requireVerification: true,
        email: newUser.email 
      },
      { status: 201 }
    );
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.issues[0].message },
        { status: 400 }
      );
    }
    
    console.error('Register error:', error);
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi, vui lòng thử lại' },
      { status: 500 }
    );
  }
}
