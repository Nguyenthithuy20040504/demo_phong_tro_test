import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { z } from 'zod';

const verifyCodeSchema = z.object({
  email: z.string(), // This is actually the identifier (email/username) from the UI
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email: identifier, code } = verifyCodeSchema.parse(body);
    const lowerIdentifier = identifier.toLowerCase();

    await dbConnect();
    const KhachThue = (await import('@/models/KhachThue')).default;

    // Search in NguoiDung
    let targetUser = await NguoiDung.findOne({
        $or: [
            { email: lowerIdentifier },
            { tenDangNhap: lowerIdentifier },
            { username: lowerIdentifier }
        ]
    }).lean();

    // If not found, search in KhachThue
    if (!targetUser) {
        targetUser = await KhachThue.findOne({
            $or: [
                { email: lowerIdentifier },
                { tenDangNhap: lowerIdentifier }
            ]
        }).lean() as any;
    }

    if (!targetUser) {
      return NextResponse.json(
        { message: 'Không tìm thấy người dùng' },
        { status: 404 }
      );
    }

    if (!targetUser.maKhoiPhucMatKhau || targetUser.maKhoiPhucMatKhau !== code) {
      return NextResponse.json(
        { message: 'Mã xác nhận không chính xác' },
        { status: 400 }
      );
    }

    if (!targetUser.hanMaKhoiPhucMatKhau || new Date() > new Date(targetUser.hanMaKhoiPhucMatKhau)) {
      return NextResponse.json(
        { message: 'Mã xác nhận đã hết hạn, vui lòng yêu cầu mã mới' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Xác minh thành công' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    console.error('Verify forgot password code error:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi hệ thống' }, { status: 500 });
  }
}
