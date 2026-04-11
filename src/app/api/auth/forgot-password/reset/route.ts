import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, newPassword } = resetPasswordSchema.parse(body);

    await dbConnect();

    const user = await NguoiDung.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    // Need to use lean or direct access because strict schema might hide maKhoiPhucMatKhau in 'user' document
    const rawUser = await NguoiDung.findOne({ email: email.toLowerCase() }).lean();

    if (!rawUser.maKhoiPhucMatKhau || rawUser.maKhoiPhucMatKhau !== code) {
      return NextResponse.json(
        { message: 'Mã xác nhận không chính xác' },
        { status: 400 }
      );
    }

    if (!rawUser.hanMaKhoiPhucMatKhau || new Date() > rawUser.hanMaKhoiPhucMatKhau) {
      return NextResponse.json(
        { message: 'Mã xác nhận đã hết hạn, vui lòng yêu cầu gửi lại mã mới' },
        { status: 400 }
      );
    }

    // Đổi mật khẩu
    // Do NguoiDung.ts sử dụng pre-save hook cho 'matKhau' và 'password', 
    // chúng ta sẽ cập nhật cả 2 trường và để hook tự động hash.
    user.matKhau = newPassword;
    user.password = newPassword;
    await user.save();

    // Reset OTP Fields using updateOne to bypass strict mode
    await NguoiDung.updateOne(
      { _id: user._id },
      { $set: { maKhoiPhucMatKhau: null, hanMaKhoiPhucMatKhau: null } },
      { strict: false }
    );

    return NextResponse.json(
      { message: 'Đổi mật khẩu thành công' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi hệ thống' },
      { status: 500 }
    );
  }
}
