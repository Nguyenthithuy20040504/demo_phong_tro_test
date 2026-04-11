import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { z } from 'zod';

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifySchema.parse(body);

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

    if (user.maXacNhanEmail !== code) {
      return NextResponse.json(
        { message: 'Mã xác nhận không chính xác' },
        { status: 400 }
      );
    }

    if (!user.hanMaXacNhanEmail || new Date() > user.hanMaXacNhanEmail) {
      return NextResponse.json(
        { message: 'Mã xác nhận đã hết hạn, vui lòng gửi lại mã mới' },
        { status: 400 }
      );
    }

    // Success
    user.daXacMinhEmail = true;
    user.maXacNhanEmail = null;
    user.hanMaXacNhanEmail = null;
    await user.save();

    return NextResponse.json(
      { message: 'Xác minh thành công' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    console.error('Verify error:', error);
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi hệ thống' },
      { status: 500 }
    );
  }
}
