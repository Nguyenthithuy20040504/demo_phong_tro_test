import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { z } from 'zod';

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifyCodeSchema.parse(body);

    await dbConnect();

    const user = await NguoiDung.findOne({ email: email.toLowerCase() }).lean();

    if (!user) {
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    if (!user.maKhoiPhucMatKhau || user.maKhoiPhucMatKhau !== code) {
      return NextResponse.json(
        { message: 'Mã xác nhận không chính xác' },
        { status: 400 }
      );
    }

    if (!user.hanMaKhoiPhucMatKhau || new Date() > user.hanMaKhoiPhucMatKhau) {
      return NextResponse.json(
        { message: 'Mã xác nhận đã hết hạn, vui lòng yêu cầu mã mới' },
        { status: 400 }
      );
    }

    // Xác nhận thành công. Không reset mã code ở đây vì sẽ dùng code này để xác thực lúc đổi mật khẩu thực tế
    return NextResponse.json(
      { message: 'Xác minh thành công' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    console.error('Verify forgot password code error:', error);
    return NextResponse.json(
      { message: 'Đã xảy ra lỗi hệ thống' },
      { status: 500 }
    );
  }
}
