import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { z } from 'zod';
import { sendForgotPasswordEmail } from '@/lib/mail';

const sendCodeSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = sendCodeSchema.parse(body);

    await dbConnect();

    const user = await NguoiDung.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Vì lý do bảo mật, không nên trả về lỗi cụ thể nếu email không tồn tại.
      // Nhưng để UX tốt hơn cho demo, cứ trả về lỗi.
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng với email này' },
        { status: 404 }
      );
    }

    if (user.trangThai === 'khoa') {
      return NextResponse.json(
        { message: 'Tài khoản này đang bị khóa' },
        { status: 403 }
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10); // 10 minutes

    await NguoiDung.updateOne(
      { _id: user._id },
      { $set: { maKhoiPhucMatKhau: otpCode, hanMaKhoiPhucMatKhau: expiryTime } },
      { strict: false }
    );

    // Send email
    await sendForgotPasswordEmail({
      email: user.email,
      khachThueName: user.ten || user.name,
      code: otpCode,
    });

    return NextResponse.json(
      { message: 'Mã xác nhận đã được gửi đến email của bạn' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Email không hợp lệ' }, { status: 400 });
    }
    console.error('Send forgot password code error:', error);
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi hệ thống' },
      { status: 500 }
    );
  }
}
