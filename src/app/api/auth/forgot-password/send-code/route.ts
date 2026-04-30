import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { z } from 'zod';
import { sendForgotPasswordEmail } from '@/lib/mail';

const sendCodeSchema = z.object({
  identifier: z.string().min(3, 'Vui lòng nhập Email hoặc Tên đăng nhập'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier } = sendCodeSchema.parse(body);
    const lowerIdentifier = identifier.toLowerCase();

    await dbConnect();
    const KhachThue = (await import('@/models/KhachThue')).default;

    // Search in NguoiDung
    let user = await NguoiDung.findOne({
        $or: [
            { email: lowerIdentifier },
            { tenDangNhap: lowerIdentifier },
            { username: lowerIdentifier }
        ]
    });

    let modelType: 'NguoiDung' | 'KhachThue' = 'NguoiDung';
    let targetUser = user;

    // If not found in NguoiDung, search in KhachThue
    if (!targetUser) {
        targetUser = await KhachThue.findOne({
            $or: [
                { email: lowerIdentifier },
                { tenDangNhap: lowerIdentifier }
            ]
        });
        modelType = 'KhachThue';
    }

    if (!targetUser || !targetUser.email) {
      return NextResponse.json(
        { message: 'Không tìm thấy tài khoản với thông tin này' },
        { status: 404 }
      );
    }

    // Check if account is locked
    if (modelType === 'NguoiDung' && (targetUser.trangThai === 'khoa' || (targetUser as any).isActive === false)) {
      return NextResponse.json(
        { message: 'Tài khoản này đang bị khóa' },
        { status: 403 }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes

    if (modelType === 'NguoiDung') {
        await NguoiDung.updateOne(
            { _id: targetUser._id },
            { $set: { maKhoiPhucMatKhau: otpCode, hanMaKhoiPhucMatKhau: expiryTime } },
            { strict: false }
        );
    } else {
        await KhachThue.updateOne(
            { _id: targetUser._id },
            { $set: { maKhoiPhucMatKhau: otpCode, hanMaKhoiPhucMatKhau: expiryTime } },
            { strict: false }
        );
    }

    // Send email
    await sendForgotPasswordEmail({
      email: targetUser.email,
      khachThueName: targetUser.ten || (targetUser as any).name || (targetUser as any).hoTen,
      code: otpCode,
    });

    return NextResponse.json(
      { message: 'Mã xác nhận đã được gửi đến email của bạn' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Vui lòng nhập Email hoặc Tên đăng nhập hợp lệ' }, { status: 400 });
    }
    console.error('Send forgot password code error:', error);
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi hệ thống' },
      { status: 500 }
    );
  }
}
