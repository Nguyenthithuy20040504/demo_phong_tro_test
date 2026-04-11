import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.redirect(new URL('/dang-nhap?error=Thiếu thông tin xác nhận', request.url));
    }

    await dbConnect();
    const user = await NguoiDung.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.redirect(new URL('/dang-nhap?error=Tài khoản không tồn tại', request.url));
    }

    if (user.daXacMinhEmail) {
      return NextResponse.redirect(new URL('/dang-nhap?message=Tài khoản đã được xác minh. Vui lòng đăng nhập', request.url));
    }

    if (user.maXacNhanEmail !== token) {
      return NextResponse.redirect(new URL('/dang-nhap?error=Link xác nhận không hợp lệ', request.url));
    }

    if (!user.hanMaXacNhanEmail || new Date() > user.hanMaXacNhanEmail) {
      return NextResponse.redirect(new URL('/dang-nhap?error=Link xác nhận đã hết hạn', request.url));
    }

    // Xác nhận thành công
    user.daXacMinhEmail = true;
    user.maXacNhanEmail = null;
    user.hanMaXacNhanEmail = null;
    await user.save();

    return NextResponse.redirect(new URL('/dang-nhap?message=verified', request.url));
  } catch (error) {
    console.error('Verify link error:', error);
    return NextResponse.redirect(new URL('/dang-nhap?error=Lỗi hệ thống khi xác nhận tài khoản', request.url));
  }
}
