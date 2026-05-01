import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import NguoiDung from '@/models/NguoiDung';
import KhachThue from '@/models/KhachThue';
import { sendAccountConfirmationLinkEmail } from '@/lib/mail';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'chuNha' && session.user.role !== 'chuTro' && session.user.role !== 'admin')) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { khachThueId, email, tenDangNhap } = await request.json();
    
    if (!khachThueId) {
      return NextResponse.json({ success: false, message: 'Thiếu ID khách thuê' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ success: false, message: 'Vui lòng nhập email' }, { status: 400 });
    }
    if (!tenDangNhap || tenDangNhap.length < 3) {
      return NextResponse.json({ success: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự' }, { status: 400 });
    }

    await dbConnect();

    // 1. Kiểm tra tenDangNhap duy nhất toàn hệ thống (trong bảng KhachThue)
    const existingUsername = await KhachThue.findOne({ 
      tenDangNhap: tenDangNhap.toLowerCase() 
    });
    
    if (existingUsername) {
      return NextResponse.json({ 
        success: false, 
        message: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.' 
      }, { status: 400 });
    }

    // 2. Kiểm tra email duy nhất trong phạm vi chủ nhà này
    const existingEmailForThisOwner = await KhachThue.findOne({
      nguoiQuanLy: session.user.id,
      email: email.toLowerCase(),
      _id: { $ne: khachThueId }, // Loại trừ chính khách thuê đang được xét
      tenDangNhap: { $exists: true, $ne: '' } // Chỉ kiểm tra những người đã có tài khoản
    });

    if (existingEmailForThisOwner) {
      return NextResponse.json({ 
        success: false, 
        message: 'Bạn đã tạo một tài khoản khác sử dụng email này. Mỗi email chỉ được gán cho một tài khoản duy nhất của bạn.' 
      }, { status: 400 });
    }

    // 3. Tìm khách thuê
    const khachThue = await KhachThue.findById(khachThueId);
    if (!khachThue) {
      return NextResponse.json({ success: false, message: 'Không tìm thấy hồ sơ khách thuê' }, { status: 404 });
    }

    if (khachThue.daXacMinhEmail) {
      return NextResponse.json({ success: false, message: 'Khách thuê này đã có tài khoản và đã xác minh.' }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hanToken = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // 3. Cập nhật thông tin tài khoản vào KhachThue
    khachThue.tenDangNhap = tenDangNhap.toLowerCase();
    khachThue.email = email.toLowerCase();
    khachThue.maXacNhanEmail = token;
    khachThue.hanMaXacNhanEmail = hanToken;
    khachThue.daXacMinhEmail = false;

    await khachThue.save();

    const baseUrl = request.nextUrl.origin;
    // Link dẫn tới trang thiết lập mật khẩu dành cho khách
    const confirmLink = `${baseUrl}/thiet-lap-mat-khau?token=${token}&email=${encodeURIComponent(khachThue.email || email)}`;
    
    sendAccountConfirmationLinkEmail({
      email: khachThue.email || email,
      khachThueName: khachThue.hoTen || 'Khách hàng',
      confirmLink: confirmLink
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: `Đã gửi lời mời xác nhận tài khoản tới email ${khachThue.email}`,
      data: {
        khachThueId: khachThue._id,
        tenDangNhap: khachThue.tenDangNhap,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error creating tenant account:', error);
    return NextResponse.json({ success: false, message: 'Có lỗi xảy ra trong quá trình xử lý' }, { status: 500 });
  }
}
