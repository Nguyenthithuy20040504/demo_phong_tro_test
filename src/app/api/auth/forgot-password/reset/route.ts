import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  email: z.string(), // This is the identifier (email/username)
  code: z.string().length(6),
  newPassword: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email: identifier, code, newPassword } = resetPasswordSchema.parse(body);
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

    let targetUser = user;
    let modelType: 'NguoiDung' | 'KhachThue' = 'NguoiDung';

    if (!targetUser) {
        targetUser = await KhachThue.findOne({
            $or: [
                { email: lowerIdentifier },
                { tenDangNhap: lowerIdentifier }
            ]
        }) as any;
        modelType = 'KhachThue';
    }

    if (!targetUser) {
      return NextResponse.json({ message: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    // Secondary check for OTP (we need lean data because fields might be outside schema)
    const rawUserData = modelType === 'NguoiDung' 
        ? await NguoiDung.findById(targetUser._id).lean()
        : await KhachThue.findById(targetUser._id).lean() as any;

    if (!rawUserData.maKhoiPhucMatKhau || rawUserData.maKhoiPhucMatKhau !== code) {
      return NextResponse.json({ message: 'Mã xác nhận không chính xác' }, { status: 400 });
    }

    if (!rawUserData.hanMaKhoiPhucMatKhau || new Date() > new Date(rawUserData.hanMaKhoiPhucMatKhau)) {
      return NextResponse.json({ message: 'Mã xác nhận đã hết hạn, vui lòng yêu cầu mã mới' }, { status: 400 });
    }

    // Change Password
    if (modelType === 'NguoiDung') {
        targetUser.matKhau = newPassword;
        targetUser.password = newPassword;
        await targetUser.save();
        
        await NguoiDung.updateOne(
            { _id: targetUser._id },
            { $set: { maKhoiPhucMatKhau: null, hanMaKhoiPhucMatKhau: null } },
            { strict: false }
        );
    } else {
        targetUser.matKhau = newPassword;
        await targetUser.save();
        
        await KhachThue.updateOne(
            { _id: targetUser._id },
            { $set: { maKhoiPhucMatKhau: null, hanMaKhoiPhucMatKhau: null } },
            { strict: false }
        );
    }

    return NextResponse.json({ message: 'Đổi mật khẩu thành công' }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }
    console.error('Reset password error:', error);
    return NextResponse.json({ message: 'Đã xảy ra lỗi hệ thống' }, { status: 500 });
  }
}
