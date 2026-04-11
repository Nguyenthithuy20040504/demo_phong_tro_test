import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { z } from 'zod';
import { sendVerificationEmail } from '@/lib/mail';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = resendSchema.parse(body);

    await dbConnect();

    const user = await NguoiDung.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    if (user.daXacMinhEmail) {
      return NextResponse.json(
        { message: 'Tài khoản đã được xác minh trước đó' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes from now

    user.maXacNhanEmail = otpCode;
    user.hanMaXacNhanEmail = expiryTime;
    await user.save();

    // Send email
    await sendVerificationEmail({
      email: user.email,
      khachThueName: user.ten || user.name,
      code: otpCode,
    });

    return NextResponse.json(
      { message: 'Đã gửi lại mã xác nhận' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Email không hợp lệ' }, { status: 400 });
    }
    console.error('Resend error:', error);
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi hệ thống' },
      { status: 500 }
    );
  }
}
