import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import KhachThue from '@/models/KhachThue';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, email, matKhau } = await request.json();

    if (!token || !email || !matKhau) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin cần thiết' }, { status: 400 });
    }

    if (matKhau.length < 6) {
      return NextResponse.json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    await dbConnect();

    // Tìm khách thuê khớp với email và mã xác nhận, còn trong hạn
    const khachThue = await KhachThue.findOne({
      email: email.toLowerCase(),
      maXacNhanEmail: token,
      hanMaXacNhanEmail: { $gt: new Date() }
    });

    if (!khachThue) {
      return NextResponse.json({ 
        success: false, 
        message: 'Mã xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ chủ nhà để nhận mã mới.' 
      }, { status: 400 });
    }

    // Hash mật khẩu mới (Mongoose middleware sẽ hash ở bước save, 
    // nhưng để chắc chắn chúng ta gán trực tiếp vào matKhau. 
    // Vì model KhachThue đã có middleware hash matKhau trước khi save nên ta chỉ cần cập nhật.)
    
    khachThue.matKhau = matKhau;
    khachThue.daXacMinhEmail = true;
    khachThue.maXacNhanEmail = undefined;
    khachThue.hanMaXacNhanEmail = undefined;

    await khachThue.save();

    return NextResponse.json({
      success: true,
      message: 'Thiết lập mật khẩu thành công. Bây giờ bạn có thể đăng nhập.'
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error setting password for tenant:', error);
    return NextResponse.json({ success: false, message: 'Có lỗi xảy ra trong quá trình thiết lập mật khẩu' }, { status: 500 });
  }
}
